// 修改fanfou.js中的fanfouRequest函数
async function fanfouRequest(apiurl, fmode, params, formData = null) {
    return new Promise(async (resolve, reject) => {
        NProgress.start();
        const url = new URL(apiurl);

        // 生成OAuth签名
        const queryParams = params || {};
        const headerParams = {
            oauth_consumer_key: CONSUMER_KEY,
            oauth_token: validToken.oauthToken,
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: OAuth1.generateTimestamp(),
            oauth_nonce: OAuth1.generateNonce(),
            oauth_version: "1.0"
        };

        try {
            const signature = generateOAuthSignature(
                fmode,
                url,
                formData ? {} : queryParams, // 如果是formData则不签名字段参数
                headerParams,
                CONSUMER_SECRET,
                validToken.oauthTokenSecret
            );

            headerParams.oauth_signature = signature;
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
async function postStatus(statusText, imageFile = null) {
    try {
        const url = 'http://api.fanfou.com/statuses/update.json';
        let response;
        const formData = new FormData();
        formData.append('status', statusText);
        if (imageFile) {
            formData.append('photo', imageFile);
        }
        response = await fanfouRequest(url, 'POST', null, formData);

        return await response.json();
    } catch (error) {
        console.error('发布失败:', error);
        throw error;
    }
}


/*

async function fanfouRequest(apiurl, fmode, params) {
    return new Promise(async (resolve, reject) => {
        NProgress.start();
        const url = new URL(apiurl);

        // Generate OAuth signature
        const queryParams = params;
        const headerParams = {
            oauth_consumer_key: CONSUMER_KEY,
            oauth_token: validToken.oauthToken,
            oauth_signature_method: "HMAC-SHA1",
            oauth_timestamp: OAuth1.generateTimestamp(),
            oauth_nonce: OAuth1.generateNonce(),
            oauth_version: "1.0"
        };

        try {
            const signature = generateOAuthSignature(fmode, url, queryParams, headerParams, CONSUMER_SECRET, validToken.oauthTokenSecret);
            headerParams.oauth_signature = signature;
            const authHeader = OAuth1.buildAuthHeader(headerParams);

            // Add query parameters to URL
            Object.entries(queryParams).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });

            const headers = new Headers({
                'Content-Type': 'application/json',
                'Authorization': authHeader
            });

            const response = await fetch(url, {
                method: fmode,
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            resolve(response);
        } catch (error) {
            console.error('Request failed:', error);
            reject(error);
        } finally {
            NProgress.done();
        }
    });
}
    */

//请注意这个是获取Home，而不是消息

async function getTimeline(user_id = null, since_id = null, max_id = null) {
    const url = new URL('http://api.fanfou.com/statuses/home_timeline.json');
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
    const url = new URL('http://api.fanfou.com/statuses/user_timeline.json');
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
    const url = new URL('http://api.fanfou.com/users/show.json');
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


async function getMentions(since_id = null, max_id = null) {
    const url = new URL('http://api.fanfou.com/statuses/mentions.json');
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

// Debug /background cli
function clearCache() {
    chrome.storage.local.set({ homelist: [], mentionlist: [] }, function () {
        console.log("Clear Local MsgList");
    });
}