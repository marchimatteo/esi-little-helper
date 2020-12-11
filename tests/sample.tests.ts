import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();

import fetchMock from "jest-fetch-mock";
import { Esi } from '../lib';

describe('Request', function() {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('good one', async () => {
    let objToExpect = { something: 'something' };
    fetchMock.mockResponse(JSON.stringify(objToExpect));

    let esi = new Esi('ciao');
    let response = await esi.request({
      method: 'GET',
      path: '/v1/universe/ancestries/',
    });

    expect(await response.json()).toEqual(objToExpect);
  });

  it('blocked on broken error window', async () => {
    fetchMock.mockResponse(JSON.stringify({}), {
      status: 500,
    });

    let esi = new Esi('ciao');
    for (let i = 0; i < 100; i++) {
      try {
        await esi.request({
          method: 'GET',
          path: '/v1/universe/ancestries/',
        });
      } catch (e) {}
    }

    await expect(esi.request({
      method: 'GET',
      path: '/v1/universe/ancestries/',
    })).rejects.toEqual(
        new Error('No remaining error in the current window, call blocked')
    );
  });

  it('good paginated', async () => {
    let pages = 30;
    fetchMock.mockResponse(JSON.stringify({}), {
      headers: {'x-pages': String(pages)},
    });

    let esi = new Esi('ciao');
    let responses = await esi.paginatedRequest({
      method: 'GET',
      path: '/v1/universe/ancestries/',
    });

    expect(responses.length).toEqual(pages);
  });
});
