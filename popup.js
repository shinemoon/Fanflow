let oauthToken = null;
let oauthTokenSecret = null;

document.getElementById("login-btn").addEventListener("click", async () => {
  await fetchRequestToken();
  if (oauthToken) {
    const authUrl = `http://fanfou.com/oauth/authorize?oauth_token=${oauthToken}&oauth_callback=oob`;
    const iframe = document.getElementById("auth-iframe");
    iframe.src = authUrl;
    iframe.style.display = "block";

    // 显示 PIN 输入框
    document.getElementById("pin-section").style.display = "block";
  }
});

document.getElementById("submit-pin-btn").addEventListener("click", async () => {
  const pin = document.getElementById("pin-input").value;
  if (pin) {
    await fetchAccessToken(pin);
  } else {
    alert("Please enter the PIN provided by Fanfou!");
  }
});

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

    console.log("Access Token:", accessToken);
  } catch (error) {
    console.error("Failed to fetch access token:", error);
  }
}
