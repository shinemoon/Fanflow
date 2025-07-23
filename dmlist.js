let curDmPage = 1;
let dmPageCnt = 8;
async function buildDMListPage(user_id, type = "up", mode = "inbox", cb) {
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
      await chrome.storage.local.get({ dmlist: [] }, async function (r) {
        dmList = r.dmlist;
        if (dmList.length == 0 || type === "forceRefresh") {
          //          dmList=[];  //Clean history
          if (mode === "inbox") {
            result = await getDMInbox(curDmPage, dmPageCnt);
          } else if (mode === "conversation") {
            result = await getDMConversation(curDmPage, dmPageCnt);
          } else {
            throw new Error("无效的显示模式，请使用 'inbox' 或 'conversation'");
          }
        } else if (type === "down") {
          curDmPage = curDmPage + 1;
          if (mode === "inbox") {
            result = await getDMInbox(curDmPage, dmPageCnt);
          } else {
            result = await getDMConversation(curDmPage, dmPageCnt);
          }
        } else if (type === "up") {
          curDmPage = 1;
          if (mode === "inbox") {
            result = await getDMInbox(curDmPage, dmPageCnt);
          } else {
            result = await getDMConversation(curDmPage, dmPageCnt);
          }
        } else {
          result = mode === "conversation" ? dmList : []; // 默认返回空数组或现有列表// TODO: to have inbox version
        }

        console.log(result);

        // 统一更新列表
        result = await dmListUpdate({
          newlist: result,
        });

        // 根据模式选择显示函数
        if (mode === "inbox") {
          showDMList(result, '#dmview');
        } else {
          showDMConversation(result, '#dmview');
        }

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
  //dmlist.conversations.forEach(conversation => {
  dmlist.messages.forEach(conversation => {
    const conversationElement = document.createElement('div');
    conversationElement.classList.add('conversation-item');
    conversationElement.innerHTML = `
            <div class="avatar">
                <img src="${conversation.sender.profile_image_url}" alt="${conversation.sender.screen_name}">
            </div>
            <div class="message-content">
                <div class="sender-info">
                    <span class="sender-name">${conversation.sender.screen_name}</span>
                    <span class="message-time">${new Date(conversation.created_at).toLocaleString()}</span>
                </div>
                <div class="message-preview">${conversation.text}</div>
                <div class="unread-indicator" style="display: ${conversation.new_conv ? 'block' : 'none'};">New</div>
            </div>
        `;
    container.append(conversationElement);
  });
}

function showDMConversation(dmlist, containerid) {
  const container = $(containerid);
  container.addClass('dm-list-container');
  dmlist.conversations.forEach(conversation => {
    const otherusr = conversation.dm.sender.id === conversation.otherid
      ? conversation.dm.sender
      : conversation.dm.recipient;

    const conversationElement = document.createElement('div');
    conversationElement.classList.add('conversation-item');
    conversationElement.innerHTML = `
            <div class="avatar sender '}">
                <img src="${otherusr.id === conversation.dm.sender.id ? otherusr.profile_image_url :curUsr.profile_image_url}" >
            </div>
            <div class="avatar rec">
                <img src="${otherusr.id === conversation.dm.sender.id ? curUsr.profile_image_url:otherusr.profile_image_url}" >
            </div>
 
            <div class="message-content">
                <div class="sender-info">
                    <span class="sender-name">${otherusr.screen_name}</span>
                    <span class="message-time">${new Date(conversation.dm.created_at).toLocaleString()}</span>
                </div>
                <div class="message-preview">${conversation.dm.text}</div>
                <div class="unread-indicator" style="display: ${conversation.dm.new_conv ? 'block' : 'none'};">New</div>
            </div>
        `;
    container.append(conversationElement);
  });
}
