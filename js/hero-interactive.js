/* ========================================
   首页交互引擎 v3
   1. 3D 立方体网格 — 鼠标倾斜 + 涟漪 + 自动动画
   2. Lenis 式平滑滚动
   3. 右侧滚动进度指示器
   4. 作品区域 — 横向拖拽循环轮播 (Ning Huang 风格)
   5. 文字打乱悬停效果 (Text Scramble)
   6. 文字逐行滚动揭示 (Mission Text Reveal)
   7. 自定义光标 + 加载动画
   ======================================== */

/* ========================================
   CubesGrid — 3D 立方体网格交互系统
   ======================================== */
class CubesGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.gridSize = options.gridSize || 8;
        this.maxAngle = options.maxAngle || 45;
        this.radius = options.radius || 3;
        this.easing = options.easing || 'power3.out';
        this.enterDur = (options.duration && options.duration.enter) || 0.3;
        this.leaveDur = (options.duration && options.duration.leave) || 0.6;
        this.faceColor = options.faceColor || 'rgba(13, 13, 20, 0.38)';
        this.borderStyle = options.borderStyle || '1px solid rgba(255,255,255,0.2)';
        this.shadow = options.shadow || false;
        this.autoAnimate = options.autoAnimate !== false;
        this.rippleOnClick = options.rippleOnClick !== false;
        this.rippleColor = options.rippleColor || '#e85a3c';
        this.rippleSpeed = options.rippleSpeed || 2;

        this.userActive = false;
        this.idleTimer = null;
        this.rafId = null;
        this.simRAF = null;
        this.cubes = [];

        this.simPos = { x: Math.random() * this.gridSize, y: Math.random() * this.gridSize };
        this.simTarget = { x: Math.random() * this.gridSize, y: Math.random() * this.gridSize };

        this._build();
        this._bindEvents();
        if (this.autoAnimate) this._startAutoAnimate();
    }

    _build() {
        this.container.style.setProperty('--cube-face-bg', this.faceColor);
        this.container.style.setProperty('--cube-face-border', this.borderStyle);
        this.container.style.setProperty('--cube-face-shadow',
            this.shadow === true ? '0 0 6px rgba(0,0,0,.5)' : (this.shadow || 'none'));

        this.container.style.display = 'grid';
        this.container.style.gridTemplateColumns = 'repeat(' + this.gridSize + ', 1fr)';
        this.container.style.gridTemplateRows = 'repeat(' + this.gridSize + ', 1fr)';
        this.container.style.width = '100%';
        this.container.style.height = '100%';

        var frag = document.createDocumentFragment();
        var faces = ['top', 'bottom', 'left', 'right', 'front', 'back'];

        for (var r = 0; r < this.gridSize; r++) {
            for (var c = 0; c < this.gridSize; c++) {
                var cube = document.createElement('div');
                cube.className = 'cube';
                cube.dataset.row = r;
                cube.dataset.col = c;

                for (var f = 0; f < faces.length; f++) {
                    var face = document.createElement('div');
                    face.className = 'cube-face cube-face--' + faces[f];
                    cube.appendChild(face);
                }

                frag.appendChild(cube);
                this.cubes.push(cube);
            }
        }

        this.container.appendChild(frag);
    }

    _tiltAt(rowCenter, colCenter) {
        var self = this;
        var useGsap = typeof gsap !== 'undefined';
        this.cubes.forEach(function (cube) {
            var r = +cube.dataset.row;
            var c = +cube.dataset.col;
            var dist = Math.hypot(r - rowCenter, c - colCenter);
            if (dist <= self.radius) {
                var pct = 1 - dist / self.radius;
                var angle = pct * self.maxAngle;
                if (useGsap) {
                    gsap.to(cube, { duration: self.enterDur, ease: self.easing, overwrite: true, rotateX: -angle, rotateY: angle });
                } else {
                    cube.style.transform = 'rotateX(' + (-angle) + 'deg) rotateY(' + angle + 'deg)';
                }
            } else {
                if (useGsap) {
                    gsap.to(cube, { duration: self.leaveDur, ease: 'power3.out', overwrite: true, rotateX: 0, rotateY: 0 });
                } else {
                    cube.style.transform = 'none';
                }
            }
        });
    }

    _resetAll() {
        var self = this;
        var useGsap = typeof gsap !== 'undefined';
        this.cubes.forEach(function (cube) {
            if (useGsap) {
                gsap.to(cube, { duration: self.leaveDur, rotateX: 0, rotateY: 0, ease: 'power3.out' });
            } else {
                cube.style.transform = 'none';
            }
        });
    }

    _onPointerMove(e) {
        if (!this.container) return;
        this.userActive = true;
        if (this.idleTimer) clearTimeout(this.idleTimer);

        var rect = this.container.getBoundingClientRect();
        var cellW = rect.width / this.gridSize;
        var cellH = rect.height / this.gridSize;
        var colCenter = (e.clientX - rect.left) / cellW;
        var rowCenter = (e.clientY - rect.top) / cellH;

        if (this.rafId) cancelAnimationFrame(this.rafId);
        var self = this;
        this.rafId = requestAnimationFrame(function () { self._tiltAt(rowCenter, colCenter); });

        this.idleTimer = setTimeout(function () { self.userActive = false; }, 3000);
    }

    _onTouchMove(e) {
        if (!this.container) return;
        e.preventDefault();
        this.userActive = true;
        if (this.idleTimer) clearTimeout(this.idleTimer);

        var rect = this.container.getBoundingClientRect();
        var cellW = rect.width / this.gridSize;
        var cellH = rect.height / this.gridSize;
        var touch = e.touches[0];
        var colCenter = (touch.clientX - rect.left) / cellW;
        var rowCenter = (touch.clientY - rect.top) / cellH;

        if (this.rafId) cancelAnimationFrame(this.rafId);
        var self = this;
        this.rafId = requestAnimationFrame(function () { self._tiltAt(rowCenter, colCenter); });

        this.idleTimer = setTimeout(function () { self.userActive = false; }, 3000);
    }

    _onClick(e) {
        if (!this.container || !this.rippleOnClick) return;
        var rect = this.container.getBoundingClientRect();
        var cellW = rect.width / this.gridSize;
        var cellH = rect.height / this.gridSize;

        var clientX = e.clientX || (e.touches && e.touches[0].clientX);
        var clientY = e.clientY || (e.touches && e.touches[0].clientY);

        var colHit = Math.floor((clientX - rect.left) / cellW);
        var rowHit = Math.floor((clientY - rect.top) / cellH);

        var spreadDelay = 0.15 / this.rippleSpeed;
        var animDuration = 0.3 / this.rippleSpeed;
        var holdTime = 0.6 / this.rippleSpeed;

        var rings = {};
        var self = this;
        this.cubes.forEach(function (cube) {
            var r = +cube.dataset.row;
            var c = +cube.dataset.col;
            var dist = Math.hypot(r - rowHit, c - colHit);
            var ring = Math.round(dist);
            if (!rings[ring]) rings[ring] = [];
            rings[ring].push(cube);
        });

        var useGsap = typeof gsap !== 'undefined';
        var ringKeys = Object.keys(rings).map(Number).sort(function (a, b) { return a - b; });
        ringKeys.forEach(function (ring) {
            var delay = ring * spreadDelay;
            var faces = [];
            rings[ring].forEach(function (cube) {
                var cubeFaces = cube.querySelectorAll('.cube-face');
                for (var i = 0; i < cubeFaces.length; i++) faces.push(cubeFaces[i]);
            });

            if (useGsap) {
                gsap.to(faces, { backgroundColor: self.rippleColor, duration: animDuration, delay: delay, ease: 'power3.out' });
                gsap.to(faces, { backgroundColor: self.faceColor, duration: animDuration, delay: delay + animDuration + holdTime, ease: 'power3.out' });
            }
        });
    }

    _startAutoAnimate() {
        var self = this;
        var speed = 0.02;
        function loop() {
            if (!self.userActive) {
                var pos = self.simPos;
                var tgt = self.simTarget;
                pos.x += (tgt.x - pos.x) * speed;
                pos.y += (tgt.y - pos.y) * speed;
                self._tiltAt(pos.y, pos.x);
                if (Math.hypot(pos.x - tgt.x, pos.y - tgt.y) < 0.1) {
                    self.simTarget = { x: Math.random() * self.gridSize, y: Math.random() * self.gridSize };
                }
            }
            self.simRAF = requestAnimationFrame(loop);
        }
        this.simRAF = requestAnimationFrame(loop);
    }

    _bindEvents() {
        var self = this;
        this._onPointerMoveBound = function (e) { self._onPointerMove(e); };
        this._onResetBound = function () { self._resetAll(); };
        this._onClickBound = function (e) { self._onClick(e); };
        this._onTouchMoveBound = function (e) { self._onTouchMove(e); };
        this._onTouchStartBound = function () { self.userActive = true; };
        this._onTouchEndBound = function () { self._resetAll(); };

        this.container.addEventListener('pointermove', this._onPointerMoveBound);
        this.container.addEventListener('pointerleave', this._onResetBound);
        this.container.addEventListener('click', this._onClickBound);
        this.container.addEventListener('touchmove', this._onTouchMoveBound, { passive: false });
        this.container.addEventListener('touchstart', this._onTouchStartBound, { passive: true });
        this.container.addEventListener('touchend', this._onTouchEndBound, { passive: true });
    }

    destroy() {
        if (this.simRAF) cancelAnimationFrame(this.simRAF);
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.idleTimer) clearTimeout(this.idleTimer);

        if (this._onPointerMoveBound) this.container.removeEventListener('pointermove', this._onPointerMoveBound);
        if (this._onResetBound) this.container.removeEventListener('pointerleave', this._onResetBound);
        if (this._onClickBound) this.container.removeEventListener('click', this._onClickBound);
        if (this._onTouchMoveBound) this.container.removeEventListener('touchmove', this._onTouchMoveBound);
        if (this._onTouchStartBound) this.container.removeEventListener('touchstart', this._onTouchStartBound);
        if (this._onTouchEndBound) this.container.removeEventListener('touchend', this._onTouchEndBound);
    }
}

