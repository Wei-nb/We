/* ========================================
   作品详情页脚本 — 图片主导 画廊式排版
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    initDetailPage();
});

function initDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const workId = parseInt(params.get('id'));
    const returnCat = params.get('cat') || 'all';
    const returnSub = params.get('sub') || 'all';

    if (!workId) { window.location.href = 'portfolio.html'; return; }

    const work = WORKS_DATA.find(w => w.id === workId);
    if (!work) { window.location.href = 'portfolio.html'; return; }

    renderDetail(work, returnCat, returnSub);
}

function renderDetail(work, returnCat, returnSub) {
    const page = document.getElementById('detailPage');
    const catInfo = CATEGORIES.find(c => c.id === work.category);
    const categoryName = catInfo ? catInfo.name : work.category;

    /* 上下篇 */
    const currentIndex = WORKS_DATA.findIndex(w => w.id === work.id);
    const prevWork = currentIndex > 0 ? WORKS_DATA[currentIndex - 1] : null;
    const nextWork = currentIndex < WORKS_DATA.length - 1 ? WORKS_DATA[currentIndex + 1] : null;

    const hasVideo = work.video && work.video.length > 0;
    const hasImages = work.images && work.images.length > 0;

    /* 图片画廊 — Masonry 瀑布流，自然排列 */

    page.innerHTML = `
        <!-- 头部 -->
        <div class="detail-header">
            <nav class="detail-breadcrumb">
                <a href="portfolio.html?category=${returnCat}">作品集</a>
                <span>/</span>
                <span>${work.name}</span>
            </nav>
            <div class="detail-title-row">
                <h1 class="detail-title">${work.name}</h1>
                <div class="detail-meta-tags">
                    <span class="meta-tag primary">${categoryName}</span>
                    ${work.subCategory ? `<span class="meta-tag">${work.subCategory}</span>` : ''}
                    ${work.year ? `<span class="meta-tag">${work.year}</span>` : ''}
                </div>
            </div>
        </div>

        <!-- 主体 -->
        <div class="detail-body">
            <!-- Hero 大图 / 视频 -->
            ${hasVideo ? `
                <div class="detail-hero" id="detailHero">
                    <video id="heroVideo" preload="metadata" playsinline loop poster="${work.thumbnail || ''}" style="width:100%;height:auto;display:block;">
                        <source src="${work.video}" type="video/mp4">
                    </video>
                    <div class="hero-play-overlay" id="heroPlayOverlay">
                        <div class="hero-play-icon">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                    <div class="hero-player-controls" id="heroControls">
                        <button class="hero-play-btn" id="heroPlayBtn" aria-label="播放">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <div class="hero-progress" id="heroProgress">
                            <div class="hero-progress-fill" id="heroProgressFill"></div>
                        </div>
                        <span class="hero-time" id="heroCurrentTime">0:00</span>
                        <span style="color:rgba(255,255,255,0.35)">/</span>
                        <span class="hero-time" id="heroDuration">0:00</span>
                    </div>
                </div>
            ` : ''}

            ${hasImages && !hasVideo ? `
                <div class="detail-hero${work.pdf ? ' pdf-clickable' : ''}" id="detailHero" ${work.pdf ? 'data-pdf="' + work.pdf + '"' : ''}>
                    <img src="${work.images[0]}" alt="${work.name}" loading="lazy">
                    ${work.pdf ? '<div class="pdf-hint"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM10 19H8v-2h2v2zm0-4H8v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg><span>查看完整 PDF 文档</span></div>' : ''}
                </div>
            ` : ''}

            ${!hasVideo && !hasImages && work.thumbnail ? `
                <div class="detail-hero">
                    <img src="${work.thumbnail}" alt="${work.name}" loading="lazy">
                </div>
            ` : ''}

            <!-- 信息条 -->
            <div class="detail-info-bar">
                <div class="info-item">
                    <div class="info-label">分类</div>
                    <div class="info-value">${categoryName} ${work.subCategory ? '/ ' + work.subCategory : ''}</div>
                </div>
                ${work.role ? `
                <div class="info-item">
                    <div class="info-label">我的角色</div>
                    <div class="info-value">${work.role}</div>
                </div>` : ''}
                ${work.year ? `
                <div class="info-item">
                    <div class="info-label">年份</div>
                    <div class="info-value">${work.year}</div>
                </div>` : ''}
                ${work.software && work.software.length ? `
                <div class="info-item">
                    <div class="info-label">制作工具</div>
                    <div class="info-software-list">
                        ${work.software.map(function(s) { return '<span class="software-chip">' + s + '</span>'; }).join('')}
                    </div>
                </div>` : ''}

                ${(work.description || work.detailDescription) ? `
                <div class="info-item info-desc-text">
                    ${work.description || ''} ${work.detailDescription || ''}
                </div>` : ''}
            </div>

            <!-- 图片画廊 — Masonry 瀑布流 -->
            ${hasImages ? `
                <div class="detail-gallery" id="detailGallery"></div>
            ` : ''}
        </div>

        <!-- 底部导航 -->
        <nav class="detail-nav">
            <a href="portfolio.html?category=${returnCat}${returnSub !== 'all' ? '&sub=' + encodeURIComponent(returnSub) : ''}" class="nav-back-btn">&larr; 返回作品集</a>

            ${prevWork ? `
                <a href="detail.html?id=${prevWork.id}&cat=${returnCat}&sub=${returnSub}" class="nav-work-link">
                    <div class="nav-thumb"><img src="${prevWork.thumbnail}" alt="" loading="lazy"></div>
                    <div>
                        <div class="nav-label">上一篇</div>
                        <div class="nav-name">${prevWork.name}</div>
                    </div>
                </a>
            ` : '<div></div>'}

            ${nextWork ? `
                <a href="detail.html?id=${nextWork.id}&cat=${returnCat}&sub=${returnSub}" class="nav-work-link">
                    <div>
                        <div class="nav-label">下一篇</div>
                        <div class="nav-name">${nextWork.name}</div>
                    </div>
                    <div class="nav-thumb"><img src="${nextWork.thumbnail}" alt="" loading="lazy"></div>
                </a>
            ` : '<div></div>'}
        </nav>
    `;

    /* 初始化交互 */
    if (hasVideo) initHeroVideo();
    if (hasImages) buildMasonry(work);
    initPdfLink();
}

