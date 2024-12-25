let validToken = null;


// local list max as 100 msb
let curList = null;
let listLength = 100;

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
  buildHomePage();

  // bindClick
  bindClickActions();
});


async function buildHomePage() {
  console.log("认证成功，页面构建开始");
  // To load local store firstly
  chrome.storage.local.get({ userinfo: userInfo, msglist: [] }, function (r) {
    // Restore local list firstly , waiting for fetching
    console.log('Fill w/ local msgs/userInfo');
    updateUserInfo(r.userinfo);
    buildHtmlFromMessages(r.msglist);
    //curList = r.msglist;
    messageListUpdate('over', listLength, r.msglist);
  })
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
      updateUserInfo(isValid);
      console.log("真实模式: 在线获取信息流, 但是原则上仅pullin 新的消息");
      var since_id = null;
      var max_id = null;
      if (curList.length > 0) {
        since_id = curList[0].id;
      }
      result = getTimeline(since_id, max_id, function (res) {
        console.log("获得" + res.msglist.length + "条新消息")
        var lastReadInd = 0;
        //let messages = curList.concat(remapMessage(res.msglist));
        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          lastReadInd = (curList.length > 0) ? curList.length - 1 : 0;
          //curList = curList.concat(remapMessage(res.msglist));
          messageListUpdate("down", listLength, res.msglist);
        } else {
          lastReadInd = res.msglist.length;
          //curList = remapMessage(res.msglist).concat(curList);
          messageListUpdate("up", listLength, res.msglist);
        }
        // Construct the full list
        // Store for local save
        chrome.storage.local.set({ msglist: curList }, function () {
          console.log("Local Save Msgs");
        });
        buildHtmlFromMessages(curList);
        // To mark the 'last read' class & also unread
        $('.unread').removeClass('unread');
        $('div.message').each(function (index) {
          if (max_id != null) {
            //Down, i.e. all item after mark 'unread'
            //Up, i.e. all item before mark 'unread'
            if (index > lastReadInd) {
              $(this).addClass('unread');
            }
          } else {
            //Up, i.e. all item before mark 'unread'
            if (index < lastReadInd) {
              $(this).addClass('unread');
            }
          }
        });

        $('.last-read').removeClass('last-read');
        $('div.message').eq(lastReadInd).addClass('last-read');
      });
    }
  } else {
    // If no valid token, then creat auth html
    chrome.tabs.create({ url: "auth.html" });
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

// Update the curList
// up - fetch newer
// down -fetch older
// over - replace
function messageListUpdate(direction = 'up', limit = 100, newlist) {
  if (direction == 'over') {
    curList = newlist;
  };
  if (direction == 'up') {
    curList = remapMessage(newlist).concat(curList);
    if (curList.length > limit)
      curList = curList.slice(0, limit);
  };
  if (direction == 'down') {
    curList = curList.concat(remapMessage(newlist));
    if (curList.length > limit)
      curList = curList.slice(Math.max(0, array.length - limit));
  };
}

function bindClickActions() {
  //For Timeline
  $('.tab').click(function () {
    $('.tab.active').removeClass('active');
    $(this).addClass('active');
    if ($(this).prop('id') == 'home') {
      console.log("home clicked");
      buildHomePage(true);
    }
  });


  // For img
  $('.content-img').click(function(){

  });

}