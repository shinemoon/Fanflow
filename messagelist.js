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
              showInd: 0,
              max_id: null,
              since_id: null,
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
      NProgress.start();
      result = getTimeline(since_id, max_id, function (res) {
        console.log("获得" + res.msglist.length + "条新消息")

        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          messageListUpdate("down", listLength, res.msglist);
        } else {
          messageListUpdate("up", listLength, res.msglist);
        }
        // Construct the full list
        // Store for local save
        chrome.storage.local.set({ msglist: curList }, function () {
          console.log("Local Save Msgs");
        });
        // Need to handle the index of showing
        buildHtmlFromMessages({
          type: type,
          //messageList: curList,
          messageList: res.msglist,
          showInd: 0,
          max_id: max_id,
          since_id: since_id,
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
 * @param {number} [options.showInd=0] - 显示的起始索引。// 目前倾向于恒为0
 * @param {string|null} [options.max_id=null] - 最大消息ID（可选）。
 * @param {string|null} [options.since_id=null] - 最小消息ID（可选）。
 * @param {Function} [options.cb=function(){}] - 回调函数，在完成后调用。
 *
 * @returns {void}
 *
 * @example
 * buildHtmlFromMessages({
 *   type: "down",
 *   messageList: messages,
 *   showInd: 0,
 *   cb: function() {
 *     console.log("消息加载完成");
 *   }
 * });
 */
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
  showInd = 0; // Override the showInd!

  var feed = $('#feed');
  // 似乎就不该清空了，而是永远附加(除了up) - forceRefresh 除外
  if (type == "forceRefresh") {
    feed.empty();
  }
  // clean all 'unread'
  $('.message').removeClass('unread');
  sortedList = remapMessage(messageList);
  let i = showInd;
  let messagesHtml = ''; // 初始化一个空字符串用于存储所有消息的HTML

  let prev_author = null;
  sortedList.forEach(function (message) {
    // 创建消息容器
    let $messageDiv = $('<div>').addClass('message');
    // same author judgement
    if(message.raw.user.id == prev_author){
      $messageDiv.addClass('same-author');
    } else {
      prev_author = message.raw.user.id;
    }

    if (type != "init") $messageDiv.addClass("unread");

    let localTime = convertToLocalTime(message.time);

    // 创建Meta容器
    let $metaDiv = $('<div>').addClass('message-meta');
    $metaDiv.append($('<img>').addClass('msg-avator').prop("src", message.avator));
    $metaDiv.append($('<span value=' + i + '>').addClass('msg-nickname').text(message.nickname + " " + (i++)));
    $metaDiv.append($('<span>').addClass('msg-time').text(localTime.localTime));
    $metaDiv.append($('<span>').addClass('msg-source').text(message.source));
    // TODO: 优化显示
    // 创建内容容器
    //if there is message.raw.repost_status in message, then to fetch message.raw.repost_status.repost_screen_name/ repost_status_id / repost_user_id and text , combine with one dict repost_details, and then , try to show match the repost_screen_name & text in message.content, use <span class='content-highlight'> to mark those and be one new 'highlight-content' var
    let contentDiv = "";
    if (message.raw && message.raw.repost_status) {
      const repostDetails = {
        screen_name: message.raw.repost_status.user.screen_name,
        status_id: message.raw.repost_status.id,
        user_id: message.raw.repost_status.user.id,
        text: message.raw.repost_status.text
      };

      // Create a regular expression to find mentions of the repost screen name in the content
      const regex = new RegExp(`@${repostDetails.screen_name} `, 'g');
      // Replace mentions in the content with highlighted text
      const highlightedName = message.content.replace(regex, '<span class="name-highlight">$&</span>');
      // Create a regular expression to find mentions of the repost text in the content
      const textRegex = new RegExp(repostDetails.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      // Replace mentions in the content with highlighted text
      const highlightedContent = highlightedName.replace(textRegex, '<span class="content-highlight">$&</span>');
      // Highlight other mentions in the content that are not the repost screen name
      // 高亮内容中的其他提及（非转发用户名）
      const mentionRegex = /@(\p{L}+) /gu;
      const highlightedContentWithMentions = highlightedContent.replace(mentionRegex, (match, p1) => {
        return p1 === repostDetails.screen_name ? match : `<span class="info-highlight">${match}</span>`;
      });


      // Create a new content container with the fully highlighted content
      $contentDiv = $('<div>').addClass('content').html(highlightedContentWithMentions);


      if (message.hasImage) {
        let $img = $('<img>').addClass('content-img').attr('src', message.image).attr('largeurl', message.largeimage);
        $contentDiv.append($img);
      }

      // Append the new content container to the message div
      $messageDiv.append($contentDiv);
    } else {
      // Highlight other mentions in the content that are not the repost screen name

      // 高亮内容中的所有提及
      const mentionRegex = /@(\p{L}+) /gu; // 使用 Unicode 属性转义以支持中文

      const highlightedContentWithMentions = message.content.replace(mentionRegex, '<span class="info-highlight">$&</span>');

      // Create a new content container with the fully highlighted content
      $contentDiv = $('<div>').addClass('content').html(highlightedContentWithMentions);

      if (message.hasImage) {
        let $img = $('<img>').addClass('content-img').attr('src', message.image).attr('largeurl', message.largeimage);
        $contentDiv.append($img);
      }
      $messageDiv.append($contentDiv);
    }
    // 创建操作容器
    let $actionsDiv = $('<div>').addClass('actions');
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
  pagline.animate(curList.length / listLength);
  //  reloc('#feed', type);
  cb();
  NProgress.done();

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