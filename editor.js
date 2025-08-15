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
    
    // 如果有保存的草稿且是新建模式，恢复reply信息
    if (savedEditorState && savedEditorState.replyInfo && type === 'new' && !content) {
        const replyInfo = savedEditorState.replyInfo;
        if (replyInfo.in_repost_user_id && replyInfo.in_repost_user_id !== '0') {
            $editorContainer.attr('in_repost_user_id', replyInfo.in_repost_user_id);
            $editorContainer.attr('in_repost_msg_id', replyInfo.in_repost_msg_id);
            console.log('恢复转发信息:', replyInfo.in_repost_user_id, replyInfo.in_repost_msg_id);
        } else if (replyInfo.in_reply_user_id && replyInfo.in_reply_user_id !== '0') {
            $editorContainer.attr('in_reply_user_id', replyInfo.in_reply_user_id);
            $editorContainer.attr('in_reply_msg_id', replyInfo.in_reply_msg_id);
            console.log('恢复回复信息:', replyInfo.in_reply_user_id, replyInfo.in_reply_msg_id);
        }
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
        
        // 添加现代化的初始动画效果
        $textarea.css('opacity', '0').animate({opacity: 1}, 300);
        
        // 添加打字机效果提示（可选）
        if (!savedEditorState || !savedEditorState.text) {
            const placeholder = $textarea.attr('placeholder');
            $textarea.attr('placeholder', '');
            let i = 0;
            const typeWriter = () => {
                if (i < placeholder.length) {
                    $textarea.attr('placeholder', placeholder.substring(0, i + 1));
                    i++;
                    setTimeout(typeWriter, 50);
                }
            };
            setTimeout(typeWriter, 500);
        }
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

    // 添加删除按钮
    $('<button>', {
        class: 'image-delete-btn',
        html: '×',
        click: function(e) {
            e.stopPropagation(); // 防止触发图片点击事件
            $('#upload-btn').val('');
            $('#fanfou-picframe').removeClass('has-image');
            $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
            $('#fanfou-image-info').empty().append('<div class="tipinfo">点击左侧区域添加图片</div>');
            
            // 如果文本也为空，清除草稿
            if (!$textarea.val().trim()) {
                clearEditorState();
                console.log('图片和文本都已清空，清除草稿');
            } else {
                saveEditorState(); // 保存状态
            }
        }
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
    
    // 恢复保存的图片信息（如果有）
    if (savedEditorState && savedEditorState.imageData && type === 'new') {
        try {
            const imageData = savedEditorState.imageData;
            
            // 显示图片预览区域
            $('#fanfou-picframe').addClass('has-image');
            
            // 先显示基本信息
            $('#fanfou-image-info').empty().append([
                `<div class="picdetails">${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                `<div class="picdetails">${(imageData.size / 1024).toFixed(1)} KB</div>`,
                '<div class="tipinfo" style="color: #007AFF;">正在恢复图片...</div>'
            ].join(''));
            
            // 尝试从保存的URL或Base64数据恢复文件
            if (imageData.imageSrc || imageData.dataUrl) {
                const imageUrl = imageData.imageSrc || imageData.dataUrl;
                
                fetch(imageUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('图片地址无效');
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        // 对于Base64数据，不验证文件大小（因为编码可能有差异）
                        if (!imageData.dataUrl) {
                            // 只对URL方式验证文件大小
                            const sizeDiff = Math.abs(blob.size - imageData.size);
                            if (sizeDiff > 1024) { // 允许1KB误差
                                throw new Error('文件大小不匹配');
                            }
                        }
                        
                        // 创建文件对象并设置到 file input
                        const file = new File([blob], imageData.name, {
                            type: imageData.type,
                            lastModified: imageData.lastModified || Date.now()
                        });
                        
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        $('#upload-btn')[0].files = dt.files;
                        
                        // 显示恢复的图片
                        $('#fanfou-image')
                            .removeClass('placeholder')
                            .attr('src', imageUrl);
                        
                        // 更新状态信息
                        const img = new Image();
                        img.onload = function() {
                            $('#fanfou-image-info').empty().append([
                                `<div class="picdetails">${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                                `<div class="picdetails">${img.width} × ${img.height}</div>`,
                                `<div class="picdetails">${(imageData.size / 1024).toFixed(1)} KB</div>`,
                                '<div class="tipinfo" style="color: #51CF66;">✓ 图片已恢复</div>'
                            ].join(''));
                        };
                        img.src = imageUrl;
                        
                        console.log('✓ 图片恢复成功:', imageData.name);
                    })
                    .catch(error => {
                        console.warn('图片恢复失败:', error.message);
                        // 恢复失败，显示占位符和重新选择提示
                        $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                            `<div class="picdetails">${(imageData.size / 1024).toFixed(1)} KB</div>`,
                            '<div class="tipinfo" style="color: #FF6B6B;">⚠ 图片无法恢复，请重新选择</div>'
                        ].join(''));
                    });
            } else {
                // 没有保存的URL，直接提示重新选择
                $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                $('#fanfou-image-info').empty().append([
                    `<div class="picdetails">${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                    `<div class="picdetails">${(imageData.size / 1024).toFixed(1)} KB</div>`,
                    '<div class="tipinfo" style="color: #FF6B6B;">请重新选择此图片</div>'
                ].join(''));
            }
            
        } catch (e) {
            console.warn('恢复图片信息失败:', e);
            $('#fanfou-image-info').append('<div class="tipinfo">恢复图片信息失败，请重新选择</div>');
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
                // 现代化的发布中状态
                $btn.prop('disabled', true).addClass('publishing');
                $btnText.html('<i class="icon-loading"></i> 发布中...');
                
                try {
                    let meta = {
                        in_repost_user_id: $editorContainer.attr('in_repost_user_id'),
                        in_repost_msg_id: $editorContainer.attr('in_repost_msg_id'),
                        in_reply_user_id: $editorContainer.attr('in_reply_user_id'),
                        in_reply_msg_id: $editorContainer.attr('in_reply_msg_id')
                    };

                    await postStatus(fanfouText, imageFile, meta);
                    
                    // 现代化的成功状态
                    $btnText.html('<i class="icon-check"></i> 已发布');
                    $btn.addClass('success');
                    setTimeout(() => {
                        toastr.success('发布成功', '', {
                            positionClass: 'toast-top-center',
                            timeOut: 2000
                        });
                        $('#fanfou-textarea').val(''); // 清空输入框
                        clearEditorState(); // 清除保存的草稿
                        $('#popmask').click();
                    }, 600);
                } catch (error) {
                    // 现代化的错误处理
                    $btn.prop('disabled', false).removeClass('publishing');
                    $btnText.text('发布');
                    toastr.error(error.message, '发布失败', {
                        positionClass: 'toast-top-center'
                    });
                }
            } else {
                // 现代化的空内容提示
                $btn.addClass('shake');
                setTimeout(() => $btn.removeClass('shake'), 400);
                
                toastr.warning("请输入内容或添加图片", '', {
                    positionClass: 'toast-top-center',
                    timeOut: 2000
                });
            }
        }
    }).appendTo($toolbar);
    
    // 保存编辑器状态到本地存储
    function saveEditorState() {
        try {
            const state = {
                text: $textarea.val(),
                hasImage: $('#fanfou-picframe').hasClass('has-image'),
                timestamp: Date.now(),
                // 保存reply相关信息
                replyInfo: {
                    in_repost_user_id: $editorContainer.attr('in_repost_user_id'),
                    in_repost_msg_id: $editorContainer.attr('in_repost_msg_id'),
                    in_reply_user_id: $editorContainer.attr('in_reply_user_id'),
                    in_reply_msg_id: $editorContainer.attr('in_reply_msg_id')
                }
            };
            
            // 如果有图片，保存文件基本信息（不保存Base64数据）
            const fileInput = $('#upload-btn')[0];
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const imgSrc = $('#fanfou-image').attr('src');
                
                state.imageData = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    imageSrc: imgSrc, // 保存当前显示的图片URL
                    // 不再保存dataUrl，避免存储空间问题
                };
            }
            
            localStorage.setItem('fanfou_editor_draft', JSON.stringify(state));
        } catch (e) {
            console.warn('保存编辑器状态失败:', e);
        }
    }

    // 清除保存的编辑器状态
    function clearEditorState() {
        try {
            localStorage.removeItem('fanfou_editor_draft');
            // 同时清理当前编辑器的reply信息（仅当是新建模式时）
            if (type === 'new') {
                $editorContainer.attr('in_repost_user_id', '0');
                $editorContainer.attr('in_repost_msg_id', '0');
                $editorContainer.attr('in_reply_user_id', '0');
                $editorContainer.attr('in_reply_msg_id', '0');
            }
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
            // 现代化的图片加载动画
            $('#fanfou-picframe').addClass('has-image');
            $('#fanfou-image').addClass('loading');
            
            // 创建预览
            const previewUrl = URL.createObjectURL(file);
            
            // 现代化的图片切换效果
            $('#fanfou-image')
                .removeClass('placeholder loading')
                .css({opacity: 0, transform: 'scale(0.8)'})
                .attr('src', previewUrl)
                .animate({opacity: 1}, 300)
                .css('transform', 'scale(1)');
                
            // 获取图片信息并显示
            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.onload = function () {
                    $('#fanfou-image-info').empty();
                    
                    // 现代化的信息显示动画
                    const fileName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
                    const fileSize = file.size > 1024 * 1024 
                        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(file.size / 1024).toFixed(1)} KB`;
                    
                    const details = [
                        `<div class="picdetails">${fileName}</div>`,
                        `<div class="picdetails">${img.width} × ${img.height}</div>`,
                        `<div class="picdetails">${fileSize}</div>`
                    ];
                    
                    $('#fanfou-image-info').append(details.join(''));
                    
                    // 现代化的渐入动画
                    $('#fanfou-image-info div').css({opacity: 0, transform: 'translateX(-10px)'});
                    $('#fanfou-image-info div').each(function(index) {
                        $(this).delay(index * 80).animate({
                            opacity: 1
                        }, 200).css('transform', 'translateX(0)');
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
        
        // 如果文本被完全清空，清理reply相关信息
        if (text.trim() === '') {
            $editorContainer.attr('in_repost_user_id', '0');
            $editorContainer.attr('in_repost_msg_id', '0');
            $editorContainer.attr('in_reply_user_id', '0');
            $editorContainer.attr('in_reply_msg_id', '0');
            console.log('文本已清空，清理reply信息');
            
            // 如果文本为空且没有图片，清除草稿
            if (!$('#fanfou-picframe').hasClass('has-image')) {
                clearEditorState();
                console.log('文本和图片都已清空，清除草稿');
            }
        }
        
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