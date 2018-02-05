'use strict';

const uuid = require('uuid')
const https = require('https')
const qs = require('querystring')
const { hmacsign, rfc3986 } = require('oauth-sign')

module.exports = class T {
  constructor(params) {
    this.hostname = 'api.twitter.com'
    this.ver = '1.1'

    const ENV = process.env
    let accessToken = params.accessToken || ENV['T_ACCESS_TOKEN']
    let accessSecret = params.accessSecret  || ENV['T_ACCESS_SECRET']
    let consumerKey = params.consumerKey  || ENV['T_CONSUMER_KEY']
    let consumerSecret = params.consumerSecret || ENV['T_CONSUMER_SECRET']

    this.oauth = {
      accessToken: accessToken,
      accessSecret: accessSecret,
      consumerKey: consumerKey,
      consumerSecret: consumerSecret
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
      .map((o) => `${o}="${rfc3986(oauth[o])}"`)
      .join(', ')
  }

  tweet(status, callback) {
    this.post('statuses/update.json', { status: status }, callback)
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

    let postBody = qs.stringify(params)
      .replace(/!/g,'%21')
      .replace(/\*/g,'%2A')
      .replace(/\(/g,'%28')
      .replace(/\)/g,'%29')
      .replace(/'/g,'%27')

    req.on('error', (e) => callback(e))
    req.write(postBody)
    req.end();

  }
}
