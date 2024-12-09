const OAuth1 = {
    generateNonce() {
      return Math.random().toString(36).substring(2);
    },
  
    generateTimestamp() {
      return Math.floor(Date.now() / 1000);
    },
  
    percentEncode(str) {
      return encodeURIComponent(str)
        .replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16));
    },
  
    createSignatureBase(method, url, params) {
      const sortedParams = Object.keys(params).sort().map(key => {
        return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
      }).join('&');
  
      return [
        method.toUpperCase(),
        this.percentEncode(url),
        this.percentEncode(sortedParams)
      ].join('&');
    },
  
    createSignature(baseString, consumerSecret, tokenSecret = '') {
      const signingKey = `${this.percentEncode(consumerSecret)}&${this.percentEncode(tokenSecret)}`;
      return CryptoJS.HmacSHA1(baseString, signingKey).toString(CryptoJS.enc.Base64);
    },
  
    buildAuthHeader(params) {
      const header = Object.keys(params).map(key => {
        return `${this.percentEncode(key)}="${this.percentEncode(params[key])}"`;
      }).join(', ');
  
      return `OAuth ${header}`;
    }
  };
const FANFOU_API_BASE = "http://fanfou.com/oauth";
const CONSUMER_KEY = "ce23ee7b25d7adc9eccb4c4741b197de";
const CONSUMER_SECRET = "de57b89fb6ead9652dcffbbd1207519f";

