let validToken = null;

// local list max as 100 msb
let curList = [];
let listLength = 100;
let fetchCnt = 20;

var lastReadInd = 0;

let pagline = null;


// Default Stub
let userInfo = {
  id: "_",
  name: "NickName",
  screen_name: "NickName",
  url: "https://fanfou.com",
  profile_image_url: "images/avator.png",
  profile_image_url_large: "images/avator.png",
  followers_count: 0,
  friends_count: 0,
  description: "有目的地生活"
};

// Page Init


document.addEventListener("DOMContentLoaded", async () => {
  pagline = new ProgressBar.Line('#progress', {
    // Stroke color.
    // Default: '#555'
    color: 'lightblue',

    // Width of the stroke.
    // Unit is percentage of SVG canvas' size.
    // Default: 1.0
    // NOTE: In Line shape, you should control
    // the stroke width by setting container's height.
    // WARNING: IE doesn't support values over 6, see this bug:
    //          https://github.com/kimmobrunfeldt/progressbar.js/issues/79
    strokeWidth: 0.3,

    // If trail options are not defined, trail won't be drawn

    // Color for lighter trail stroke
    // underneath the actual progress path.
    // Default: '#eee'
    trailColor: '#f4f4f4',

    // Width of the trail stroke. Trail is always centered relative to
    // actual progress path.
    // Default: same as strokeWidth
    trailWidth: 0.1,
  });
  pagline.animate(1);

  buildHomePage("init", bindClickActions);
  // Bind page listener
  $('.feed').on('wheel', debounce(function (event) {
    const feedElement = $(this)[0];
    const scrollTop = feedElement.scrollTop;
    const scrollHeight = feedElement.scrollHeight;
    const clientHeight = feedElement.clientHeight;
    let toBottom = scrollHeight - scrollTop - clientHeight;
    // Check if scrolled to bottom /top => Bottom first
    if (event.originalEvent.deltaY > 0 && toBottom <= 10) {
      if (NProgress.status == null) {
        console.log('Reached bottom');
        buildHomePage("down", bindClickActions);
      }
    } else if (event.originalEvent.deltaY < 0 && scrollTop === 0) {
      // Check if scrolled to bottom (with 50px threshold)
      console.log('Reached top');
      if (NProgress.status == null) {
        buildHomePage("up", bindClickActions);
      }
    }
  }, 200));
});


function updateUserInfo(usr) {
  $('#user-avator img').prop("src", usr.profile_image_url);
  $('#user-name').text(usr.screen_name);
  $('#user-description').text(usr.description);
  $('#user-follower .value').text(String(usr.followers_count));
  $('#user-following .value').text(String(usr.friends_count));
}

function bindClickActions() {
  //For Timeline
  $('.tab').click(function () {
    $('.tab.active').removeClass('active');
    $(this).addClass('active');
    if ($(this).prop('id') == 'home') {
      console.log("home clicked");
      //Re-pull the data!
      $('#feed').scrollTop(0);
    }
  });
  // For img 
  $('.content-img').click(function () {
    console.log("switchMask");
    constructPop("img", [$(this).attr("src"), $(this).attr('largeurl')]);
    $('.mask').addClass('show');
  });


  //For Mask
  $('#popmask').on('click', function (event) {
    // 检查点击的目标是否是 #popframe 或其子元素
    if (!$(event.target).closest('#popframe').length) {
      // 在这里执行你希望在 #popframe 之外点击时触发的操作
      $('#popmask').removeClass('show');
    }
  });
}

function constructPop(type, content) {
  var $popframe = $('#popframe');
  $popframe.empty();

  // Add control row
  var $controls = $('<div>').addClass('pop-controls');
  // General
  $controls.append($('<span class="retweet">').addClass('icon-retweet'));
  $controls.append($('<span class="reply">').addClass('icon-reply'));
  $controls.append($('<span class="star">').addClass('icon-star'));

  // for pic
  $controls.append($('<span class="resize">').addClass('icon-resize'));
  $controls.append($('<span class="download">').addClass('icon-download2'));
  $popframe.append($controls);
  var ctrl_buttons = ['retweet', 'reply', 'star', 'resize', 'download'];
  // For img display
  if (type == "img") {
    ctrl_buttons = ['resize', 'download'];
    buildPopImg(content[0], content[1]);

  }
  ctrl_buttons.forEach(btn => $('.' + btn).addClass("show"));
}

