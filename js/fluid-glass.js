/**
 * Fluid Glass — 液态玻璃引擎 v2
 * 完全对齐 reactbits.dev/components/fluid-glass
 * 滑动动效 + 鼠标追踪光效
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════
     1. 动画帧节流鼠标追踪
     ═══════════════════════════════════════ */
  var ticking = false;
  var pendingElements = [];

  function scheduleUpdate(el, x, y) {
    pendingElements.push({ el: el, x: x, y: y });
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () {
        var seen = {};
        for (var i = pendingElements.length - 1; i >= 0; i--) {
          var item = pendingElements[i];
          if (!seen[item.el]) {
            seen[item.el] = true;
            item.el.style.setProperty('--mouse-x', item.x + '%');
            item.el.style.setProperty('--mouse-y', item.y + '%');
          }
        }
        pendingElements = [];
        ticking = false;
      });
    }
  }

  /* ═══════════════════════════════════════
     3. 绑定元素鼠标追踪
     ═══════════════════════════════════════ */
  function bindMouseTracking(el) {
    if (el._fluidGlassBound) return;
    el._fluidGlassBound = true;

    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;

      scheduleUpdate(el, x, y);

      // 动态渐变角度
      var angle = Math.atan2(y - 50, x - 50) * (180 / Math.PI) + 90;
      el.style.setProperty('--gradient-angle', angle + 'deg');
    });

    el.addEventListener('mouseleave', function () {
      el.style.setProperty('--mouse-x', '50%');
      el.style.setProperty('--mouse-y', '50%');
      el.style.setProperty('--gradient-angle', '135deg');
    });
  }

  /* ═══════════════════════════════════════
     2. 增强滑动动效 — 错层延迟入场
     ═══════════════════════════════════════ */
  function enhanceScrollReveal() {
    // 为 .reveal 元素添加增强入场动画
    var reveals = document.querySelectorAll('.reveal:not(.reveal-enhanced)');
    if (!reveals.length) return;

    reveals.forEach(function (el, index) {
      el.classList.add('reveal-enhanced');
      // 同一父容器内的同级元素错层延迟
      var siblings = el.parentNode ? el.parentNode.querySelectorAll('.reveal-enhanced') : [];
      var localIdx = Array.prototype.indexOf.call(siblings, el);
      // 每行有不同延迟
      var rowDelay = (localIdx % 3) * 0.08 + Math.floor(localIdx / 3) * 0.04;
      el.style.setProperty('--reveal-delay', rowDelay + 's');
    });
  }

  /* ═══════════════════════════════════════
     3. 初始化
     ═══════════════════════════════════════ */
  function initAll() {
    // 绑定鼠标追踪到所有玻璃元素
    document.querySelectorAll(
      '.fluid-glass, .fluid-glass-solid, .fluid-glass-dark, ' +
      '.work-glass-card, .light-work-card, .detail-glass, .nav-work-link-glass, ' +
      '.work-glass-row, .sidebar-glass, .filter-bar-glass'
    ).forEach(function (el) {
      bindMouseTracking(el);
    });

    // 增强滑动动效
    enhanceScrollReveal();
  }

  /* ═══════════════════════════════════════
     4. MutationObserver：动态注入后重新绑定
     ═══════════════════════════════════════ */
  var observer = new MutationObserver(function (mutations) {
    var added = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length) {
        added = true;
        break;
      }
    }
    if (added) {
      requestAnimationFrame(function () {
        initAll();
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  /* ═══════════════════════════════════════
     5. DOM 就绪
     ═══════════════════════════════════════ */
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    initAll();
  });
})();
