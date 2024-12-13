let oauthToken = null;
let oauthTokenSecret = null;

let debug = true;

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
  if (debug) {
    console.log("调试模式: 生成伪信息流 ");
    appendMessages(10);
  }

};

function generateRandomString(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function appendMessages(n) {
  var $feed = $('#feed');

  for (var i = 0; i < n; i++) {
    // 创建消息容器
    var $messageDiv = $('<div>').addClass('message');

    // 生成随机长度的内容字符串
    var contentLength = Math.floor(Math.random() * 140) + 1;
    var nickLength = Math.floor(Math.random() * 20) + 1;
    var contentText = generateRandomString(contentLength);
    var nickName =generateRandomString(nickLength);

    // 创建Meta容器并添加文本
    var $metaDiv= $('<div>').addClass('message-meta');
    $metaDiv.append($('<img>').addClass('msg-avator').prop("src","images/avator-demo.png"));
    $metaDiv.append($('<span>').addClass('msg-nickname').text(nickName));
    $metaDiv.append($('<span>').addClass('msg-time').text("xxx-xx-xx"));
    $metaDiv.append($('<span>').addClass('msg-source').text("via"));


    // 创建内容容器并添加文本
    var $contentDiv = $('<div>').addClass('content').text(contentText);

    // 以1/3的概率添加图片
    if (Math.random() < 1 / 3) {
      var $img = $('<img>').addClass('content-img').attr('src', 'images/demo.jpg');
      $contentDiv.append($img);
    }

    $messageDiv.append($metaDiv);
    $messageDiv.append($contentDiv);

    // 创建操作容器
    var $actionsDiv = $('<div>').addClass('actions');

    // 添加星标、引用和回复图标
    $actionsDiv.append($('<span>').addClass('icon-star'));
    $actionsDiv.append($('<span>').addClass('icon-quote1'));
    $actionsDiv.append($('<span>').addClass('icon-reply'));

    // 以1/3的概率添加链接图标
    if (Math.random() < 1 / 3) {
      $actionsDiv.append($('<span>').addClass('icon-link'));
    }

    $messageDiv.append($actionsDiv);
    $feed.append($messageDiv);
  }
}