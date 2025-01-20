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