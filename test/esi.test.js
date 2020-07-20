const { Esi, CallBuilder } = require('../esi');

test('testing call builder', () => {
  let call = new CallBuilder('GET', '/v1/universe/ancestries/');
  expect(call.method).toBe('GET');
});

describe('Testing fetch', () => {
  beforeEach(() => {
    fetch.resetMocks()
  });

  test("successful call", async () => {
    fetch.mockResponseOnce(
        JSON.stringify({ something: 'some expected string'})
    );

    let call = new CallBuilder('GET', '/v1/universe/ancestries/');
    let esi = new Esi();
    let result = await esi.call(call);

    expect(await result.json()).toEqual({ something: 'some expected string'});
  });

  test("throw on network error", async () => {
    fetch.mockReject(() => Promise.reject());

    let call = new CallBuilder('GET', '/v1/universe/ancestries/');
    let esi = new Esi();

    await expect(esi.call(call)).rejects.toThrow();
  });

  test("throw on error limit received", async () => {
    fetch.mockResponseOnce(
        JSON.stringify({}),
        { status: 420, statusText: 'error limited yo'}
    );

    let call = new CallBuilder('GET', '/v1/universe/ancestries/');
    let esi = new Esi();

    await expect(esi.call(call)).rejects
      .toThrowError('Error 420 from ESI: error limited yo');
  });

  test("throw on not found error", async () => {
    fetch.mockResponseOnce(
        JSON.stringify({}),
        { status: 404, statusText: 'not found'}
    );

    let call = new CallBuilder('GET', '/v1/universe/ancestries/');
    let esi = new Esi();

    await expect(esi.call(call)).rejects
      .toThrowError('Error 404 from ESI: not found');
  });

  test("calls are blocked after 100 errors in 60 seconds", async () => {
    fetch.mockResponse(
        JSON.stringify({}),
        { status: 404, statusText: 'not found'}
    );

    let call = new CallBuilder('GET', '/v1/universe/ancestries/');
    let esi = new Esi();

    let responses = [];
    for (let i = 0; i <= 100; i++) {
      responses.push(esi.call(call));
    }

    try {
      await Promise.all(responses)
      .then();
    } catch(e) {}

    await expect(esi.call(call)).rejects
      .toThrowError('Error window broken');
  });

  test("calls are blocked after error limit error", async () => {
    fetch.mockResponseOnce(
        JSON.stringify({}),
        { status: 420, statusText: 'error limited yo'}
    );

    let call = new CallBuilder('GET', '/v1/universe/ancestries/');
    let esi = new Esi();
    try {
      await esi.call(call);
    } catch(e) {}

    await expect(esi.call(call)).rejects
    .toThrowError('Error window broken');
  });

  test("error limits are registered from headers", async () => {
    fetch.mockResponseOnce(
        JSON.stringify({}),
        {
          headers: {
            "x-esi-error-limit-reset": 40,
            "x-esi-error-limit-remain": 70
          }
        }
    );

    let call = new CallBuilder('GET', '/v1/universe/ancestries/');
    let esi = new Esi();
    let result = await esi.call(call);
    await result.json();

    await expect(esi.limitReset).toBe("40");
    await expect(esi.limitRemain).toBe("70");
  });
});