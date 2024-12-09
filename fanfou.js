async function showUserInfo(oauthToken, oauthTokenSecret) {
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

    try {
        const response = await fetch(url, { method: "GET", headers });
        const data = await response.json();
        console.log(data);

        document.getElementById("auth-section").style.display = "none";
        document.getElementById("success-section").style.display = "none";
        document.getElementById("user-info").style.display = "block";

        document.getElementById("username").textContent = data.id;
        document.getElementById("nickname").textContent = data.screen_name;
    } catch (error) {
        console.error("Failed to fetch user info:", error);
    }
}
