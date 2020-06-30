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
  async call(callProps) {
    if (this._isErrorWindowBroken()) {
      throw new Error('Error window broken')
    }

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
          throw new Error(`Error ${status} from ESI: ${statusText}`);
        }

        let mustIncrementError = true;
        if (this._hasErrorLimitHeaders(headers)) {
          this._ingestErrorLimitsFromHeaders(headers);
          mustIncrementError = false;
        }

        if (!response.ok) {
          this._flagError(mustIncrementError);

          throw new Error(`Error ${status} from ESI: ${statusText}`);
        }

        return response;
      })
      .then(data => {
        return data;
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

class CallBuilder {
  constructor(method, path) {
    this.method = method;
    this.path = `https://esi.evetech.net${path}`;
    this.token = null;
    this.body = null;
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
  UniverseNames
};