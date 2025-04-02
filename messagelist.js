/**
 * 构建主页并加载消息列表。
 * 
 * @param {string} type - 指定加载类型，默认为 "up"。可选值包括 "up"、"down" 和 "init"。
 * @param {function} cb - 回调函数，用于处理构建完成后的操作。
 * 
 * 该函数首先从本地存储中获取用户信息和消息列表，然后验证存储的令牌。如果令牌有效，将根据指定的类型加载消息列表：
 * - "up"：向上加载更多消息。
 * - "down"：向下加载更多消息。
 * - "init"：初始化时加载消息列表。
 * 
 * 如果没有有效的令牌，将打开认证页面。
 */
async function buildHomePage(type = "up", cb) {
  console.log("认证成功，页面构建开始:" + type);
  // To load local store firstly
  // Because home is init page, so it will also get mention or other list if possible from local
  chrome.storage.local.get({ userinfo: userInfo, homelist: [], mentionlist: [], }, function (r) {
    // Restore local list firstly , waiting for fetching
    updateUserInfo(r.userinfo);
    curList = r.homelist;
    mentionList = r.mentionlist;
    pagline.animate(curList.length / listLength);
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
          //此处则永远从零开始, 并且up时，必然重新拉取最近的信息。
          since_id = curList[0].id;
          console.log("向顶部滚动: 在线获取信息流,pullin更新的消息");
        }
        if (type == "down") {
          // 向底部滚动，suppose也是拉取（因为此时我们不再分段显示）, 所以永远都是最后一个元素的id
          max_id = curList[curList.length - 1].id;
          console.log("向底部滚动，在线获取信息流,pullin 更旧的消息");
        }

        // Just show the local list
        // 初始化则重新load
        if (type == "init") {
          if (initRrefresh == false) {
            //Get first page to show
            buildHtmlFromMessages({
              type: type,
              messageList: curList,
              cb: cb
            });
            return;
          } else {
            type = 'forceRefresh';
          }
        }

        if (type == "forceRefresh") {
          curList = [];
        };


      }
      //      $('.ajax').addClass('loading');
      result = getTimeline(null, since_id, max_id, function (res) {
        console.log("获得" + res.msglist.length + "条新消息")

        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          messageListUpdate("down", listLength, res.msglist);
        } else {
          messageListUpdate("up", listLength, res.msglist);
        }
        // Construct the full list
        // Store for local save
        chrome.storage.local.set({ homelist: curList }, function () {
          console.log("Local Save Msgs");
        });
        // Need to handle the index of showing
        buildHtmlFromMessages({
          type: type,
          messageList: res.msglist,
          cb: cb,
        });
      });
    }
  } else {
    // If no valid token, then creat auth html
    chrome.tabs.create({ url: "auth.html" });
  }
};


/**
 * 根据消息列表构建HTML并更新页面显示。
 *
 * @param {Object} options - 配置选项。
 * @param {string} [options.type="up"] - 消息显示类型。
 * @param {Array} [options.messageList=[]] - 消息列表数组。
 * @param {Function} [options.cb=function(){}] - 回调函数，在完成后调用。
 *
 * @returns {void}
 *
 * @example
 * buildHtmlFromMessages({
 *   type: "down",
 *   messageList: messages,
 *   cb: function() {
 *     console.log("消息加载完成");
 *   }
 * });
 */