/* ========================================
   Hero 视频控制 — 拖拽滑动擦除视频进度
   ======================================== */
function initHeroVideo() {
    var video = document.getElementById('heroVideo');
    var playBtn = document.getElementById('heroPlayBtn');
    var overlay = document.getElementById('heroPlayOverlay');
    var hero = document.getElementById('detailHero');
    var progress = document.getElementById('heroProgress');
    var progressFill = document.getElementById('heroProgressFill');
    var curTimeEl = document.getElementById('heroCurrentTime');
    var durTimeEl = document.getElementById('heroDuration');

    if (!video) return;

    var isPlaying = false;
    var isDragging = false;
    var dragStartX = 0;
    var dragStartTime = 0;
    var movedDuringDrag = false;
    var DRAG_THRESHOLD = 5; /* 移动超过5px才算拖拽 */

    function togglePlay() {
        if (isPlaying) video.pause(); else video.play();
    }

    function updateIcon(playing) {
        isPlaying = playing;
        if (playBtn) {
            playBtn.innerHTML = playing
                ? '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        }
        if (playing) { hero.classList.add('playing'); } else { hero.classList.remove('playing'); }
    }

    /* ── 拖拽滑动擦除 ── */
    function onDragStart(e) {
        e.preventDefault();
        isDragging = true;
        movedDuringDrag = false;
        dragStartX = e.type.indexOf('touch') === 0 ? e.touches[0].clientX : e.clientX;
        dragStartTime = video.currentTime;
        video.pause();
        hero.classList.add('scrubbing');
        /* 显示擦除提示光标 */
        hero.style.cursor = 'ew-resize';
        if (overlay) overlay.style.opacity = '0';
    }

    function onDragMove(e) {
        if (!isDragging) return;
        var clientX = e.type.indexOf('touch') === 0 ? e.touches[0].clientX : e.clientX;
        var deltaX = clientX - dragStartX;

        if (Math.abs(deltaX) < DRAG_THRESHOLD && !movedDuringDrag) return;
        movedDuringDrag = true;

        /* 擦除灵敏度：全屏宽度 = 完整视频时长 */
        var heroWidth = hero.clientWidth;
        var sensitivity = heroWidth > 0 ? heroWidth : 800;
        var scrubRatio = deltaX / sensitivity;

        var newTime = dragStartTime + scrubRatio * video.duration;
        newTime = Math.max(0, Math.min(video.duration || 1, newTime));

        video.currentTime = newTime;

        /* 更新进度条 */
        var pct = (newTime / video.duration) * 100 || 0;
        if (progressFill) progressFill.style.width = pct + '%';
        if (curTimeEl) curTimeEl.textContent = formatTime(newTime);

        /* 显示擦除浮层提示 */
        showScrubTooltip(e);
    }

    function onDragEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        hero.classList.remove('scrubbing');
        hero.style.cursor = '';
        if (overlay) overlay.style.opacity = '';

        hideScrubTooltip();

        /* 如果只是轻点（未移动），切换播放/暂停 */
        if (!movedDuringDrag) {
            togglePlay();
        } else {
            /* 拖拽后保持暂停，让用户细看当前帧 */
            if (playBtn) updateIcon(false);
        }
    }

    /* ── 擦除浮层提示 ── */
    function showScrubTooltip(e) {
        var tip = document.getElementById('scrubTooltip');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'scrubTooltip';
            tip.style.cssText =
                'position:absolute;top:16px;left:50%;transform:translateX(-50%);' +
                'background:rgba(0,0,0,0.75);color:#fff;padding:6px 14px;border-radius:20px;' +
                'font-size:13px;font-family:"SF Mono",monospace;letter-spacing:0.5px;' +
                'pointer-events:none;z-index:20;backdrop-filter:blur(8px);' +
                'transition:opacity 0.15s;opacity:0;';
            hero.appendChild(tip);
        }
        var pct = (video.currentTime / video.duration) * 100 || 0;
        var dir = '';
        if (video.currentTime > dragStartTime + 0.1) dir = '\u25B6 ';
        else if (video.currentTime < dragStartTime - 0.1) dir = '\u25C0 ';
        tip.textContent = dir + formatTime(video.currentTime) + ' / ' + formatTime(video.duration) + ' \u00B7 ' + Math.round(pct) + '%';
        tip.style.opacity = '1';
    }

    function hideScrubTooltip() {
        var tip = document.getElementById('scrubTooltip');
        if (tip) tip.style.opacity = '0';
    }

    /* ── 事件绑定 ── */
    /* 在 hero 上监听拖拽 */
    hero.addEventListener('mousedown', onDragStart);
    hero.addEventListener('touchstart', onDragStart, { passive: false });

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });

    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    /* 播放按钮仍可用 */
    if (playBtn) {
        playBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!movedDuringDrag) togglePlay();
        });
    }

    video.addEventListener('play', function() { updateIcon(true); });
    video.addEventListener('pause', function() { updateIcon(false); });

    video.addEventListener('timeupdate', function() {
        if (isDragging) return; /* 拖拽时不覆盖进度 */
        var pct = (video.currentTime / video.duration) * 100 || 0;
        if (progressFill) progressFill.style.width = pct + '%';
        if (curTimeEl) curTimeEl.textContent = formatTime(video.currentTime);
    });

    video.addEventListener('loadedmetadata', function() {
        if (durTimeEl) durTimeEl.textContent = formatTime(video.duration);
    });

    /* 进度条点击仍可跳转 */
    if (progress) {
        progress.addEventListener('click', function(e) {
            e.stopPropagation();
            var rect = progress.getBoundingClientRect();
            var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            video.currentTime = pct * video.duration;
        });
    }
}

