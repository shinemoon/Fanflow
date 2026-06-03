// banner切换封装
let validToken = null;
let curUsr = null;
let otherUsrId = null;

let curNotification = null;
// local list max as 100 msb
let curList = [];
let mentionList = [];

let dmList = [];
// This is for the 'switch showing' list
let showList = [];
let showid = null; //curshow userid

let listLength = 400;
let fetchCnt = 20;
var lastReadInd = 0;
let pagline = null;
let initRrefresh = false;

let preTab = '';
// Possible values for curTab: 
// 'home'
// 'mentions'
// 'showUser'
// 'dm'

let curTab = 'home';

function requestBackgroundSync(reason = 'popup') {
  chrome.runtime.sendMessage({
    action: 'fanflow:syncNow',
    reason: reason
  }).catch(() => {
    // Service worker may be waking up; ignore transient message errors.
  });
}

function normalizeCount(value) {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'object') {
    return (
      Number(value.unread) ||
      Number(value.count) ||
      Number(value.total) ||
      0
    );
  }

  return Number(value) || 0;
}

function getTimelineUnreadCount(notification) {
  if (!notification) return 0;

  const timelineKeys = [
    'timeline',
    'statuses',
    'home_timeline',
    'home_timeline_unread',
    'notify_num'
  ];

  for (const key of timelineKeys) {
    const count = normalizeCount(notification[key]);
    if (count > 0) return count;
  }

  return 0;
}

function getHomeTopMessageId() {
  return (Array.isArray(curList) && curList.length > 0 && curList[0] && curList[0].id)
    ? curList[0].id
    : null;
}

function markTimelineAsReadByHomeTab() {
  return new Promise((resolve) => {
    const readId = getHomeTopMessageId();

    if (readId) {
      chrome.runtime.sendMessage({
        action: 'fanflow:markTimelineRead',
        reason: 'home-tab-click',
        readId: readId
      }).finally(() => {
        resolve();
      });
      return;
    }

    chrome.storage.local.get({ homelist: [] }, function (result) {
      const list = Array.isArray(result.homelist) ? result.homelist : [];
      const fallbackReadId = (list.length > 0 && list[0] && list[0].id) ? list[0].id : null;

      chrome.runtime.sendMessage({
        action: 'fanflow:markTimelineRead',
        reason: 'home-tab-click',
        readId: fallbackReadId
      }).finally(() => {
        resolve();
      });
    });
  });
}

function applyNotificationToUi(notification, cache) {
  if (!notification) return;

  const cacheTimeline = Number(cache && cache.timelineUnread);
  const timelineCount = Number.isFinite(cacheTimeline) && cacheTimeline >= 0
    ? cacheTimeline
    : getTimelineUnreadCount(notification);
  const mentionCount = Number(notification.mentions) || 0;
  const dmCount = Number(notification.direct_messages) || 0;
  const requestCount = Number(notification.friend_requests) || 0;

  refreshBadges(timelineCount, mentionCount, dmCount);

  if (requestCount > 0) {
    $('#user-avator').addClass('userNotify');
  } else {
    $('#user-avator').removeClass('userNotify');
  }
}

function ensureSyncStatusElement() {
  let statusEl = document.getElementById('sync-status');
  if (statusEl) return statusEl;

  const container = document.querySelector('.container');
  if (!container) return null;

  statusEl = document.createElement('div');
  statusEl.id = 'sync-status';
  statusEl.style.cssText = 'position: absolute;right: 10px;bottom: 0px;font-size: 11px;color: rgba(115, 118, 110, 0.4)!important; background: rgba(255, 255, 255, 0.85);z-index: 5;';
  container.appendChild(statusEl);
  return statusEl;
}

function formatSyncTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString();
}