function buildHtmlFromMessages({
  type = "up",
  messageList = [],
  container = "#feed",
  cb = function () { }
} = {}) {

  var feed = $(container);
  // 似乎就不该清空了，而是永远附加(除了up) - forceRefresh 除外
  if (type == "forceRefresh" || type === "init") {
    feed.empty();
  }
  // clean all 'unread'
  $('.message').removeClass('unread');
  sortedList = remapMessage(messageList);
  let i = 0;
  let messagesHtml = ''; // 初始化一个空字符串用于存储所有消息的HTML

  let prev_author = null;
  sortedList.forEach(function (message) {
    // 创建消息容器
    let $messageDiv = $('<div>').addClass('message');
    // same author judgement
    if (message.raw.user.id == prev_author) {
      $messageDiv.addClass('same-author');
    } else {
      prev_author = message.raw.user.id;
    }

    if (type != "init") $messageDiv.addClass("unread");

    let localTime = convertToLocalTime(message.time);

    // 创建Meta容器
    let $metaDiv = $('<div>').addClass('message-meta');
    $metaDiv.append($('<img>').addClass('msg-avator').prop("src", message.avator));
    //$metaDiv.append($('<span value=' + i + ' usrid='+message.userid+'>').addClass('msg-nickname').text(message.nickname + " " + (i++)));
    $metaDiv.append($('<span value=' + i + ' usrid='+message.userid+'>').addClass('msg-nickname').text(message.nickname ));
    $metaDiv.append($('<span>').addClass('msg-time').text(localTime.localTime));
    $metaDiv.append($('<span>').addClass('msg-source').text(message.source));
    // TODO: 优化显示
    // 创建内容容器
    //if there is message.raw.repost_status in message, then to fetch message.raw.repost_status.repost_screen_name/ repost_status_id / repost_user_id and text , combine with one dict repost_details, and then , try to show match the repost_screen_name & text in message.content, use <span class='content-highlight'> to mark those and be one new 'highlight-content' var
    let highlightedContentWithMentions = '';
    if (message.raw && message.raw.repost_status) {
      const repostDetails = {
        screen_name: message.raw.repost_status.user.screen_name,
        status_id: message.raw.repost_status.id,
        user_id: message.raw.repost_status.user.id,
        text: message.raw.repost_status.text
      };
      // Create a regular expression to find mentions of the repost text in the content
      /* Deprecated, as in html mode, it's risky to match string(because status) with html code
      // 创建正则表达式以查找内容中的转发文本- 
      const escapedText = repostDetails.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const textRegex = new RegExp(escapedText.replace(/<[^>]*>/g, ''), 'g');
      // Replace mentions in the content with highlighted text
      let highlightedContent = message.content.replace(textRegex, '<span class="content-highlight">$&</span>');
      */

      let highlightedContent = message.content;

      $contentDiv = $('<div>').addClass('content').html(highlightedContent);
      // Highlight other mentions in the content that are not the repost screen name
      // 高亮内容中的其他提及（非转发用户名）
      highlightedContentWithMentions = highlightedContent;
      $messageDiv.addClass("reply").attr('srcid', repostDetails.status_id);
    } else if (message.raw && message.raw.in_reply_to_status_id) {
      // 非rt，纯reply
      highlightedContentWithMentions = message.content;
      $messageDiv.addClass("reply").attr('srcid', message.raw.in_reply_to_status_id);
    } else {
      highlightedContentWithMentions = message.content;
    }
    // Create a new content container with the fully highlighted content
    $contentDiv = $('<div>').addClass('content').html(highlightedContentWithMentions);
    if (message.hasImage) {
      let $img = $('<img>').addClass('content-img').attr('src', message.image).attr('largeurl', message.largeimage);
      $contentDiv.append($img);
    }
    $messageDiv.append($contentDiv);
    // 创建操作容器
    let $actionsDiv = $('<div>').addClass('actions');
    $actionsDiv.append($('<span>').addClass('icon-star'));
    $actionsDiv.append($('<span>').addClass('icon-quote1'));
    $actionsDiv.append($('<span>').addClass('icon-reply'));
    $actionsDiv.append($('<span>').addClass('icon-link').addClass('reply-src'));
    // 拼装消息HTML
    $messageDiv.append($metaDiv);
    $messageDiv.append($contentDiv);
    $messageDiv.append($actionsDiv);

    // 将消息HTML添加到字符串中
    messagesHtml += $messageDiv.prop('outerHTML');
  });

  // 循环结束后一次性添加所有消息到$feed
  if (type === 'up' || type === 'init' || type === 'forceRefresh') {
    feed.prepend(messagesHtml);
    // 裁剪#feed中的.message队列，确认仅保留前<N (N=limit)个.message
    let messages = feed.children('.message');
    if (messages.length > listLength) {
      messages.slice(listLength).remove();
    }
  } else if (type === 'down') {
    feed.append(messagesHtml);
    // 裁剪#feed中的.message队列，确认仅保留后<N (N=limit)个.message
    let messages = feed.children('.message');
    if (messages.length > listLength) {
      messages.slice(0, -listLength).remove();
    }
  }
  //  reloc('#feed', type);
  applyDarkMode();
  cb();

}

// Update the curList
// up - fetch newer
// down -fetch older
// over - replace
/**
 * 更新消息列表，根据滚动方向和新消息列表更新当前消息列表。
 *
 * @param {string} direction - 滚动方向，'up' 表示向上滚动，'down' 表示向下滚动，'init' 表示初始化，不更新列表。
 * @param {number} limit - 当前消息列表的最大长度限制。
 * @param {Array} newlist - 新的消息列表，将用于更新当前消息列表。
 *
 * @returns {void} 无返回值。
 *
 * @example
 * // 向上滚动并更新消息列表
 * messageListUpdate('up', 100, newMessages);
 *
 * @example
 * // 向下滚动并更新消息列表
 * messageListUpdate('down', 100, newMessages);
 */
function messageListUpdate(direction = 'up', limit = 100, newlist) {
  console.log("更新消息列表");
  // Not update list, if no scrolling
  if (direction == 'init') return;
  if (direction == 'up') {
    curList = newlist.concat(curList);
    if (curList.length > limit)
      curList = curList.slice(0, limit);
  }
  if (direction == 'down') {
    curList = curList.concat(newlist);
    if (curList.length > limit)
      curList = curList.slice(-limit); // 取后limit个元素
  }
  pagline.animate(curList.length / listLength);
}

/**
 * 构建并显示带有模糊效果的图片弹窗。
 * 
 * @param {string} thumb - 缩略图的 URL。
 * @param {string} large - 大图的 URL。
 * 
 * 此函数创建一个包含模糊背景的图片容器，并在点击缩略图时切换到大图。
 * 还提供了缩放和下载功能，用户可以通过点击相应按钮进行操作。
 * 
 * @example
 * buildPopImg('thumb.jpg', 'large.jpg');
 */
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

/**
 * 根据类型滚动指定元素的位置。
 * 
 * @param {HTMLElement} el - 要滚动的元素。
 * @param {string} type - 滚动类型，'up' 表示滚动到底部，其他值表示滚动到顶部。
 */
function reloc(el, type) {
  if (type == 'up') {
    // 滚动到元素的底部
    $(el).scrollTop($(el)[0].scrollHeight);
  } else {
    // 滚动到元素的顶部
    $(el).scrollTop(0);
  }
}