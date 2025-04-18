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
    var $picframe= $('<div>', {
        id: 'fanfou-picframe'
    }).appendTo($editorContainer);



    $editorContainer.appendTo($popframe);


    // 发布按钮
    $('<button>', {
        text: '发布',
        click: function () {
            var tweetText = $textarea.val();
            if (tweetText.trim() !== "") {
                // 这里可以添加发布推特的逻辑
                console.log("发布推特: " + tweetText);
            } else {
                toastr.options.timeOut = "3000";
                toastr.options.extendedTimeOut = "1000";
                toastr.error("内容不能为空!");
            }
        }
    }).appendTo($toolbar);

    // 图片上传按钮
    $('<button>', {
        text: '上传图片',
        click: function () {
            // 这里可以添加图片上传的逻辑
            console.log("图片上传功能尚未实现");
        }
    }).appendTo($toolbar);

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