// 修改fanfou.js中的fanfouRequest函数
async function fanfouRequest(apiurl, fmode, params, formData = null) {
    //NProgress.start();
    const url = new URL(apiurl);

    // 生成OAuth签名
    const queryParams = params || {};
    const signParams = {
        oauth_consumer_key: CONSUMER_KEY,
        oauth_nonce: OAuth1.generateNonce(),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: OAuth1.generateTimestamp(),
        oauth_token: validToken.oauthToken,
        oauth_version: "1.0"
    };

    //var headerParams = (fmode == 'POST') ? {} : signParams;
    var headerParams = signParams;

    try {
        const signature = generateOAuthSignature(
            fmode,
            url,
            formData ? {} : queryParams, // 如果是formData则不签名字
            headerParams,
            CONSUMER_SECRET,
            validToken.oauthTokenSecret
        );

        headerParams.oauth_signature = signature;
        if (fmode === 'POST' && formData) {
            /* // Remove header
            Object.entries(signParams).forEach(([key, value]) => {
                formData.append(key, value);
            });
            */
        }
        const authHeader = OAuth1.buildAuthHeader(headerParams);

        // 构造请求头
        const headers = new Headers({
            'Authorization': authHeader
        });

        // 根据请求类型设置Content-Type
        if (formData) {
            // 不设置Content-Type头，浏览器会自动处理multipart边界
        } else {
            headers.append('Content-Type', 'application/json');
            // 添加查询参数到URL
            Object.entries(queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }

        const fetchOptions = {
            method: fmode,
            headers: headers,
            body: formData || (fmode !== 'GET' ? JSON.stringify(queryParams) : null)
        };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    } catch (error) {
        throw error;
    } finally {
        //NProgress.done();
    }
}

async function getMentions(since_id = null, max_id = null) {
    const url = new URL(FANFOU_API_BASE + '/statuses/mentions.json');
    const queryParams = {
        format: 'html',
        mode: 'lite',
        count: fetchCnt
    };

    if (since_id)
        queryParams.since_id = since_id;

    if (max_id)
        queryParams.max_id = max_id;

    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        const result = await response.json();
        return { msglist: result };
    } catch (error) {
        console.error('Error fetching mentions:', error);
        throw error;
    }
}

/**
 * 获取通知数量（account/notification）
 * https://github.com/FanfouAPI/FanFouAPIDoc/wiki/account.notification
 * 返回 { mention, direct_message, follower, favorite }
 */
async function getNotification() {
    const url = new URL(FANFOU_API_BASE + '/account/notification.json');
    const queryParams = {
        format: 'html',
        mode: 'lite'
    };
    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        const data = await response.json();
        // 存储到 local storage
        chrome.storage.local.set({ notification: data });
        return data;
    } catch (error) {
        console.error('Error fetching notification:', error);
        throw error;
    }
}

/**
 * 更新通知数字（account/update-notify-num）
 * https://github.com/FanfouAPI/FanFouAPIDoc/wiki/account.update-notify-num
 * 返回 { notify_num }
 */
async function updateNotifyNum(num) {
    const url = new URL(FANFOU_API_BASE + '/account/update-notify-num.json');
    const queryParams = {
        notify_num: num,
        format: 'html',
        mode: 'lite'
    };
    try {
        const response = await fanfouRequest(url, 'POST', queryParams);
        const data = await response.json();
        // 存储到 local storage
        chrome.storage.local.set({ notify_num: data.notify_num });
        return data;
    } catch (error) {
        console.error('Error updating notify_num:', error);
        throw error;
    }
}