function renderSyncStatus(cache) {
  const statusEl = ensureSyncStatusElement();
  if (!statusEl) return;

  if (!cache) {
    statusEl.textContent = '同步: 等待中';
    statusEl.style.color = '#6b7280';
    return;
  }

  const state = cache.syncState || 'idle';
  const timeLabel = formatSyncTime(cache.lastUpdatedAt);

  if (state === 'ok') {
    statusEl.textContent = timeLabel ? `同步: ${timeLabel}` : '同步: 已完成';
    statusEl.style.color = '#0f766e';
    return;
  }

  if (state === 'unauthenticated' || state === 'auth-invalid') {
    statusEl.textContent = '同步: 需登录';
    statusEl.style.color = '#b45309';
    return;
  }

  if (state === 'error') {
    statusEl.textContent = '同步: 失败';
    statusEl.style.color = '#b91c1c';
    return;
  }

  statusEl.textContent = timeLabel ? `同步: ${timeLabel}` : '同步: 进行中';
  statusEl.style.color = '#6b7280';
}


// Default Stub
let userInfo = {
  id: "_",
  name: "NickName",
  screen_name: "NickName",
  url: "https://fanfou.com",
  profile_image_url: "images/avator.png",
  profile_image_url_large: "images/avator.png",
  followers_count: 0,
  friends_count: 0,
  description: "有目的地生活"
};

let dmmode = "conversation";

// Page Init


document.addEventListener("DOMContentLoaded", async () => {
  pagline = new ProgressBar.Line('#progress', {
    // Stroke color.
    // Default: '#555'
    color: 'lightblue',

    // Width of the stroke.
    // Unit is percentage of SVG canvas' size.
    // Default: 1.0
    // NOTE: In Line shape, you should control
    // the stroke width by setting container's height.
    // WARNING: IE doesn't support values over 6, see this bug:
    //          https://github.com/kimmobrunfeldt/progressbar.js/issues/79
    strokeWidth: 0.3,

    // If trail options are not defined, trail won't be drawn

    // Color for lighter trail stroke
    // underneath the actual progress path.
    // Default: '#eee'
    trailColor: '#f4f4f4',

    // Width of the trail stroke. Trail is always centered relative to
    // actual progress path.
    // Default: same as strokeWidth
    trailWidth: 0.1,
  });
  pagline.animate(0);

  // popup打开时仅执行一次主页刷新，避免重复请求
  buildHomePage("forceRefresh", function () {
    bindClickActions();
    markTimelineAsReadByHomeTab().finally(() => {
      loadAndRefreshNotifications();
    });
  });
  // Bind page listener
  $('.feed').on('wheel', debounce(function (event) {
    const feedElement = $(this)[0];
    const scrollTop = feedElement.scrollTop;
    const scrollHeight = feedElement.scrollHeight;
    const clientHeight = feedElement.clientHeight;
    let toBottom = scrollHeight - scrollTop - clientHeight;
    // Check if scrolled to bottom /top => Bottom first
    if (event.originalEvent.deltaY > 0 && toBottom <= 10) {
      if (NProgress.status == null) {
        console.log('Reached bottom');
        if (curTab === 'home')
          buildHomePage("down", bindClickActions);
        else if (curTab === 'mentions')
          buildMentionListPage('down', bindClickActions);
        else if (curTab === 'showUser')
          buildUserListPage(showid, 'down', bindClickActions);
        else if (curTab === 'dm')
          buildDMListPage(null, 'down', dmmode, function () { });
      }
    } else if (event.originalEvent.deltaY < 0 && scrollTop === 0) {
      // Check if scrolled to bottom (with 50px threshold)
      console.log('Reached top');
      if (NProgress.status == null) {
        if (curTab === 'home')
          buildHomePage("up", bindClickActions);
        else if (curTab === 'mentions')
          buildMentionListPage('up', bindClickActions);
        else if (curTab === 'showUser')
          buildUserListPage(showid, 'up', bindClickActions);
        else if (curTab === 'dm') // For dm , no need so complicateed handling, must force refresh
          buildDMListPage(null, 'forceRefresh', dmmode, function () { });
      }
    }
  }, 200));


  // 效果
  // Hover effect for span elements inside #float-buttons
  $('#float-buttons>div').hover(
    function () {
      // Mouse enter
      $(this).html("<div class='hint'>" + $(this).attr('value') + "</div>");
    },
    function () {
      // Mouse leave
      $(this).html(''); // Reset to original text if needed
    }
  );
  // Add badges to mentions and dm tabs
  const $homeBadge = $('<div>').addClass('badge badge-home').text('0');
  $('#home').css('position', 'relative').append($homeBadge);
  // Add mention badge
  const $mentionBadge = $('<div>').addClass('badge badge-mention').text('0');
  $('#mentions').css('position', 'relative').append($mentionBadge);
  // Add DM badge
  const $dmBadge = $('<div>').addClass('badge badge-dm').text('0');
  $('#dm').css('position', 'relative').append($dmBadge);
//  renderSyncStatus(null);
  loadAndRefreshNotifications();
  requestBackgroundSync('popup-open');

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.messageCache || changes.notification) {
      loadAndRefreshNotifications();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.action === 'fanflow:messageCacheUpdated') {
      loadAndRefreshNotifications();
    }
  });
});


