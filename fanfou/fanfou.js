// 修改fanfou.js中的fanfouRequest函数
async function fanfouRequest(apiurl, fmode, params, formData = null) {
    return new Promise(async (resolve, reject) => {
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
            resolve(response);
        } catch (error) {
            reject(error);
        } finally {
            NProgress.done();
        }
    });
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

