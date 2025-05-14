async function buildDMListPage(user_id, type = "up", cb) {
    console.log("To show DM");
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
      // 获取用户信息并更新界面-No need in DM page

      // 处理加载后的提及列表，例如更新页面显示
      // to fetch list from server
      //dmListUpdate(direction, listLength, result.msglist);

      // to list /sort data
      //dmListUpdate();


      // To build UI & list

    } else {
      openAuthPage();
    }
  } else {
    openAuthPage();
  }

  if (cb) cb();
}

function dmListUpdate(direction = 'up', limit = 100, newlist) {
  console.log("更新消息列表");
}

