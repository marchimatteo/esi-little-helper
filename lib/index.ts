import fetch, {Headers, RequestInit} from 'node-fetch';

class Esi {
  private userAgent: string;
  private errorManager: ErrorManager;

  constructor(userAgent: string) {
    this.userAgent = userAgent;
    this.errorManager = new ErrorManager();
  }

  public request(props: RequestParameters): void {
    let {method, path, token = null, body = null} = props;
    if (this.errorManager.getErrorRemain() < 1) {
      throw new Error('No remaining error in the current window, call blocked');
    }

    let fetchProps: RequestInit = {};
    fetchProps.method = method;
    fetchProps.headers = {
      'Content-Type': 'application/json',
      'X-User-Agent': this.userAgent
    }
    if (token !== null) {
      fetchProps.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body !== null) {
      fetchProps.body = body;
    }
  }

  public paginatedRequest(): void {

  }
}

class ErrorManager {
  private limitRemain: number = 100;
  private limitReset: number = Date.now() + 60*1000;

  constructor() {
  }

  public getErrorRemain(): number {
    if (this.limitReset < (Date.now() - 1)) {
      this.reset();
    }

    return this.limitRemain;
  }

  public getErrorReset(): number {
    if (this.limitReset < (Date.now() - 1)) {
      this.reset();
    }

    return this.limitReset;
  }

  public flagError(headers: Headers | null = null) {
    if (headers !== null && headers.get('x-esi-error-limit-reset') !== null) {
      this.limitReset = Number(headers.get('x-esi-error-limit-reset'));
    }

    this.limitRemain -= 1;
  }

  private reset(): void {
    this.limitRemain = 100;
    this.limitReset = Date.now() + 60*1000;
  }
}

class RequestParameters {
  public method: string;
  public path: string;
  public token?: string | null;
  public body?: string | null;

  constructor(
      method: string,
      path: string,
      token: string | null = null,
      body: string | null = null
  ) {
    this.method = method;
    this.path = `https://esi.evetech.net${path}`;
    this.token = token;
    this.body = body;
  }
}

export { Esi };
