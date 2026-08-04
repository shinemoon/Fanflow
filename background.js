/*
 * FanFlow background sync scheduler
 * - Single source of truth for unread notification and prefetched message caches
 * - Runs on startup and every 3 minutes
 */

importScripts(
  'fanfou/crypto-js.min.js',
  'FanfouLite/cred.js',
  'fanfou/oauth1.js'
);

const SYNC_INTERVAL_MS = 3 * 60 * 1000;
const SYNC_ALARM_NAME = 'fanflow-sync-alarm';
const PREFETCH_MENTION_COUNT = 20;
const PREFETCH_DM_COUNT = 8;
const PREFETCH_HOME_TIMELINE_COUNT = 40;
const HOME_LIST_LIMIT = 400;

const CACHE_KEY = 'messageCache';
const LEGACY_NOTIFICATION_KEY = 'notification';

let validToken = null;
let syncInProgress = false;
let syncPending = false;

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
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

function getTimelineUnreadFromCache(cache, notification) {
  const cacheCount = Number(cache && cache.timelineUnread);
  if (Number.isFinite(cacheCount) && cacheCount >= 0) {
    return cacheCount;
  }

  return getTimelineUnreadCount(notification);
}

function calculateTimelineUnread(homeTimeline, lastReadId) {
  if (!Array.isArray(homeTimeline) || homeTimeline.length === 0 || !lastReadId) {
    return {
      unreadCount: 0,
      foundAnchor: false
    };
  }

  let unreadCount = 0;
  let foundAnchor = false;
  const seen = new Set();

  for (const message of homeTimeline) {
    if (!message || !message.id) continue;
    if (seen.has(message.id)) continue;
    seen.add(message.id);

    if (message.id === lastReadId) {
      foundAnchor = true;
      break;
    }

    unreadCount += 1;
  }

  return {
    unreadCount,
    foundAnchor
  };
}

function mergeHomeTimelineLists(primaryList, secondaryList, limit = HOME_LIST_LIMIT) {
  const merged = [];
  const seen = new Set();

  [primaryList, secondaryList].forEach((list) => {
    if (!Array.isArray(list)) return;

    list.forEach((message) => {
      if (!message || !message.id || seen.has(message.id)) return;
      seen.add(message.id);
      merged.push(message);
    });
  });

  return merged.slice(0, limit);
}

function setBadgeFromNotification(notification, cache) {
  const mentionCount = Number(notification && notification.mentions) || 0;
  const dmCount = Number(notification && notification.direct_messages) || 0;
  const requestCount = Number(notification && notification.friend_requests) || 0;
  const timelineCount = getTimelineUnreadFromCache(cache, notification);
  const total = mentionCount + dmCount + requestCount + timelineCount;
  const titleLines = ['FanFlow'];

  if (timelineCount > 0) titleLines.push(`Home: ${timelineCount}`);
  if (mentionCount > 0) titleLines.push(`Mention: ${mentionCount}`);
  if (dmCount > 0) titleLines.push(`DM: ${dmCount}`);
  if (requestCount > 0) titleLines.push(`Request: ${requestCount}`);

  chrome.action.setBadgeText({ text: total > 0 ? String(total) : '' });
  chrome.action.setTitle({ title: titleLines.join('\n') });
  return total;
}

function extractApiError(data) {
  if (!data) return '';

  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }

  return '';
}

async function requestApi(path, method, queryParams, token) {
  const url = new URL(FANFOU_API_BASE + path);
  const requestQuery = queryParams || {};

  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: OAuth1.generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: OAuth1.generateTimestamp(),
    oauth_token: token.oauthToken,
    oauth_version: '1.0'
  };

  oauthParams.oauth_signature = generateOAuthSignature(
    method,
    url,
    requestQuery,
    oauthParams,
    CONSUMER_SECRET,
    token.oauthTokenSecret
  );

  const headers = new Headers({
    Authorization: OAuth1.buildAuthHeader(oauthParams)
  });

  let body = null;
  if (method === 'GET') {
    Object.entries(requestQuery).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
  } else {
    headers.append('Content-Type', 'application/json');
    body = JSON.stringify(requestQuery);
  }

  const response = await fetch(url, {
    method,
    headers,
    body
  });

  const text = await response.text();
  let parsed = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = null;
    }
  }

  const apiError = extractApiError(parsed);
  if (apiError) {
    throw new Error(apiError);
  }

  if (!response.ok) {
    throw new Error('HTTP error! status: ' + response.status);
  }

  return parsed;
}

