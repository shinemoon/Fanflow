async function buildUserListPage(user_id, type = "up", cb) {
  const token = await getStoredToken();
  if (token) {
    const isValid = await validateToken(token.oauthToken, token.oauthTokenSecret);
    if (isValid) {
      console.log("认证成功，用户针对页面构建开始:" + type);
      // 全局赋值令牌
      validToken = {
        oauthToken: token.oauthToken,
        oauthTokenSecret: token.oauthTokenSecret
      }
      chrome.storage.local.set({ userinfo: isValid }, function () {
        // console.log("Local Save users");
      });
      // 刷新User信息部分
      console.log(user_id);
      // TODO：获取用户信息，并且更新信息界面

      /*
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
                userMsgListUpdate("down", listLength, res.msglist);
              } else {
                userMsgListUpdate("up", listLength, res.msglist);
              }
              // Construct the full list
              chrome.storage.local.set({ mentionlist: mentionList }, function () {
                console.log("Local Save Mentions Msgs");
              });
              buildHtmlFromMessages({
                type: type,
                messageList: res.msglist,
                cb: cb
              });
            });
            // 处理加载后的提及列表，例如更新页面显示
      */
    } else {
      openAuthPage();
    }
  } else {
    openAuthPage();
  }
  if (cb) cb();
}

function userMsgListUpdate(direction = 'up', limit = 100, newlist) {
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