/* ========================================
   全局初始化
   ======================================== */
document.addEventListener('DOMContentLoaded', function () {
    initLoading();
    initCubeGrid();
    initLenisScroll();
    initScrollProgress();
    initWorksGrid();
    initTextScramble();
    initMissionReveal();
    initScrollIndicator();
});

/* ========================================
   0. 加载动画
   ======================================== */
function initLoading() {
    var bar = document.getElementById('loadingProgressBar');
    if (!bar) return;
    var w = 0;
    var interval = setInterval(function () {
        w += Math.random() * 30;
        if (w > 85) { w = 85; clearInterval(interval); }
        bar.style.width = Math.min(w, 100) + '%';
    }, 120);

    var checkLoaded = setInterval(function () {
        if (window._cubesReady) {
            clearInterval(checkLoaded);
            finishLoading();
        }
    }, 100);

    setTimeout(function () {
        clearInterval(checkLoaded);
        finishLoading();
    }, 3000);
}

function finishLoading() {
    var overlay = document.getElementById('loadingOverlay');
    var bar = document.getElementById('loadingProgressBar');
    if (bar) bar.style.width = '100%';
    setTimeout(function () {
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(function () { overlay.style.display = 'none'; }, 600);
        }
    }, 400);
}

/* ========================================
   1. 3D 立方体网格
   ======================================== */