function formatTime(sec) {
    if (!isFinite(sec)) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
}

/* ========================================
   灯箱
   ======================================== */
var currentLightboxIndex = 0;
var lightboxImages = [];

function initLightbox() {
    var galleryItems = document.querySelectorAll('.gallery-img[data-src]');
    var lightbox = document.getElementById('lightbox');
    var lbImg = document.getElementById('lightboxImg');
    var closeBtn = document.querySelector('.lb-close');
    var prevBtn = document.querySelector('.lb-prev');
    var nextBtn = document.querySelector('.lb-next');

    if (!galleryItems.length || !lightbox) return;

    lightboxImages = Array.from(galleryItems).map(function(item) { return item.dataset.src; });

    galleryItems.forEach(function(item, index) {
        item.addEventListener('click', function() { openLightbox(index); });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', function() { navigateLightbox(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { navigateLightbox(1); });

    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });
}

function openLightbox(index) {
    var lightbox = document.getElementById('lightbox');
    var lbImg = document.getElementById('lightboxImg');
    var counter = document.querySelector('.lb-counter');

    currentLightboxIndex = index;
    if (lbImg) lbImg.src = lightboxImages[index];
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (counter) counter.textContent = (index + 1) + ' / ' + lightboxImages.length;
}

function closeLightbox() {
    var lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(dir) {
    currentLightboxIndex = (currentLightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
    var lbImg = document.getElementById('lightboxImg');
    var counter = document.querySelector('.lb-counter');
    
    if (lbImg) lbImg.src = lightboxImages[currentLightboxIndex];
    if (counter) counter.textContent = (currentLightboxIndex + 1) + ' / ' + lightboxImages.length;
}

/* ========================================
   PDF 首图点击
   ======================================== */
function initPdfLink() {
    var heroEl = document.querySelector('.detail-hero.pdf-clickable');
    if (!heroEl) return;

    var pdfUrl = heroEl.dataset.pdf;
    if (!pdfUrl) return;

    heroEl.style.cursor = 'pointer';
    heroEl.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(pdfUrl, '_blank');
    });
}

