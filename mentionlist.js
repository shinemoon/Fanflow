/**
 * 构建提及列表页面并加载提及列表。
 * 
 * @param {string} type - 指定加载类型，默认为 "up"。可选值包括 "up"、"down" 和 "init"。- "forceRefresh" 也支持了
 * @param {function} cb - 回调函数，用于处理构建完成后的操作。
 * 
 * 该函数首先从本地存储中获取用户信息和提及列表，然后验证存储的令牌。如果令牌有效，将根据指定的类型加载提及列表：
 * - "up"：向上加载更多提及。
 * - "down"：向下加载更多提及。
 * - "init"：初始化时加载提及列表。
 * 
 * 如果没有有效的令牌，将打开认证页面。
 */
async function buildMentionListPage(type = "up", cb) {
  console.log("认证成功，提及列表页面构建开始:" + type);
  // 首先从本地存储中获取用户信息和提及列表
  chrome.storage.local.get({ userinfo: userInfo, mentionlist: [] }, function (r) {
    // 先恢复本地提及列表，等待获取数据
    updateUserInfo(r.userinfo);
    mentionList = r.mentionlist;
    pagline.animate(mentionList.length / listLength);
  });
  const token = await getStoredToken();
  if (token) {
    const isValid = await validateToken(token.oauthToken, token.oauthTokenSecret);
    if (isValid) {
      // 全局赋值令牌
      validToken = {
        oauthToken: token.oauthToken,
        oauthTokenSecret: token.oauthTokenSecret
      }
      chrome.storage.local.set({ userinfo: isValid }, function () {
        // console.log("Local Save users");
      });
      // 检查是否存在已有的列表项？
      updateUserInfo(isValid);

      // 根据类型加载提及列表
      let since_id = null;
      let max_id = null;
      if (type === "up") {
        since_id = mentionList[0].id;
        console.log("向顶部滚动: 在线获取信息流,pullin更新的Mention消息");
      } else if (type === "down") {
        max_id = mentionList[mentionList.length - 1].id;
        console.log("向底部滚动，在线获取信息流,pullin 更旧的Mention消息");
      } else if (type === "init") {
        //Get first page to show
        buildHtmlFromMessages({
          type: type,
          container:'#mentioned',
          messageList: mentionList,
          cb: cb
        });
        return;
      } else if (type === "forceRefresh") {
        mentionList = [];
      }

      await getMentions(since_id, max_id, function (res) {
        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          mentionListUpdate("down", listLength, res.msglist);
        } else {
          mentionListUpdate("up", listLength, res.msglist);
        }
        // Construct the full list
        chrome.storage.local.set({ mentionlist: mentionList }, function () {
          console.log("Local Save Mentions Msgs");
        });
        buildHtmlFromMessages({
          type: type,
          container:'#mentioned',
          messageList: res.msglist,
          cb: cb
        });
      });
      // 处理加载后的提及列表，例如更新页面显示
    } else {
      openAuthPage();
    }
  } else {
    openAuthPage();
  }

  if (cb) cb();
}


function mentionListUpdate(direction = 'up', limit = 100, newlist) {
  console.log("更新Mention消息列表");
  // Not update list, if no scrolling
  if (direction == 'init') return;
  if (direction == 'up') {
    mentionList = newlist.concat(mentionList);
    if (mentionList.length > limit)
      mentionList = mentionList.slice(0, limit);
  }
  if (direction == 'down') {
    mentionList = mentionList.concat(newlist);
    if (mentionList.length > limit)
      mentionList = mentionList.slice(-limit); // 取后limit个元素
  }
  pagline.animate(mentionList.length / listLength);
}