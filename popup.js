let validToken = null;
let curList = null;

// Default Stub
let userInfo = {
  id: "_",
  name: "NickName",
  screen_name: "NickName",
  url: "https://fanfou.com",
  profile_image_url: "images/avator.png",
  profile_image_url_large: "images/avator.png",
  followers_count: 0,
  friends_count: 0,
  description: "有目的地生活"
};

// Page Init


document.addEventListener("DOMContentLoaded", async () => {
  // Build dummy page firstly
  buildPage(null);
  const token = await getStoredToken();
  if (token) {
    const isValid = await validateToken(token.oauthToken, token.oauthTokenSecret);
    if (isValid) {
      // Global assignment on token.
      validToken = {
        oauthToken: token.oauthToken,
        oauthTokenSecret: token.oauthTokenSecret
      }
      chrome.storage.local.set({ userinfo: isValid }, function () {
        console.log("Local Save users");
      });
      buildPage(isValid);
      return;
    }
  }
  // If no valid token, then creat auth html
  chrome.tabs.create({ url: "auth.html" });
});


async function buildPage(validUser) {
  console.log("认证成功，页面构建开始");
  // To load local store firstly
  if (validUser == null) {
    chrome.storage.local.get({ userinfo: userInfo, msglist: [] }, function (r) {
      // Restore local list firstly , waiting for fetching
      console.log('Fill w/ local msgs/userInfo');
      updateUserInfo(r.userinfo);
      buildHtmlFromMessages(r.msglist);
      curList = r.msglist;
    })
  } else {
    updateUserInfo(validUser);
    console.log("真实模式: 在线获取信息流, 但是原则上仅pullin 新的消息");
    var since_id = null;
    var max_id = null;
    if (curList.length > 0) {
      since_id = curList[0].id;
    }
    result = getTimeline(since_id, max_id, function (res) {
      console.log("获得"+res.msglist.length+"条新消息")
      //let messages = curList.concat(remapMessage(res.msglist));
      let messages = remapMessage(res.msglist).concat(curList);
      // Construct the full list
      // Store for local save
      chrome.storage.local.set({ msglist: messages }, function () {
        console.log("Local Save Msgs");
      });
      buildHtmlFromMessages(messages);
    });
  }
};



function updateUserInfo(usr) {
  $('#user-avator img').prop("src", usr.profile_image_url);
  $('#user-name').text(usr.screen_name);
  $('#user-description').text(usr.description);
  $('#user-follower .value').text(String(usr.followers_count));
  $('#user-following .value').text(String(usr.friends_count));
}

function buildHtmlFromMessages(messageList) {
  var $feed = $('#feed');
  $feed.empty();
  messageList.forEach(function (message) {
    // 创建消息容器
    var $messageDiv = $('<div>').addClass('message');

    // 创建Meta容器
    var $metaDiv = $('<div>').addClass('message-meta');
    $metaDiv.append($('<img>').addClass('msg-avator').prop("src", message.avator));
    $metaDiv.append($('<span>').addClass('msg-nickname').text(message.nickname));
    $metaDiv.append($('<span>').addClass('msg-time').text(message.time));
    $metaDiv.append($('<span>').addClass('msg-source').text(message.source));

    // 创建内容容器
    var $contentDiv = $('<div>').addClass('content').text(message.content);
    if (message.hasImage) {
      var $img = $('<img>').addClass('content-img').attr('src', message.image);
      $contentDiv.append($img);
    }

    // 创建操作容器
    var $actionsDiv = $('<div>').addClass('actions');
    $actionsDiv.append($('<span>').addClass('icon-star'));
    $actionsDiv.append($('<span>').addClass('icon-quote1'));
    $actionsDiv.append($('<span>').addClass('icon-reply'));
    if (message.hasLinkIcon) {
      $actionsDiv.append($('<span>').addClass('icon-link'));
    }

    // 拼装消息HTML
    $messageDiv.append($metaDiv);
    $messageDiv.append($contentDiv);
    $messageDiv.append($actionsDiv);

    // 添加到页面
    $feed.append($messageDiv);
  });
}