/**
 * 更新用户信息到页面 UI 元素
 * @param {Object} usr - 用户信息对象
 * @param {string} usr.profile_image_url - 用户头像 URL
 * @param {string} usr.screen_name - 用户昵称
 * @param {string} usr.description - 用户简介
 * @param {number} usr.followers_count - 粉丝数量
 * @param {number} usr.friends_count - 关注数量
 */
function updateUserInfo(usr) {
  $('#user-avator img').prop("src", usr.profile_image_url);
  $('#user-name').text(usr.screen_name);
  $('#user-description').text(usr.description);
  $('#user-follower .value').text(String(usr.followers_count));
  $('#user-following .value').text(String(usr.friends_count));
}

function bindClickActions() {
  //For Timeline
  $('.tab').off('click');
  $('.tab').click(function () {
    $('.tab.active').removeClass('active');

    //  Workaround，确保tab点击都会回到主界面
    bannerToggle('self');

    $(this).addClass('active');
    let ntype = 'init';
    if ($(this).prop('id') == 'home') {
      console.log("home clicked");
      $('.feed').addClass('background');
      $('#feed').removeClass('background');
      markTimelineAsReadByHomeTab().finally(() => {
        requestBackgroundSync('tab-click-home');
        loadAndRefreshNotifications();
      });

      if (curTab != "home" && curList.length > 0) {
        // If just swtich layers, no need to change content
        preTab = curTab;
        curTab = 'home';
        //        $('#feed').empty();
      } else {
        $('#feed').scrollTop(0);
        ntype = 'forceRefresh';
      }
      buildHomePage(ntype, bindClickActions);
    } else if ($(this).prop('id') == 'mentions') {
      requestBackgroundSync('tab-click');
      loadAndRefreshNotifications();
      console.log("mentions clicked");
      $('.feed').addClass('background');
      $('#mentioned').removeClass('background');
      //if (curTab != "mentions" && mentionList.length > 0) {
      if (curTab != "mentions") {
        preTab = curTab;
        curTab = 'mentions';
        //$('#mentioned').empty();
      } else {
        $('#mentioned').scrollTop(0);
        ntype = 'forceRefresh';
      }
      buildMentionListPage(ntype, bindClickActions);
    } else if ($(this).prop('id') == 'dm') {
      requestBackgroundSync('tab-click');
      loadAndRefreshNotifications();
      if (window.shouldOpenPendingDMDetail && window.pendingDMUserId) {
        console.log("dm detail clicked");
        //
        $('.feed').addClass('background');
        bannerToggle('none');
        buildDMListPage(null, "init", dmmode, bindClickActions);
      } else {
        console.log("dm clicked");
        $('.feed').addClass('background');
        $('#dmview').removeClass('background');
        //if (curTab != "dm" && dmList.length > 0) {
        if (curTab != "dm") {
          preTab = curTab;
          curTab = 'dm';
          ntype = "init";
        } else {
          $('#dmview').scrollTop(0);
          ntype = 'forceRefresh';
        }
        buildDMListPage(null, ntype, dmmode, bindClickActions);
      }
    }
  });

  // non-tab click

  $('.button').off('click');
  $('.button').click(function () {
    if ($(this).prop('id') == 'editor') {
      console.log("editor clicked");
      constructPop("editor", null);
    };
  });

  // For img 
  $('.content-img').off('click');
  $('.content-img').click(function () {
    console.log("content-img switchMask");
    constructPop("img", [$(this).attr("src"), $(this).attr('largeurl')]);
  });


  //For Mask
  $('#popmask').off("click");
  $('#popmask').on('click', function (event) {
    // 检查点击的目标是否是 #popframe 或其子元素
    if (!$(event.target).closest('#popframe').length) {
      // 在这里执行你希望在 #popframe 之外点击时触发的操作
      console.log("popmask switchMask");
      $('#popmask').removeClass('show');
    }
  });


  // For name & link in message
  $('a, span.msg-nickname').off("click");
  $('a, span.msg-nickname').on('click', function (event) {
    event.preventDefault(); // 阻止默认跳转行为
    //Name
    if ($(this).hasClass('former') || $(this).hasClass('msg-nickname')) {
      // 切换到showUser Tab，封装为函数
      const getShowId = (el) => el.hasClass('former') ? el.attr('href').split('/').pop() : el.attr('usrid');
      switchToShowUserTab(getShowId($(this)));
    } else {
      let targetUrl = new URL($(this).attr('href'), 'https://fanfou.com');
      window.open(targetUrl);
    }
  });
  // 处理分页返回
  $('#switchLayer').off("click");
  $("#switchLayer").on('click', function (event) {
    /*
    $('#userinfo').removeClass("background");
    $('#user-description').removeClass("background");
    $('#switch-description').addClass("background");
    $('.button-array').removeClass('background');
    */


    if (preTab == "home") {
      $('#home').click();
    } else if (preTab == "mentions") {
      $('#mentions').click();
    } else if (preTab == "showUser") {
      $('#home').click();
    } else {
      $('#home').click();
    };
  });


  //float buttons actions:
  // - top
  $('#float-buttons div').off('click');
  $("#float-buttons div").on('click', function (event) {
    const spanId = $(this).attr('id');
    switch (spanId) {
      case 'top':
        // 执行顶部按钮的操作
        console.log('Top button clicked');
        $('.feed:not(.background)').animate({ scrollTop: 0 }, 'slow');
        break;
      case 'follow':
        // 执行添加按钮的操作
        console.log('Add button clicked');
        break;
      case 'unfollow':
        // 执行移除按钮的操作
        console.log('Remove button clicked');
        break;
      case 'touser':
        window.open('https://fanfou.com/' + otherUsrId, '_blank');
        break;
      default:
        console.log('Unknown button clicked');
    }
  });
}

