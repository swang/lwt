'use strict';

const uuid = require('node-uuid')
const https = require('https')
const qs = require('querystring')
const { hmacsign, rfc3986 } = require('oauth-sign')

module.exports = class T {
  constructor(params) {
    this.hostname = 'api.twitter.com'
    this.ver = '1.1'

    let { accessToken, accessSecret, consumerKey, consumerSecret } = params

    this.oauth = {
      accessToken,
      accessSecret,
      consumerKey,
      consumerSecret
    }
  }

  sign() {
    return {
      oauth_consumer_key: this.oauth.consumerKey,
      oauth_timestamp: (~~(+new Date()/1000)).toString(),
      oauth_nonce: uuid().replace(/-/g, ''),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_version: '1.0',
      oauth_token: this.oauth.accessToken
    }
  }

  hmac(method, url, paramsAndAuth) {
    return hmacsign(
      method.toUpperCase(),
      url,
      paramsAndAuth,
      this.oauth.consumerSecret,
      this.oauth.accessSecret
    )
  }

  oauthHeader(oauth) {
    return 'OAuth ' + Object.keys(oauth)
      .map((o) => o + '=' + '"' + rfc3986(oauth[o]) + '"')
      .join(', ')
  }

  tweet(status, callback) {
    this.post('statuses/update.json', { status }, callback)
  }

  get(url, params, callback) {
    this.request('GET', url, params, callback)
  }

  post(url, params, callback) {
    this.request('POST', url, params, callback)
  }

  request(method, url, params, callback) {
    method = method.toUpperCase()
    url += !url.endsWith('.json') ? '.json' : ''

    let oauthSign = this.sign()
    let paramsAndAuth = Object.assign({}, params, oauthSign)

    let hmac = this.hmac(
      method,
      `https://${this.hostname}/${this.ver}/${url}`,
      paramsAndAuth
    )
    oauthSign.oauth_signature = hmac

    let query = (method === 'GET' ? `?${qs.stringify(params)}` : '')

    let headers = {
      Authorization: this.oauthHeader(oauthSign)
    }

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    let opts = {
      method,
      port: 443,
      hostname: 'api.twitter.com',
      path: `/${this.ver}/${url}${query}`,
      headers
    }

    let req = https.request(opts, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try { body = JSON.parse(body) } catch (e) {}
        callback(null, body)
      })
    })

    req.on('error', (e) => callback(e))
    req.write(qs.stringify(params))
    req.end();
  }
}