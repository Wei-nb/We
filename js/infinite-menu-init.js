/* ========================================
   InfiniteMenu 初始化
   3D 球面无限菜单 — 首页"探索分类"区块
   ======================================== */
import { InfiniteGridMenu } from './infinite-menu.js';

(function () {
  'use strict';

  let _menuInstance = null;

  /* ── 子分类英文→中文映射 ── */
  const SUB_CAT_CN = {
    'Character': '角色建模', 'Prop': '道具设计', 'Environment': '环境',
    'Interior': '室内', 'Exterior': '室外', 'Concept': '概念',
    'Character Animation': '角色动画', 'Motion Graphics': '动态图形',
    'Sculpting': '雕塑', 'Texture Studies': '纹理研究',
    'Character Design': '角色设计', 'Illustration': '插画',
    'UI Design': 'UI设计'
  };

  /* ── 构建菜单项数据 ── */
  function buildItems(worksData) {
    const catMap = {};
    if (typeof CATEGORIES !== 'undefined' && CATEGORIES.length) {
      CATEGORIES.forEach(c => { catMap[c.id] = c.name; });
    }

    return worksData.map(work => {
      const catName = catMap[work.category] || '';
      const subName = SUB_CAT_CN[work.subCategory] || work.subCategory || '';
      const tags = [catName, subName].filter(Boolean).join(' · ');

      return {
        image: work.thumbnail,
        link: 'detail.html?id=' + work.id,
        title: work.name,
        description: tags + (work.year ? ' · ' + work.year : '')
      };
    });
  }

  /* ── Fallback UI（WebGL 不可用时）── */
  function renderFallback(stage, items) {
    stage.innerHTML = '';
    stage.className = 'infinite-menu-stage fallback-active';

    items.forEach((item, i) => {
      const card = document.createElement('a');
      card.href = item.link || '#';
      card.className = 'infinite-menu-fallback-card';
      card.style.animationDelay = (i * 0.08) + 's';

      card.innerHTML =
        (item.image
          ? '<img src="' + item.image + '" alt="" class="fallback-thumb">'
          : '<div class="fallback-placeholder">✦</div>') +
        '<div class="fallback-info">' +
          '<div class="fallback-title">' + (item.title || '') + '</div>' +
          '<div class="fallback-desc">' + (item.description || '') + '</div>' +
        '</div>';

      stage.appendChild(card);
    });
  }

  /* ── 初始化 WebGL 菜单 ── */
  function initMenu(stage, items) {
    if (_menuInstance) return;

    stage.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.id = 'infinite-grid-menu-canvas';
    canvas.style.cssText = 'display:block;width:100%;height:100%;position:absolute;top:0;left:0;';
    stage.appendChild(canvas);

    const faceTitle = document.createElement('h2');
    faceTitle.className = 'face-title inactive';
    stage.appendChild(faceTitle);

    const faceDesc = document.createElement('p');
    faceDesc.className = 'face-description inactive';
    stage.appendChild(faceDesc);

    let activeItem = null;
    let menu = null;
    let tapPos = { x: 0, y: 0 };
    let isTap = true;

    /* 活跃项变更 */
    function onActiveChange(index) {
      const item = items[index % items.length];
      if (!item) return;
      activeItem = item;
      faceTitle.textContent = item.title || '';
      faceDesc.textContent = item.description || '';
      if (menu && !menu.movementActive) {
        faceTitle.className = 'face-title active';
        faceDesc.className = 'face-description active';
        canvas.style.cursor = 'pointer';
      }
    }

    /* 移动状态变更 */
    function onMovementChange(isMoving) {
      if (isMoving) {
        faceTitle.className = 'face-title inactive';
        faceDesc.className = 'face-description inactive';
        canvas.style.cursor = 'grab';
        // 拖拽探索 → 中心几何体放大
        console.log('[InfiniteMenu] movement START → scale up');
        if (window.__centralGeometry) {
          window.__centralGeometry.setScale(2.0);
        } else {
          console.warn('[InfiniteMenu] __centralGeometry not found!');
        }
      } else if (activeItem) {
        faceTitle.className = 'face-title active';
        faceDesc.className = 'face-description active';
        canvas.style.cursor = 'pointer';
        // 停止探索分类 → 中心几何体缩小
        console.log('[InfiniteMenu] movement STOP → scale down');
        if (window.__centralGeometry) {
          window.__centralGeometry.setScale(1.0);
        } else {
          console.warn('[InfiniteMenu] __centralGeometry not found!');
        }
      }
    }

    /* 触控/点击跳转 */
    canvas.addEventListener('pointerdown', e => {
      tapPos.x = e.clientX;
      tapPos.y = e.clientY;
      isTap = true;
    });
    canvas.addEventListener('pointermove', e => {
      if (!isTap) return;
      const dx = e.clientX - tapPos.x;
      const dy = e.clientY - tapPos.y;
      if (dx * dx + dy * dy > 64) isTap = false;
    });
    canvas.addEventListener('click', () => {
      if (isTap && activeItem && activeItem.link) {
        window.location.href = activeItem.link;
      }
    });

    /* 启动 WebGL */
    try {
      menu = new InfiniteGridMenu(
        canvas, items, onActiveChange, onMovementChange,
        sk => sk.run(), 1.0
      );
      _menuInstance = menu;
      window._infiniteMenu = menu;

      console.log('[InfiniteMenu] ready — ' + items.length + ' items');
    } catch (err) {
      console.error('[InfiniteMenu] WebGL 初始化失败:', err.message || err);
      renderFallback(stage, items);
      return;
    }

    /* ResizeObserver 自适应 */
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        if (menu) {
          try { menu.resize(); } catch (e) { /* ignore */ }
        }
      });
      ro.observe(stage);
    } else {
      window.addEventListener('resize', () => {
        clearTimeout(window.__imResizeTimer);
        window.__imResizeTimer = setTimeout(() => {
          if (menu) {
            try { menu.resize(); } catch (e) { /* ignore */ }
          }
        }, 150);
      });
    }
  }

  /* ── 启动入口 ── */
  function boot() {
    const stage = document.getElementById('infiniteMenuStage');
    if (!stage) return;

    if (typeof WORKS_DATA === 'undefined' || !WORKS_DATA.length) {
      console.warn('[InfiniteMenu] WORKS_DATA 为空');
      return;
    }

    const items = buildItems(WORKS_DATA);
    if (!items.length) return;

    initMenu(stage, items);
  }

  /* 等待 DOM + 数据就绪后启动 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 200));
  } else {
    setTimeout(boot, 100);
  }

})();
