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

  // If no valid token, then creat auth html
//  chrome.tabs.create({ url: "auth.html" });

});