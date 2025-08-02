/**
 * 发送私信消息
 * @param {string} user_id - 接收方用户ID（必填）
 * @param {string} text - 消息内容（必填）
 * @param {object} options - 可选参数，如 in_reply_to_id
 * @returns {Promise<object>} - 返回发送后的消息对象
 */
async function sendDM(user_id, text, options = {}) {
    if (!user_id || !text) {
        throw new Error('user_id 和 text 均为必填项');
    }
    const url = FANFOU_API_BASE + '/direct_messages/new.json';
    const formData = new FormData();
    formData.append('user', user_id);
    formData.append('text', text);
    formData.append('format', 'html');
    formData.append('mode', 'lite');
    if (options.in_reply_to_id) {
        formData.append('in_reply_to_id', options.in_reply_to_id);
    }
    try {
        const response = await fanfouRequest(url, 'POST', null, formData);
        return await response.json();
    } catch (error) {
        console.error('Error sending DM:', error);
        throw error;
    }
}
/**
 * 获取与指定用户的私信对话（会话详情）。
 * @param {string} user_id - 对方用户ID（必填）
 * @param {object} options - 可选参数，如 since_id, max_id, count, page
 * @returns {Promise<object>} - 返回消息对象列表 { messages: [...] }
 */
async function getDMDetails(user_id, options = {}) {
    if (!user_id) {
        throw new Error('user_id is required');
    }
    const url = new URL(FANFOU_API_BASE + '/direct_messages/conversation.json');
    const queryParams = {
        format: 'html',
        mode: 'lite',
        id: user_id,
        ...(options.since_id && { since_id: options.since_id }),
        ...(options.max_id && { max_id: options.max_id }),
        ...(options.count && { count: options.count }),
        ...(options.page && { page: options.page })
    };
    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        return { messages: await response.json() };
    } catch (error) {
        console.error('Error fetching DM details:', error);
        throw error;
    }
}
// 修改fanfou.js中的fanfouRequest函数
async function fanfouRequest(apiurl, fmode, params, formData = null) {
    NProgress.start();
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
        NProgress.done();
    }
}

// 修改后的postStatus函数
async function postStatus(statusText, imageFile = null, meta = null) {
    console.log(meta);
    try {
        var url = null;
        if (imageFile == null)
            url = FANFOU_API_BASE + '/statuses/update.json';
        else
            url = FANFOU_API_BASE + '/photos/upload.json';
        let response;
        const formData = new FormData();
        formData.append('status', statusText);
        // 修改后的图片处理逻辑（替换原91行附近代码）
        if (imageFile) {
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(imageFile.type)) {
                throw new Error('仅支持JPEG/PNG/GIF格式');
            }
            if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error('图片大小不能超过5MB');
            }

            // 新增二进制处理
            try {
                const blob = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve(new Blob([reader.result], { type: imageFile.type }));
                    };
                    reader.readAsArrayBuffer(imageFile);
                });

                formData.append('photo', blob, imageFile.name);
            } catch (e) {
                throw new Error('文件处理失败: ' + e.message);
            }
        }
        if (meta && meta.in_repost_msg_id && meta.in_repost_msg_id !== '0') {
            formData.append('repost_status_id', meta.in_repost_msg_id);
        }
        formData.append('mode', "lite");
        formData.append('format', "html");
        if (meta && meta.in_reply_msg_id && meta.in_reply_msg_id !== '0') {
            formData.append('in_reply_to_status_id', meta.in_reply_msg_id);
// /            formData.append('in_reply_to_user_id', meta.in_reply_user_id);
        }

        response = await fanfouRequest(url, 'POST', null, formData);

        return await response.json();
    } catch (error) {
        console.error('发布失败:', error);
        throw error;
    }
}


//请注意这个是获取Home，而不是消息

async function getTimeline(user_id = null, since_id = null, max_id = null) {
    const url = new URL(FANFOU_API_BASE + '/statuses/home_timeline.json');
    const queryParams = {
        format: 'html',
        mode: 'lite',
        count: fetchCnt,
        ...(user_id && { user_id: user_id }),
        ...(since_id && { since_id: since_id }),
        ...(max_id && { max_id: max_id })
    };

    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        return { msglist: await response.json() };
    } catch (error) {
        console.error('Error fetching timeline:', error);
        throw error;
    }
}



async function getStatus(user_id = null, since_id = null, max_id = null) {
    const url = new URL(FANFOU_API_BASE + '/statuses/user_timeline.json');
    const queryParams = {
        format: 'html',
        mode: 'lite',
        count: fetchCnt
    };

    if (user_id) {
        queryParams.user_id = user_id;
    }

    if (since_id)
        queryParams.since_id = since_id;

    if (max_id)
        queryParams.max_id = max_id;

    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        return { msglist: await response.json() };
    } catch (error) {
        console.error('Error fetching timeline:', error);
        throw error;
    }
}