var cubesInstance = null;

function initCubeGrid() {
    var scene = document.getElementById('heroCubesScene');
    if (!scene) return;

    cubesInstance = new CubesGrid(scene, {
        gridSize: 10,
        maxAngle: 65,
        radius: 5,
        easing: 'power3.out',
        duration: { enter: 0.25, leave: 0.5 },
        faceColor: 'rgba(26, 26, 36, 0.38)',
        borderStyle: '1px solid rgba(255,255,255,0.2)',
        shadow: '0 0 12px rgba(232,90,60,0.2)',
        autoAnimate: true,
        rippleOnClick: true,
        rippleColor: '#e85a3c',
        rippleSpeed: 2
    });

    window._cubesReady = true;
}

/* ========================================
   2. Lenis 式平滑滚动
   ======================================== */
function initLenisScroll() {
    var target = 0, current = 0, rounded = 0;
    var rafId = null;

    function update() {
        var diff = target - current;
        current += diff * 0.075;
        rounded = Math.round(current * 100) / 100;

        if (Math.abs(diff) > 0.01) {
            window.scrollTo(0, rounded);
        }

        rafId = requestAnimationFrame(update);
    }

    window.addEventListener('wheel', function (e) {
        target += e.deltaY;
        target = Math.max(0, Math.min(target, document.body.scrollHeight - window.innerHeight));
    }, { passive: true });

    var touchStartY = 0, touchTarget = 0;
    window.addEventListener('touchstart', function (e) {
        touchStartY = e.touches[0].clientY;
        touchTarget = target;
    }, { passive: true });
    window.addEventListener('touchmove', function (e) {
        var dy = touchStartY - e.touches[0].clientY;
        target = touchTarget + dy;
        target = Math.max(0, Math.min(target, document.body.scrollHeight - window.innerHeight));
    }, { passive: true });

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var el = document.querySelector(this.getAttribute('href'));
            if (el) {
                e.preventDefault();
                target = el.getBoundingClientRect().top + current;
                target = Math.max(0, Math.min(target, document.body.scrollHeight - window.innerHeight));
            }
        });
    });

    target = current = window.pageYOffset;
    rafId = requestAnimationFrame(update);
}

