function buildPopEditor() {
    console.log("Build Pop Editor")
    var $popframe = $('#popframe');
    var $editorContainer = $('<div id="fanfou-editor"></div>');

    // 创建文本输入区域
    var $textarea = $('<textarea>', {
        id: 'fanfou-textarea',
        placeholder: 'What\'s happening?',
        rows: 4
    }).appendTo($editorContainer);

    // 创建工具栏
    var $toolbar = $('<div>', {
        id: 'fanfou-toolbar'
    }).appendTo($editorContainer);


    // 图片占位符
    // 图片占位符
    var $picframe = $('<div>', {
        id: 'fanfou-picframe'
    }).appendTo($editorContainer);

    // 插入图片元素
    $('<img>', {
        id: 'fanfou-image',
        src: '/images/background.png', // 默认图片路径
        alt: 'Uploaded Image'
    }).appendTo($picframe);


    $editorContainer.appendTo($popframe);


    // 发布按钮
    $('<button >', {
        id: "publish-btn",
        text: '发布',
        click: async function () {
            var fanfouText = $textarea.val();
            const imageFile = $('#upload-btn')[0].files[0];
            if (fanfouText.trim() !== "" || imageFile !== null) {
                // 这里可以添加发布推特的逻辑
                console.log("发布: " + fanfouText);
                try {
                    await postStatus(fanfouText, imageFile);
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





    // 替换原有的label方式，改为按钮触发
    $('<button>', {
        type: 'button',
        class: 'upload-btn',
        title: '上传图片',
        text: '上传图片',
        css: {
        },
        click: function () {
            $('#upload-btn').click(); // 触发隐藏的file input
        }
    }).appendTo($toolbar);

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
        }
    });


    // 字数计数器
    var $charCount = $('<span>', {
        id: 'char-count',
        text: '140'
    }).appendTo($toolbar);

    // 监听文本变化，更新字数计数
    $textarea.on('input', function () {
        var remaining = 140 - $(this).val().length;
        $charCount.text(remaining);
        if (remaining < 0) {
            $textarea.val($textarea.val().substring(0, 140));
            $charCount.text(0);
        }
    });

}