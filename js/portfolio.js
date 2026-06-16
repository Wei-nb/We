/* ========================================
   作品集页面脚本
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    initPortfolio();
});

let currentCategory = 'all';
let currentSub = 'all';

function initPortfolio() {
    const subFiltersContainer = document.getElementById('subFilters');
    if (!subFiltersContainer) return;

    // 找到正确的 filter-row（第一个）
    const filterRow = document.querySelector('.filter-bar-glass .filter-row');
    if (!filterRow) return;

    // 生成主分类按钮
    CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (cat.id === currentCategory ? ' active' : '');
        btn.textContent = cat.name;
        btn.dataset.category = cat.id;
        btn.addEventListener('click', () => selectCategory(cat.id));
        filterRow.appendChild(btn);
    });

    // 生成子分类按钮（默认显示全部）
    updateSubFilters(currentCategory);

    // 渲染作品
    renderWorks();

    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const urlCat = urlParams.get('category');
    if (urlCat && CATEGORIES.find(c => c.id === urlCat)) {
        selectCategory(urlCat);
    }
}

function selectCategory(categoryId) {
    currentCategory = categoryId;
    currentSub = 'all';

    // 更新主分类按钮状态
    document.querySelectorAll('.filter-bar-glass .filter-row .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === categoryId);
    });

    // 更新子分类
    updateSubFilters(categoryId);
    renderWorks();
}

function updateSubFilters(categoryId) {
    const container = document.getElementById('subFilters');
    if (!container) return;

    container.innerHTML = '';

    if (categoryId === 'all') {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category || !category.subs) return;

    // 全部子分类按钮
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.textContent = '全部';
    allBtn.dataset.sub = 'all';
    allBtn.addEventListener('click', () => selectSub('all'));
    container.appendChild(allBtn);

    // 各子分类按钮
    category.subs.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = sub;
        btn.dataset.sub = sub;
        btn.addEventListener('click', () => selectSub(sub));
        container.appendChild(btn);
    });
}

function selectSub(subName) {
    currentSub = subName;

    document.querySelectorAll('#subFilters .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sub === subName);
    });

    renderWorks();
}

function renderWorks() {
    const grid = document.getElementById('worksGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid || !emptyState) return;

    let filteredWorks = WORKS_DATA;

    if (currentCategory !== 'all') {
        filteredWorks = filteredWorks.filter(w => w.category === currentCategory);
    }

    if (currentSub !== 'all') {
        filteredWorks = filteredWorks.filter(w => w.subCategory === currentSub);
    }

    grid.innerHTML = '';

    if (filteredWorks.length === 0) {
        grid.style.display = 'none';
        emptyState.classList.remove('hidden');
        return;
    }

    grid.style.display = '';
    emptyState.classList.add('hidden');

    filteredWorks.forEach((work, index) => {
        const card = createWorkCard(work, index);
        grid.appendChild(card);
    });
}

function createWorkCard(work, index) {
    const card = document.createElement('a');
    card.href = 'detail.html?id=' + work.id + '&cat=' + currentCategory + '&sub=' + currentSub;
    card.className = 'work-glass-card reveal';
    card.style.transitionDelay = Math.min(index * 0.06, 0.3) + 's';

    // 分类主题色
    var catColors = {
        modeling: 'rgba(232,90,60,0.6)',
        scenedesign: 'rgba(60,160,232,0.6)',
        animation: 'rgba(100,200,100,0.6)',
        other: 'rgba(180,120,232,0.6)'
    };
    card.style.setProperty('--card-accent', catColors[work.category] || catColors.modeling);

    var hasVideo = work.video && work.video.length > 0;

    card.innerHTML =
        '<div class="card-inner">' +
            '<div class="work-glass-thumb">' +
                '<img src="' + work.thumbnail + '" alt="' + work.name + '" loading="lazy">' +
                (hasVideo ?
                    '<video class="card-preview-video" muted loop playsinline preload="none">' +
                        '<source src="' + work.video + '" type="video/mp4">' +
                    '</video>' : '') +
            '</div>' +
            '<div class="work-glass-info">' +
                '<span class="glass-tag">' + work.subCategory + '</span>' +
                '<span class="glass-title">' + work.name + '</span>' +
                '<span class="glass-desc">' + work.description + '</span>' +
            '</div>' +
        '</div>';

    // 悬停视频预览逻辑
    if (hasVideo) {
        var video = card.querySelector('.card-preview-video');
        var hoverTimer;

        card.addEventListener('mouseenter', function () {
            hoverTimer = setTimeout(function () {
                video.play().catch(function () {});
            }, 350);
        });

        card.addEventListener('mouseleave', function () {
            clearTimeout(hoverTimer);
            video.pause();
            video.currentTime = 0;
        });
    }

    // 触发reveal动画
    requestAnimationFrame(function () {
        setTimeout(function () { card.classList.add('visible'); }, 50 + index * 50);
    });

    return card;
}
