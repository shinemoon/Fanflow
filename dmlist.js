let curDmPage = 0;
let dmPageCnt = 8;
async function buildDMListPage(user_id, type = "up", mode = "conversation", cb) {
  console.log("To show DM");
  $("#float-buttons>div").addClass('background');
  $('#top').removeClass('background');
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
      // 检查是否全局变量跳转
      if (window.shouldOpenPendingDMDetail && window.pendingDMUserId) {
        try {
          let dmdetail = document.querySelector('#dmdetail');
          if (!dmdetail) {
            dmdetail = document.createElement('div');
            dmdetail.id = 'dmdetail';
            dmdetail.className = 'dmdetail';
            document.body.appendChild(dmdetail);
          } else {
            dmdetail.innerHTML = '';
            dmdetail.style.display = '';
          }
          window.curdm = await getDMDetails(window.pendingDMUserId);
          if (typeof showDMDetail === 'function') {
            showDMDetail(window.curdm, dmdetail, window.pendingDMUserId);
          }
        } catch (e) {
          console.error('自动打开DM详情失败:', e);
        }
        if (cb) cb();
        return;
      }
      // 获取用户信息并更新界面-No need in DM page
      // Get local
      await chrome.storage.local.get({ dmlist: [] }, async function (r) {
        dmList = r.dmlist;
        if (type === "forceRefresh" || type === "up") {
          curDmPage = 1;
          dmList = [];
          result = await getDMConversation(curDmPage, dmPageCnt);
        } else if (type === "down") {
          if (curDmPage == 0)
            dmList = []; // 清空全部数据，重新获取, in first page
          curDmPage = curDmPage + 1;
          result = await getDMConversation(curDmPage, dmPageCnt);
        } else {
          result = dmList;
        }

        console.log(result);
        dmList = await dmListUpdate({
          newlist: result.conversations,
        });

        showDMConversation(dmList, '#dmview');
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
    conversationElement.addEventListener('click', async function () {
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
            dmdetail.className = 'dmdetail';
            document.body.appendChild(dmdetail);
          } else {
            dmdetail.innerHTML = '';
            dmdetail.style.display = '';
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
    container.append(conversationElement);
  });

  // 检查是否有待打开的DM详情（来自消息流的.dm点击）
  if (window.shouldOpenPendingDMDetail && window.pendingDMUserId) {
    (async () => {
      try {
        window.curdm = await getDMDetails(window.pendingDMUserId);
        const dmview = document.querySelector('#dmview');
        if (dmview) dmview.style.display = 'none';
        let dmdetail = document.querySelector('#dmdetail');
        if (!dmdetail) {
          dmdetail = document.createElement('div');
          dmdetail.id = 'dmdetail';
          dmdetail.className = 'dmdetail';
          document.body.appendChild(dmdetail);
        } else {
          dmdetail.innerHTML = '';
          dmdetail.style.display = '';
        }
        if (typeof showDMDetail === 'function') {
          showDMDetail(window.curdm, dmdetail, window.pendingDMUserId);
        }
      } catch (e) {
        console.error('自动打开DM详情失败:', e);
      } finally {
        // 清理全局变量 - 在返回处理了
      }
    })();
  }
}
function showDMDetail(dmDetail, container, otherUserId) {
  // 清空内容
  container.innerHTML = '';
  // 添加userid水印到dmdetail根节点，并绑定点击事件
  const idWatermark = document.createElement('span');
  idWatermark.className = 'dm-detail-userid-watermark';
  idWatermark.textContent = otherUserId;
  idWatermark.title = '点击查看该用户消息';
  idWatermark.style.cursor = 'pointer';
  container.appendChild(idWatermark);
  $('.dm-detail-userid-watermark').off('click');
  $('.dm-detail-userid-watermark').on('click', function (e) {
    e.stopPropagation();
    switchToShowUserTab(otherUserId);
    $('#dmdetail').remove();
  });
  // 添加返回按钮（顶部banner）
  const backBtn = document.createElement('button');
  backBtn.textContent = ' 返回 ';
  backBtn.className = 'dm-detail-back-btn';
  // 标记本次详情页是否发送过DM
  if (typeof container.hasSentDM === 'undefined') container.hasSentDM = false;
  backBtn.onclick = async function () {
    container.style.display = 'none';
    const dmview = document.querySelector('#dmview');
    if (dmview) dmview.style.display = '';
    // 如果是通过window的全局变量跳转进来的，返回时直接跳首页并清理变量
    if (window.shouldOpenPendingDMDetail || window.pendingDMUserId) {
      const homeBtn = document.querySelector('#home');
      if (homeBtn) homeBtn.click();
      window.shouldOpenPendingDMDetail = false;
      window.pendingDMUserId = null;
      return;
    }
    // 仅当本次详情页发送过DM时才刷新对话列表
    if (container.hasSentDM) {
      // 这里可根据实际需求刷新DM列表
      // 例如：await buildDMListPage(...)
    }
  };
  container.appendChild(backBtn);


  // 聊天消息区
  const chatBox = document.createElement('div');
  chatBox.className = 'dm-chat-box';

  // 获取当前用户id
  const curUserId = (typeof curUsr !== 'undefined' && curUsr.id) ? curUsr.id : null;

  (dmDetail.messages || []).forEach(msg => {
    const isMe = curUserId && msg.sender_id === curUserId;
    const msgItem = document.createElement('div');
    msgItem.className = 'dm-msg-item' + (isMe ? ' me' : '');
    const avatar = document.createElement('img');
    avatar.className = 'dm-msg-avatar';
    avatar.src = msg.sender && msg.sender.profile_image_url ? msg.sender.profile_image_url : '';
    avatar.alt = msg.sender && msg.sender.screen_name ? msg.sender.screen_name : '';
    // 气泡
    const bubble = document.createElement('div');
    bubble.className = 'dm-msg-bubble' + (isMe ? ' me' : '');
    bubble.textContent = msg.text;
    // 时间放在气泡内底部
    const time = document.createElement('div');
    time.className = 'dm-msg-time';
    time.textContent = new Date(msg.created_at).toLocaleString();
    bubble.appendChild(time);
    if (isMe) {
      msgItem.appendChild(bubble);
      msgItem.appendChild(avatar);
    } else {
      msgItem.appendChild(avatar);
      msgItem.appendChild(bubble);
    }
    chatBox.appendChild(msgItem);
  });
  container.appendChild(chatBox);

  // 底部输入区
  let inputBar = document.createElement('div');
  inputBar.className = 'dm-detail-inputbar';
  inputBar.innerHTML = `
    <input type="text" placeholder="输入私信内容..." />
    <button>发送</button>
  `;
  container.appendChild(inputBar);

  // 发送事件集成
  const input = inputBar.querySelector('input[type="text"]');
  const sendBtn = inputBar.querySelector('button');
  async function doSendDM() {
    const text = input.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';
    try {
      await sendDM(otherUserId, text);
      input.value = '';
      // 重新获取并刷新对话
      const newDetail = await getDMDetails(otherUserId);
      showDMDetail(newDetail, container, otherUserId);
      // 发送后刷新会话列表并存储
      const result = await getDMConversation(1, dmPageCnt);
      dmList = await dmListUpdate({ newlist: result.conversations });
      // 标记已发送
      container.hasSentDM = true;
    } catch (e) {
      toastr.error('发送失败: ' + (e && e.message ? e.message : e), '错误');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '发送';
    }
  }
  sendBtn.addEventListener('click', doSendDM);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      doSendDM();
    }
  });
}
