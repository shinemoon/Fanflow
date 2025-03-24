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

      // 根据类型加载提及列表
      let since_id = null;
      let max_id = null;
      if (type === "up") {
        since_id = showList[0].id;
        console.log("向顶部滚动: 在线获取信息流,pullin更新的Mention消息");
      } else if (type === "down") {
        max_id = showList[showList.length - 1].id;
        console.log("向底部滚动，在线获取信息流,pullin 更旧的Mention消息");
      } else if (type === "init") {
        //Get first page to show
        showList = [];
      } else if (type === "forceRefresh") {
        showList = [];
      }

      result = getTimeline(user_id, since_id, max_id, function (res) {
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

      // 处理加载后的提及列表，例如更新页面显示
    } else {
      openAuthPage();
    }
  } else {
    openAuthPage();
  }
  if (cb) cb();
}