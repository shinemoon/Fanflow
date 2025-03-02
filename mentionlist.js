/**
 * 构建提及列表页面并加载提及列表。
 * 
 * @param {string} type - 指定加载类型，默认为 "up"。可选值包括 "up"、"down" 和 "init"。
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
  chrome.storage.local.get({ userinfo: userInfo, mentionList: [] }, function (r) {
    // 先恢复本地提及列表，等待获取数据
    updateUserInfo(r.userinfo);
    curMentionList = r.mentionList;
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
      let mentions;
      if (type === "up") {
        mentions = await getMentions('up');
      } else if (type === "down") {
        mentions = await getMentions('down');
      } else if (type === "init") {
        mentions = await getMentions('init');
      }

      // 处理加载后的提及列表，例如更新页面显示
      renderMentionList(mentions);
    } else {
      openAuthPage();
    }
  } else {
    openAuthPage();
  }

  if (cb) cb();
}

// 假设存在这个函数用于渲染提及列表到页面
function renderMentionList(mentions) {
  // 这里实现将提及列表渲染到页面的逻辑
  // 例如，遍历 mentions 数组，创建相应的 DOM 元素并添加到页面中
  console.log("mentions", mentions);
}


