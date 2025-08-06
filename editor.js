function buildPopEditor(type = 'new', content = null) {
    if (content) console.log(content);
    let in_repost_user_id = null;
    let in_repost_msg_id = null;
    let in_reply_user_id = null;
    let in_reply_msg_id = null;

    let repost_photo = null;
    let post_text = "";


    // Remove HTML tags from content.text using regex
    if (content && content.text && type == "retweet") {
        in_repost_user_id = content.user.id;
        in_repost_msg_id = content.id;
        post_text = "转@" + content.user.screen_name + " " + content.text.replace(/<[^>]*>/g, '');
    }
    if (type == "reply") {
        in_reply_user_id = content.user.id;
        in_reply_msg_id = content.id;
        post_text = "@" + content.user.screen_name + " ";
    }


    console.log("Build Pop Editor")
    var $popframe = $('#popframe');
    var $editorContainer = $('<div id="fanfou-editor"></div>');
    $editorContainer.attr('in_repost_user_id', "0");
    $editorContainer.attr('in_repost_msg_id', "0");
    $editorContainer.attr('in_reply_user_id', "0");
    $editorContainer.attr('in_reply_msg_id', "0");

    if (in_repost_msg_id !== null) {
        $editorContainer.attr('in_repost_user_id', in_repost_user_id);
        $editorContainer.attr('in_repost_msg_id', in_repost_msg_id);
    } else if (in_reply_msg_id !== null) {
        $editorContainer.attr('in_reply_user_id', in_reply_user_id);
        $editorContainer.attr('in_reply_msg_id', in_reply_msg_id);
    }
    //Repost Img handling:
    // Repost image handling
    if (content && content.photo) {
        repost_photo = content.photo;
    }


    // 创建文本输入区域
    var $textarea = $('<textarea>', {
        id: 'fanfou-textarea',
        placeholder: 'What\'s happening?',
        text: type == 'retweet' || type == 'reply' ? post_text : null,
        rows: 4,
        autofocus: true
    }).appendTo($editorContainer);
    // 光标移动到最开始
    $textarea[0].setSelectionRange(0, 0);
    // 创建工具栏
    var $toolbar = $('<div>', {
        id: 'fanfou-toolbar'
    }).appendTo($editorContainer);
    // 图片占位符
    var $picframe = $('<div>', {
        id: 'fanfou-picframe',
    }).appendTo($editorContainer);
    // 插入图片元素
    var $piccontainer = $('<div>', {
        id: 'fanfou-image-container',
    }).appendTo($picframe);
    // 插入图片元素
    $('<img>', {
        id: 'fanfou-image',
        src: '/images/background.png', // 默认图片路径
        id: 'fanfou-image',
        src: repost_photo ? repost_photo.imageurl : '/images/background.png',
        click: function () {
            if (!repost_photo)
                $('#upload-btn').click(); // 触发隐藏的file input
        },
        alt: 'Uploaded Image',
    }).appendTo($piccontainer);

    // 插入图片元素信息控制
    $('<div>', {
        id: 'fanfou-image-info',
    }).appendTo($picframe);

    $editorContainer.appendTo($popframe);

    //细节控制
    $('#fanfou-image-info').append('<div class="tipinfo">请点击上传图片</div>');
    if (repost_photo && repost_photo.imageurl !== '/images/background.png') {
        $('#fanfou-image-info').html('<div class="tipinfo">转发图片</div>');
    }



    // 发布按钮
    $('<button >', {
        id: "publish-btn",
        text: '发布',
        click: async function () {
            var fanfouText = $textarea.val();
            const imageFile = $('#upload-btn')[0].files[0]; // This will only be treated in upload case (i.e. null still if overided by repost)
            if (fanfouText.trim() !== "" || imageFile) {
                // 这里可以添加发布推特的逻辑
                console.log("发布: " + fanfouText);
                try {
                    //TODO : to add reply id in
                    let meta = null;
                    meta = {
                        in_repost_user_id: $editorContainer.attr('in_repost_user_id'),
                        in_repost_msg_id: $editorContainer.attr('in_repost_msg_id'),
                        in_reply_user_id: $editorContainer.attr('in_reply_user_id'),
                        in_reply_msg_id: $editorContainer.attr('in_reply_msg_id')
                    };

                    await postStatus(fanfouText, imageFile, meta);
                    toastr.success('发布成功');
                    $('#fanfou-textarea').val(''); // 清空输入框
                    $('#popmask').click();
                } catch (error) {
                    toastr.error(error.message);
                }
            } else {
                toastr.options.timeOut = "3000";
                toastr.options.extendedTimeOut = "1000";
                toastr.error("内容不能为空!");
            }
        }
    }).appendTo($toolbar);
    // Bind Ctrl+Enter shortcut to trigger publish button click
    $(document).on('keydown', function (e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            $('#publish-btn').click();
        }
    });







    // 保持原有的file input（需确保在DOM中）
    $('<input>', {
        type: 'file',
        id: 'upload-btn',
        accept: 'image/*',
        css: { display: 'none' }
    }).appendTo($toolbar);

    // 图片选择处理逻辑保持不变
    $('#upload-btn').change(function (e) {
        const file = e.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            $('#fanfou-image').attr('src', previewUrl).show();
            // 获取图片信息并显示
            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.onload = function () {
                    $('#fanfou-image-info').empty(); // 清空之前的信息
                    $('#fanfou-image-info').append(`<div class="picdetails">${file.name}</div>`);
                    $('#fanfou-image-info').append(`<div class="picdetails">${img.width} x ${img.height}</div>`);
                    $('#fanfou-image-info').append(`<div class="picdetails">${(file.size / 1024).toFixed(2)} KB</div>`);
                    $('#fanfou-image-info').append(`<div class="action " id="reset-pic">    重 置    </div>`);
                    $('#reset-pic').click(function () {
                        $('#upload-btn').val('');
                        $('#fanfou-image-info div.picdetails').text(" ").hide(); // 清空之前的信息
                        $('#fanfou-image-info div.picdetails').eq(0).text("请点击上传图片").show(); // 清空之前的信息
                        $('#fanfou-image-info div.action').eq(0).hide(); // 
                        $('#fanfou-image').attr('src', '/images/background.png');
                        // 创建一个空的FileList对象
                    });
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            $PLACEHOLDER$ = ''; // 清空占位符

        }
    });


    // 字数计数器
    var $charCount = $('<span>', {
        id: 'char-count',
        text: '140'
    }).appendTo($toolbar);

    // 监听文本变化，更新字数计数
    $textarea.on('input', function () {
        var text = $(this).val();
        var cursorPos = this.selectionStart;
        var remaining = 140 - text.length;
        $charCount.text(remaining);
        if (remaining < 0) {
            if (text.length > 140) {
                text = text.substring(0, 137) + '...';
                $(this).val(text);
                this.setSelectionRange(cursorPos, cursorPos);
                $charCount.text(0);
            } else {
                // 如果继续输入，删除一个字符并保留 '...'
                text = text.substring(0, text.length - 4) + '...';
                $(this).val(text);
                this.setSelectionRange(cursorPos, cursorPos);
                $charCount.text(0);
            }
        }
    });
}