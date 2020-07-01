const fetch = require("node-fetch");

class Esi {
  constructor() {
    this._limitResetDefault = 60;
    this._limitRemainDefault = 100;
    this._errorWindowBrokenSinceDefault = null;

    this.limitRemain = this._limitRemainDefault;
    this.limitReset = this._limitResetDefault;
    this.errorWindowBrokenSince = this._errorWindowBrokenSinceDefault;
  }

  /**
   * @throws {Error}
   */
  call(callProps) {
    let responses = this._fetch(callProps);

    return new Result(responses);
  }

  _fetch(callProps, previousResponses = []) {
    if (this._isErrorWindowBroken()) {
      throw new Error('Error window broken')
    }

    let responses = previousResponses;
    let { method, path, token = null, body = null} = callProps;

    let fetchParams = {};
    fetchParams.method = method;
    fetchParams.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'esi-little-helper'
    }
    if (token !== null) {
      fetchParams.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body !== null) {
      fetchParams.body = body;
    }

    return fetch(path, fetchParams)
      .then(response => {
        let { status, statusText, headers } = response;
        if (status === 420) { // Error limited
          this._breakErrorWindow();
          throw new Error(`ESI ${status}: ${statusText}`);
        }

        let mustIncrementError = true;
        if (this._hasErrorLimitHeaders(headers)) {
          this._ingestErrorLimitsFromHeaders(headers);
          mustIncrementError = false;
        }

        if (!response.ok) {
          this._flagError(mustIncrementError);
          throw new Error(`ESI ${status}: ${statusText}`);
        }

        responses.push(response);

        // PAGINATION
        if (callProps.totalPages === null) {
          let pages = response.headers.get('x-pages');
          callProps.totalPages = pages === null ? 1 : pages;
        }
        if (callProps.totalPages > callProps.currentPage) {
          callProps.incrementCurrentPage();
          return this._fetch(callProps, responses);
        }

        return responses;
      })
      .catch(e => {
        throw new Error(e)
      });
  }

  /**
   * This function fetch from esi all the pages of a given call, the calls are
   * execute asynchronously 20 at a time.
   * If a callback function is provided, the data from the responses will be
   * sent to it.
   *
   * @param {CallBuilder} callProps
   * @param {function} [callback=null]
   * @returns {Result}
   */
  paginatedCall(callProps, callback = null) {
    let responses = [];
    let firstResult = this.call(callProps);
    let firstResponse = firstResult.firstResponse;
    responses.push(firstResponse);

    firstResponse.then(response => {
      let pages = response.headers.get('x-pages');
      if (pages === null || pages === 1) {
        console.log(firstResult);
        return firstResult;
      }

      //return this.resolvePagination(callProps, firstResponse, pages);
    })

    return new Result(responses);
  }

  resolvePagination(callProps, firstResponse, pages) {
    let responses = [];
    let oldPath = callProps.path;
    let newPath = (page) => `${oldPath}?page=${page}`;
    let page = 2;
    while (page <= pages) {
      let additionalPages = [];
      for (let i = 0; i <= 20 && page <= pages; i++, page++) {
        let paginatedCallProps = {...callProps};
        paginatedCallProps.path = newPath(page);
        let result = this.call(paginatedCallProps)
        additionalPages.push(result.firstResponse);
      }

      Promise.all(additionalPages)
      .then((results) => {
        results.forEach((result) => responses.push(result));
      });
    }

    if (callback !== null) {
      responses.forEach(response => {
        this._processResponse(response, callback);
      })
    }

    return new Result(responses);
  }

  async responsesToJson(responses) {
    if (!Array.isArray(responses)) {
      responses = [responses];
    }

    let promises = [];
    responses.forEach(response => {
      let newPromise = response.json();
      promises.push(newPromise);
    })


    return Promise.all(promises)
      .then(promises => {
        let result = [];
        let orderCount = 0;
        for (let data of promises) {
          data.forEach(data => result.push(data));
        }
        return result;
      });
  }

  _processResponse(response, callback) {
    response.json().then(data => callback(data));
  }

  _hasErrorLimitHeaders(headers) {
    let limitReset = headers.get('x-esi-error-limit-reset');
    let limitRemain = headers.get('x-esi-error-limit-remain');

    return limitReset !== null && limitRemain !== null;
  }

  _ingestErrorLimitsFromHeaders(headers) {
    this._setLimitRemain(headers.get('x-esi-error-limit-remain'));
    this._setLimitReset(headers.get('x-esi-error-limit-reset'));
  }

  _isErrorWindowBroken() {
    if (this.limitRemain > 0) {
      return false;
    }

    if (this.limitRemain <= 0 && !this._isInErroredWindow()) {
      this.limitRemain = this._limitRemainDefault;

      return false;
    }

    return true;
  }

  _isInErroredWindow() {
    return this.errorWindowBrokenSince !== null
        && (this.errorWindowBrokenSince + 60) > this._nowInSeconds();
  }

  _flagError(increment) {
    if (increment === true) {
      this.limitRemain--;
    }

    if (this.limitRemain <= 0) {
      this.errorWindowBrokenSince = this._nowInSeconds();
    }
  }

  _breakErrorWindow() {
    this.limitRemain = 0;
    this.errorWindowBrokenSince = this._nowInSeconds();
  }

  _setLimitRemain(limitRemain) {
    if (limitRemain !== this.limitRemain) {
      this.limitRemain = limitRemain;
    }
  }

  _setLimitReset(limitReset) {
    if (limitReset !== this.limitReset) {
      this.limitReset = limitReset;
    }
  }

  _nowInSeconds() {
    return Date.now() / 1000;
  }
}

