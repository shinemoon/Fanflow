async function buildHomePage(type = "up", cb) {
  console.log("认证成功，页面构建开始");
  // To load local store firstly
  chrome.storage.local.get({ userinfo: userInfo, msglist: [] }, function (r) {
    // Restore local list firstly , waiting for fetching
    console.log('Fill w/ local msgs/userInfo');
    updateUserInfo(r.userinfo);
    buildHtmlFromMessages(r.msglist);
    //curList = r.msglist;
    messageListUpdate(type, listLength, r.msglist);
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
        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          lastReadInd = (curList.length > 0) ? curList.length - 1 : 0;
          messageListUpdate("down", listLength, res.msglist);
        } else {
          lastReadInd = res.msglist.length;
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

        // Use CB  to bind all actions after loaded!
        cb();
      });
    }
  } else {
    // If no valid token, then creat auth html
    chrome.tabs.create({ url: "auth.html" });
  }
};


function buildHtmlFromMessages(messageList) {
  var $feed = $('#feed');
  $feed.empty();
  sortedList = remapMessage(messageList);
  sortedList.forEach(function (message) {
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
      var $img = $('<img>').addClass('content-img').attr('src', message.image).attr('largeurl', message.largeimage);
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
    curList = newlist.concat(curList);
    if (curList.length > limit)
      curList = curList.slice(0, limit);
  };

  if (direction == 'down') {
    curList = curList.concat(newlist);
    if (curList.length > limit)
      curList = curList.slice(Math.max(0, array.length - limit));
  };
}

function buildPopImg(thumb, large) {
  var $popframe = $('#popframe');
  // Create a container for the blur effect
  var $imgContainer = $('<div>').addClass('img-container');

  // Create image element with blur effect background
  var $img = $('<img class="popimg thumb">').attr('src', thumb);


  // Add both to frame
  $imgContainer.appendTo($popframe);
  $img.appendTo($imgContainer);

  const fullImg = new Image();
  fullImg.onload = () => {
    $img.fadeOut(300, function () {
      $(this).attr('src', large).fadeIn(800);
      $imgContainer.addClass('clean');
    });
  };
  fullImg.src = large;
  // And then need actions for scale and download
  // Resize button - open in new window

  $('.resize').click(function () {
    const imgUrl = $('.popimg').attr('src');
    window.open(imgUrl, '_blank');
  });

  // Download button
  $('.download').click(async function () {
    const imgUrl = $('.popimg').attr('src');
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = imgUrl.split('/').pop();
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  });


}