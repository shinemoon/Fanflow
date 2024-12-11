let oauthToken = null;
let oauthTokenSecret = null;

// Page Init


document.addEventListener("DOMContentLoaded", async () => {
  const token = await getStoredToken();
  if (token) {
    const isValid = await validateToken(token.oauthToken, token.oauthTokenSecret);
    if (isValid) {
      //Show UserInfo
      buildPage(isValid);
      return;
    }
  }
  // If no valid token, then creat auth html
  chrome.tabs.create({ url: "auth.html" });
});


function buildPage(validUser) {
  console.log("认证成功，页面构建开始");
  // Example JavaScript for adding messages dynamically
  document.getElementById('post-span').addEventListener('click', () => {
    console.log('Post button clicked'); // Debug log
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    console.log('Message input value:', message); // Debug log
    if (message) {
      const feed = document.getElementById('feed');
      console.log('Adding message to feed'); // Debug log
      const newMessage = document.createElement('div');
      newMessage.className = 'message';
      newMessage.innerHTML = `
                    <div class="content">${message}</div>
                    <div class="actions">
                        <button class="like">Like</button>
                        <button class="reply">Reply</button>
                    </div>
                `;
      feed.prepend(newMessage);
      input.value = '';
      console.log('Message added successfully'); // Debug log
    } else {
      console.log('No message entered'); // Debug log
    }
  });

};