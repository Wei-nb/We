/**
 * Target Cursor — 四角锁定光标特效
 * 来源: reactbits.dev/animations/target-cursor
 * 基于 GSAP 的纯 JavaScript 实现
 */
(function () {
  'use strict';

  if (window.__targetCursorLoaded) return;
  window.__targetCursorLoaded = true;

  var config = Object.assign(
    {
      targetSelector:
        'a, button, .card, .work-glass-card, .work-glass-row, .light-work-card, ' +
        '.filter-btn, .filter-btn-small, .nav-work-link, .nav-work-link-glass, ' +
        '.contact-submit, .infinite-menu-item, .hero-hint, .detail-hero, ' +
        '.gallery-img, .cursor-target, .project-card, .social-link, ' +
        '.hamburger, img',
      spinDuration: 2.5,
      hoverDuration: 0.25,
      targetGap: 6,
      hideDefaultCursor: true,
      parallaxOn: true
    },
    window.TargetCursorOptions || {}
  );

  /* ── 移动端检测 ── */
  function isMobile() {
    var hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var small = window.innerWidth <= 768;
    var ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    var isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    return (hasTouch && small) || isMobileUA;
  }

  if (isMobile()) return;

  /* ── 等待 GSAP ── */
  function waitForGSAP(cb) {
    if (window.gsap) { cb(); return; }
    var count = 0;
    var timer = setInterval(function () {
      count++;
      if (window.gsap) {
        clearInterval(timer);
        cb();
      } else if (count > 50) {
        clearInterval(timer);
        console.warn('[target-cursor] GSAP 未加载');
      }
    }, 200);
  }

  waitForGSAP(function () {
    var gsap = window.gsap;

    /* ── 创建 DOM ── */
    var wrapper = document.createElement('div');
    wrapper.className = 'target-cursor-wrapper';
    wrapper.innerHTML =
      '<div class="target-cursor-rotor">' +
      '<div class="target-cursor-dot"></div>' +
      '<div class="target-cursor-corner corner-tl"></div>' +
      '<div class="target-cursor-corner corner-tr"></div>' +
      '<div class="target-cursor-corner corner-br"></div>' +
      '<div class="target-cursor-corner corner-bl"></div>' +
      '</div>';
    document.body.appendChild(wrapper);

    var rotor = wrapper.querySelector('.target-cursor-rotor');
    var corners = Array.prototype.slice.call(wrapper.querySelectorAll('.target-cursor-corner'));
    var dot = wrapper.querySelector('.target-cursor-dot');

    var CORNER_SIZE = 12;
    var spinTl = null;
    var activeTarget = null;
    var leaveHandler = null;
    var targetCornerPositions = null;
    var activeStrength = { current: 0 };
    var resumeTimeout = null;

    /* ── 配置 ── */
    if (config.hideDefaultCursor) {
      document.documentElement.classList.add('target-cursor-enabled');
    }

    /* ── 旋转动画 ── */
    function createSpin() {
      if (spinTl) spinTl.kill();
      spinTl = gsap.timeline({ repeat: -1 })
        .to(rotor, {
          rotation: '+=360',
          duration: config.spinDuration,
          ease: 'none'
        });
    }

    /* ── 重置四角到默认位置 ── */
    function resetCorners() {
      var s = CORNER_SIZE;
      var positions = [
        { x: -s * 1.6, y: -s * 1.6 },
        { x: s * 0.6, y: -s * 1.6 },
        { x: s * 0.6, y: s * 0.6 },
        { x: -s * 1.6, y: s * 0.6 }
      ];
      corners.forEach(function (c, i) {
        gsap.to(c, {
          x: positions[i].x,
          y: positions[i].y,
          duration: 0.3,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    }

    /* ── 移动光标 ── */
    function moveCursor(x, y) {
      gsap.to(wrapper, {
        x: x,
        y: y,
        duration: 0.08,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    }

    /* ── 清理悬停状态 ── */
    function clearHover() {
      gsap.ticker.remove(tickerFn);
      gsap.killTweensOf(activeStrength);
      activeStrength.current = 0;
      targetCornerPositions = null;
      if (activeTarget && leaveHandler) {
        activeTarget.removeEventListener('mouseleave', leaveHandler);
      }
      activeTarget = null;
      leaveHandler = null;
      resetCorners();
    }

    /* ── 逐帧更新：四角跟随目标 ── */
    function tickerFn() {
      if (!targetCornerPositions) return;
      var strength = activeStrength.current;
      if (strength === 0) return;

      var cx = Number(gsap.getProperty(wrapper, 'x'));
      var cy = Number(gsap.getProperty(wrapper, 'y'));

      corners.forEach(function (corner, i) {
        var curX = Number(gsap.getProperty(corner, 'x'));
        var curY = Number(gsap.getProperty(corner, 'y'));
        var targetX = targetCornerPositions[i].x - cx;
        var targetY = targetCornerPositions[i].y - cy;
        var finalX = curX + (targetX - curX) * strength;
        var finalY = curY + (targetY - curY) * strength;
        var dur = strength >= 0.99 ? (config.parallaxOn ? 0.15 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: dur,
          ease: dur === 0 ? 'none' : 'power1.out',
          overwrite: 'auto'
        });
      });
    }

    /* ── 进入目标元素 ── */
    function enterTarget(target) {
      if (!target || activeTarget === target) return;
      if (activeTarget && leaveHandler) {
        activeTarget.removeEventListener('mouseleave', leaveHandler);
      }
      if (resumeTimeout) {
        clearTimeout(resumeTimeout);
        resumeTimeout = null;
      }

      var rect = target.getBoundingClientRect();
      var gap = Number(config.targetGap) || 0;
      var cs = CORNER_SIZE;

      targetCornerPositions = [
        { x: rect.left - gap, y: rect.top - gap },
        { x: rect.right + gap - cs, y: rect.top - gap },
        { x: rect.right + gap - cs, y: rect.bottom + gap - cs },
        { x: rect.left - gap, y: rect.bottom + gap - cs }
      ];

      activeTarget = target;

      gsap.killTweensOf(rotor, 'rotation');
      gsap.killTweensOf(corners);
      gsap.killTweensOf(activeStrength);
      if (spinTl) spinTl.pause();

      gsap.set(rotor, { rotation: 0 });
      gsap.ticker.add(tickerFn);

      gsap.to(activeStrength, {
        current: 1,
        duration: config.hoverDuration,
        ease: 'power2.out',
        overwrite: 'auto'
      });

      var cx = Number(gsap.getProperty(wrapper, 'x'));
      var cy = Number(gsap.getProperty(wrapper, 'y'));

      corners.forEach(function (corner, i) {
        gsap.to(corner, {
          x: targetCornerPositions[i].x - cx,
          y: targetCornerPositions[i].y - cy,
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      });

      leaveHandler = function () {
        clearHover();
        resumeTimeout = window.setTimeout(function () {
          if (!activeTarget) {
            gsap.set(rotor, { rotation: 0 });
            createSpin();
          }
          resumeTimeout = null;
        }, 50);
      };

      target.addEventListener('mouseleave', leaveHandler);
    }

    /* ── 向上查找匹配的目标 ── */
    function findTarget(el) {
      while (el && el !== document.body) {
        if (el.matches && el.matches(config.targetSelector)) return el;
        el = el.parentElement;
      }
      return null;
    }

    /* ── 滚动时检查目标是否仍在光标下 ── */
    function scrollHandler() {
      if (!activeTarget) return;
      var mx = Number(gsap.getProperty(wrapper, 'x'));
      var my = Number(gsap.getProperty(wrapper, 'y'));
      var el = document.elementFromPoint(mx, my);
      var stillOver = el && (el === activeTarget || el.closest(config.targetSelector) === activeTarget);
      if (!stillOver && leaveHandler) leaveHandler();
    }

    /* ── 点击反馈 ── */
    function mouseDownHandler() {
      if (!dot) return;
      gsap.to(dot, { scale: 0.6, duration: 0.15, overwrite: 'auto' });
      gsap.to(wrapper, { scale: 0.9, duration: 0.15, overwrite: 'auto' });
    }

    function mouseUpHandler() {
      if (!dot) return;
      gsap.to(dot, { scale: 1, duration: 0.2, overwrite: 'auto' });
      gsap.to(wrapper, { scale: 1, duration: 0.2, overwrite: 'auto' });
    }

    /* ── 初始化 ── */
    gsap.set(wrapper, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });

    createSpin();
    resetCorners();

    window.addEventListener('mousemove', function (e) {
      moveCursor(e.clientX, e.clientY);
    });

    window.addEventListener('mouseover', function (e) {
      enterTarget(findTarget(e.target));
    }, { passive: true });

    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);
  });
})();
