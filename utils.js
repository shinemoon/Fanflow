function extractTextFromHtml(htmlString) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlString;
  return tempDiv.textContent || tempDiv.innerText || '';
}


function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}


function convertToLocalTime(dateString) {
  // 将日期字符串解析为 Date 对象
  const date = new Date(dateString);

  // 转换为系统当前时区的可读时间
  const localTime = date.toLocaleString(); // 默认格式，包含日期和时间
  const localDate = date.toLocaleDateString(); // 仅日期
  const localTimeOnly = date.toLocaleTimeString(); // 仅时间

  return {
    localTime, // 完整的本地时间
    localDate, // 本地日期
    localTimeOnly // 本地时间
  };
}


function getLastPageFirstIndex(curList, listShowLength) {
  const totalPages = Math.ceil(curList.length / listShowLength);
  return (totalPages - 1) * listShowLength;
}


function cleanCurrentPageStatus() {
  // 提取所有 .msg-nickname 元素的 value 值作为索引队列
  const indexQueue = $('#feed .message .message-meta .msg-nickname').map(function () {
    return $(this).attr('value'); // 获取 value 值
  }).get(); // 将 jQuery 对象转换为普通数组

  // 遍历 curList，将对应索引的 item 的 read 属性改为 'read'
  indexQueue.forEach(index => {
    if (curList[index]) { // 确保索引存在
      curList[index].read = 'read';
    }
  });
  // Store for local save
  chrome.storage.local.set({ msglist: curList }, function () {
    console.log("Local Save Msgs");
  });
}