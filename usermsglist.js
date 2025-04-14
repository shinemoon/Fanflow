async function buildUserListPage(user_id, type = "up", cb) {
  let canShow = false;
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
      // 获取用户信息并更新界面
      try {
        const res = await getUserInfo(user_id); // Now using Promise version
        console.log("获得用户信息");
        console.log(res);

        // 填充用户面板
        if (res) {
          $('#switch-name').text(res.name);
          $('#switch-following .value').text(res.followers_count);
          $('#switch-follower .value').text(res.friends_count);
          $('#switch-description .value').text(res.description);
          $('#switch-avator img').prop("src", res.profile_image_url);
        }

        // 检查是否可以显示内容
        //- 有无锁定
        if (res.protected === false || res.following) {
          canShow = true;
        }
        //- 是否好友
        if (res.following) {
          $('#follow').addClass('background');
          $('#unfollow').removeClass('background');
          $('#unfollow').on('click', function () {
            console.log('用户点击了关注按钮');
          });
        } else {
          toastr.options.timeOut = "3000";
          toastr.options.extendedTimeOut = "1000";
          toastr.warning('未关注用户');

          $('#unfollow').addClass('background');
          $('#follow').removeClass('background');
          $('#follow').on('click', function () {
            console.log('用户点击了关注按钮');
          });
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }

      if (canShow) {
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
        try {
          // Using await with the Promise-based getStatus
          const result = await getStatus(user_id, since_id, max_id);
          console.log(`获得 ${result.msglist.length} 条新消息`);

          // Determine update direction based on max_id
          const direction = max_id != null ? "down" : "up";
          userListUpdate(direction, listLength, result.msglist);

          // Build HTML from messages (one-time showing)
          buildHtmlFromMessages({
            type: type,
            container: '#switchshow',
            messageList: result.msglist,
            cb: cb
          });

        } catch (error) {
          console.error("加载用户消息失败:", error);
          // Add any error handling UI feedback here if needed
          if (cb) cb(error); // Pass error to callback if provided
        }
      } else {
        console.log("Show applying lock");
        toastr.options.timeOut = "0";
        toastr.options.extendedTimeOut = "0";
        toastr.error('用户设置消息保护，请申请关注。');


      };
      // 处理加载后的提及列表，例如更新页面显示
    } else {
      openAuthPage();
    }
  } else {
    openAuthPage();
  }
  if (cb && canShow) cb();
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

