import { Response } from 'node-fetch';
declare class Esi {
    private readonly userAgent;
    private errorManager;
    constructor(userAgent: string);
    request(props: RequestParameters): Promise<Response>;
    paginatedRequest(props: RequestParameters): Promise<Array<Promise<Response>>>;
}
interface RequestParameters {
    method: string;
    path: string;
    urlSearchParams?: URLSearchParams;
    token?: string;
    body?: string;
}
export { Esi };
