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
      // 试图确认能否读取，根据这个显示是否显示或者建议Follow
      result = getUserInfo(user_id, function (res) {
        console.log("获得用户信息");
        console.log(res);
        //填充用户面板
        if (res) {
          $('#switch-name').text(res.name);
          $('#switch-following .value').text(res.followers_count);
          $('#switch-follower .value').text(res.friends_count);
          $('#switch-description .value').text(res.description);
          $('#switch-avator img').prop("src", res.profile_image_url);
        }
      });

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

      //result = getTimeline(user_id, since_id, max_id, function (res) {
      result = getStatus(user_id, since_id, max_id, function (res) {
        console.log("获得" + res.msglist.length + "条新消息")

        // only if older ones, those will be append at end of previous list, other is in revered direction
        if (max_id != null) {
          userListUpdate("down", listLength, res.msglist);
        } else {
          userListUpdate("up", listLength, res.msglist);
        }
        // Will not store any local but just for one-time showing
        // Need to handle the index of showing
        buildHtmlFromMessages({
          type: type,
          container: '#switchshow',
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

function userListUpdate(direction = 'up', limit = 100, newlist) {
  console.log("更新消息列表");
  // Not update list, if no scrolling
  if (direction == 'init') return;
  if (direction == 'up') {
    showList = newlist.concat(showList);
    if (showList.length > limit)
      showList = showList.slice(0, limit);
  }
  if (direction == 'down') {
    showList = showList.concat(newlist);
    if (showList.length > limit)
      showList = showList.slice(-limit); // 取后limit个元素
  }
  pagline.animate(showList.length / listLength);
}

