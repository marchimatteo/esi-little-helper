# esi-little-helper

First initialize the Esi class and create the specific call object containing the necessary properties. 
```javascript
let esi = new Esi();
let systemCall = new System(30000142);
```
Then execute the calling the Esi `call()` method passing to it the call object created previously.

The method return a Promise that will return itself a Fetch Response object upon success, all the errors checks are done by the module.

In order to get the data out from the Response's Body you'll have to call the built-in method `json()`, which will return another promise.

For full details on the promise chain please refer to the Fetch API documentation on MDN web docs. 
```javascript
esi.call(systemCall)
    .then(response => response.json())
    .then(data => console.log(data.name))
    .catch(e => console.error(e));

// -> Jita
```
If you want to avoid the promise chain, you can pass a callback to the `call()` function.
```javascript
esi.call(systemCall, data => console.log(data.name))
  .catch(e => console.error(e));

// -> Jita
```

If you need the headers, you can access the Fetch Headers object directly from the Response.
```javascript
esi.call(systemCall)
  .then(response => console.log(response.headers.get('content-length')))
  .catch(e => console.error(e));

// -> 988
```
The `call()` method doesn't handle automatically pagination, if you want to request also all the pages related to the first call you can rely on the `paginatedCall()` method.
```javascript
let metropolisOrders = new MarketOrders(10000042);


esi.paginatedCall(metropolisOrders)
  .then(responses => {
    responses.forEach(response => {
      response.json()
        .then(data => console.log(data));
    })
  });
```