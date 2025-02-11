async function buildHomePage(type = "up", cb) {
  console.log("认证成功，页面构建开始:" + type);
  // To load local store firstly
  chrome.storage.local.get({ userinfo: userInfo, msglist: [] }, function (r) {
    // Restore local list firstly , waiting for fetching
    updateUserInfo(r.userinfo);
    curList = r.msglist;
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
          console.log('listShowInd: ' + listShowInd + ' / Pre');
          since_id = curList[listShowInd].id;
          if (listShowInd > listShowLength - 1) {
            console.log("原有缓存队列: 获取剩下的从" + listShowInd + "开始的元素");
            // move the pointer to 'previous page header'
            //let curId = (listShowInd > listShowLength) ? (listShowInd - listShowLength) : 0;
            listShowInd = (listShowInd - 2 * listShowLength > -1) ? listShowInd - 2 * listShowLength : -1; 
            buildHtmlFromMessages({
              type: type,
              messageList: curList,
              showInd: listShowInd + 1,
              max_id: null,
              since_id: since_id,
              cb: cb
            });
            listShowInd = listShowInd + $("#feed .message").length;
            pagline.animate(listShowInd / curList.length);
            console.log('listShowInd: ' + listShowInd + ' / ' + curList.length);

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
            buildHtmlFromMessages({
              type: type,
              messageList: curList,
              showInd: listShowInd + 1,
              max_id: max_id,
              cb: cb
            });
            // move the pointer to end of the page!
            listShowInd = listShowInd + $("#feed .message").length;
            pagline.animate(listShowInd / curList.length);
            console.log('listShowInd: ' + listShowInd + ' / ' + curList.length);
            return;
          } else {
            console.log("超出缓存队列: 在线获取信息流,pullin 更旧的消息");
          }
        }

        // Just show the local list
        if (type == "init") {
          //Get first page to show
          buildHtmlFromMessages({
            type: type,
            messageList: curList,
            showInd: 0,
            max_id: null,
            since_id: null,
            cb: cb
          });
          listShowInd = $("#feed .message").length - 1;
          pagline.animate(listShowInd / curList.length);
          console.log('listShowInd: ' + listShowInd + ' / ' + curList.length);
          return;
        }
      }
      //      $('.ajax').addClass('loading');
      NProgress.start();
      result = getTimeline(since_id, max_id, function (res) {
        console.log("获得" + res.msglist.length + "条新消息")
        if (res.msglist.length > 0) {
          res.msglist.forEach(item => {
            item.read = 'new';
          });
        }
        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          messageListUpdate("down", listLength, res.msglist);
          //Down side no need to touch listShowInd
          listShowInd = listShowInd;
        } else {
          messageListUpdate("up", listLength, res.msglist);
          //Up side  need to sfhit the listShowInd up to first page! // current 
          //listShowInd = 0;
          listShowInd = getLastPageFirstIndex(res.msglist, listShowLength) - 1;
        }
        // Construct the full list
        // Store for local save
        chrome.storage.local.set({ msglist: curList }, function () {
          console.log("Local Save Msgs");
        });
        // Need to handle the index of showing
        buildHtmlFromMessages({
          type: 'new',
          messageList: curList,
          showInd: listShowInd + 1,
          max_id: max_id,
          since_id: since_id,
          cb: cb,
        });
        //Move pointer to end of page
        listShowInd = listShowInd + $("#feed .message").length;

      });
    }
  } else {
    // If no valid token, then creat auth html
    chrome.tabs.create({ url: "auth.html" });
  }
};


function buildHtmlFromMessages({
  type = "up",
  messageList = [],
  showInd = 0,
  max_id = null,
  since_id = null,
  cb = function () { }
} = {}) {
  // Clean current page's status;
  cleanCurrentPageStatus();

  var $feed = $('#feed');
  $feed.empty();
  // Update current pointer to the showing window in messages
  sortedList = remapMessage(messageList).slice(showInd, listShowLength + showInd);
  let i = showInd;
  sortedList.forEach(function (message) {
    // 创建消息容器
    var $messageDiv = $('<div>').addClass('message');
    if (message.newinfo == 'new') {
      $messageDiv.addClass('unread');
    }
    let localTime = convertToLocalTime(message.time);

    // 创建Meta容器
    var $metaDiv = $('<div>').addClass('message-meta');
    $metaDiv.append($('<img>').addClass('msg-avator').prop("src", message.avator));
    $metaDiv.append($('<span value='+i+'>').addClass('msg-nickname').text(message.nickname + " " + (i++)));
    $metaDiv.append($('<span>').addClass('msg-time').text(localTime.localTime));
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
  $('div.message').each(function (index) {
  });

  reloc('#feed', type);
  cb();
  NProgress.done();

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

function reloc(el, type) {
  if (type == 'up') {
    // 滚动到元素的底部
    $(el).scrollTop($(el)[0].scrollHeight);
  } else {
    // 滚动到元素的顶部
    $(el).scrollTop(0);
  }
}