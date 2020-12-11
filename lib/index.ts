import fetch, {Headers, RequestInit, Response} from 'node-fetch';

class Esi {
  private readonly userAgent: string;
  private errorManager: ErrorManager;

  constructor(userAgent: string) {
    this.userAgent = userAgent;
    this.errorManager = new ErrorManager();
  }

  public async request(props: RequestParameters): Promise<Response> {
    let {method, path, urlSearchParams = null, token = null, body = null} = props;
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

    let query = '';
    if (urlSearchParams !== null) {
      query = `?${urlSearchParams.toString()}`;
    }

    let response;
    try {
      response = await fetch(`https://esi.evetech.net${path}${query}`, fetchProps);
    } catch (e) {
      this.errorManager.flagError();
      throw new Error(e);
    }
    if (!response.ok) {
      this.errorManager.flagError(response.headers);
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  public async paginatedRequest(
      props: RequestParameters
  ): Promise<Array<Promise<Response>>> {
    let firstResponse = await this.request(props);
    let pages = 1;
    let headerPages = firstResponse.headers.get('x-pages');
    if (headerPages !== null) {
      pages = Number(headerPages);
    }

    let responseStack: Array<Promise<Response>> = [
        new Promise(() => firstResponse)
    ];
    for (let i = 2; i <= pages; i++) {
      let urlSearchParams = props.urlSearchParams ?? new URLSearchParams();
      urlSearchParams.set('page', String(i));
      let newProps = {...props};
      newProps.urlSearchParams = urlSearchParams;
      responseStack.push(this.request(newProps));
    }

    return responseStack;
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

interface RequestParameters {
  method: string;
  path: string;
  urlSearchParams?: URLSearchParams;
  token?: string;
  body?: string;
}

export { Esi };
