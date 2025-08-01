let curDmPage = 0;
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
        //if (dmList.length == 0 || type === "forceRefresh") {
        if (type === "forceRefresh" || type === "up") {
          curDmPage = 1;
          dmList = [];  // Clear history
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
        } else {
          result = mode === "conversation" ? dmList : []; // 默认返回空数组或现有列表// TODO: to have inbox version
        }

        console.log(result);
        // 统一更新列表

        dmList = await dmListUpdate({
          newlist: result.conversations,
        });

        // 根据模式选择显示函数
        if (mode === "inbox") {
          showDMList(dmList, '#dmview');
        } else {
          showDMConversation(dmList, '#dmview');
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
  newlist = [],
} = {}) {
  console.log("更新DM列表");
  dmList = dmList.concat(newlist || []);
  await chrome.storage.local.set({ dmlist: dmList });
  return dmList;
}


function showDMList(dmlist, containerid) {
  const container = $(containerid);
  container.addClass('dm-list-container');
  container.empty();
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
  container.empty();
  dmlist.forEach(conversation => {
    const otherusr = conversation.dm.sender.id === conversation.otherid
      ? conversation.dm.sender
      : conversation.dm.recipient;

    const conversationElement = document.createElement('div');
    conversationElement.classList.add('conversation-item');
    conversationElement.setAttribute('data-userid', otherusr.id);
    conversationElement.innerHTML = `
            <div class="avatar sender '}">
                <img src="${otherusr.id === conversation.dm.sender.id ? otherusr.profile_image_url : curUsr.profile_image_url}" >
            </div>
            <div class="avatar rec">
                <img src="${otherusr.id === conversation.dm.sender.id ? curUsr.profile_image_url : otherusr.profile_image_url}" >
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
    // 增加点击事件，点击后获取该用户的私信详情
    conversationElement.addEventListener('click', async function() {
      const userid = this.getAttribute('data-userid');
      console.log(userid);
      if (typeof getDMDetails === 'function') {
        try {
          window.curdm = await getDMDetails(userid);
          console.log('curdm', window.curdm);
          // 隐藏原有#dmview，显示#dmdetail
          const dmview = document.querySelector('#dmview');
          if (dmview) dmview.style.display = 'none';
          let dmdetail = document.querySelector('#dmdetail');
          if (!dmdetail) {
            dmdetail = document.createElement('div');
            dmdetail.id = 'dmdetail';
            dmdetail.style.position = 'absolute';
            dmdetail.style.top = '0';
            dmdetail.style.left = '0';
            dmdetail.style.width = '100%';
            dmdetail.style.height = '100%';
            dmdetail.style.background = '#fff';
            dmdetail.style.zIndex = '999';
            document.body.appendChild(dmdetail);
          } else {
            dmdetail.innerHTML = '';
            dmdetail.style.display = 'block';
          }
          showDMDetail(window.curdm, dmdetail, userid);
        } catch (e) {
          console.error('获取DM详情失败:', e);
          // 获取失败时模拟点击 #dm
          const dmBtn = document.querySelector('#dm');
          if (dmBtn) {
            dmBtn.click();
          }
        }
      } else {
        console.warn('getDMDetails 未定义');
      }
    });

// 聊天详情UI渲染函数，模拟聊天软件界面
function showDMDetail(dmDetail, container, otherUserId) {
  // 清空内容
  container.innerHTML = '';
  // 添加返回按钮
  const backBtn = document.createElement('button');
  backBtn.textContent = '← 返回';
  backBtn.style.margin = '10px';
  backBtn.onclick = function() {
    container.style.display = 'none';
    const dmview = document.querySelector('#dmview');
    if (dmview) dmview.style.display = '';
  };
  container.appendChild(backBtn);

  // 聊天消息区
  const chatBox = document.createElement('div');
  chatBox.className = 'dm-chat-box';
  chatBox.style.padding = '20px';
  chatBox.style.maxHeight = '80vh';
  chatBox.style.overflowY = 'auto';
  chatBox.style.background = '#f5f5f5';

  // 获取当前用户id
  const curUserId = (typeof curUsr !== 'undefined' && curUsr.id) ? curUsr.id : null;

  (dmDetail.messages || []).forEach(msg => {
    const msgItem = document.createElement('div');
    msgItem.className = 'dm-msg-item';
    msgItem.style.display = 'flex';
    msgItem.style.marginBottom = '16px';
    msgItem.style.alignItems = 'flex-end';
    // 判断消息方向
    const isMe = curUserId && msg.sender_id === curUserId;
    msgItem.style.justifyContent = isMe ? 'flex-end' : 'flex-start';

    // 头像
    const avatar = document.createElement('img');
    avatar.src = msg.sender && msg.sender.profile_image_url ? msg.sender.profile_image_url : '';
    avatar.alt = msg.sender && msg.sender.screen_name ? msg.sender.screen_name : '';
    avatar.style.width = '36px';
    avatar.style.height = '36px';
    avatar.style.borderRadius = '50%';
    avatar.style.margin = isMe ? '0 0 0 10px' : '0 10px 0 0';

    // 气泡
    const bubble = document.createElement('div');
    bubble.className = 'dm-msg-bubble';
    bubble.textContent = msg.text;
    bubble.style.padding = '10px 16px';
    bubble.style.borderRadius = '18px';
    bubble.style.maxWidth = '60%';
    bubble.style.background = isMe ? '#aee1f9' : '#fff';
    bubble.style.color = '#222';
    bubble.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
    bubble.style.wordBreak = 'break-all';
    bubble.style.fontSize = '15px';

    if (isMe) {
      msgItem.appendChild(bubble);
      msgItem.appendChild(avatar);
    } else {
      msgItem.appendChild(avatar);
      msgItem.appendChild(bubble);
    }

    // 时间
    const time = document.createElement('div');
    time.className = 'dm-msg-time';
    time.textContent = new Date(msg.created_at).toLocaleString();
    time.style.fontSize = '12px';
    time.style.color = '#888';
    time.style.margin = isMe ? '0 0 0 10px' : '0 10px 0 0';
    time.style.alignSelf = 'flex-end';
    msgItem.appendChild(time);

    chatBox.appendChild(msgItem);
  });

  container.appendChild(chatBox);
}
    container.append(conversationElement);
  });
}
