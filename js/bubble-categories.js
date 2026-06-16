/**
 * Bubble Categories — 物理重力掉落胶囊分类
 * 参考 reactbits.dev/text-animations/falling-text
 * 纯 JS 物理引擎：重力加速 → 弹跳衰减 → 自然停稳
 */
(function () {
    /* ═══════════════ 可调参数 ═══════════════ */
    var GRAVITY = 1.6;              // 重力加速度 (px/frame²)
    var BOUNCE = 0.35;              // 弹性系数 0~1，越小弹跳越少
    var FRICTION = 0.93;            // 水平速度摩擦衰减
    var STOP_VELOCITY = 0.5;        // 低于此速度停止弹跳
    var STAGGER_MS = 120;           // 每个胶囊间隔触发 (ms)
    var FALL_HEIGHT = 300;          // 起始掉落高度 (px, 负值=上方)

    var links = [];
    var physics = [];
    var animId = null;
    var section = null;
    var triggered = false;

    /* ═══════════════ 初始化 ═══════════════ */
    function init() {
        var els = document.querySelectorAll('.bubble-cat-link');
        if (!els.length) return;

        links = Array.from(els);
        section = document.getElementById('categories');

        // 为每个胶囊建立物理状态
        physics = links.map(function (el, i) {
            // 计算 CSS 原始旋转
            var rawRot = el.style.getPropertyValue('--item-rot') || '0deg';
            var baseRot = parseFloat(rawRot);

            // 初始隐藏态：置顶 + 不可见
            el.style.opacity = '0';
            el.style.transform = 'rotate(' + baseRot + 'deg) translateY(' + (-FALL_HEIGHT) + 'px)';
            el.classList.remove('init-hidden'); // 不再用旧入场

            return {
                el: el,
                baseRot: baseRot,       // CSS 原始小角度旋转
                y: -FALL_HEIGHT,        // 当前 Y 偏移
                vy: 0,                  // 垂直速度
                vx: 0,                  // 水平速度
                vRot: 0,                // 旋转速度
                curRot: 0,              // 当前附加旋转
                grounded: false,
                triggered: false,
                idx: i
            };
        });

        // 滚动触发
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting && !triggered) {
                    triggered = true;
                    startFall();
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 1.0, rootMargin: '0px 0px -80px 0px' });

        if (section) obs.observe(section);

        // 兜底触发（用户长时间未滚动完时）
        setTimeout(function () {
            if (!triggered) { triggered = true; startFall(); if (section) obs.unobserve(section); }
        }, 6000);
    }

    /* ═══════════════ 触发掉落 ═══════════════ */
    function startFall() {
        // 全显
        links.forEach(function (el) { el.style.opacity = '1'; });

        physics.forEach(function (p) {
            setTimeout(function () {
                p.triggered = true;
                // 随机初速度 — 模拟不同角度掉落
                p.vy = 1 + Math.random() * 4;
                p.vx = (Math.random() - 0.5) * 14;
                p.vRot = (Math.random() - 0.5) * 6;
            }, p.idx * STAGGER_MS + Math.random() * 30);
        });

        if (!animId) animId = requestAnimationFrame(tick);
    }

    /* ═══════════════ 物理帧更新 ═══════════════ */
    function tick() {
        var allDone = true;

        for (var i = 0; i < physics.length; i++) {
            var p = physics[i];
            if (!p.triggered) { allDone = false; continue; }

            if (!p.grounded) {
                // 重力加速
                p.vy += GRAVITY;
                // 水平摩擦减速
                p.vx *= FRICTION;
                // 旋转衰减
                p.vRot *= 0.9;

                // 更新位置
                p.y += p.vy;
                p.curRot += p.vRot;

                // ══ 地面碰撞 (Y=0 为基准线) ══
                if (p.y >= 0) {
                    p.y = 0;

                    if (Math.abs(p.vy) > STOP_VELOCITY) {
                        // 弹跳
                        p.vy = -p.vy * BOUNCE;
                        p.vx *= 0.6;       // 着地水平减速
                        p.vRot *= -0.5;    // 反弹旋转反转
                    } else {
                        // 速度太小，停稳
                        p.vy = 0; p.vx = 0; p.vRot = 0;
                        p.grounded = true;
                    }
                }

                /* ── 写入 DOM ── */
                applyTransform(p);

                allDone = false;
            } else {
                /* ── 停稳后过渡到精确位置 ── */
                settleToFinal(p);
            }
        }

        if (allDone) {
            animId = null;
            // 清理 inline transform，添加 done 标记让 CSS transition 恢复
            for (var j = 0; j < physics.length; j++) {
                var pp = physics[j];
                pp.el.style.transform = '';
                pp.el.style.transition = '';
                pp.el.classList.add('physics-done');
            }
            return;
        }

        animId = requestAnimationFrame(tick);
    }

    /* ═══════════════ 工具函数 ═══════════════ */
    function applyTransform(p) {
        var rotVal = p.baseRot + p.curRot;
        var yVal = Math.round(p.y * 10) / 10;
        var xVal = Math.round(p.vx * 0.15 * 10) / 10;
        p.el.style.transform =
            'rotate(' + rotVal + 'deg)' +
            ' translateX(' + xVal + 'px)' +
            ' translateY(' + yVal + 'px)';
    }

    function settleToFinal(p) {
        if (p._settled) return;

        // 阻尼平滑归位：指数衰减
        p.curRot *= 0.75;
        p.y *= 0.75;

        // 小于阈值直接到位
        if (Math.abs(p.y) < 0.3 && Math.abs(p.curRot) < 0.08) {
            p._settled = true;
            p.y = 0;
            p.curRot = 0;
        }

        p.el.style.transform =
            'rotate(' + (p.baseRot + p.curRot) + 'deg)' +
            ' translateY(' + Math.round(p.y * 10) / 10 + 'px)';
    }

    /* ═══════════════ 启动 ═══════════════ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
