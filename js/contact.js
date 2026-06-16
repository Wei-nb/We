/* ========================================
   联系页面脚本
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    initContactForm();
});

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const btn = form.querySelector('.submit-btn');
        const originalText = btn.innerHTML;

        // 模拟提交
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            发送中...
        `;
        btn.disabled = true;

        setTimeout(() => {
            btn.style.background = '#22c55e';
            btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
                已发送！
            `;

            setTimeout(() => {
                btn.style.background = '';
                btn.innerHTML = originalText;
                btn.disabled = false;
                form.reset();
            }, 2500);
        }, 1200);
    });
}
