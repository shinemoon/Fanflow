const FANFOU_API_BASE = "http://fanfou.com/oauth";
const CONSUMER_KEY = "ce23ee7b25d7adc9eccb4c4741b197de";
const CONSUMER_SECRET = "de57b89fb6ead9652dcffbbd1207519f";


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
async function fetchRequestToken() {
  const url = `${FANFOU_API_BASE}/request_token`;

  const params = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: OAuth1.generateTimestamp(),
    oauth_nonce: OAuth1.generateNonce(),
    oauth_version: "1.0"
  };

  const baseString = OAuth1.createSignatureBase("GET", url, params);
  params.oauth_signature = OAuth1.createSignature(baseString, CONSUMER_SECRET);

  const headers = { Authorization: OAuth1.buildAuthHeader(params) };

  try {
    const response = await fetch(url, { method: "GET", headers });
    const text = await response.text();
    const tokenData = new URLSearchParams(text);

    oauthToken = tokenData.get("oauth_token");
    oauthTokenSecret = tokenData.get("oauth_token_secret");

    console.log("Request Token:", oauthToken);
  } catch (error) {
    console.error("Failed to fetch request token:", error);
  }
}

async function fetchAccessToken(verifier) {
  const url = `${FANFOU_API_BASE}/access_token`;

  const params = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_token: oauthToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: OAuth1.generateTimestamp(),
    oauth_nonce: OAuth1.generateNonce(),
    oauth_version: "1.0",
    oauth_verifier: verifier
  };

  const baseString = OAuth1.createSignatureBase("GET", url, params);
  params.oauth_signature = OAuth1.createSignature(baseString, CONSUMER_SECRET, oauthTokenSecret);

  const headers = { Authorization: OAuth1.buildAuthHeader(params) };

  try {
    const response = await fetch(url, { method: "GET", headers });
    const text = await response.text();
    const tokenData = new URLSearchParams(text);

    const accessToken = tokenData.get("oauth_token");
    const accessTokenSecret = tokenData.get("oauth_token_secret");

    document.getElementById("auth-section").style.display = "none";
    document.getElementById("auth-iframe").style.display = "none";
    document.getElementById("pin-section").style.display = "none";
    document.getElementById("result-section").style.display = "block";

    document.getElementById("access-token").textContent = accessToken;
    document.getElementById("access-token-secret").textContent = accessTokenSecret;

    const tokenGot = {
      oauthToken: accessToken,
      oauthTokenSecret: accessTokenSecret
    };
    console.log("Access Token:", tokenGot);
    await storeToken(tokenGot);

  } catch (error) {
    console.error("Failed to fetch access token:", error);
  }

}

async function storeToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ fanfouToken: token }, resolve);
  });
}

async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("fanfouToken", (result) => {
      resolve(result.fanfouToken || null);
    });
  });
}


async function validateToken(oauthToken, oauthTokenSecret) {
  try {
    const url = `${FANFOU_API_BASE}/account/verify_credentials.json`;
    const params = {
      oauth_consumer_key: CONSUMER_KEY,
      oauth_token: oauthToken,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: OAuth1.generateTimestamp(),
      oauth_nonce: OAuth1.generateNonce(),
      oauth_version: "1.0"
    };

    const baseString = OAuth1.createSignatureBase("GET", url, params);
    params.oauth_signature = OAuth1.createSignature(baseString, CONSUMER_SECRET, oauthTokenSecret);

    const headers = { Authorization: OAuth1.buildAuthHeader(params) };
    const response = await fetch(url, { method: "GET", headers });

    return response.ok;
  } catch (error) {
    return false;
  }
}