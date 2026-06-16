/**
 * Glitch Text — 原生 JS 初始化
 * 查找所有 [data-glitch] 元素，注入 CSS 变量
 */
(function () {
    'use strict';

    function initGlitchText() {
        var els = document.querySelectorAll('[data-glitch]');

        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var speed = parseFloat(el.dataset.glitchSpeed) || 0.5;
            var shadows = el.dataset.glitchShadows !== 'false';
            var hover = el.dataset.glitchHover === 'true';

            // CSS 变量
            el.style.setProperty('--glitch-duration-after', (speed * 3) + 's');
            el.style.setProperty('--glitch-duration-before', (speed * 2) + 's');
            el.style.setProperty('--glitch-shadow-after', shadows ? '-3px 0 #3c8ae8' : 'none');
            el.style.setProperty('--glitch-shadow-before', shadows ? '3px 0 #e85a3c' : 'none');

            // 设置 data-text 用于伪元素 content
            if (!el.getAttribute('data-text')) {
                el.setAttribute('data-text', el.textContent.trim());
            }

            // 添加类名
            el.classList.add('glitch');
            if (hover) el.classList.add('glitch-hover');
        }
    }

    // DOM 就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlitchText);
    } else {
        initGlitchText();
    }
})();
