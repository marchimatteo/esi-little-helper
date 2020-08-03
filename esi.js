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
   * @return {Result}
   * @throws {Error} When the call fail or the error window is broken.
   */
  call(callProps) {
    let responses = this._fetch(callProps);

    return new Result(responses);
  }

  _fetch(callProps, paginating = false) {
    if (this._isErrorWindowBroken()) {
      return Promise.reject(new Error('Error window broken'));
    }

    let { method, path, token = null, body = null} = callProps;

    let fetchParams = {};
    fetchParams.method = method;
    fetchParams.headers = {
      'Content-Type': 'application/json',
      'X-User-Agent': 'esi-little-helper'
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
          throw new Error(`ESI ${status} - ${statusText}`);
        }

        let mustIncrementError = true;
        if (this._hasErrorLimitHeaders(headers)) {
          this._ingestErrorLimitsFromHeaders(headers);
          mustIncrementError = false;
        }

        if (!response.ok) {
          this._flagError(mustIncrementError);
          throw new Error(`ESI ${status} - ${statusText}`);
        }

        // When _fetch is paginating it means it's been called within _fetch,
        // in that case we return a single response and not an array of
        // responses.
        if (paginating) {
          return response;
        }

        let responses = [response];

        // Pagination
        if (callProps.totalPages === null) {
          let pages = response.headers.get('x-pages');
          pages = pages === null ? 1 : Number(pages);
          callProps.totalPages = pages;

          if (pages > 1) {
            let oldPath = callProps.path;
            let newPath = page => `${oldPath}?page=${page}`;
            for (let page = 2; page <= pages; page++) {
              let paginatedCallProps = {...callProps};
              paginatedCallProps.path = newPath(page);
              responses.push(this._fetch(paginatedCallProps, true));
            }
          }
        }

        return responses;
      })
      .catch(e => {
        throw new Error(e)
      });
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
    this._responses = responses;
  }

  /**
   * Return the body of the all the Responses, in json format.
   *
   * @returns {Promise<any>}
   */
  json() {
    let promises = [];
    return this._responses
      .then(responses => {
        // The first response is a special case because its Promise is already
        // fulfilled.
        let firstResponse = responses.shift();
        promises.push(firstResponse.json());

        responses.forEach(response => {
          promises.push(
              response.then(data => data.json())
          );
        })

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
      });
  }

  /**
   * Returns the Headers object of the first response.
   *
   * @returns {Promise<Headers>}
   */
  headers() {
    return this._responses
      .then(responses => responses[0].headers);
  }

  /**
   * Return the first Response object.
   *
   * @returns {Promise<Response>}
   */
  response() {
    return this._responses
      .then(responses => responses[0]);
  }

  /**
   * @returns {Promise<boolean>}
   */
  hasMultiplePages() {
    return this._responses
      .then(responses => responses.length > 1);
  }
}

class CallBuilder {
  constructor(method, path, token = null, body = null) {
    this.totalPages = null;
    this.method = method;
    this.path = `https://esi.evetech.net${path}`;
    this.token = token;
    this.body = body;
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

module.exports = {
  Esi,
  CallBuilder,
};