// 封装切换到showUser Tab的函数
function switchToShowUserTab(userid) {
  preTab = curTab;
  curTab = "showUser";
  $('.feed').addClass('background');
  // 每次切进来都必重刷（临时性显示层）
  showList = [];
  $('#switchshow').empty();
  $('#switchshow').removeClass('background');
  showid = userid;
  // 切换信息
  bannerToggle('other');
  buildUserListPage(showid, 'init', bindClickActions);
}

function constructPop(type, content) {
  var $popframe = $('#popframe');
  $popframe.empty();

  // Add control row
  var $controls = $('<div>').addClass('pop-controls');
  // General
  $controls.append($('<span class="retweet">').addClass('icon-retweet'));
  $controls.append($('<span class="reply">').addClass('icon-reply'));
  $controls.append($('<span class="star">').addClass('icon-star'));
  // for pic
  $controls.append($('<span class="resize">').addClass('icon-resize'));
  $controls.append($('<span class="download">').addClass('icon-download2'));
  // for writer


  $popframe.append($controls);
  var ctrl_buttons = ['retweet', 'reply', 'star', 'resize', 'download'];
  // For img display
  if (type == "img") {
    ctrl_buttons = ['resize', 'download'];
    buildPopImg(content[0], content[1]);
  } else if (type == "editor") {
    ctrl_buttons = [];
    buildPopEditor('new');
  } else if (type == "retweet" || type == "reply") {
    ctrl_buttons = [];
    buildPopEditor(type, content);
  }
  ctrl_buttons.forEach(btn => $('.' + btn).addClass("show"));
  applyDarkMode();
  $('.mask').addClass('show');
}

