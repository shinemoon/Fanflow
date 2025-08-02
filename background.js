// FanFlow 后台计数器，每10秒+1，并显示在扩展图标badge上
let bgCounter = 0;

function updateBadge() {
    chrome.action.setBadgeText({ text: bgCounter.toString() });
}

setInterval(() => {
    bgCounter++;
    updateBadge();
}, 10000);

// 初始化 badge
updateBadge();
