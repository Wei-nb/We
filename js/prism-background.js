/* ========================================
   Prism Background — 棱镜光谱背景
   基于 reactbits.dev Prism 组件移植为原生 JS
   使用 ogl (轻量 WebGL) 渲染光线步进棱镜
   ======================================== */

import { Renderer, Triangle, Program, Mesh } from 'ogl';

class PrismBackground {
  constructor(options = {}) {
    this.el = options.el || document.body;
    this._height = Math.max(0.001, options.height ?? 3.5);
    this._baseHalf = Math.max(0.001, (options.baseWidth ?? 5.5)) * 0.5;
    this._animationType = options.animationType || 'rotate';
    this._glow = Math.max(0.0, options.glow ?? 1);
    this._offsetX = options.offset?.x ?? 0;
    this._offsetY = options.offset?.y ?? 0;
    this._noise = Math.max(0.0, options.noise ?? 0.5);
    this._transparent = options.transparent ?? true;
    this._saturation = options.saturation ?? ((options.transparent ?? true) ? 1.5 : 1);
    this._scale = Math.max(0.001, options.scale ?? 3.6);
    this._hue = options.hueShift ?? 0;
    this._colorFreq = Math.max(0.0, options.colorFrequency ?? 1);
    this._bloom = Math.max(0.0, options.bloom ?? 1);
    this._timeScale = Math.max(0, options.timeScale ?? 0.5);
    this._hoverStrength = Math.max(0, options.hoverStrength ?? 2);
    this._inertia = Math.max(0, Math.min(1, options.inertia ?? 0.05));
    this._noiseIsZero = this._noise < 1e-6;
    this._rsX = 1; this._rsY = 1; this._rsZ = 1;
    this._raf = 0;

    this._init();
  }

