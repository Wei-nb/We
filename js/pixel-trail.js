/**
 * Pixel Trail — 像素拖尾光标
 * 基于 reactbits.dev/animations/pixel-trail 原生 Three.js 实现
 */
import * as THREE from 'three';

class PixelTrail {
    constructor(options = {}) {
        this.gridSize    = options.gridSize    || 40;
        this.trailSize   = options.trailSize   || 0.1;
        this.maxAge      = options.maxAge      || 250;
        this.interpolate = options.interpolate || 5;
        this.color       = options.color       || '#ffffff';
        this.gooey       = options.gooey !== false;

        // 鼠标位置 0-1 归一化
        this.tx = 0.5;
        this.ty = 0.5;
        this.cx = 0.5;
        this.cy = 0.5;
        this._alive = false;

        this._init();
    }

    /* ── Gooey SVG 滤镜 ── */
    _createFilter() {
        if (!this.gooey) return;
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('class', 'goo-filter-container');
        svg.setAttribute('style', 'position:absolute;overflow:hidden;z-index:1');
        const filter = document.createElementNS(ns, 'filter');
        filter.setAttribute('id', 'pixel-goo-filter');
        filter.innerHTML =
            '<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>' +
            '<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>' +
            '<feBlend in="SourceGraphic" in2="goo"/>';
        svg.appendChild(filter);
        document.body.appendChild(svg);
    }

    /* ── Three.js 场景 ── */
    _setupThree() {
        this.canvas = document.createElement('canvas');
        Object.assign(this.canvas.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '9998',
            pointerEvents: 'none',
            filter: this.gooey ? 'url(#pixel-goo-filter)' : 'none'
        });
        document.body.appendChild(this.canvas);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: false,
            powerPreference: 'high-performance'
        });

        this.scene  = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // ── 自定义 ShaderMaterial ──
        this.uniforms = {
            resolution: { value: new THREE.Vector2() },
            mouseTrail: { value: null },
            gridSize:   { value: this.gridSize },
            pixelColor: { value: new THREE.Color(this.color) }
        };

        const mat = new THREE.ShaderMaterial({
            uniforms:       this.uniforms,
            transparent:    true,
            depthWrite:     false,
            depthTest:      false,
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec2 resolution;
                uniform sampler2D mouseTrail;
                uniform float gridSize;
                uniform vec3 pixelColor;

                vec2 coverUv(vec2 uv) {
                    vec2 s = resolution.xy / max(resolution.x, resolution.y);
                    vec2 newUv = (uv - 0.5) * s + 0.5;
                    return clamp(newUv, 0.0, 1.0);
                }

                void main() {
                    vec2 screenUv = gl_FragCoord.xy / resolution;
                    vec2 uv = coverUv(screenUv);
                    vec2 gridUvCenter = (floor(uv * gridSize) + 0.5) / gridSize;
                    float trail = texture2D(mouseTrail, gridUvCenter).r;
                    gl_FragColor = vec4(pixelColor, trail);
                }
            `
        });

        const geo = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(geo, mat);
        this.scene.add(this.mesh);

        this._resize();
    }

    /* ── 拖尾纹理缓冲 (Canvas 2D) ── */
    _createTrailBuffer() {
        const size = 512;
        const tc = document.createElement('canvas');
        tc.width  = size;
        tc.height = size;

        this.trailCtx = tc.getContext('2d');
        this.trailCtx.fillStyle = '#000';
        this.trailCtx.fillRect(0, 0, size, size);

        this.trailTex = new THREE.CanvasTexture(tc);
        this.trailTex.minFilter = THREE.NearestFilter;
        this.trailTex.magFilter = THREE.NearestFilter;
        this.trailTex.wrapS = THREE.ClampToEdgeWrapping;
        this.trailTex.wrapT = THREE.ClampToEdgeWrapping;

        this.uniforms.mouseTrail.value = this.trailTex;
    }

    /* ── 更新拖尾 ── */
    _updateTrail() {
        const ctx  = this.trailCtx;
        const size = 512;
        const fade = 20 / this.maxAge;  // 淡出速率

        // 全屏淡出
        ctx.fillStyle = 'rgba(0, 0, 0, ' + fade + ')';
        ctx.fillRect(0, 0, size, size);

        // 平滑插值 (ease)
        const ease = 1.0 - Math.pow(1.0 - this.interpolate / 100, 16.67);
        this.cx += (this.tx - this.cx) * ease;
        this.cy += (this.ty - this.cy) * ease;

        // 绘制当前光标
        const px = this.cx * size;
        const py = this.cy * size;
        const r  = Math.max(this.trailSize * size, 2);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        this.trailTex.needsUpdate = true;
    }

    /* ── 事件绑定 ── */
    _bindEvents() {
        const self = this;

        document.addEventListener('mousemove', (e) => {
            self.tx = e.clientX / window.innerWidth;
            self.ty = e.clientY / window.innerHeight;
        });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length) {
                self.tx = e.touches[0].clientX / window.innerWidth;
                self.ty = e.touches[0].clientY / window.innerHeight;
            }
        }, { passive: true });

        window.addEventListener('resize', () => self._resize());
    }

    _resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.uniforms.resolution.value.set(w, h);
    }

    /* ── 动画循环 ── */
    _animate() {
        this._alive = true;
        const loop = () => {
            if (!this._alive) return;
            requestAnimationFrame(loop);
            this._updateTrail();
            this.renderer.render(this.scene, this.camera);
        };
        loop();
    }

    /* ── 初始化 ── */
    _init() {
        this._createFilter();
        this._setupThree();
        this._createTrailBuffer();
        this._bindEvents();
        this._animate();
    }

    /* ── 销毁 ── */
    destroy() {
        this._alive = false;
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.renderer?.dispose();
        this.trailTex?.dispose();
    }
}

// ── 自动初始化 ──
(function () {
    function start() {
        if (window.__pixelTrail) {
            window.__pixelTrail.destroy();
            window.__pixelTrail = null;
        }
        try {
            window.__pixelTrail = new PixelTrail({
                gridSize: 45,
                trailSize: 0.07,
                maxAge: 350,
                interpolate: 4,
                color: '#e85a3c',
                gooey: true
            });
            console.log('PixelTrail initialized');
        } catch (e) {
            console.warn('PixelTrail init failed:', e.message);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(start, 200));
    } else {
        setTimeout(start, 200);
    }
})();