async function validateTokenForBackground(token) {
  const user = await validateToken(token.oauthToken, token.oauthTokenSecret);
  return user || null;
}

async function writeSyncState(partial) {
  const current = await storageGet({
    messageCache: {
      notification: null,
      mentions: [],
      dmConversations: [],
      homeTimeline: [],
      homeTimelineLastSyncAt: null,
      timelineUnread: 0,
      timelineLastReadId: null,
      timelineLastSeenAt: null,
      timelineInitialized: false,
      lastUpdatedAt: null,
      syncState: 'idle',
      lastError: null,
      source: null
    }
  });

  const merged = Object.assign({}, current.messageCache || {}, partial);

  await storageSet({
    messageCache: merged,
    notification: merged.notification || null
  });

  return merged;
}

function notifyPopupCacheUpdated(cache, total) {
  chrome.runtime.sendMessage({
    action: 'fanflow:messageCacheUpdated',
    payload: {
      totalNotify: total,
      lastUpdatedAt: cache.lastUpdatedAt,
      syncState: cache.syncState
    }
  }).catch(() => {
    // Popup may be closed.
  });
}

async function performSync(trigger) {
  const token = await getStoredToken();
  const existing = await storageGet({
    messageCache: {
      notification: null,
      mentions: [],
      dmConversations: [],
      homeTimeline: [],
      homeTimelineLastSyncAt: null,
      timelineUnread: 0,
      timelineLastReadId: null,
      timelineLastSeenAt: null,
      timelineInitialized: false,
      lastUpdatedAt: null,
      syncState: 'idle',
      lastError: null,
      source: null
    },
    homelist: []
  });
  const previousCache = existing.messageCache || {};

  if (!token) {
    chrome.action.setBadgeText({ text: '?' });
    chrome.action.setTitle({ title: 'FanFlow\n状态: 未登录（缺少 token）' });
    const cache = await writeSyncState({
      notification: null,
      syncState: 'unauthenticated',
      lastError: 'missing token',
      source: trigger,
      lastUpdatedAt: Date.now()
    });
    notifyPopupCacheUpdated(cache, 0);
    return;
  }

  const userInfo = await validateTokenForBackground(token);
  if (!userInfo) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setTitle({ title: 'FanFlow\n状态: 登录失效（token invalid）' });
    const cache = await writeSyncState({
      syncState: 'auth-invalid',
      lastError: 'token invalid',
      source: trigger,
      lastUpdatedAt: Date.now()
    });
    notifyPopupCacheUpdated(cache, 0);
    return;
  }

  validToken = {
    oauthToken: token.oauthToken,
    oauthTokenSecret: token.oauthTokenSecret
  };

  await storageSet({ userinfo: userInfo });

  try {
    const notification = await requestApi(
      '/account/notification.json',
      'GET',
      { format: 'html', mode: 'lite' },
      validToken
    );

    let mentions = [];
    let dmConversations = [];
    let fetchedHomeTimeline = [];
    const previousHomeTimeline = Array.isArray(previousCache.homeTimeline)
      ? previousCache.homeTimeline
      : (Array.isArray(existing.homelist) ? existing.homelist : []);

    if ((Number(notification && notification.mentions) || 0) > 0) {
      const mentionData = await requestApi(
        '/statuses/mentions.json',
        'GET',
        { format: 'html', mode: 'lite', count: PREFETCH_MENTION_COUNT },
        validToken
      );
      if (Array.isArray(mentionData)) {
        mentions = mentionData;
      }
    }

    if ((Number(notification && notification.direct_messages) || 0) > 0) {
      const dmData = await requestApi(
        '/direct_messages/conversation_list.json',
        'GET',
        { format: 'html', mode: 'lite', page: 1, count: PREFETCH_DM_COUNT },
        validToken
      );
      if (Array.isArray(dmData)) {
        dmConversations = dmData;
      }
    }

    try {
      const homeTimelineData = await requestApi(
        '/statuses/home_timeline.json',
        'GET',
        { format: 'html', mode: 'lite', count: PREFETCH_HOME_TIMELINE_COUNT },
        validToken
      );
      if (Array.isArray(homeTimelineData)) {
        fetchedHomeTimeline = homeTimelineData;
      }
    } catch (timelineError) {
      // Keep the previous timeline unread state when timeline prefetch fails.
      console.warn('home timeline prefetch failed:', timelineError);
    }

    const homeTimeline = mergeHomeTimelineLists(fetchedHomeTimeline, previousHomeTimeline);

    const latestState = await storageGet({
      messageCache: {
        notification: null,
        mentions: [],
        dmConversations: [],
        homeTimeline: [],
        homeTimelineLastSyncAt: null,
        timelineUnread: 0,
        timelineLastReadId: null,
        timelineLastSeenAt: null,
        timelineInitialized: false,
        lastUpdatedAt: null,
        syncState: 'idle',
        lastError: null,
        source: null
      }
    });

    const latestCache = latestState.messageCache || previousCache;
    const previousTimelineUnread = Number(latestCache.timelineUnread) || 0;
    let timelineUnread = previousTimelineUnread;
    let timelineLastReadId = latestCache.timelineLastReadId || null;
    let timelineInitialized = Boolean(latestCache.timelineInitialized);
    let timelineLastSeenAt = latestCache.timelineLastSeenAt || previousCache.timelineLastSeenAt || null;

    if (homeTimeline.length > 0) {
      const currentTopId = homeTimeline[0].id || null;

      if (!timelineInitialized || !timelineLastReadId) {
        timelineUnread = 0;
        timelineInitialized = true;
        timelineLastReadId = currentTopId;
      } else {
        const unread = calculateTimelineUnread(homeTimeline, timelineLastReadId);
        if (unread.foundAnchor) {
          timelineUnread = unread.unreadCount;
        } else if (previousTimelineUnread === 0) {
          timelineUnread = 0;
        } else {
          timelineUnread = unread.unreadCount;
        }
      }
    }

    const latestBeforeWriteState = await storageGet({
      messageCache: {
        notification: null,
        mentions: [],
        dmConversations: [],
        homeTimeline: [],
        homeTimelineLastSyncAt: null,
        timelineUnread: 0,
        timelineLastReadId: null,
        timelineLastSeenAt: null,
        timelineInitialized: false,
        lastUpdatedAt: null,
        syncState: 'idle',
        lastError: null,
        source: null
      }
    });

    const latestBeforeWriteCache = latestBeforeWriteState.messageCache || latestCache;
    const latestSeenAt = latestBeforeWriteCache.timelineLastSeenAt || null;

    if (latestSeenAt && (!timelineLastSeenAt || latestSeenAt > timelineLastSeenAt)) {
      timelineLastSeenAt = latestSeenAt;
      timelineLastReadId = latestBeforeWriteCache.timelineLastReadId || timelineLastReadId;
      timelineInitialized = Boolean(latestBeforeWriteCache.timelineInitialized);

      if (!timelineInitialized || !timelineLastReadId) {
        timelineUnread = 0;
      } else {
        const unread = calculateTimelineUnread(homeTimeline, timelineLastReadId);
        timelineUnread = unread.foundAnchor ? unread.unreadCount : 0;
      }
    }

    const cache = {
      notification,
      mentions,
      dmConversations,
      homeTimeline,
      homeTimelineLastSyncAt: Date.now(),
      timelineUnread,
      timelineLastReadId,
      timelineLastSeenAt: timelineLastSeenAt || Date.now(),
      timelineInitialized,
      lastUpdatedAt: Date.now(),
      syncState: 'ok',
      lastError: null,
      source: trigger
    };

    await storageSet({
      messageCache: cache,
      homelist: homeTimeline,
      notification,
      mentionPrefetch: mentions,
      dmPrefetch: dmConversations
    });

    const total = setBadgeFromNotification(notification, cache);
    notifyPopupCacheUpdated(cache, total);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    const cache = await writeSyncState({
      syncState: 'error',
      lastError: message,
      source: trigger,
      lastUpdatedAt: Date.now()
    });

    if (cache && cache.notification) {
      const total = setBadgeFromNotification(cache.notification, cache);
      notifyPopupCacheUpdated(cache, total);
    } else {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'FanFlow\n未读总数: 0' });
      notifyPopupCacheUpdated(cache, 0);
    }
  }
}

