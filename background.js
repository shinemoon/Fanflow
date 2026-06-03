/*
 * FanFlow background sync scheduler
 * - Single source of truth for unread notification and prefetched message caches
 * - Runs on startup and every 3 minutes
 */

importScripts(
  'fanfou/crypto-js.min.js',
  'fanfou/cred.js',
  'fanfou/oauth1.js'
);

const SYNC_INTERVAL_MS = 3 * 60 * 1000;
const PREFETCH_MENTION_COUNT = 20;
const PREFETCH_DM_COUNT = 8;

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

function setBadgeFromNotification(notification) {
  const mentionCount = Number(notification && notification.mentions) || 0;
  const dmCount = Number(notification && notification.direct_messages) || 0;
  const requestCount = Number(notification && notification.friend_requests) || 0;
  const total = mentionCount + dmCount + requestCount;

  chrome.action.setBadgeText({ text: total > 0 ? String(total) : '' });
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

  if (!token) {
    chrome.action.setBadgeText({ text: '?' });
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

    const cache = {
      notification,
      mentions,
      dmConversations,
      lastUpdatedAt: Date.now(),
      syncState: 'ok',
      lastError: null,
      source: trigger
    };

    await storageSet({
      messageCache: cache,
      notification,
      mentionPrefetch: mentions,
      dmPrefetch: dmConversations
    });

    const total = setBadgeFromNotification(notification);
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
      const total = setBadgeFromNotification(cache.notification);
      notifyPopupCacheUpdated(cache, total);
    } else {
      chrome.action.setBadgeText({ text: '' });
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

chrome.runtime.onInstalled.addListener(() => {
  runSync('installed');
});

chrome.runtime.onStartup.addListener(() => {
  runSync('startup-event');
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

  return false;
});

runSync('startup');
setInterval(() => {
  runSync('interval');
}, SYNC_INTERVAL_MS);
