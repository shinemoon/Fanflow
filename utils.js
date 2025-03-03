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


/**
 * 切换暗黑模式。
 * 
 * 此函数用于在页面中切换暗黑模式。它会检查包含 '.container' 类的元素是否已应用 'dark-mode' 类。
 * 如果已应用，则移除该类并重置滤镜效果；如果未应用，则添加该类并应用滤镜效果以实现暗黑模式。
 * 
 * @function toggleDarkMode
 * @returns {void}
 */
function toggleDarkMode() {
  // 获取.container元素
  const container = document.querySelector('body');
  // 检查.container是否包含'dark-mode'类
  if (container.classList.contains('dark-mode')) {
    container.classList.remove('dark-mode');
  } else {
    container.classList.add('dark-mode');
  }
  applyDarkMode();
}

function applyDarkMode() {
  // 获取.container元素
  const container = document.querySelector('body');
  if (container.classList.contains('dark-mode')) {
    container.style.filter = 'invert(0.9) hue-rotate(180deg)'; // 或者使用其他您喜欢的颜色变换效果
    const images = container.querySelectorAll('img');
    images.forEach(img => img.style.filter = 'invert(1) hue-rotate(180deg)');
  } else {
    container.style.filter = 'none'; // 或者 'hue-rotate(0deg)'
    const images = container.querySelectorAll('img');
    images.forEach(img => img.style.filter = 'none');
  }
}