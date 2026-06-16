/* ========================================
   Smooth Transitions — GSAP ScrollTrigger 丝滑版面切换
   不改变原有内容，仅增强版面间的过渡动效
   ======================================== */
(function () {
  'use strict';

  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[SmoothTransitions] GSAP/ScrollTrigger 未加载，跳过');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    _animateHero();
    _animateWorks();
    _animateInfiniteMenu();
    _animateCategories();
    _animateAbout();
    _createSectionOverlays();
  }

  /* ========================================
     1. Hero — 视差 + 渐隐
     ======================================== */
  function _animateHero() {
    var hero = document.getElementById('hero');
    if (!hero) return;

    var content = hero.querySelector('.hero-content');
    var hint = hero.querySelector('.hero-hint');
    var indicator = hero.querySelector('.scroll-indicator');
    var cubesWrap = hero.querySelector('.hero-cubes-wrap');

    // 立方体背景缩放 + 渐变
    if (cubesWrap) {
      gsap.to(cubesWrap, {
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.7
        },
        scale: 0.92,
        opacity: 0.25,
        ease: 'none'
      });
    }

    // 内容上浮 + 淡出
    if (content) {
      gsap.to(content, {
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom center',
          scrub: 0.6
        },
        y: 100,
        opacity: 0.15,
        ease: 'none'
      });
    }

    // 提示文字更快淡出
    if (hint) {
      gsap.to(hint, {
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'center top',
          scrub: 0.5
        },
        opacity: 0,
        y: -20
      });
    }

    // 滚动指示器快速消失
    if (indicator) {
      gsap.to(indicator, {
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=200',
          scrub: true
        },
        opacity: 0
      });
    }
  }

  /* ========================================
     2. Works — 标题揭示 + 卡片区域
     ======================================== */
  function _animateWorks() {
    var works = document.getElementById('works');
    if (!works) return;

    var header = works.querySelector('.section-header');
    var footer = works.querySelector('.section-footer');
    var bgTitle = works.querySelector('.works-bg-title');

    // 背景大文字视差
    if (bgTitle) {
      gsap.fromTo(bgTitle, 
        { y: 40, opacity: 0.2 },
        {
          scrollTrigger: {
            trigger: works,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.5
          },
          y: -40,
          opacity: 0.6,
          ease: 'none'
        }
      );
    }

    // 标题从下方滑入
    if (header) {
      gsap.fromTo(header,
        { y: 50, opacity: 0 },
        {
          scrollTrigger: {
            trigger: works,
            start: 'top 80%',
            end: 'top 40%',
            scrub: 0.5
          },
          y: 0,
          opacity: 1,
          ease: 'power2.out'
        }
      );
    }

    // More Works 按钮从下方滑入
    if (footer) {
      gsap.fromTo(footer,
        { y: 30, opacity: 0 },
        {
          scrollTrigger: {
            trigger: footer,
            start: 'top 90%',
            end: 'top 60%',
            scrub: 0.4
          },
          y: 0,
          opacity: 1
        }
      );
    }
  }

  /* ========================================
     3. InfiniteMenu (3D 球面) — 标题揭示
     ======================================== */
  function _animateInfiniteMenu() {
    var section = document.getElementById('lightWorks');
    if (!section) return;

    var header = section.querySelector('.infinite-menu-header');
    var hint = section.querySelector('.infinite-menu-hint');
    var stage = section.querySelector('.infinite-menu-stage');

    // 标题组合滑入
    if (header) {
      var tag = header.querySelector('.infinite-menu-tag');
      var title = header.querySelector('.infinite-menu-title');
      var desc = header.querySelector('.infinite-menu-desc');

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          end: 'top 30%',
          scrub: 0.6
        }
      });

      if (tag) tl.fromTo(tag, { y: 30, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out' }, 0);
      if (title) tl.fromTo(title, { y: 25, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out' }, 0.08);
      if (desc) tl.fromTo(desc, { y: 20, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out' }, 0.14);
    }

    // 提示文字淡入
    if (hint) {
      gsap.fromTo(hint,
        { opacity: 0 },
        {
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
            end: 'top 45%',
            scrub: 0.4
          },
          opacity: 0.5
        }
      );
    }
  }

  /* ========================================
     4. Categories — Bubble 分类链接逐个揭示
     ======================================== */
  function _animateCategories() {
    var section = document.getElementById('categories');
    if (!section) return;

    var header = section.querySelector('.section-header');
    var items = section.querySelectorAll('.bubble-cat-col');

    // 标题
    if (header) {
      gsap.fromTo(header,
        { y: 40, opacity: 0 },
        {
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 45%',
            scrub: 0.5
          },
          y: 0,
          opacity: 1
        }
      );
    }

    // 分类项目逐个从下方滑入
    items.forEach(function (item, i) {
      gsap.fromTo(item,
        { y: 60, opacity: 0, rotation: -3 },
        {
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            end: 'top 30%',
            scrub: 0.5
          },
          y: 0,
          opacity: 1,
          rotation: 0,
          delay: i * 0.08,
          ease: 'power3.out'
        }
      );
    });
  }

  /* ========================================
     5. About — Mission 文字逐行揭示
     ======================================== */
  function _animateAbout() {
    var section = document.getElementById('about');
    if (!section) return;

    var label = section.querySelector('.about-label');
    var svg = section.querySelector('.about-mission-svg');
    var markers = section.querySelectorAll('.mission-marker');
    var enText = section.querySelector('.about-mission-en');
    var services = section.querySelectorAll('.service-item');

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        end: 'top 20%',
        scrub: 0.7
      }
    });

    if (label) tl.fromTo(label, { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, 0);
    if (svg) tl.fromTo(svg, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1 }, 0.1);

    markers.forEach(function (m, i) {
      tl.fromTo(m, { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, 0.15 + i * 0.08);
    });

    if (enText) {
      tl.fromTo(enText, { y: 15, opacity: 0 }, { y: 0, opacity: 1 }, 0.25);
    }

    services.forEach(function (s, i) {
      tl.fromTo(s, { x: -20, opacity: 0 }, { x: 0, opacity: 1 }, 0.35 + i * 0.1);
    });
  }

  /* ========================================
     6. 版面过渡叠加层 — 渐变擦除
     ======================================== */
  function _createSectionOverlays() {
    var sections = [
      { id: 'hero', color: '#0a0a0a' },
      { id: 'works', color: '#0d0d0f' },
      { id: 'lightWorks', color: '#0a0a0d' },
      { id: 'categories', color: '#0c0c0e' },
      { id: 'about', color: '#0a0a0a' }
    ];

    sections.forEach(function (sec) {
      var el = document.getElementById(sec.id);
      if (!el) return;

      // 在每个 section 底部创建渐变过渡层
      var overlay = document.createElement('div');
      overlay.className = 'section-transition-overlay';
      overlay.style.cssText =
        'position:absolute;bottom:0;left:0;right:0;height:clamp(80px,12vw,180px);' +
        'pointer-events:none;z-index:2;' +
        'background:linear-gradient(to bottom,transparent,' + sec.color + ');';
      el.style.position = el.style.position || 'relative';
      el.appendChild(overlay);
    });
  }

  /* ── 启动 ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // 延迟确保所有 section 都渲染完毕
      setTimeout(init, 400);
    });
  } else {
    setTimeout(init, 300);
  }
})();