class Result {
  constructor(responses) {
    this.responses = responses;
    this.firstResponse = this.responses[0];
  }

  json() {
    let promises = [];
    this.responses.forEach(response => {
      promises.push(
          response.then(response => response.json())
      );
    });

    return Promise.all(promises)
      .then(promises => {
        if (promises.length === 1) {
          return promises[0];
        }

        let result = [];
        for (let data of promises) {
          data.forEach(data => result.push(data));
        }

        return result;
      });
  }
}

class CallBuilder {
  constructor(method, path) {
    this.totalPages = null;
    this.currentPage = 1;
    this.method = method;
    this.basePath = path;
    this.token = null;
    this.body = null;
  }

  get path() {
    return `https://esi.evetech.net${this.basePath}${this.query}`;
  }

  get query() {
    return this.currentPage > 1 ? `?page=${this.currentPage}` : '';
  }

  incrementCurrentPage() {
    this.currentPage++;
  }

  setToken(token) {
    this.token = token;

    return this;
  }

  setBody(body) {
    this.body = body;

    return this;
  }
}

class Character extends CallBuilder {
  constructor(charID) {
    super(
        'GET',
        `/v4/characters/${charID}/`
    );
  }
}

class CharacterLocation extends CallBuilder {
  constructor(charID, token) {
    super(
        'GET',
        `/v2/characters/${charID}/location/`
    );
    this.token = token;
  }
}

class CharacterOnline extends CallBuilder {
  constructor(charID, token) {
    super(
        'GET',
        `/v3/characters/${charID}/online/`
    );
    this.token = token;
  }
}

class Corporation extends CallBuilder {
  constructor(corpID) {
    super(
        'GET',
        `/v4/corporations/${corpID}/`
    );
  }
}

class Alliance extends CallBuilder {
  constructor(id) {
    super(
        'GET',
        `/v3/alliances/${id}/`
    );
  }
}

class System extends CallBuilder {
  constructor(id) {
    super(
        'GET',
        `/v4/universe/systems/${id}/`
    );
  }
}

class Station extends CallBuilder {
  constructor(id) {
    super(
        'GET',
        `/v2/universe/stations/${id}/`
    );
  }
}

class Structure extends CallBuilder {
  constructor(id, token) {
    super(
        'POST',
        `/v2/universe/structures/${id}/`
    );
    this.token = token;
  }
}

class Factions extends CallBuilder {
  constructor() {
    super(
        'GET',
        `/v2/universe/factions/`
    );
  }
}

class UniverseNames extends CallBuilder {
  constructor(ids) {
    super(
        'POST',
        `/v3/universe/names/`
    );
    this.body = JSON.stringify(ids);
  }
}

class MarketOrders extends CallBuilder {
  constructor(regionID) {
    super(
        'GET',
        `/v1/markets/${regionID}/orders/`
    );
  }
}

module.exports = {
  Esi,
  CallBuilder,
  Character,
  CharacterLocation,
  CharacterOnline,
  Corporation,
  Alliance,
  System,
  Station,
  Structure,
  Factions,
  UniverseNames,
  MarketOrders
};