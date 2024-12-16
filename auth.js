let oauthToken = null;
let oauthTokenSecret = null;

// Page Init


document.addEventListener("DOMContentLoaded", async () => {
  // Validate
  const token = await getStoredToken();
  if (token) {
    const isValid = await validateToken(token.oauthToken, token.oauthTokenSecret);
    if (isValid) {
      return;
    }
  }
  // Request 
  await fetchRequestToken();
  if (oauthToken) {
    const authUrl = `http://fanfou.com/oauth/authorize?oauth_token=${oauthToken}&oauth_callback=oob`;
    const iframe = document.getElementById("auth-iframe");
    iframe.src = authUrl;
    iframe.style.display = "block";

    iframe.onload = () => {
      iframe.contentWindow.postMessage({ type: "injectCSS", css: "body { background-color: lightblue; }" }, "*");
    };

    // 在 iframe 内的页面中监听消息
    window.addEventListener("message", (event) => {
      console.log(event);
      if (event.data.type === "injectCSS") {
        const style = document.createElement("style");
        style.textContent = event.data.css;
        document.head.appendChild(style);
      }
    });

    // 显示 PIN 输入框
    document.getElementById("pin-section").style.display = "block";
  }
});

//Submit
document.getElementById("submit-pin-btn").addEventListener("click", async () => {
  const pin = document.getElementById("pin-input").value;
  if (pin) {
    await fetchAccessToken(pin);
    /* 
        //Handle those 'element relevant' items from this function
    */

    const gotToken = await getStoredToken();

    document.getElementById("auth-iframe").style.display = "none";
    document.getElementById("pin-section").style.display = "none";
    //显示结果，倒计时关闭
    startCountdown()

  } else {
    alert("Please enter the PIN provided by Fanfou!");
  }
});

function startCountdown() {
  const resultSection = document.getElementById("result-section");
  const countdownMessage = document.getElementById("countdown-message");

  // 显示倒计时区域
  resultSection.style.display = "block";

  let seconds = 5; // 倒计时时间
  countdownMessage.textContent = `验证成功，即将关闭窗口（${seconds}秒）`;

  const timer = setInterval(() => {
    seconds--;
    countdownMessage.textContent = `验证成功，即将关闭窗口（${seconds}秒）`;

    if (seconds <= 0) {
      clearInterval(timer); // 停止计时器
      window.close(); // 关闭窗口
    }
  }, 1000); // 每隔1秒更新一次
}

