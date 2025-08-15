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
    
    // 添加粘贴事件监听，支持直接粘贴图片
    $textarea.on('paste', function(e) {
        const clipboardData = e.originalEvent.clipboardData;
        if (!clipboardData) return;
        
        // 尝试获取剪贴板中的HTML内容，可能包含图片的原始URL
        let sourceUrl = null;
        try {
            const htmlData = clipboardData.getData('text/html');
            if (htmlData) {
                // 使用正则提取img标签的src属性
                const imgMatch = htmlData.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
                if (imgMatch && imgMatch[1]) {
                    sourceUrl = imgMatch[1];
                    console.log('检测到图片原始URL:', sourceUrl);
                }
            }
        } catch (e) {
            console.log('无法获取剪贴板HTML数据:', e.message);
        }
        
        const items = clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // 检查是否为图片类型
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault(); // 阻止默认粘贴行为
                
                const file = item.getAsFile();
                if (file) {
                    console.log('检测到粘贴图片:', file.name || 'clipboard-image', file.size, 'bytes');
                    
                    // 如果有原始URL，临时保存它
                    if (sourceUrl) {
                        window._tempClipboardSourceUrl = sourceUrl;
                        console.log('临时保存图片来源URL:', sourceUrl);
                    }
                    
                    // 显示粘贴处理状态
                    toastr.info('正在处理粘贴的图片...', '', {
                        positionClass: 'toast-top-center',
                        timeOut: 2000
                    });
                    
                    // 创建一个虚拟的file input event来重用现有的图片处理逻辑
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    
                    // 设置到隐藏的file input
                    $('#upload-btn')[0].files = dt.files;
                    
                    // 触发file input的change事件
                    $('#upload-btn').trigger('change');
                    
                    // 显示成功提示
                    setTimeout(() => {
                        toastr.success('图片粘贴成功！', '', {
                            positionClass: 'toast-top-center',
                            timeOut: 2000
                        });
                    }, 500);
                }
                break; // 只处理第一个图片
            }
        }
    });
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

    // 为整个编辑器容器添加粘贴事件监听
    $editorContainer.on('paste', function(e) {
        // 如果焦点不在textarea上，也能处理粘贴
        if (e.target !== $textarea[0]) {
            const clipboardData = e.originalEvent.clipboardData;
            if (!clipboardData) return;
            
            // 尝试获取剪贴板中的HTML内容，可能包含图片的原始URL
            let sourceUrl = null;
            try {
                const htmlData = clipboardData.getData('text/html');
                if (htmlData) {
                    const imgMatch = htmlData.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
                    if (imgMatch && imgMatch[1]) {
                        sourceUrl = imgMatch[1];
                        console.log('容器检测到图片原始URL:', sourceUrl);
                    }
                }
            } catch (e) {
                console.log('容器无法获取剪贴板HTML数据:', e.message);
            }
            
            const items = clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    
                    const file = item.getAsFile();
                    if (file) {
                        console.log('容器检测到粘贴图片:', file.name || 'clipboard-image');
                        
                        // 如果有原始URL，临时保存它
                        if (sourceUrl) {
                            window._tempClipboardSourceUrl = sourceUrl;
                            console.log('容器临时保存图片来源URL:', sourceUrl);
                        }
                        
                        toastr.info('正在处理粘贴的图片...', '', {
                            positionClass: 'toast-top-center',
                            timeOut: 2000
                        });
                        
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        $('#upload-btn')[0].files = dt.files;
                        $('#upload-btn').trigger('change');
                        
                        setTimeout(() => {
                            toastr.success('图片粘贴成功！', '', {
                                positionClass: 'toast-top-center',
                                timeOut: 2000
                            });
                        }, 500);
                    }
                    break;
                }
            }
        }
    });

    //细节控制
    if (repost_photo && repost_photo.imageurl !== '/images/background.png') {
        $('#fanfou-image-info').html('<div class="tipinfo">转发图片</div>');
        $('#fanfou-picframe').addClass('has-image');
    } else {
        $('#fanfou-image-info').append('<div class="tipinfo">点击左侧区域添加图片</div>');
    }
    
    // 恢复保存的图片（如果有），尝试从原始路径重新读取
    if (savedEditorState && savedEditorState.imageData && type === 'new') {
        try {
            const imageData = savedEditorState.imageData;
            
            // 显示图片预览区域
            $('#fanfou-picframe').addClass('has-image');
            
            // 先显示恢复中状态
            $('#fanfou-image-info').empty().append([
                `<div class="picdetails">${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                `<div class="picdetails">${(imageData.size / 1024).toFixed(1)} KB</div>`,
                '<div class="tipinfo" style="color: #007AFF;">正在尝试恢复图片...</div>'
            ].join(''));
            
            // 尝试通过路径重新创建文件选择（浏览器环境限制）
            if (imageData.isPastedFromClipboard && !imageData.sourceUrl) {
                // 对于纯剪贴板图片（无原始URL），显示缩略图（如果有）或提示
                setTimeout(() => {
                    // 检查是否有保存的缩略图
                    if (imageData.thumbnail && imageData.thumbnail.dataUrl) {
                        console.log('显示剪贴板图片的保存缩略图');
                        $('#fanfou-image')
                            .removeClass('placeholder')
                            .attr('src', imageData.thumbnail.dataUrl)
                            .css({
                                'opacity': '0.8',
                                'filter': 'grayscale(20%)',
                                'border': '2px dashed #007AFF'
                            });
                        
                        // 缓存图片数据以便保存草稿
                        window._currentImageData = {
                            ...imageData,
                            // 确保有必要的字段
                            lastModified: imageData.lastModified || Date.now()
                        };
                        
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">剪贴板图片: ${imageData.name}</div>`,
                            `<div class="picdetails">原始大小: ${(imageData.size / 1024).toFixed(1)} KB</div>`,
                            `<div class="picdetails">缩略图: ${imageData.thumbnail.width}×${imageData.thumbnail.height}</div>`,
                            '<div class="tipinfo" style="color: #007AFF;">显示已保存的缩略图预览</div>',
                            '<div class="tipinfo" style="color: #FF6B6B; margin-top: 5px;">需要重新粘贴图片以继续编辑</div>',
                            '<div class="tipinfo" style="color: #86868B; font-size: 10px;">提示: 可以直接在文本框中按 Ctrl+V 粘贴图片</div>'
                        ].join(''));
                    } else {
                        // 没有缩略图时显示原来的提示
                        $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">剪贴板图片: ${imageData.name}</div>`,
                            `<div class="picdetails">大小: ${(imageData.size / 1024).toFixed(1)} KB</div>`,
                            `<div class="picdetails">类型: ${imageData.type.split('/')[1].toUpperCase()}</div>`,
                            '<div class="tipinfo" style="color: #FF6B6B;">剪贴板图片无法自动恢复，请重新粘贴</div>',
                            '<div class="tipinfo" style="color: #86868B; font-size: 10px;">提示: 可以直接在文本框中按 Ctrl+V 粘贴图片</div>'
                        ].join(''));
                    }
                }, 500);
                
            } else if (imageData.isPastedFromClipboard && imageData.sourceUrl) {
                // 对于有原始URL的剪贴板图片，尝试从URL恢复
                console.log('尝试从剪贴板图片的原始URL恢复:', imageData.sourceUrl);
                
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = function() {
                    // 创建canvas来转换图片为blob
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(function(blob) {
                        // 创建文件对象
                        const file = new File([blob], imageData.name || 'recovered-clipboard-image.jpg', {
                            type: imageData.type || 'image/jpeg'
                        });
                        
                        // 显示恢复的图片
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            $('#fanfou-image').removeClass('placeholder').attr('src', e.target.result);
                            $('#fanfou-image-info').empty().append([
                                `<div class="picdetails">${imageData.name}</div>`,
                                `<div class="picdetails">${img.width} × ${img.height}</div>`,
                                `<div class="picdetails">${(file.size / 1024).toFixed(1)} KB</div>`,
                                '<div class="tipinfo" style="color: #51CF66;">✓ 剪贴板图片已从原始URL恢复</div>'
                            ].join(''));
                        };
                        reader.readAsDataURL(file);
                        
                        // 设置全局变量以便发布时使用
                        uploadedFile = file;
                        
                        // 同步文件到file input，确保草稿保存时能检测到图片
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        $('#upload-btn')[0].files = dt.files;
                        
                        // 缓存恢复的图片数据，以防后续需要保存草稿
                        window._currentImageData = {
                            name: imageData.name,
                            size: imageData.size || file.size,
                            type: imageData.type || file.type,
                            filePath: imageData.sourceUrl,
                            sourceUrl: imageData.sourceUrl,
                            isPastedFromClipboard: true,
                            originalSource: 'clipboard-with-url',
                            lastModified: file.lastModified || Date.now()
                        };
                        
                        console.log('✓ 剪贴板图片从URL恢复成功:', imageData.sourceUrl);
                    }, imageData.type || 'image/jpeg');
                };
                
                img.onerror = function(error) {
                    console.warn('剪贴板图片URL恢复失败:', error.message);
                    
                    // 检查是否有保存的缩略图作为备选显示
                    if (imageData.thumbnail && imageData.thumbnail.dataUrl) {
                        console.log('URL恢复失败，显示保存的缩略图');
                        $('#fanfou-image')
                            .removeClass('placeholder')
                            .attr('src', imageData.thumbnail.dataUrl)
                            .css({
                                'opacity': '0.7',
                                'filter': 'grayscale(30%)',
                                'border': '2px dashed #FF6B6B'
                            });
                        
                        // 缓存图片数据以便保存草稿
                        window._currentImageData = {
                            ...imageData,
                            lastModified: imageData.lastModified || Date.now()
                        };
                        
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">剪贴板图片: ${imageData.name}</div>`,
                            `<div class="picdetails">显示缩略图预览</div>`,
                            '<div class="tipinfo" style="color: #FF6B6B;">原始链接已失效，显示保存的预览图</div>',
                            `<div style="font-size: 10px; margin-top: 5px; color: #6c757d; word-break: break-all;">${imageData.sourceUrl}</div>`,
                            '<div class="tipinfo" style="color: #86868B; font-size: 10px; margin-top: 5px;">请重新粘贴图片</div>'
                        ].join(''));
                    } else {
                        $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">剪贴板图片: ${imageData.name}</div>`,
                            `<div class="picdetails">原始来源: 网络图片</div>`,
                            '<div class="tipinfo" style="color: #FF6B6B;">原始链接已失效，请重新粘贴</div>',
                            `<div style="font-size: 10px; margin-top: 5px; color: #6c757d; word-break: break-all;">${imageData.sourceUrl}</div>`
                        ].join(''));
                    }
                };
                
                img.src = imageData.sourceUrl;
                
            } else if (imageData.filePath && imageData.filePath !== imageData.name) {
                // 显示完整的文件路径信息
                setTimeout(() => {
                    // 检查是否有保存的缩略图
                    if (imageData.thumbnail && imageData.thumbnail.dataUrl) {
                        console.log('本地文件恢复失败，显示保存的缩略图');
                        $('#fanfou-image')
                            .removeClass('placeholder')
                            .attr('src', imageData.thumbnail.dataUrl)
                            .css({
                                'opacity': '0.8',
                                'filter': 'grayscale(20%)',
                                'border': '2px dashed #ffa500'
                            });
                        
                        // 缓存图片数据以便保存草稿
                        window._currentImageData = {
                            ...imageData,
                            lastModified: imageData.lastModified || Date.now()
                        };
                        
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">文件: ${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                            `<div class="picdetails">缩略图: ${imageData.thumbnail.width}×${imageData.thumbnail.height}</div>`,
                            `<div class="picdetails">原始大小: ${(imageData.size / 1024).toFixed(1)} KB</div>`,
                            `<div class="picdetails" style="font-size: 10px; opacity: 0.7;">路径: ${imageData.filePath}</div>`,
                            '<div class="tipinfo" style="color: #ffa500;">显示保存的缩略图预览</div>',
                            '<div class="tipinfo" style="color: #FF6B6B;">请重新选择此图片（浏览器安全限制）</div>'
                        ].join(''));
                    } else {
                        $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">文件: ${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                            `<div class="picdetails">大小: ${(imageData.size / 1024).toFixed(1)} KB</div>`,
                            `<div class="picdetails">类型: ${imageData.type.split('/')[1].toUpperCase()}</div>`,
                            `<div class="picdetails" style="font-size: 10px; opacity: 0.7;">路径: ${imageData.filePath}</div>`,
                            '<div class="tipinfo" style="color: #FF6B6B;">请重新选择此图片（由于浏览器安全限制无法自动读取本地文件）</div>'
                        ].join(''));
                    }
                }, 500);
                
            } else if (imageData.imageSrc && !imageData.imageSrc.startsWith('blob:')) {
                // 如果是网络URL（非blob），尝试直接访问
                const networkUrl = imageData.imageSrc;
                console.log('尝试从网络URL恢复:', networkUrl);
                
                fetch(networkUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('网络图片访问失败: ' + response.status);
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        // 创建文件对象
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
                            .attr('src', networkUrl);
                        
                        const img = new Image();
                        img.onload = function() {
                            $('#fanfou-image-info').empty().append([
                                `<div class="picdetails">${imageData.name.length > 18 ? imageData.name.substring(0, 15) + '...' : imageData.name}</div>`,
                                `<div class="picdetails">${img.width} × ${img.height}</div>`,
                                `<div class="picdetails">${(blob.size / 1024).toFixed(1)} KB</div>`,
                                '<div class="tipinfo" style="color: #51CF66;">✓ 网络图片已恢复</div>'
                            ].join(''));
                        };
                        img.src = networkUrl;
                        
                        console.log('✓ 网络图片恢复成功:', imageData.name);
                    })
                    .catch(error => {
                        console.warn('网络图片恢复失败:', error.message);
                        $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                        $('#fanfou-image-info').empty().append([
                            `<div class="picdetails">网络图片: ${imageData.name}</div>`,
                            `<div class="picdetails">原URL: ${networkUrl.length > 30 ? networkUrl.substring(0, 27) + '...' : networkUrl}</div>`,
                            '<div class="tipinfo" style="color: #FF6B6B;">⚠ 网络图片源已失效，请重新选择</div>'
                        ].join(''));
                    });
                    
            } else if (imageData.dataUrl) {
                // 兼容旧版本Base64数据
                const imageUrl = imageData.dataUrl;
                
                fetch(imageUrl)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('图片地址无效');
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        // 验证文件大小（允许一定误差）
                        if (!imageData.dataUrl && Math.abs(blob.size - imageData.size) > 1024) {
                            throw new Error('文件大小不匹配');
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
                            '<div class="tipinfo" style="color: #FF6B6B;">⚠ 图片源已失效，请重新选择</div>'
                        ].join(''));
                    });
            } else {
                // 没有URL信息，直接提示重新选择
                $('#fanfou-image').addClass('placeholder').attr('src', '/images/background.png');
                $('#fanfou-image-info').empty().append([
                    `<div class="picdetails">上次选择: ${imageData.name}</div>`,
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
        
        // 检查localStorage使用情况（用于调试和优化）
        checkStorageUsage();
        
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
            
            // 如果有图片，保存文件原始路径信息和生成缩略图
            const fileInput = $('#upload-btn')[0];
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                
                // 检测是否为粘贴的图片（通常文件名为空或image.png）
                const isPastedImage = !file.name || file.name === 'image.png' || file.name === 'image' || file.name.startsWith('image.');
                
                // 检查是否有临时保存的剪贴板来源URL
                const clipboardSourceUrl = window._tempClipboardSourceUrl;
                
                state.imageData = {
                    name: file.name || 'pasted-image.png',
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    // 改进的路径和来源信息
                    filePath: isPastedImage ? (clipboardSourceUrl || 'clipboard://pasted-image') : (file.webkitRelativePath || file.name),
                    isPastedFromClipboard: isPastedImage,
                    // 新增：如果有原始URL，保存它，并标记类型为network
                    ...(clipboardSourceUrl && isPastedImage && {
                        sourceUrl: clipboardSourceUrl,
                        type: 'network',
                        originalSource: 'clipboard-with-url'
                    })
                };
                
                // 缓存当前图片数据到全局变量，以便后续保存时使用
                window._currentImageData = state.imageData;
                
                // 生成并保存缩略图
                const currentImageElement = $('#fanfou-image')[0];
                if (currentImageElement && currentImageElement.src && !currentImageElement.src.includes('background.png')) {
                    // 异步生成缩略图
                    generateThumbnail(currentImageElement, 150, 0.6)
                        .then(thumbnail => {
                            // 如果缩略图不超过20KB，保存到状态中
                            if (thumbnail.sizeKB < 20) {
                                state.imageData.thumbnail = {
                                    dataUrl: thumbnail.dataUrl,
                                    width: thumbnail.width,
                                    height: thumbnail.height
                                };
                                console.log('缩略图已保存到草稿');
                            } else {
                                console.log('缩略图过大，跳过保存:', thumbnail.sizeKB, 'KB');
                            }
                            
                            // 无论是否保存缩略图都继续保存草稿
                            finalizeSaveState(state);
                        })
                        .catch(error => {
                            console.warn('缩略图生成失败，继续保存草稿:', error);
                            finalizeSaveState(state);
                        });
                    return; // 异步处理，直接返回
                }
                
            } else if ($('#fanfou-picframe').hasClass('has-image') && 
                      (savedEditorState?.imageData || window._currentImageData)) {
                // 如果没有新文件但有图片显示，且有之前的图片数据，保留之前的数据
                const previousImageData = window._currentImageData || savedEditorState.imageData;
                console.log('保留之前恢复的图片数据:', previousImageData.name);
                state.imageData = { ...previousImageData };
                
                // 也尝试生成当前显示图片的缩略图
                const currentImageElement = $('#fanfou-image')[0];
                if (currentImageElement && currentImageElement.src && 
                    !currentImageElement.src.includes('background.png') && 
                    !previousImageData.thumbnail) {
                    // 如果之前没有缩略图，尝试生成
                    generateThumbnail(currentImageElement, 150, 0.6)
                        .then(thumbnail => {
                            if (thumbnail.sizeKB < 20) {
                                state.imageData.thumbnail = {
                                    dataUrl: thumbnail.dataUrl,
                                    width: thumbnail.width,
                                    height: thumbnail.height
                                };
                                console.log('为恢复的图片生成了缩略图');
                            }
                            finalizeSaveState(state);
                        })
                        .catch(() => {
                            finalizeSaveState(state);
                        });
                    return;
                }
            }
                
                // 清理临时URL
                if (window._tempClipboardSourceUrl) {
                    console.log('保存图片来源URL到草稿:', clipboardSourceUrl);
                    delete window._tempClipboardSourceUrl;
                }
            
            // 如果没有异步操作，直接保存
            finalizeSaveState(state);
            
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('存储空间不足，尝试清理后重试...');
                // 尝试清理localStorage中的其他数据
                try {
                    // 先清理可能存在的旧草稿
                    localStorage.removeItem('fanfou_editor_draft');
                    
                    // 再次尝试保存基本信息
                    const minimalState = {
                        text: $textarea.val().substring(0, 1000), // 只保存前1000字符
                        timestamp: Date.now(),
                        replyInfo: {
                            in_reply_user_id: $editorContainer.attr('in_reply_user_id'),
                            in_reply_msg_id: $editorContainer.attr('in_reply_msg_id')
                        }
                    };
                    localStorage.setItem('fanfou_editor_draft', JSON.stringify(minimalState));
                    console.log('已保存最小化草稿');
                } catch (e) {
                    console.error('即使最小化保存也失败:', e);
                }
            } else {
                console.error('保存编辑器状态失败:', error);
            }
        }
    }
    
    // 完成状态保存的函数
    function finalizeSaveState(state) {
        try {
            // 检查数据大小，实现安全存储
            const dataString = JSON.stringify(state);
            const dataSizeKB = (dataString.length * 2) / 1024; // 估算UTF-16大小
            
            console.log(`草稿数据大小: ${dataSizeKB.toFixed(1)} KB`);
            
            // 如果数据过大，尝试压缩
            if (dataSizeKB > 100) { // 超过100KB时开始优化
                console.warn('草稿数据较大，开始优化...');
                
                // 首先移除缩略图（如果存在且数据仍然过大）
                if (state.imageData && state.imageData.thumbnail && dataSizeKB > 200) {
                    console.log('移除缩略图以减小数据量');
                    delete state.imageData.thumbnail;
                }
                
                // 截断过长的文本
                if (state.text && state.text.length > 10000) {
                    state.text = state.text.substring(0, 10000);
                    console.log('文本内容已截断到10000字符');
                }
                
                // 重新计算大小
                const optimizedString = JSON.stringify(state);
                const optimizedSizeKB = (optimizedString.length * 2) / 1024;
                console.log(`优化后数据大小: ${optimizedSizeKB.toFixed(1)} KB`);
                
                if (optimizedSizeKB > 500) { // 如果还是太大，只保存文本
                    console.warn('数据仍然过大，只保存文本内容');
                    const minimalState = {
                        text: state.text.substring(0, 5000), // 进一步截断
                        hasImage: false,
                        timestamp: state.timestamp,
                        replyInfo: state.replyInfo
                    };
                    localStorage.setItem('fanfou_editor_draft', JSON.stringify(minimalState));
                    return;
                }
                
                localStorage.setItem('fanfou_editor_draft', optimizedString);
            } else {
                localStorage.setItem('fanfou_editor_draft', dataString);
            }
            
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn('localStorage空间不足，尝试清理旧数据...');
                try {
                    // 清理旧数据并尝试只保存最基本的信息
                    localStorage.removeItem('fanfou_editor_draft');
                    
                    const minimalState = {
                        text: state.text.substring(0, 1000), // 只保存前1000字符
                        timestamp: state.timestamp,
                        replyInfo: state.replyInfo
                    };
                    
                    localStorage.setItem('fanfou_editor_draft', JSON.stringify(minimalState));
                    console.log('已保存最小化草稿到finalizeSaveState');
                    
                } catch (fallbackError) {
                    console.error('finalizeSaveState无法保存任何草稿数据:', fallbackError);
                }
            } else {
                console.warn('finalizeSaveState保存失败:', e);
            }
        }
    }

    // 清除保存的编辑器状态
    function clearEditorState() {
        try {
            localStorage.removeItem('fanfou_editor_draft');
            console.log('已清除草稿');
            checkStorageUsage(); // 清除后检查存储使用情况
            
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

    // 检查localStorage使用情况的工具函数
    function checkStorageUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            const totalSizeMB = (totalSize * 2) / (1024 * 1024); // UTF-16估算
            console.log(`localStorage总使用量: ${totalSizeMB.toFixed(2)} MB`);
            
            // 检查草稿大小
            const draftData = localStorage.getItem('fanfou_editor_draft');
            if (draftData) {
                const draftSizeKB = (draftData.length * 2) / 1024;
                console.log(`当前草稿大小: ${draftSizeKB.toFixed(1)} KB`);
            }
        } catch (e) {
            console.warn('无法检查存储使用情况:', e);
        }
    }

    // 生成图片缩略图的工具函数
    function generateThumbnail(imageElement, maxWidth = 200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 计算缩略图尺寸，保持宽高比
                const originalWidth = imageElement.naturalWidth || imageElement.width;
                const originalHeight = imageElement.naturalHeight || imageElement.height;
                
                let thumbnailWidth = maxWidth;
                let thumbnailHeight = (originalHeight * maxWidth) / originalWidth;
                
                // 如果高度超过最大宽度，则以高度为准
                if (thumbnailHeight > maxWidth) {
                    thumbnailHeight = maxWidth;
                    thumbnailWidth = (originalWidth * maxWidth) / originalHeight;
                }
                
                canvas.width = Math.round(thumbnailWidth);
                canvas.height = Math.round(thumbnailHeight);
                
                // 绘制缩略图
                ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
                
                // 转换为base64，使用较低质量以减小体积
                const thumbnailDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                // 检查缩略图大小
                const thumbnailSizeKB = (thumbnailDataUrl.length * 0.75) / 1024; // base64大约增加33%
                console.log(`缩略图大小: ${canvas.width}×${canvas.height}, ${thumbnailSizeKB.toFixed(1)} KB`);
                
                resolve({
                    dataUrl: thumbnailDataUrl,
                    width: canvas.width,
                    height: canvas.height,
                    sizeKB: thumbnailSizeKB
                });
            } catch (error) {
                console.warn('生成缩略图失败:', error);
                reject(error);
            }
        });
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
                    
                    // 缓存当前上传的图片数据
                    const isPastedImage = !file.name || file.name === 'image.png' || file.name === 'image' || file.name.startsWith('image.');
                    window._currentImageData = {
                        name: file.name || 'uploaded-image.png',
                        size: file.size,
                        type: file.type,
                        lastModified: file.lastModified,
                        filePath: file.webkitRelativePath || file.name,
                        isPastedFromClipboard: isPastedImage
                    };
                    
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