  /* ── 初始化 ── */
  _init() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this._renderer = new Renderer({ dpr, alpha: this._transparent, antialias: false });
    const gl = (this._gl = this._renderer.gl);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    Object.assign(gl.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block',
    });
    this.el.appendChild(gl.canvas);

    /* ── 着色器 ── */
    const vertex = /* glsl */ `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;

    const fragment = /* glsl */ `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHeight;
      uniform float uBaseHalf;
      uniform mat3 uRot;
      uniform int uUseBaseWobble;
      uniform float uGlow;
      uniform vec2 uOffsetPx;
      uniform float uNoise;
      uniform float uSaturation;
      uniform float uScale;
      uniform float uHueShift;
      uniform float uColorFreq;
      uniform float uBloom;
      uniform float uCenterShift;
      uniform float uInvBaseHalf;
      uniform float uInvHeight;
      uniform float uMinAxis;
      uniform float uPxScale;
      uniform float uTimeScale;

      vec4 tanh4(vec4 x) {
        vec4 e2x = exp(2.0 * x);
        return (e2x - 1.0) / (e2x + 1.0);
      }

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float sdOctaAnisoInv(vec3 p) {
        vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
        float m = q.x + q.y + q.z - 1.0;
        return m * uMinAxis * 0.5773502691896258;
      }

      float sdPyramidUpInv(vec3 p) {
        float oct = sdOctaAnisoInv(p);
        float halfSpace = -p.y;
        return max(oct, halfSpace);
      }

      mat3 hueRotation(float a) {
        float c = cos(a), s = sin(a);
        mat3 W = mat3(
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114);
        mat3 U = mat3(
          0.701, -0.587, -0.114,
          -0.299, 0.413, -0.114,
          -0.300, -0.588, 0.886);
        mat3 V = mat3(
          0.168, -0.331, 0.500,
          0.328, 0.035, -0.500,
          -0.497, 0.296, 0.201);
        return W + U * c + V * s;
      }

      /* ── 行星环 SDF ── */
      float ringSDF(vec3 p, float radius, float thickness, float ringY) {
        float dXZ = abs(length(p.xz) - radius);
        float dY  = abs(p.y - ringY);
        return max(dXZ - thickness, dY - thickness * 2.5);
      }

      vec4 ringContribution(vec3 p, float radius, float thickness,
                            float dotCount, float orbitSpd, float phase,
                            vec3 ringCol, float alphaBase, float ringY) {
        float d = ringSDF(p, radius, thickness, ringY);
        float alpha = exp(-d * 28.0) * alphaBase;

        // 虚实点线结合
        if (dotCount > 0.5) {
          float angle = atan(p.z, p.x) + iTime * uTimeScale * orbitSpd + phase;
          float pattern = sin(angle * dotCount) * 0.5 + 0.5;
          // 点状：高密度锐利切出；线状：低密度平滑过渡
          if (dotCount > 20.0) {
            alpha *= smoothstep(0.35, 0.60, pattern);   // 细密虚线
          } else {
            alpha *= smoothstep(0.25, 0.45, pattern);   // 粗点
          }
        }

        return vec4(ringCol * alpha, alpha);
      }

      void main() {
        vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;
        float z = 5.0;
        float d = 0.0;
        vec3 p;
        vec4 oGeo   = vec4(0.0);  // 主几何体
        vec4 oRings = vec4(0.0);  // 行星环
        float centerShift = uCenterShift;
        float cf = uColorFreq;
        mat2 wob = mat2(1.0);
        if (uUseBaseWobble == 1) {
          float t = iTime * uTimeScale;
          float c0 = cos(t + 0.0);
          float c1 = cos(t + 33.0);
          float c2 = cos(t + 11.0);
          wob = mat2(c0, c1, c2, c0);
        }

        // 环平面高度
        float ringY = uCenterShift * 0.5;
        float R0 = uBaseHalf;

        const int STEPS = 100;
        for (int i = 0; i < STEPS; i++) {
          p = vec3(f, z);
          p.xz = p.xz * wob;
          p = uRot * p;
          vec3 q = p;
          q.y += centerShift;
          d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
          z -= d;
          oGeo += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;

          /* ── 四层半透明行星环 ── */
          // 环1：内圈细密虚线
          oRings += ringContribution(p, R0 * 1.20, 0.025, 30.0, 1.3, 0.0,
                       vec3(0.35, 0.65, 1.0), 0.16, ringY);
          // 环2：实线光环
          oRings += ringContribution(p, R0 * 1.50, 0.020, 0.0, -0.5, 1.2,
                       vec3(0.50, 0.72, 1.0), 0.22, ringY);
          // 环3：外圈粗点
          oRings += ringContribution(p, R0 * 1.85, 0.055, 14.0, 0.7, 2.5,
                       vec3(0.55, 0.78, 1.0), 0.14, ringY);
          // 环4：最外圈细密光点
          oRings += ringContribution(p, R0 * 2.20, 0.015, 42.0, 0.9, 4.0,
                       vec3(0.60, 0.82, 1.0), 0.10, ringY);
        }

        // 几何体后处理
        oGeo = tanh4(oGeo * oGeo * (uGlow * uBloom) / 1e5);

        // 环后处理
        oRings = clamp(oRings * 1.4, 0.0, 1.0);

        // 混合：环覆盖在几何体上
        vec3 col = mix(oGeo.rgb, oRings.rgb, oRings.a);
        col = clamp(col, 0.0, 1.0);

        // 噪点
        float n = rand(gl_FragCoord.xy + vec2(iTime));
        col += (n - 0.5) * uNoise;
        col = clamp(col, 0.0, 1.0);

        // 饱和度
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

        // 色相偏移
        if (abs(uHueShift) > 0.0001) {
          col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
        }

        float finalAlpha = max(oGeo.a, oRings.a);
        gl_FragColor = vec4(col, finalAlpha);
      }
    `;

    /* ── Program & Mesh ── */
    const iRes = new Float32Array(2);
    const offPx = new Float32Array(2);
    this._iRes = iRes;
    this._offPx = offPx;

    this._program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        iResolution:    { value: iRes },
        iTime:          { value: 0 },
        uHeight:        { value: this._height },
        uBaseHalf:      { value: this._baseHalf },
        uUseBaseWobble: { value: 1 },
        uRot:           { value: new Float32Array([1,0,0, 0,1,0, 0,0,1]) },
        uGlow:          { value: this._glow },
        uOffsetPx:      { value: offPx },
        uNoise:         { value: this._noise },
        uSaturation:    { value: this._saturation },
        uScale:         { value: this._scale },
        uHueShift:      { value: this._hue },
        uColorFreq:     { value: this._colorFreq },
        uBloom:         { value: this._bloom },
        uCenterShift:   { value: this._height * 0.25 },
        uInvBaseHalf:   { value: 1 / this._baseHalf },
        uInvHeight:     { value: 1 / this._height },
        uMinAxis:       { value: Math.min(this._baseHalf, this._height) },
        uPxScale:       { value: 1 / ((gl.drawingBufferHeight || 1) * 0.1 * this._scale) },
        uTimeScale:     { value: this._timeScale },
      },
    });

    this._mesh = new Mesh(gl, { geometry: new Triangle(gl), program: this._program });

    /* ── Resize ── */
    this._ro = new ResizeObserver(() => this._onResize());
    this._ro.observe(this.el);
    this._onResize();

    /* ── 旋转参数 ── */
    this._rotBuf = new Float32Array(9);
    this._yaw = 0; this._pitch = 0; this._roll = 0;
    this._targetYaw = 0; this._targetPitch = 0;

    const rnd = () => Math.random();
    this._wX = (0.3 + rnd() * 0.6) * this._rsX;
    this._wY = (0.2 + rnd() * 0.7) * this._rsY;
    this._wZ = (0.1 + rnd() * 0.5) * this._rsZ;
    this._phX = rnd() * Math.PI * 2;
    this._phZ = rnd() * Math.PI * 2;

    /* ── 动画模式 ── */
    this._pointer = { x: 0, y: 0, inside: true };
    if (this._animationType === 'hover') {
      this._program.uniforms.uUseBaseWobble.value = 0;
      this._onPointerMove = (e) => {
        const ww = Math.max(1, window.innerWidth);
        const wh = Math.max(1, window.innerHeight);
        this._pointer.x = Math.max(-1, Math.min(1, (e.clientX - ww * 0.5) / (ww * 0.5)));
        this._pointer.y = Math.max(-1, Math.min(1, (e.clientY - wh * 0.5) / (wh * 0.5)));
        this._pointer.inside = true;
        this._startRAF();
      };
      this._onLeave = () => { this._pointer.inside = false; };
      this._onBlur = () => { this._pointer.inside = false; };
      window.addEventListener('pointermove', this._onPointerMove, { passive: true });
      window.addEventListener('mouseleave', this._onLeave);
      window.addEventListener('blur', this._onBlur);
    } else if (this._animationType === '3drotate') {
      this._program.uniforms.uUseBaseWobble.value = 0;
    }

    this._t0 = performance.now();
    this._startRAF();
  }

  /* ── 窗口尺寸 ── */
  _onResize() {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this._renderer.setSize(w, h);
    const gl = this._gl;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this._iRes[0] = gl.drawingBufferWidth;
    this._iRes[1] = gl.drawingBufferHeight;
    this._offPx[0] = this._offsetX * dpr;
    this._offPx[1] = this._offsetY * dpr;
    this._program.uniforms.uPxScale.value =
      1 / ((gl.drawingBufferHeight || 1) * 0.1 * this._scale);
  }

  /* ── RAF ── */
  _startRAF() {
    if (this._raf) return;
    this._raf = requestAnimationFrame((t) => this._render(t));
  }
  _stopRAF() {
    if (!this._raf) return;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  /* ── 旋转矩阵 ── */
  _setEuler(yY, pX, rZ, out) {
    const cy = Math.cos(yY), sy = Math.sin(yY);
    const cx = Math.cos(pX), sx = Math.sin(pX);
    const cz = Math.cos(rZ), sz = Math.sin(rZ);
    out[0] = cy * cz + sy * sx * sz;
    out[1] = cx * sz;
    out[2] = -sy * cz + cy * sx * sz;
    out[3] = -cy * sz + sy * sx * cz;
    out[4] = cx * cz;
    out[5] = sy * sz + cy * sx * cz;
    out[6] = sy * cx;
    out[7] = -sx;
    out[8] = cy * cx;
    return out;
  }

  _lerp(a, b, t) { return a + (b - a) * t; }

  /* ── 渲染帧 ── */
  _render(t) {
    const time = (t - this._t0) * 0.001;
    this._program.uniforms.iTime.value = time;
    let keep = true;

    if (this._animationType === 'hover') {
      const max = 0.6 * this._hoverStrength;
      this._targetYaw = (this._pointer.inside ? -this._pointer.x : 0) * max;
      this._targetPitch = (this._pointer.inside ? this._pointer.y : 0) * max;
      this._yaw = this._lerp(this._yaw, this._targetYaw, this._inertia);
      this._pitch = this._lerp(this._pitch, this._targetPitch, this._inertia);
      this._roll = this._lerp(this._roll, 0, 0.1);
      this._program.uniforms.uRot.value =
        this._setEuler(this._yaw, this._pitch, this._roll, this._rotBuf);
      if (this._noiseIsZero) {
        if (Math.abs(this._yaw - this._targetYaw) < 1e-4 &&
            Math.abs(this._pitch - this._targetPitch) < 1e-4 &&
            Math.abs(this._roll) < 1e-4) keep = false;
      }
    } else if (this._animationType === '3drotate') {
      const ts = time * this._timeScale;
      this._yaw = ts * this._wY;
      this._pitch = Math.sin(ts * this._wX + this._phX) * 0.6;
      this._roll = Math.sin(ts * this._wZ + this._phZ) * 0.5;
      this._program.uniforms.uRot.value =
        this._setEuler(this._yaw, this._pitch, this._roll, this._rotBuf);
      if (this._timeScale < 1e-6) keep = false;
    } else {
      // rotate mode — identity, wobble handled in shader
      this._rotBuf[0] = 1; this._rotBuf[1] = 0; this._rotBuf[2] = 0;
      this._rotBuf[3] = 0; this._rotBuf[4] = 1; this._rotBuf[5] = 0;
      this._rotBuf[6] = 0; this._rotBuf[7] = 0; this._rotBuf[8] = 1;
      this._program.uniforms.uRot.value = this._rotBuf;
      if (this._timeScale < 1e-6) keep = false;
    }

    this._renderer.render({ scene: this._mesh });
    if (keep) this._raf = requestAnimationFrame((t2) => this._render(t2));
    else this._raf = 0;
  }

  /* ── 动态缩放 ── */
  setScale(val) {
    this._scale = Math.max(0.001, val);
    this._program.uniforms.uPxScale.value =
      1 / ((this._gl.drawingBufferHeight || 1) * 0.1 * this._scale);
  }

  /* ── 销毁 ── */
  destroy() {
    this._stopRAF();
    this._ro.disconnect();
    if (this._animationType === 'hover') {
      if (this._onPointerMove) window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('mouseleave', this._onLeave);
      window.removeEventListener('blur', this._onBlur);
    }
    const c = this._gl.canvas;
    if (c.parentElement === this.el) this.el.removeChild(c);
  }
}

/* ── 自启动 ── */
(function boot() {
  if (window.__prismBg) return;
  try {
    const container = document.getElementById('prismBackground');
    if (!container) {
      console.warn('[Prism] #prismBackground container not found');
      return;
    }
    window.__prismBg = new PrismBackground({
      el: container,
      height: 3.5,
      baseWidth: 5.5,
      animationType: 'rotate',
      glow: 1.0,
      noise: 0.5,
      bloom: 1.0,
      transparent: true,
      hueShift: 0.6,
      scale: 2.5,
      timeScale: 0.5,
      colorFrequency: 1.0,
    });
    console.log('[Prism] background ready');

    /* ── 滚动联动：拖拽探索区冲近 → 离开后缩回 ── */
    const prism = window.__prismBg;
    // uPxScale = 1/(h*0.1*scale) → scale↑ = uPxScale↓ = geometry larger/closer
    const BASE_SCALE = 2.5;   // 正常大小
    const CLOSE_SCALE = 8.0;  // 冲近镜头（~3.2x 放大）

    const snapZoom = (targetScale) => {
      gsap.to(prism, {
        _scale: targetScale,
        duration: 0.45,
        ease: 'power3.out',
        onUpdate: () => prism.setScale(prism._scale),
      });
    };

    // #lightWorks 进入→变大，离开→还原
    ScrollTrigger.create({
      trigger: '#lightWorks',
      start: 'top 80%',
      end: 'bottom 30%',
      onEnter: () => snapZoom(CLOSE_SCALE),
      onLeave: () => snapZoom(BASE_SCALE),
      onEnterBack: () => snapZoom(CLOSE_SCALE),
      onLeaveBack: () => snapZoom(BASE_SCALE),
    });
  } catch (err) {
    console.warn('[Prism] init failed:', err.message);
  }
})();

export default window.__prismBg;
