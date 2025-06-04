let curDmPage = 1;
let dmPageCnt = 8;
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
      // Get local
      chrome.storage.local.get({ dmlist: [] }, async function (r) {
        dmList = r.dmlist;
        // 处理加载后的提及列表，例如更新页面显示
        // to fetch list from server
        if (dmList.length == 0 || type === "forceRefresh") {
          result = await getDMConversation(curDmPage, dmPageCnt);
        } else if (type === "down") {
          curDmPage = curDmPage + 1;
          result = await getDMConversation(curDmPage, dmPageCnt);
        } else if (type === "up") {
          curDmPage = 1;
          result = await getDMConversation(curDmPage, dmPageCnt);
        } else {
          result = dmList;
        }
        console.log(result);

        // to list /sort data
        result = await dmListUpdate(
          {
            newlist: result,
          });

        // To build UI & list
        showDMList(result, '#dmview');

      });

    } else {
      openAuthPage();
    }
  } else {
    openAuthPage();
  }

  if (cb) cb();
}

async function dmListUpdate({
  direction = 'up',
  limit = 100,
  newlist = [],
} = {}) {
  console.log("更新DM列表");
  await chrome.storage.local.set({ dmlist: newlist });
  return newlist;
}


function showDMList(dmlist, containerid) {
  const container = $(containerid);
  container.addClass('dm-list-container');
  dmlist.conversations.forEach(conversation => {
    const conversationElement = document.createElement('div');
    conversationElement.classList.add('conversation-item');
    conversationElement.innerHTML = `
            <div class="avatar">
                <img src="${conversation.dm.sender.profile_image_url}" alt="${conversation.dm.sender.screen_name}">
            </div>
            <div class="message-content">
                <div class="sender-info">
                    <span class="sender-name">${conversation.dm.sender.screen_name}</span>
                    <span class="message-time">${new Date(conversation.dm.created_at).toLocaleString()}</span>
                </div>
                <div class="message-preview">${conversation.dm.text}</div>
                <div class="unread-indicator" style="display: ${conversation.new_conv ? 'block' : 'none'};">New</div>
            </div>
        `;
    container.append(conversationElement);
  });
}