async function getUserInfo(user_id = null) {
    const url = new URL(FANFOU_API_BASE + '/users/show.json');
    const queryParams = {
        format: 'html',
        mode: 'lite'
    };

    if (user_id) {
        queryParams.id = user_id;
    } else {
        throw new Error('User ID is required');
    }

    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        return await response.json();
    } catch (error) {
        console.error('Error fetching user info:', error);
        throw error;
    }
}
/**
 * Fetches direct message conversations.
 * @param since_id - The minimum message ID to fetch.
 * @param max_id - The maximum message ID to fetch.
 * @returns An object containing a list of conversations.
 */
async function getDMConversation(page= 1, count= 4 ) {
    const url = new URL(FANFOU_API_BASE + '/direct_messages/conversation_list.json');
    const queryParams = {
        format: 'html',
        mode: 'lite',
        count: fetchCnt,
        ...(page && { page : page }),
        ...(count && { count: count })
    };

    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        return { conversations: await response.json() };
    } catch (error) {
        console.error('Error fetching direct message conversations:', error);
        throw error;
    }
}



/**
 * Fetches direct message inbox messages.
 * @param since_id - The minimum message ID to fetch (messages newer than this ID).
 * @param max_id - The maximum message ID to fetch (messages older than this ID).
 * @param count - Number of messages to fetch (default: 20, max: 200).
 * @param page - Page number for pagination (default: 1).
 * @returns An object containing a list of inbox messages.
 */
async function getDMInbox(since_id = null, max_id = null, count = 20, page = 1) {

    since_id=null;
    max_id = null;
    const url = new URL(FANFOU_API_BASE + '/direct_messages/inbox.json');
    const queryParams = {
        format: 'html',
        mode: 'lite',
        count: count,
        ...(since_id && { since_id: since_id }),
        ...(max_id && { max_id: max_id }),
        ...(page && { page: page })
    };

    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        return { messages: await response.json() };
    } catch (error) {
        console.error('Error fetching direct message inbox:', error);
        throw error;
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



// Remap the info
function remapMessage(msgs) {
    let retArr = [];
    msgs.forEach(function (v, i) {
        let curmsg = {
            nickname: v.user.screen_name,
            avator: v.user.profile_image_url,
            time: v.created_at,
            source: extractTextFromHtml(v.source),
            content: v.text,
            hasImage: 'photo' in v,
            image: ('photo' in v) ? v.photo.imageurl : null,
            largeimage: ('photo' in v) ? v.photo.largeurl : null,
            hasLinkIcon: (v.in_reply_to_status_id != ""),
            id: v.id,
            userid: v.user.id,
            usergender: v.user.gender,
            favorited: v.favorited,
            raw: v,
        }
        retArr.push(curmsg);
    });
    return retArr;
}

async function toggleFavorite(status_id, favorite = true) {
    const url = new URL(FANFOU_API_BASE + '/favorites/create/' + status_id + '.json');
    const queryParams = {
        id: status_id
    };

    if (!favorite) {
        url.pathname = '/favorites/destroy/' + status_id + '.json';
    }

    try {
        const response = await fanfouRequest(url, 'POST', queryParams);
        return await response.json();
    } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
}


// Debug /background cli
function clearCache() {
    chrome.storage.local.set({ homelist: [], mentionlist: [] }, function () {
        console.log("Clear Local MsgList");
    });
}


/**
 * 获取通知数量（account/notification）
 * https://github.com/FanfouAPI/FanFouAPIDoc/wiki/account.notification
 * 返回 { mention, direct_message, follower, favorite }
 */
async function getNotification(cb) {
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
        if(cb) cb();
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

/**
 * 查询两个用户是否为好友关系
 * https://github.com/FanfouAPI/FanFouAPIDoc/wiki/friendships.exists
 * @param {string} user_a - 用户A的ID或用户名
 * @param {string} user_b - 用户B的ID或用户名
 * @returns {Promise<boolean>} - 是否为好友关系
 */
async function checkFriendshipExists(user_a, user_b) {
    if (!user_a || !user_b) throw new Error('user_a 和 user_b 均为必填项');
    const url = new URL(FANFOU_API_BASE + '/friendships/exists.json');
    const queryParams = {
        user_a,
        user_b,
        format: 'html',
        mode: 'lite'
    };
    try {
        const response = await fanfouRequest(url, 'GET', queryParams);
        const data = await response.json();
        // API 返回 true/false
        return data;
    } catch (error) {
        console.error('Error checking friendship:', error);
        throw error;
    }
}

