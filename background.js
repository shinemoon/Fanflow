// FanFlow 后台计数器，每10秒+1，并显示在扩展图标badge上
let bgCounter = 0;

function updateBadge() {
    chrome.action.setBadgeText({ text: bgCounter.toString() });
}

setInterval(async function () {
    await chrome.storage.local.get({ fanfouToken: null }, async function (r) {
        const tokenData = r.fanfouToken;
        console.log("Access Token:", tokenData);
        if (tokenData == null || tokenData === undefined) {
            bgCounter = 'NaN';
        } else {
            bgCounter += 1;
            // Check Mentiones
//            const mentionResult = await getNotification();
 //           bgCounter += mentionResult ? mentionResult.mentions.length : 0;
        }
        updateBadge();
    });
}, 10000);

// 初始化 badge
updateBadge();
