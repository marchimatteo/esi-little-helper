# esi-little-helper

This module provides a simple way to execute calls to ESI, the EVE Online API, handling automatically the API error limits and pagination.  

*Disclaimer: this module has no built in throttling, so in case of pagination lots of request can get dispatched at the same time with a single call.*

---
### CallBuilder
An helper class to compose the parameters for the ESI call.
```javascript
let params = new CallBuilder(
    method,   // required (ex. 'GET')
    path,     // required (ex. '/v4/universe/systems/30000142/')
    token,    // optional, depending on the API endpoint
    body      // optional, depending on the API endpoint
);
```
### Esi
Execute the call, if pagination is detected it calls automatically all the pages, throw in case of API error, or in case the ESI object has broken the error limit and it's still withing the same error window.  
Returns a **Result** object.

Ideally a single instance of the Esi class should be used for all the calls, to better keep track of API errors and share the same error window information.
```javascript
let esi = new Esi();
result = esi.call(params);
```
### Result
Get the JSON of the API call, in case of pagination the bodies are merged together in a single JSON.
```javascript
result.json()
    .then(data => console.log(data))
    .catch(e => console.error(e));
```
Get the **Headers** object of the response, in case of paginated call returns the Headers object of the first response.
```javascript
result.headers()
    .then(data => console.log(data))
    .catch(e => console.error(e));
```
Get the **Response** object of the response, in case of paginated call returns the first response.
```javascript
result.response()
    .then(data => console.log(data))
    .catch(e => console.error(e));
```
---
## Example
First initialize the Esi class and create the specific parameter object containing the necessary properties, such as method and path. 
```javascript
let esi = new Esi();
let params = new CallBuilder(
    'GET',
    '/v4/universe/systems/30000142/'
);
```
Then execute the calling the Esi `call()` method passing to it the parameter object created previously.

The *call* method return a **Result** object, from which you can access the resulting json as soon as the response (or *all the responses*, in case of pagination) is resolved.
```javascript
esi.call(params).json()
  .then(data => console.log(data.name))
  .catch(e => console.error(e));

// -> Jita
```
