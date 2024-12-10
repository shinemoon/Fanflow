const FANFOU_API_BASE = "http://api.fanfou.com";
const FANFOU_AUTH_BASE = "http://fanfou.com/oauth";

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


  buildAuthHeader(params) {
    const header = Object.keys(params).map(key => {
      return `${this.percentEncode(key)}="${this.percentEncode(params[key])}"`;
    }).join(', ');

    return `OAuth ${header}`;
  }
};
async function fetchRequestToken() {
  const url = `${FANFOU_AUTH_BASE}/request_token`;

  const params = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: OAuth1.generateTimestamp(),
    oauth_nonce: OAuth1.generateNonce(),
    oauth_version: "1.0"
  };


  // 生成签名
  const signature = generateOAuthSignature('GET', url, params, CONSUMER_SECRET);
  params.oauth_signature = signature;

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
  const url = `${FANFOU_AUTH_BASE}/access_token`;

  const params = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_token: oauthToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: OAuth1.generateTimestamp(),
    oauth_nonce: OAuth1.generateNonce(),
    oauth_version: "1.0",
    oauth_verifier: verifier
  };

  const signature = generateOAuthSignature('GET', url, params, CONSUMER_SECRET);
  params.oauth_signature = signature;

  const headers = { Authorization: OAuth1.buildAuthHeader(params) };

  try {
    const response = await fetch(url, { method: "GET", headers });
    const text = await response.text();
    const tokenData = new URLSearchParams(text);

    const accessToken = tokenData.get("oauth_token");
    const accessTokenSecret = tokenData.get("oauth_token_secret");

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

    // Parameter passing
    let fetchPar = new URLSearchParams({
      mode: 'default',
      format: 'json',
    });

    const signature = generateOAuthSignature('POST', url, params, CONSUMER_SECRET, oauthTokenSecret);
    params.oauth_signature = signature;

    const headers = {
      Authorization: OAuth1.buildAuthHeader(params),
      'Content-Type': 'application/json' //
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: fetchPar    });
    return response.ok;
  } catch (error) {
    console.log(error);
    return false;
  }
}

function clearToken() {
  chrome.storage.local.remove("fanfouToken", () => {
    if (chrome.runtime.lastError) {
      console.error("Error clearing token:", chrome.runtime.lastError);
    } else {
      console.log("Token cleared successfully.");
    }
  });
}

/**
 * 创建 OAuth 签名
 * @param {string} baseString - 签名基字符串
 * @param {string} consumerSecret - 应用的 Consumer Secret
 * @param {string} tokenSecret - 用户的 Token Secret，默认为空
 * @returns {string} 签名结果（Base64 编码）
 */
function createSignature(baseString, consumerSecret, tokenSecret = '') {
  // 签名密钥 = consumerSecret & tokenSecret（需编码）
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // 使用 CryptoJS 生成 HMAC-SHA1 签名并编码为 Base64
  const signature = CryptoJS.HmacSHA1(baseString, signingKey).toString(CryptoJS.enc.Base64);

  return signature;
}


/**
 * 创建签名基字符串
 * @param {string} httpMethod - 请求方法（GET 或 POST）
 * @param {string} baseUrl - 请求的基础 URL
 * @param {Object} params - 所有参与签名的参数
 * @returns {string} 签名基字符串
 */
function createBaseString(httpMethod, baseUrl, params) {
  // 按照参数名称字典序排序
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // 构造签名基字符串
  return `${httpMethod.toUpperCase()}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`;
}

/**
 * 生成 OAuth 签名的完整流程
 * @param {string} httpMethod - 请求方法（GET 或 POST）
 * @param {string} baseUrl - 请求的基础 URL
 * @param {Object} allParams - 所有请求参数（包括 QueryString 和 Body）
 * @param {string} consumerSecret - 应用的 Consumer Secret
 * @param {string} tokenSecret - 用户的 Token Secret，默认为空
 * @returns {string} OAuth 签名
 */
function generateOAuthSignature(httpMethod, baseUrl, allParams, consumerSecret, tokenSecret = '') {
  // 创建签名基字符串
  const baseString = createBaseString(httpMethod, baseUrl, allParams);
  console.log(baseString);

  // 创建签名
  return createSignature(baseString, consumerSecret, tokenSecret);
}

/**
 * 将对象转换为查询参数字符串
 * @param {Object} params - 参数对象
 * @returns {string} 查询字符串
 */
function buildQueryString(params) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}