/* ========================================
   3. 右侧滚动进度指示器
   ======================================== */
function initScrollProgress() {
    var sections = document.querySelectorAll('#hero, #works, #lightWorks, #categories, #about');
    var spSections = document.querySelectorAll('.sp-section');
    var track = document.getElementById('spActiveTrack');
    if (sections.length === 0 || spSections.length === 0) return;

    function update() {
        var scrollY = window.pageYOffset || window.scrollY;
        var docH = document.body.scrollHeight - window.innerHeight;
        var progress = docH > 0 ? scrollY / docH : 0;

        if (track) {
            track.style.height = (progress * 100) + '%';
        }

        spSections.forEach(function (sp) {
            var id = sp.dataset.section;
            var el = document.getElementById(id);
            if (el) {
                var top = el.offsetTop, bottom = top + el.offsetHeight;
                if (scrollY + window.innerHeight * 0.4 >= top && scrollY < bottom) {
                    sp.classList.add('active');
                } else {
                    sp.classList.remove('active');
                }
            }
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* ========================================
   4. 作品区域 — 横向拖拽循环轮播 (Ning Huang 风格)
   ======================================== */
function initWorksGrid() {
    var grid = document.getElementById('featuredCards');
    if (!grid || typeof WORKS_DATA === 'undefined') return;

    var FEATURED_IDS = [24, 11, 14, 23, 20, 19];
    var works = FEATURED_IDS.map(function (fid) {
        return WORKS_DATA.find(function (w) { return w.id === fid; });
    }).filter(Boolean);
    var catNames = { modeling: '建模', scenedesign: '场景设计', animation: '动画', other: '其他' };

    // 错落配置：上下偏移(px)、旋转角(deg)
    var scatterStyle = [
        { y: -18, rot: -10 },
        { y: 12,  rot: 7   },
        { y: -8,  rot: -5  },
        { y: 22,  rot: 9   },
        { y: -15, rot: -8  },
        { y: 5,   rot: 4   }
    ];

    // 轨道容器
    var track = document.createElement('div');
    track.className = 'scattered-track';
    grid.appendChild(track);

    function createCard(work, idx) {
        var cfg = scatterStyle[idx % scatterStyle.length];
        var card = document.createElement('a');
        card.href = 'detail.html?id=' + work.id;
        card.className = 'scattered-card';
        card.dataset.workId = work.id;
        card.style.setProperty('--sc-y', cfg.y + 'px');
        card.style.setProperty('--sc-rot', cfg.rot + 'deg');
        card.style.setProperty('--sc-delay', ((idx % works.length) * 0.1) + 's');
        card.style.setProperty('--sc-fdelay', ((idx % works.length) * 0.35) + 's');

        card.innerHTML =
            '<div class="sc-bg" style="background-image:url(\'' + work.thumbnail + '\')"></div>' +
            '<div class="sc-overlay"></div>' +
            '<div class="sc-glare"></div>' +
            '<div class="sc-content">' +
                '<span class="sc-tag">' + (catNames[work.category] || work.category) + '</span>' +
                '<h3 class="sc-title">' + work.name + '</h3>' +
                '<span class="sc-year">' + work.year + '</span>' +
            '</div>';

        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
            card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
        });
        return card;
    }

    // 渲染三套卡片：尾部克隆 -> 原始 -> 头部克隆（支持双向无限滚动）
    for (var c = 0; c < works.length; c++) track.appendChild(createCard(works[c], c));
    for (var i = 0; i < works.length; i++) track.appendChild(createCard(works[i], i));
    for (var c2 = 0; c2 < works.length; c2++) track.appendChild(createCard(works[c2], c2));

    /* ====== 拖拽 + 自动左漂 + 无限循环逻辑 ====== */
    var isDragging = false, startX = 0, currentX = 0, offsetX = 0;
    var autoDriftSpeed = 0.35; // 每帧左漂像素
    var driftRAF = null;

    var fcEl = track.querySelector('.scattered-card');
    var cardWidth = fcEl ? fcEl.offsetWidth : 300;
    var gap = 30;
    var singleSetWidth = (cardWidth + gap) * works.length;

    // 初始定位到中间组（原始卡片）
    currentX = offsetX = -singleSetWidth;
    track.style.transform = 'translateX(' + currentX + 'px)';

    // 入场动画 — IntersectionObserver 触发
    new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var allCards = track.querySelectorAll('.scattered-card');
                allCards.forEach(function (card, ci) {
                    setTimeout(function () { card.classList.add('sc-visible'); }, ci * 40);
                });
                this.disconnect();
            }
        });
    }, { threshold: 0.1 }).observe(grid);

    // ====== 自动左漂循环 ======
    function autoDriftLoop() {
        if (!isDragging) {
            offsetX -= autoDriftSpeed;
            currentX = offsetX;

            // 无限循环回绕
            while (offsetX > -singleSetWidth * 0.5) { offsetX -= singleSetWidth; }
            while (offsetX < -singleSetWidth * 2.5) { offsetX += singleSetWidth; }
            currentX = offsetX;

            track.style.transition = 'none';
            track.style.transform = 'translateX(' + currentX + 'px)';
        }
        driftRAF = requestAnimationFrame(autoDriftLoop);
    }
    driftRAF = requestAnimationFrame(autoDriftLoop);

    // ====== 拖拽事件 ======
    function onPointerDown(e) {
        isDragging = true;
        startX = e.type.indexOf('touch') === 0 ? e.touches[0].clientX : e.clientX;
        track.style.transition = 'none';
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        var cx = e.type.indexOf('touch') === 0 ? e.touches[0].clientX : e.clientX;
        currentX = offsetX + (cx - startX) * 1.0;
        track.style.transform = 'translateX(' + currentX + 'px)';
    }

    function onPointerUp() {
        if (!isDragging) return;
        isDragging = false;
        offsetX = currentX;

        // 回绕检测 — 保持在原始组附近
        while (offsetX > -singleSetWidth * 0.5) { offsetX -= singleSetWidth; currentX -= singleSetWidth; }
        while (offsetX < -singleSetWidth * 2.5) { offsetX += singleSetWidth; currentX += singleSetWidth; }

        // 松手后无缝继续自动左漂
        track.style.transition = 'none';
        track.style.transform = 'translateX(' + currentX + 'px)';
    }

    grid.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    grid.addEventListener('touchstart', onPointerDown, { passive: true });
    grid.addEventListener('touchmove', onPointerMove, { passive: false });
    grid.addEventListener('touchend', onPointerUp, { passive: true });

    // 防止拖拽后误触链接
    var dragCount = 0;
    grid.addEventListener('mousedown', function () { dragCount = 0; });
    window.addEventListener('mousemove', function () { if (isDragging && Math.abs(currentX - offsetX) > 5) dragCount++; });
    grid.addEventListener('click', function (e) { if (dragCount > 3) { e.preventDefault(); e.stopPropagation(); } });

    // resize 时重新计算尺寸
    window.addEventListener('resize', function () {
        var f = track.querySelector('.scattered-card');
        if (f) {
            cardWidth = f.offsetWidth;
            gap = parseInt(getComputedStyle(track).gap) || 30;
            singleSetWidth = (cardWidth + gap) * works.length;
        }
    });

    initScrollReveal();
}

function initScrollReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var delay = parseFloat(el.style.getPropertyValue('--reveal-delay') || '0');

                setTimeout(function () {
                    el.classList.add('visible');
                }, delay * 1000);

                if (el.classList.contains('reveal-stagger')) {
                    el.classList.add('visible');
                }

                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    });

    reveals.forEach(function (el) {
        if (el.classList.contains('reveal') &&
            !el.classList.contains('reveal-stagger') &&
            el.parentElement) {

            var parent = el.parentElement;
            if (parent.classList.contains('reveal-stagger')) {
                // 由 reveal-stagger 的 CSS 处理
            } else {
                var siblings = parent.querySelectorAll('.reveal:not(.reveal-stagger)');
                var idx = Array.prototype.indexOf.call(siblings, el);
                if (idx >= 0 && !el.style.getPropertyValue('--reveal-delay')) {
                    el.style.setProperty('--reveal-delay', (idx * 0.06) + 's');
                }
            }
        }
        observer.observe(el);
    });
}

/* ========================================
   5. 文字打乱悬停效果 (Text Scramble)
   ======================================== */
function initTextScramble() {
    var chars = '!<>-_\\/[]{}—=+*^?#________';
    var elements = document.querySelectorAll('[data-scramble]');

    elements.forEach(function (el) {
        var originalText = el.textContent || '';
        var interval = null;

        el.addEventListener('mouseenter', function () {
            if (interval) return;
            var frame = 0;
            interval = setInterval(function () {
                el.textContent = originalText.split('').map(function (c, i) {
                    if (i < frame) return originalText[i];
                    if (c === ' ') return ' ';
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join('');
                frame += 1 / 3;
                if (frame >= originalText.length) {
                    el.textContent = originalText;
                    clearInterval(interval);
                    interval = null;
                }
            }, 40);
        });

        el.addEventListener('mouseleave', function () {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            var revFrame = originalText.length;
            var revInterval = setInterval(function () {
                el.textContent = originalText.split('').map(function (c, i) {
                    if (i > revFrame) return originalText[i];
                    if (c === ' ') return ' ';
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join('');
                revFrame -= 1;
                if (revFrame < 0) {
                    el.textContent = originalText;
                    clearInterval(revInterval);
                }
            }, 30);
        });
    });
}

/* ========================================
   6. 文字逐行滚动揭示 (Mission/Vision)
   ======================================== */
function initMissionReveal() {
    var markers = document.querySelectorAll('.mission-marker');
    if (!markers.length) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    markers.forEach(function (m, i) {
        m.style.transitionDelay = (i * 0.15) + 's';
        observer.observe(m);
    });
}

/* ========================================
   8. 滚动指示器
   ======================================== */
function initScrollIndicator() {
    var indicator = document.getElementById('scrollIndicator');
    var worksSection = document.getElementById('works');
    if (!indicator || !worksSection) return;

    indicator.addEventListener('click', function () {
        worksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    var scrolled = false;
    window.addEventListener('scroll', function () {
        if (!scrolled && window.pageYOffset > 100) {
            scrolled = true;
            indicator.style.opacity = '0';
            indicator.style.pointerEvents = 'none';
        }
    }, { passive: true });
}
