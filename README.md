# light-weight twitter
lwt is a light-weight twitter api library written in es2015 for node
verisons >= 4.0.0. rather than bring in an entire http library like `request`,
it instead just uses the `oauth-sign` portion of `request` and a uuid
generator library, `node-uuid` to make calls to twitter's api.

# install

```
npm install lwt
```

# examples

```js
'use strict';
let params = {
  accessToken: 'ACCESS_TOKEN',
  accessSecret: 'ACCESS_SECRET',
  consumerKey: 'CONSUMER_KEY',
  consumerSecret: 'CONSUMER_SECRET'
}

let t = new T(params)
t.get('followers/list', {}, function(err, data) {
  // print the first page of followers for the current oauthed user
  console.log(data.users.map((d) => `${d.name}: ${d.screen_name}` ))
})
```

# license
ISC

# author
Shuan Wang (shuanwang@gmail.com)
