function buildPopEditor(type = 'new', content = null) {
    // 添加平滑初始化效果
    $('#popframe').css({opacity: 0}).animate({opacity: 1}, 300);
    
    if (content) console.log(content);
    let in_repost_user_id = null;
    let in_repost_msg_id = null;
    let in_reply_user_id = null;
    let in_reply_msg_id = null;

    let repost_photo = null;
    let post_text = "";

    // 尝试恢复之前保存的编辑器状态（仅在新建时）
    let savedEditorState = null;
    if (type === 'new') {
        try {
            const savedData = localStorage.getItem('fanfou_editor_draft');
            if (savedData) {
                savedEditorState = JSON.parse(savedData);
                console.log('恢复编辑器草稿:', savedEditorState);
            }
        } catch (e) {
            console.warn('无法恢复编辑器草稿:', e);
        }
    }


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

    // 如果有保存的草稿且是新建模式，使用草稿内容
    if (savedEditorState && type === 'new' && !content) {
        post_text = savedEditorState.text || "";
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
        placeholder: '有什么新鲜事？',
        text: type == 'retweet' || type == 'reply' ? post_text : (savedEditorState ? savedEditorState.text || "" : ""),
        rows: 4,
        autofocus: true
    }).appendTo($editorContainer);
    
    // 确保在DOM渲染完成后立即聚焦并将光标置于开头
    setTimeout(function() {
        $textarea.focus();
        $textarea[0].setSelectionRange(0, 0);
        
        // 添加动画效果
        $textarea.css('opacity', '0').animate({opacity: 1}, 200);
    }, 0);
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
        class: repost_photo ? '' : 'placeholder',
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
    if (repost_photo && repost_photo.imageurl !== '/images/background.png') {
        $('#fanfou-image-info').html('<div class="tipinfo">转发图片</div>');
        $('#fanfou-picframe').addClass('has-image');
    } else {
        $('#fanfou-image-info').append('<div class="tipinfo">点击左侧区域添加图片</div>');
    }
    
    // 恢复保存的图片（如果有）
    if (savedEditorState && savedEditorState.imageData && type === 'new') {
        try {
            // 创建文件对象并设置到 file input
            fetch(savedEditorState.imageData.dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], savedEditorState.imageData.name, {
                        type: savedEditorState.imageData.type
                    });
                    
                    // 创建新的 DataTransfer 对象来设置文件
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    $('#upload-btn')[0].files = dt.files;
                    
                    // 显示恢复的图片
                    $('#fanfou-picframe').addClass('has-image');
                    $('#fanfou-image')
                        .removeClass('placeholder')
                        .attr('src', savedEditorState.imageData.dataUrl);
                    
                    // 显示图片信息
                    const img = new Image();
                    img.onload = function() {
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">${savedEditorState.imageData.name.length > 18 ? savedEditorState.imageData.name.substring(0, 15) + '...' : savedEditorState.imageData.name}</div>`,
                            `<div class="picdetails">${img.width} × ${img.height}</div>`,
                            `<div class="picdetails">${(savedEditorState.imageData.size / 1024).toFixed(1)} KB</div>`,
                            `<div class="action" id="reset-pic">重置</div>`
                        ].join(''));
                        
                        // 重置按钮功能
                        $('#reset-pic').click(function () {
                            $('#upload-btn').val('');
                            $('#fanfou-picframe').removeClass('has-image');
                            $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                            $('#fanfou-image-info').empty().append('<div class="tipinfo">点击左侧区域添加图片</div>');
                            saveEditorState(); // 保存状态
                        });
                    };
                    img.src = savedEditorState.imageData.dataUrl;
                })
                .catch(e => {
                    console.warn('恢复图片失败:', e);
                });
        } catch (e) {
            console.warn('恢复图片失败:', e);
        }
    }
    
    // 确保textarea获得焦点，并且光标位于开头
    // 使用requestAnimationFrame确保在下一次重绘前执行，此时DOM已完全渲染
    requestAnimationFrame(function() {
        const textarea = document.getElementById('fanfou-textarea');
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(0, 0);
        }
        
        // 如果有草稿被恢复，显示提示
        if (savedEditorState && type === 'new') {
            const draftTime = new Date(savedEditorState.timestamp).toLocaleString();
            toastr.info(`已恢复 ${draftTime} 的草稿`, '草稿恢复', {
                timeOut: 3000,
                extendedTimeOut: 1000
            });
        }
    });



    // 发布按钮
    $('<button>', {
        id: "publish-btn",
        html: '<span>发布</span>',
        click: async function () {
            const $btn = $(this);
            const $btnText = $btn.find('span');
            var fanfouText = $textarea.val();
            const imageFile = $('#upload-btn')[0].files[0]; // This will only be treated in upload case (i.e. null still if overided by repost)
            
            if (fanfouText.trim() !== "" || imageFile) {
                // 添加发布中的状态显示
                $btn.prop('disabled', true);
                $btnText.text('发布中...');
                
                try {
                    let meta = {
                        in_repost_user_id: $editorContainer.attr('in_repost_user_id'),
                        in_repost_msg_id: $editorContainer.attr('in_repost_msg_id'),
                        in_reply_user_id: $editorContainer.attr('in_reply_user_id'),
                        in_reply_msg_id: $editorContainer.attr('in_reply_msg_id')
                    };

                    await postStatus(fanfouText, imageFile, meta);
                    
                    // 更新按钮状态为成功
                    $btnText.text('已发布');
                    setTimeout(() => {
                        toastr.success('发布成功');
                        $('#fanfou-textarea').val(''); // 清空输入框
                        clearEditorState(); // 清除保存的草稿
                        $('#popmask').click();
                    }, 300);
                } catch (error) {
                    // 恢复按钮状态
                    $btn.prop('disabled', false);
                    $btnText.text('发布');
                    toastr.error(error.message);
                }
            } else {
                // 添加按钮轻微抖动效果
                $btn.addClass('shake');
                setTimeout(() => $btn.removeClass('shake'), 500);
                
                toastr.options.timeOut = "3000";
                toastr.options.extendedTimeOut = "1000";
                toastr.error("内容不能为空!");
            }
        }
    }).appendTo($toolbar);
    
    // 保存编辑器状态到本地存储
    function saveEditorState() {
        try {
            const state = {
                text: $textarea.val(),
                hasImage: $('#fanfou-picframe').hasClass('has-image'),
                timestamp: Date.now()
            };
            
            // 如果有图片，保存文件信息
            const fileInput = $('#upload-btn')[0];
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                // 将文件转换为Base64保存（注意：大文件可能会有问题）
                const reader = new FileReader();
                reader.onload = function(e) {
                    state.imageData = {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        dataUrl: e.target.result
                    };
                    localStorage.setItem('fanfou_editor_draft', JSON.stringify(state));
                };
                reader.readAsDataURL(file);
            } else {
                localStorage.setItem('fanfou_editor_draft', JSON.stringify(state));
            }
        } catch (e) {
            console.warn('保存编辑器状态失败:', e);
        }
    }

    // 清除保存的编辑器状态
    function clearEditorState() {
        try {
            localStorage.removeItem('fanfou_editor_draft');
        } catch (e) {
            console.warn('清除编辑器状态失败:', e);
        }
    }

    // 在页面关闭前保存状态
    $(window).on('beforeunload', function() {
        if ($textarea.val().trim() || $('#fanfou-picframe').hasClass('has-image')) {
            saveEditorState();
        }
    });
    
    // 监听弹窗关闭，保存草稿
    $('#popmask').on('click', function() {
        if ($textarea.val().trim() || $('#fanfou-picframe').hasClass('has-image')) {
            saveEditorState();
        }
    });
    
    // ESC键关闭时也保存
    $(document).on('keyup', function(e) {
        if (e.key === 'Escape') {
            if ($textarea.val().trim() || $('#fanfou-picframe').hasClass('has-image')) {
                saveEditorState();
            }
        }
    });
    
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

    // 图片选择处理逻辑优化
    $('#upload-btn').change(function (e) {
        const file = e.target.files[0];
        if (file) {
            // 显示图片框
            $('#fanfou-picframe').addClass('has-image');
            
            // 创建预览
            const previewUrl = URL.createObjectURL(file);
            
            // 使用淡入效果切换图片
            $('#fanfou-image')
                .removeClass('placeholder')
                .css('opacity', '0.3')
                .attr('src', previewUrl)
                .animate({opacity: 0.85}, 300);
                
            // 获取图片信息并显示
            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.onload = function () {
                    $('#fanfou-image-info').empty(); // 清空之前的信息
                    
                    // 添加动画效果，依次显示信息
                    const details = [
                        `<div class="picdetails" style="opacity:0">${file.name.length > 18 ? file.name.substring(0, 15) + '...' : file.name}</div>`,
                        `<div class="picdetails" style="opacity:0">${img.width} × ${img.height}</div>`,
                        `<div class="picdetails" style="opacity:0">${(file.size / 1024).toFixed(1)} KB</div>`,
                        `<div class="action" id="reset-pic" style="opacity:0">重置</div>`
                    ];
                    
                    $('#fanfou-image-info').append(details.join(''));
                    
                    // 依次淡入显示信息
                    $('#fanfou-image-info div').each(function(index) {
                        $(this).delay(index * 100).animate({opacity: 1}, 200);
                    });
                    
                    // 重置按钮功能
                    $('#reset-pic').click(function () {
                        $('#upload-btn').val('');
                        
                        // 动画效果移除图片
                        $('#fanfou-picframe').removeClass('has-image');
                        $('#fanfou-image')
                            .animate({opacity: 0.5}, 200, function() {
                                $(this).addClass('placeholder').attr('src', '/images/background.png');
                            });
                            
                        // 重置信息区域
                        $('#fanfou-image-info div').fadeOut(200, function() {
                            $('#fanfou-image-info').empty().append('<div class="tipinfo">点击左侧区域添加图片</div>');
                            // 在重置完成后保存状态
                            setTimeout(saveEditorState, 100);
                        });
                    });
                    
                    // 图片处理完成后保存状态
                    saveEditorState();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });


    // 字数计数器
    var $charCount = $('<span>', {
        id: 'char-count',
        text: '140'
    }).appendTo($toolbar);
    
    // 添加图片按钮
    $('<div>', {
        id: 'add-photo-btn',
        html: '<i class="icon-image"></i>',
        title: '添加图片',
        click: function() {
            $('#upload-btn').click();
        }
    }).appendTo($toolbar);

    // 监听文本变化，更新字数计数
    $textarea.on('input', function () {
        var text = $(this).val();
        var cursorPos = this.selectionStart;
        var remaining = 140 - text.length;
        
        // 平滑更新字数
        $charCount
            .removeClass('warn danger')
            .text(remaining);
            
        // 根据剩余字数添加样式
        if (remaining < 20) {
            $charCount.addClass('warn');
        }
        if (remaining < 10) {
            $charCount.addClass('danger');
        }
        
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
        
        // 文本变化时自动保存（防抖处理）
        clearTimeout(window.editorSaveTimeout);
        window.editorSaveTimeout = setTimeout(function() {
            if (text.trim() || $('#fanfou-picframe').hasClass('has-image')) {
                saveEditorState();
            }
        }, 1000); // 1秒后保存
    });
}