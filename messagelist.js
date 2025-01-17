async function buildHomePage(type = "up", cb) {
  console.log("认证成功，页面构建开始");
  // To load local store firstly
  chrome.storage.local.get({ userinfo: userInfo, msglist: [] }, function (r) {
    // Restore local list firstly , waiting for fetching
    updateUserInfo(r.userinfo);
    //    buildHtmlFromMessages(messageList = r.msglist, showInd=0, lastReadInd=0, max_id=null, since_id=null, cb = cb);
    //curList = r.msglist;
    //messageListUpdate(type, listLength, r.msglist);
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
        //console.log("Local Save users");
      });
      // Need to check if there is existed list items ?
      updateUserInfo(isValid);
      var since_id = null;
      var max_id = null;

      if (curList.length > 0) {
        if (type == "up") {
          // Use existed ones
          // Then directly show remained existed messages
          since_id = curList[listShowInd].id;
          if (listShowInd > 0) {
            console.log("原有缓存队列: 获取剩下的从" + listShowInd + "开始的元素");
            buildHtmlFromMessages(messageList = curList, showInd = (showInd > listShowLength - 1) ? (showInd - listShowLength + 1) : 0, max_id = null, since_id = since_id, lastReadInd = listShowInd, cb = cb);
            return;
          } else {
            // or if that's first message, then pull in 
            console.log("超出缓存队列: 在线获取信息流,pullin更新的消息");
          }
        }
        if (type == "down") {
          let max_id_ind = (listShowInd + listShowLength - 1 < curList.length) ? listShowInd + listShowLength - 1 : curList.length - 1;
          max_id = curList[max_id_ind].id;

          if (listShowInd < curList.length - 1) {
            console.log("原有缓存队列: 获取剩下的" + (curList.length - listShowInd - 1) + "元素");
            buildHtmlFromMessages(messageList = curList, showInd = max_id_ind, max_id = max_id, lastReadInd = max_id_ind % listShowLength, cb = cb);
            return;
          } else {
            console.log("超出缓存队列: 在线获取信息流,pullin 更旧的消息");
          }
        }
      }
      //      $('.ajax').addClass('loading');
      NProgress.start();
      result = getTimeline(since_id, max_id, function (res) {
        console.log("获得" + res.msglist.length + "条新消息")
        var lastReadInd = 0;
        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          messageListUpdate("down", listLength, res.msglist);
          lastReadInd = curList.length - res.msglist.length - 1;
        } else {
          messageListUpdate("up", listLength, res.msglist);
          lastReadInd = res.msglist.length;
        }
        // Construct the full list
        // Store for local save
        chrome.storage.local.set({ msglist: curList }, function () {
          console.log("Local Save Msgs");
        });
        // Need to handle the index of showing
        buildHtmlFromMessages(messageList = curList, showInd = listShowInd, lastReadInd = lastReadInd, max_id = max_id, since_id = since_id, cb = cb);
      });
    }
  } else {
    // If no valid token, then creat auth html
    chrome.tabs.create({ url: "auth.html" });
  }
};


function buildHtmlFromMessages(messageList, showInd = 0, lastReadInd = 0, max_id = null, since_id = null, cb = function () { }) {
  var $feed = $('#feed');
  $feed.empty();
  // Update current pointer to the showing window in messages
  listShowInd = showInd;
  sortedList = remapMessage(messageList).slice(showInd, listShowLength + showInd);
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
  reloc(true, function () {
    // Use CB  to bind all actions after loaded!
    cb();
    //    $('.ajax').removeClass('loading');
    NProgress.done();
  });
  listShowInd = listShowInd + $("#feed .message").length;
  pagline.animate(listShowInd / curList.length);
  console.log('listShowInd: ' + listShowInd + ' / ' + curList.length);
}

// Update the curList
// up - fetch newer
// down -fetch older
// over - replace
function messageListUpdate(direction = 'up', limit = 100, newlist) {
  console.log("更新消息列表");
  // Not update list, if no scrolling
  if (direction == 'init') return;

  if (direction == 'up' && curList.length > 0) {
    // to check if this init up list can concat with previous curList?
    const existingIds = new Set(curList.slice(0, newlist.length).map(item => item.id));
    originalLength = newlist.length;
    newlist = newlist.filter(item => !existingIds.has(item.id));
    // Not connected with orginal curList, then override it totally
    if (newlist.length == originalLength && originalLength > 0) {
      curList = newlist;
    } else {
      curList = newlist.concat(curList);
      if (curList.length > limit)
        curList = curList.slice(0, limit);
    }
  } else if (direction == 'up') {
    curList = newlist;
  }

  if (direction == 'down') {
    curList = curList.concat(newlist);
    if (curList.length > limit)
      curList = curList.slice(Math.max(0, curList.length - limit));
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

  $('.popimg').click(function () {
    $('#popmask').removeClass('show');
  });

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
// Keep in .last-read 

function reloc(run = true, cb) {
  // Check if the element with the class 'last-read' exists
  if ($('#feed .last-read').length) {
    // Get the current scroll position of #feed
    var currentScrollTop = $('#feed').scrollTop();

    // Get the top position of the element relative to #feed
    var targetPosition = $('#feed .last-read').offset().top;

    // Calculate the scroll distance to the target position relative to the current scroll position
    var scrollDistance = targetPosition + currentScrollTop;
    /*
        console.log("Current scrollTop:", currentScrollTop);
        console.log("Target position:", targetPosition);
        console.log("Scroll distance:", scrollDistance);
    */

    // Scroll #feed to the target position with the calculated scroll distance
    if (run)
      $('#feed').animate({
        scrollTop: scrollDistance
      }, 1000, function () {
        // This function will be called when animation is complete
        cb();
      });
    else
      cb();
  } else {
    cb();
  }
}
