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
            const signature = generateOAuthSignature('GET', url, queryParams, headerParams, CONSUMER_SECRET, validToken.oauthTokenSecret);
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