/* ========================================
   Masonry 瀑布流 — JS 驱动 + 最小高度约束 + 视觉平衡
   ======================================== */
function buildMasonry(work) {
    var gallery = document.getElementById('detailGallery');
    if (!gallery) return;

    var colCount = window.innerWidth <= 768 ? 2 : 3;
    var cols = [];
    var colHeights = [];
    
    /* 创建列 */
    for (var c = 0; c < colCount; c++) {
        var col = document.createElement('div');
        col.className = 'masonry-col';
        gallery.appendChild(col);
        cols.push(col);
        colHeights.push(0);
    }

    /* 预加载图片获取尺寸 */
    var loadPromises = work.images.map(function(src) {
        return new Promise(function(resolve) {
            var img = new Image();
            img.onload = function() {
                resolve({ src: src, w: img.naturalWidth, h: img.naturalHeight });
            };
            img.onerror = function() {
                resolve({ src: src, w: 800, h: 600 });
            };
            img.src = src;
        });
    });

    /* 占位数据 */
    var imageData = work.images.map(function(src, i) {
        return { src: src, index: i, w: 800, h: 600 };
    });

    /* ── 核心渲染：带最小高度 + 平衡分配 ── */
    function renderCards(dataList) {
        var gap = 12;
        var colWidth = (gallery.clientWidth - (colCount - 1) * gap) / colCount;
        /* 最小卡片高度 = 列宽的 65%，避免突兀矮图 */
        var minCardH = colWidth * 0.65;

        /* 按面积降序排列，大图先分配，避免末尾堆积小图 */
        var sorted = dataList.slice().sort(function(a, b) {
            return (b.w * b.h) - (a.w * a.h);
        });

        sorted.forEach(function(item, idx) {
            var ratio = item.w / item.h || 1.33;
            /* clamp ratio 到合理范围 [0.55, 2.5]，防止极端比例产生过矮/过高卡片 */
            if (ratio > 2.5) ratio = 2.5;   /* 超宽图限制 */
            if (ratio < 0.55) ratio = 0.55; /* 超高竖图拉高 */

            var cardHeight = colWidth / ratio;
            /* 强制最小高度 */
            if (cardHeight < minCardH) cardHeight = minCardH;

            /* ── 平衡列选择 ──
               找到放入后「该列高度」最接近「当前平均高度」的列，
               这样不会出现某列远远落后然后突然塞入一个矮图的情况
            */
            var avgH = colHeights.reduce(function(s, h) { return s + h; }, 0) / colCount;
            var bestCol = 0;
            var bestScore = Infinity;

            for (var c = 0; c < colCount; c++) {
                var afterH = colHeights[c] + cardHeight + gap;
                /* 分数 = 放入后与平均高度的差距，偏向选较短的但不过度 */
                var score = afterH - avgH;
                if (score < 0) score *= 0.6; /* 对低于平均的稍微惩罚轻一点，鼓励填平 */
                if (score < bestScore) {
                    bestScore = score;
                    bestCol = c;
                }
            }

            var card = document.createElement('div');
            card.className = 'gallery-img masonry-item';
            card.setAttribute('data-src', item.src);
            card.setAttribute('data-index', item.index);
            card.style.transitionDelay = (idx * 0.05) + 's';
            card.innerHTML =
                '<img src="' + item.src + '" alt="' + work.name + ' - ' + (item.index + 1) + '" loading="lazy">' +
                '<div class="gallery-img-overlay"><span class="gallery-img-index">' + String(item.index + 1).padStart(2, '0') + '</span></div>';

            cols[bestCol].appendChild(card);
            colHeights[bestCol] += cardHeight + gap;
        });

        /* 入场动画 */
        requestAnimationFrame(function() {
            setTimeout(function() {
                var cards = gallery.querySelectorAll('.masonry-item');
                if (typeof gsap !== 'undefined') {
                    gsap.to(cards, {
                        opacity: 1,
                        y: 0,
                        duration: 0.55,
                        ease: 'power3.out',
                        stagger: { each: 0.05, from: 'start' }
                    });
                } else {
                    cards.forEach(function(c, i) {
                        setTimeout(function() { c.classList.add('revealed'); }, i * 50);
                    });
                }
            }, 80);

            setTimeout(initLightbox, 100);
        });
    }

    /* 先快速渲染占位 */
    renderCards(imageData);

    /* 异步加载真实尺寸后重新排版 */
    Promise.all(loadPromises).then(function(realData) {
        cols.forEach(function(col) { col.innerHTML = ''; });
        for (var c = 0; c < colCount; c++) colHeights[c] = 0;
        renderCards(realData);
    });
}
