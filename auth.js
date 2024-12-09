let oauthToken = null;
let oauthTokenSecret = null;

// Page Init


document.addEventListener("DOMContentLoaded", async () => {
  const token = await getStoredToken();
  if (token) {
    const isValid = await validateToken(token.oauthToken, token.oauthTokenSecret);
    if (isValid) {
      showUserInfo(token.oauthToken, token.oauthTokenSecret);
      return;
    }
  }
  document.getElementById("auth-section").style.display = "block";
});

//Token Relevant

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