async function runSync(trigger) {
  if (syncInProgress) {
    syncPending = true;
    return;
  }

  syncInProgress = true;
  try {
    do {
      syncPending = false;
      await performSync(trigger);
    } while (syncPending);
  } finally {
    syncInProgress = false;
  }
}

function ensureSyncAlarm() {
  const periodInMinutes = Math.max(1, Math.round(SYNC_INTERVAL_MS / 60000));

  chrome.alarms.create(SYNC_ALARM_NAME, {
    delayInMinutes: 0.1,
    periodInMinutes
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureSyncAlarm();
  runSync('installed');
});

chrome.runtime.onStartup.addListener(() => {
  ensureSyncAlarm();
  runSync('startup-event');
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === SYNC_ALARM_NAME) {
    runSync('alarm');
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.fanfouToken) {
    runSync('token-changed');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'fanflow:syncNow') {
    runSync(message.reason || 'popup-request')
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error && error.message ? error.message : String(error)
        });
      });
    return true;
  }

  if (message && message.action === 'fanflow:markTimelineRead') {
    (async () => {
      const state = await storageGet({
        messageCache: {
          notification: null,
          mentions: [],
          dmConversations: [],
          homeTimeline: [],
          homeTimelineLastSyncAt: null,
          timelineUnread: 0,
          timelineLastReadId: null,
          timelineLastSeenAt: null,
          timelineInitialized: false,
          lastUpdatedAt: null,
          syncState: 'idle',
          lastError: null,
          source: null
        }
      });

      const currentCache = state.messageCache || {};
      let readId = (message && message.readId) ? message.readId : currentCache.timelineLastReadId;

      if (!readId && Array.isArray(currentCache.homeTimeline) && currentCache.homeTimeline.length > 0) {
        readId = currentCache.homeTimeline[0] && currentCache.homeTimeline[0].id
          ? currentCache.homeTimeline[0].id
          : null;
      }

      if (!readId) {
        const token = await getStoredToken();
        if (token) {
          const tokenUser = await validateTokenForBackground(token);
          if (tokenUser) {
            validToken = {
              oauthToken: token.oauthToken,
              oauthTokenSecret: token.oauthTokenSecret
            };
            try {
              const latestHome = await requestApi(
                '/statuses/home_timeline.json',
                'GET',
                { format: 'html', mode: 'lite', count: 1 },
                validToken
              );
              if (Array.isArray(latestHome) && latestHome.length > 0 && latestHome[0] && latestHome[0].id) {
                readId = latestHome[0].id;
              }
            } catch (e) {
              // Keep existing anchor if fetch fails.
            }
          }
        }
      }

      const updatedCache = Object.assign({}, currentCache, {
        timelineUnread: 0,
        timelineLastReadId: readId || currentCache.timelineLastReadId || null,
        timelineLastSeenAt: Date.now(),
        timelineInitialized: true,
        source: message && message.reason ? message.reason : 'popup-home-read',
        lastUpdatedAt: Date.now()
      });

      await storageSet({
        messageCache: updatedCache,
        notification: updatedCache.notification || null
      });

      const total = setBadgeFromNotification(updatedCache.notification, updatedCache);
      notifyPopupCacheUpdated(updatedCache, total);
      sendResponse({ ok: true });
    })().catch((error) => {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : String(error)
      });
    });

    return true;
  }

  return false;
});

ensureSyncAlarm();
runSync('startup');
