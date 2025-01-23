async function fanfouRequest(apiurl, fmode, params, cb) {
    const url = new URL(apiurl);
    // 生成签名
    const queryParams = params;
    const headerParams = {
        oauth_consumer_key: CONSUMER_KEY,
        oauth_token: validToken.oauthToken,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: OAuth1.generateTimestamp(),
        oauth_nonce: OAuth1.generateNonce(),
        oauth_version: "1.0"
    };

    const signature = generateOAuthSignature('GET', url, queryParams, headerParams, CONSUMER_SECRET, validToken.oauthTokenSecret);
    headerParams.oauth_signature = signature;
    authHeader = OAuth1.buildAuthHeader(headerParams);

    // 使用 forEach 遍历 queryParams 并添加到 url.searchParams
    Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    const headers = new Headers({
        'Content-Type': 'application/json',
    });
    headers.append('Authorization', authHeader);

    try {
        const response = await fetch(url, {
            method: fmode,
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        cb(response);
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function getTimeline(since_id = null, max_id = null, cb) {
    var url = new URL('http://api.fanfou.com/statuses/home_timeline.json');
    const queryParams = {
        count: 60,
    }
    if (since_id)
        queryParams.since_id = since_id;

    if (max_id)
        queryParams.max_id = max_id;

    try {
        fanfouRequest(url, 'GET', queryParams, async function (data) {
            var result = await data.json();
            cb({msglist: result });
        });
    } catch (error) {
        console.error('Error fetching timeline:', error);
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
            largeimage: ('photo' in v) ? v.photo.largeurl: null,
            hasLinkIcon: (v.in_reply_to_status_id != ""),
            id: v.id,
            userid: v.user.id,
            usergender: v.user.gender,
            favorited: v.favorited,
        }
        retArr.push(curmsg);
    });
    return retArr;
}

// Debug /background cli
function clearCache (){
        chrome.storage.local.set({ msglist: []}, function () {
            console.log("Clear Local MsgList");
        });
}