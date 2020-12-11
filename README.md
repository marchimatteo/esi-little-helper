# esi-little-helper

This module provides a simple way to execute calls towards ESI, the EVE Online API, handling automatically API error limits and pagination.

It's built on top of the javascript's Fetch API, so for more details on the returned **Response** and **Headers** objects please refer to the Fetch documentation. 

---
### Esi
Execute the call using the Esi's `request` method, providing an object with the following parameters:
- method: the method of the request, ex. 'GET'
- path: the path of the request, excluding the base uri, ex. '/v1/alliances/'
- urlSearchParams (optional): a URLSearchParams instance, use it if you need to provide query parameters
- token (optional): the access token in case you need to make an authenticated request
- body (optional): in case you need to submit the body
- throws (optional, default to true): if the request should throw in case of error.
 
Returns a Promise with the **Response** object of the Fetch API. 

Ideally a single instance of the Esi class should be used for all the calls, to better keep track of API errors and share the same error window information.
```javascript
let esi = new Esi('my user agent');
let response = await esi.request({
  method: 'GET',
  path: '/v1/alliances/'
});
```

If you know the endpoint you are going to hit support pagination, you can use instead the `paginatedRequest`, that will return a Promise that will resolve to an array of responses.
```javascript
let esi = new Esi('my user agent');
let pendingResponses = await esi.paginatedRequest({
  method: 'GET',
  path: '/v1/alliances/'
});

for (let pendingResponse of pendingResponses) {
  let response = await pendingResponse;
  // do something with the response
}
```
### Response
Get the JSON of the API call.
```javascript
response.json()
    .then(data => console.log(data))
    .catch(e => console.error(e));
```
Get the **Headers** object of the response.
```javascript
console.log(response.headers());
```