// Other initilaization
toastr.options = {
  "closeButton": false,
  "debug": false,
  "newestOnTop": false,
  "progressBar": false,
  "positionClass": "toast-top-center",
  "preventDuplicates": true,
  "onclick": null,
  "showDuration": "300",
  "hideDuration": "1000",
  "timeOut": "5000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut"
}

function bannerToggle(type = 'self') {
  // 所有涉及的元素
  const $userinfo = $('#userinfo');
  const $userDescription = $('#user-description');
  const $buttonArray = $('.button-array');
  const $switchDescription = $('#switch-description');
  const $switchLayer = $('#switchLayer');

  if (type === 'self') {
    // switch开头的都加background，其他都去掉
    $userinfo.removeClass('background');
    $userDescription.removeClass('background');
    $buttonArray.removeClass('background');
    $switchDescription.addClass('background');
    $switchLayer.addClass('background');
  } else if (type === 'other') {
    // switch开头的都去掉background，其他都加上
    $userinfo.addClass('background');
    $userDescription.addClass('background');
    $buttonArray.addClass('background');
    $switchDescription.removeClass('background');
    $switchLayer.removeClass('background');
  } else if (type === 'none') {
    // 全部加background
    $userinfo.addClass('background');
    $userDescription.addClass('background');
    $buttonArray.addClass('background');
    $switchDescription.addClass('background');
    $switchLayer.addClass('background');
  }
}

// 用户头像和昵称点击跳转
$(document).on('click', '#user-avator, #user-name', function () {
  if (curUsr && curUsr.id) {
    const url = `https://fanfou.com/${curUsr.id}`;
    window.open(url, '_blank');
  }
});

// Load notifications from local storage and update badges
function loadAndRefreshNotifications() {
  chrome.storage.local.get({
    messageCache: null,
    notification: null
  }, function (result) {
    const cache = result.messageCache;
    curNotification = (cache && cache.notification) ? cache.notification : result.notification;
//    renderSyncStatus(cache);

    if (curNotification == null) {
      refreshBadges(0, 0, 0);
      $('#user-avator').removeClass('userNotify');
      return;
    }

    applyNotificationToUi(curNotification, cache);
  });

}

/**
 * 刷新 mentions 和 dm 的 badge
 * @param {number} timelineCount - 首页未读数量
 * @param {number} mentionCount - 提及数量
 * @param {number} dmCount - 私信数量
 */
function refreshBadges(timelineCount, mentionCount, dmCount) {
  const $homeBadge = $('.badge-home');
  const $mentionBadge = $('.badge-mention');
  const $dmBadge = $('.badge-dm');
  if ($homeBadge.length) {
    if (timelineCount > 0) {
      $homeBadge.text(timelineCount).show();
    } else {
      $homeBadge.hide();
    }
  }
  if ($mentionBadge.length) {
    if (mentionCount > 0) {
      $mentionBadge.text(mentionCount).show();
    } else {
      $mentionBadge.hide();
    }
  }
  if ($dmBadge.length) {
    if (dmCount > 0) {
      $dmBadge.text(dmCount).show();
    } else {
      $dmBadge.hide();
    }
  }
}
