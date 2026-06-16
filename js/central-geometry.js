/* ========================================
   Central Geometry Background — Original
   Central Icosahedron + Colorful Rings + Floating Text + Particles
   ======================================== */

import * as THREE from 'three';

class CentralGeometry {
  constructor(options = {}) {
    this.container = options.container || document.getElementById("centralGeometryContainer");
    if (!this.container) { console.warn("[CG] container missing"); return; }
    this.time = 0;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this._currentScale = 1.0;
    this._targetScale = 1.0;
    this._init();
  }

  setScale(target) { this._targetScale = target; }

  _init() {
    const aspect = window.innerWidth / window.innerHeight;
    this.scene = new THREE.Scene();
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 300);
    this.camera.position.z = 22;
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;";
    this.container.appendChild(this.renderer.domElement);

    this._createCentralForm();
    this._createRings();
    this._createOrbitingGems();
    this._createGlowHalo();
    this._createEnergyLines();
    this._createParticles();
    this._createTextSprites();
    this._bindEvents();
    this._animate();
  }

  _createCentralForm() {
    this.centralGroup = new THREE.Group();

    const geo = new THREE.IcosahedronGeometry(9.0, 1);

    // —— 面片（半透明实体） ——
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xe85a3c, transparent: true, opacity: 0.08,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    this.centralGroup.add(new THREE.Mesh(geo, outerMat));

    const innerGeo = new THREE.IcosahedronGeometry(7.0, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    this.centralGroup.add(new THREE.Mesh(innerGeo, innerMat));

    // —— 线框（半透明边缘） ——
    const outerEdge = new THREE.EdgesGeometry(geo);
    const outerLineMat = new THREE.LineBasicMaterial({
      color: 0xe85a3c, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.centralGroup.add(new THREE.LineSegments(outerEdge, outerLineMat));

    const innerEdge = new THREE.EdgesGeometry(innerGeo);
    const innerLineMat = new THREE.LineBasicMaterial({
      color: 0xff6b4a, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    this.centralGroup.add(new THREE.LineSegments(innerEdge, innerLineMat));

    // —— 错落浮动三角面片（零散分离） ——
    this._addScatteredFaces(geo, outerMat, 0.50, 1.10, 3.2, 0.30);
    this._addScatteredFaces(innerGeo, innerMat, 0.35, 0.85, 2.5, 0.28);

    // —— 镂空窗口框（透过看见内部） ——
    this._addWindowFrames(geo, 2, 1.5);

    this.rootGroup.add(this.centralGroup);
  }

  _addScatteredFaces(icosaGeo, baseMaterial, minOff, maxOff, minCY, selectProb) {
    var posArr = icosaGeo.getAttribute('position').array;
    var vertCount = posArr.length / 3;
    var seed = 54861;
    function frac(n) { return n - Math.floor(n); }
    function hash(idx) {
      var h = idx * 2654435761 + seed;
      h = ((h >> 16) ^ h) * 0x45d9f3b;
      h = ((h >> 16) ^ h) * 0x45d9f3b;
      h = (h >> 16) ^ h;
      return frac(h * 0.0001);
    }
    for (var i = 0; i < vertCount; i += 3) {
      var i9 = i * 3;
      var v0x = posArr[i9],     v0y = posArr[i9 + 1], v0z = posArr[i9 + 2];
      var v1x = posArr[i9 + 3], v1y = posArr[i9 + 4], v1z = posArr[i9 + 5];
      var v2x = posArr[i9 + 6], v2y = posArr[i9 + 7], v2z = posArr[i9 + 8];
      var cy = (v0y + v1y + v2y) / 3;
      if (cy < minCY) continue;
      var hVal = hash(i);
      if (hVal > selectProb) continue;
      var e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
      var e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
      var nx = e1y * e2z - e1z * e2y;
      var ny = e1z * e2x - e1x * e2z;
      var nz = e1x * e2y - e1y * e2x;
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= nl; ny /= nl; nz /= nl;
      var off = minOff + hash(i + 1) * (maxOff - minOff);
      var ox = nx * off, oy = ny * off, oz = nz * off;
      var verts = new Float32Array([
        v0x + ox, v0y + oy, v0z + oz,
        v1x + ox, v1y + oy, v1z + oz,
        v2x + ox, v2y + oy, v2z + oz
      ]);
      var triGeo = new THREE.BufferGeometry();
      triGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      triGeo.computeVertexNormals();
      var triMat = baseMaterial.clone();
      triMat.opacity = Math.min(baseMaterial.opacity * 1.8 + hash(i + 2) * 0.06, 0.15);
      this.centralGroup.add(new THREE.Mesh(triGeo, triMat));
    }
  }


  // —— 镂空窗口：暗色空洞 + 亮线边框（NormalBlending 可见穿透） ——
  _addWindowFrames(icosaGeo, count, minCY) {
    var posArr = icosaGeo.getAttribute('position').array;
    var vertCount = posArr.length / 3;
    var seed = 99731;
    function frac(n) { return n - Math.floor(n); }
    function hash(idx) {
      var h = idx * 2654435761 + seed;
      h = ((h >> 16) ^ h) * 0x45d9f3b;
      h = ((h >> 16) ^ h) * 0x45d9f3b;
      h = (h >> 16) ^ h;
      return frac(h * 0.0001);
    }
    var candidates = [];
    for (var i = 0; i < vertCount; i += 3) {
      var i9 = i * 3;
      var cy = (posArr[i9 + 1] + posArr[i9 + 4] + posArr[i9 + 7]) / 3;
      if (cy < minCY) continue;
      candidates.push(i);
    }
    var picked = [];
    var usedRegions = [];
    while (picked.length < count && candidates.length > 0) {
      var ri = Math.floor(hash(picked.length * 7 + 3) * candidates.length);
      var fi = candidates[ri];
      var i9 = fi * 3;
      var cx = (posArr[i9] + posArr[i9 + 3] + posArr[i9 + 6]) / 3;
      var cy2 = (posArr[i9 + 1] + posArr[i9 + 4] + posArr[i9 + 7]) / 3;
      var cz = (posArr[i9 + 2] + posArr[i9 + 5] + posArr[i9 + 8]) / 3;
      var tooClose = false;
      for (var r = 0; r < usedRegions.length; r++) {
        var dx = cx - usedRegions[r][0], dy = cy2 - usedRegions[r][1], dz = cz - usedRegions[r][2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 6.0) { tooClose = true; break; }
      }
      if (tooClose) { candidates.splice(ri, 1); continue; }
      picked.push(fi);
      usedRegions.push([cx, cy2, cz]);
      candidates.splice(ri, 1);

      var v0x = posArr[i9], v0y = posArr[i9 + 1], v0z = posArr[i9 + 2];
      var v1x = posArr[i9 + 3], v1y = posArr[i9 + 4], v1z = posArr[i9 + 5];
      var v2x = posArr[i9 + 6], v2y = posArr[i9 + 7], v2z = posArr[i9 + 8];

      // Normal
      var e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
      var e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;
      var nx = e1y * e2z - e1z * e2y;
      var ny = e1z * e2x - e1x * e2z;
      var nz = e1x * e2y - e1y * e2x;
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= nl; ny /= nl; nz /= nl;
      var outPush = 0.25;

      // === Hole fill: dark transparent fill using NormalBlending ===
      // This creates a visible dark "shadow" hole on the bright outer surface
      var hv0x = v0x + nx * outPush, hv0y = v0y + ny * outPush, hv0z = v0z + nz * outPush;
      var hv1x = v1x + nx * outPush, hv1y = v1y + ny * outPush, hv1z = v1z + nz * outPush;
      var hv2x = v2x + nx * outPush, hv2y = v2y + ny * outPush, hv2z = v2z + nz * outPush;
      var holeVerts = new Float32Array([
        hv0x, hv0y, hv0z, hv1x, hv1y, hv1z, hv2x, hv2y, hv2z
      ]);
      var holeGeo = new THREE.BufferGeometry();
      holeGeo.setAttribute('position', new THREE.BufferAttribute(holeVerts, 3));
      holeGeo.computeVertexNormals();
      var holeMat = new THREE.MeshBasicMaterial({
        color: 0x2a1111, transparent: true, opacity: 0.12,
        blending: THREE.NormalBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide
      });
      var holeMesh = new THREE.Mesh(holeGeo, holeMat);
      holeMesh.renderOrder = 10;
      this.centralGroup.add(holeMesh);

      // === Frame edges: bright thin lines ===
      var fv0x = v0x + nx * outPush, fv0y = v0y + ny * outPush, fv0z = v0z + nz * outPush;
      var fv1x = v1x + nx * outPush, fv1y = v1y + ny * outPush, fv1z = v1z + nz * outPush;
      var fv2x = v2x + nx * outPush, fv2y = v2y + ny * outPush, fv2z = v2z + nz * outPush;
      var edgeVerts = new Float32Array([
        fv0x, fv0y, fv0z, fv1x, fv1y, fv1z,
        fv1x, fv1y, fv1z, fv2x, fv2y, fv2z,
        fv2x, fv2y, fv2z, fv0x, fv0y, fv0z
      ]);
      var edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgeVerts, 3));
      var edgeMat = new THREE.LineBasicMaterial({
        color: 0xff7755, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
      edgeLine.renderOrder = 11;
      this.centralGroup.add(edgeLine);

      // === Vertex dots ===
      var dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute('position',
        new THREE.BufferAttribute(new Float32Array([fv0x, fv0y, fv0z, fv1x, fv1y, fv1z, fv2x, fv2y, fv2z]), 3));
      var dotMat = new THREE.PointsMaterial({
        color: 0xff8866, size: 0.12,
        transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var dotPoints = new THREE.Points(dotGeo, dotMat);
      dotPoints.renderOrder = 12;
      this.centralGroup.add(dotPoints);
    }
  }

  _createRings() {
    this.rings = [];
    const ringColors = [0xff9977, 0xff7755, 0xffaa88, 0xffddcc, 0xffeee8];

    // 柔光点纹理
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 32; dotCanvas.height = 32;
    const ctx = dotCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
    const dotTex = new THREE.CanvasTexture(dotCanvas);

    ringColors.forEach((color, i) => {
      const radius = 7.5 + i * 2.5;
      const count = 280;
      const positions = new Float32Array(count * 3);
      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2;
        const j3 = j * 3;
        positions[j3] = Math.cos(angle) * radius;
        positions[j3 + 1] = 0;
        positions[j3 + 2] = Math.sin(angle) * radius;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color, map: dotTex,
        size: 0.30 - i * 0.06,
        transparent: true, opacity: 0.65 - i * 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false,
        sizeAttenuation: true
      });
      const ring = new THREE.Points(geo, mat);
      ring.rotation.x = Math.PI / 2 + i * 0.65;
      ring.rotation.y = i * 0.9;
      ring.userData = {
        speed: 0.008 + i * 0.004 * (i % 2 === 0 ? 1 : -1),
        axis: i % 3 === 0 ? 'x' : i % 3 === 1 ? 'y' : 'z'
      };
      this.rootGroup.add(ring);
      this.rings.push(ring);
    });
  }

  // —— 环绕宝石几何体（多彩小多面体轨道） ——
  _createOrbitingGems() {
    this.gems = [];
    const gemColors = [
      0xff9977, 0xff7755, 0xff6b4a, 0xffaa88, 0xffccaa,
      0xff9977, 0xff9977, 0xffccaa, 0xffccaa, 0xff9977
    ];
    const gemGroup = new THREE.Group();

    for (let i = 0; i < 14; i++) {
      const size = 0.15 + Math.random() * 0.3;
      let shapeGeo;
      const rnd = Math.random();
      if (rnd < 0.4) shapeGeo = new THREE.TetrahedronGeometry(size, 0);
      else if (rnd < 0.75) shapeGeo = new THREE.OctahedronGeometry(size * 0.85, 0);
      else shapeGeo = new THREE.IcosahedronGeometry(size * 0.75, 0);

      const color = gemColors[i % gemColors.length];
      const gemMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.25 + Math.random() * 0.20,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const gem = new THREE.Mesh(shapeGeo, gemMat);
      const gemEdge = new THREE.EdgesGeometry(shapeGeo);
      const gemLine = new THREE.LineSegments(gemEdge,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending, depthWrite: false }));
      gem.add(gemLine);

      const orbitR = 10.5 + Math.random() * 5.0;
      const orbitTilt = (Math.random() - 0.5) * Math.PI * 0.7;
      const orbitPhase = Math.random() * Math.PI * 2;
      const orbitSpeed = 0.12 + Math.random() * 0.35;

      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      gem.position.set(
        orbitR * Math.sin(phi) * Math.cos(theta),
        orbitR * Math.sin(phi) * Math.sin(theta),
        orbitR * Math.cos(phi)
      );

      gem.userData = {
        orbitR, orbitTilt, orbitPhase, orbitSpeed,
        baseY: gem.position.y,
        floatAmp: 0.2 + Math.random() * 0.7,
        floatFreq: 0.3 + Math.random() * 0.5,
        rotSpeed: 0.005 + Math.random() * 0.025
      };

      gemGroup.add(gem);
      this.gems.push(gem);
    }
    this.gemGroup = gemGroup;
    this.rootGroup.add(gemGroup);
  }

  // —— 外发光晕球 + 脉动外环 ——
  _createGlowHalo() {
    this.haloGroup = new THREE.Group();

    // 大范围柔和光晕球
    [11.8, 13.5].forEach((r, idx) => {
      const haloGeo = new THREE.SphereGeometry(r, 48, 48);
      const haloMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xff9977 : 0xff6b4a,
        transparent: true, opacity: 0.04 - idx * 0.01,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      });
      this.haloGroup.add(new THREE.Mesh(haloGeo, haloMat));
    });

    // 脉动细外环
    const pulseColors = [0xff9977, 0xff6b4a, 0xffaa88, 0xff7755, 0xffccaa];
    this.pulseRings = [];
    pulseColors.forEach((color, i) => {
      const r = 13.2 + i * 1.0;
      const geo = new THREE.TorusGeometry(r, 0.04, 16, 260);
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI * 0.35 + i * 0.4;
      ring.rotation.y = i * 0.5;
      ring.userData = {
        baseOpacity: 0.12 + i * 0.010,
        pulseSpeed: 0.4 + i * 0.15,
        phase: i * 1.2,
        axis: i % 3 === 0 ? 'x' : i % 3 === 1 ? 'y' : 'z',
        rotSpeed: 0.0008 + i * 0.0003 * (i % 2 ? -1 : 1)
      };
      this.haloGroup.add(ring);
      this.pulseRings.push(ring);
    });

    this.rootGroup.add(this.haloGroup);
  }

  // —— 辐射能量连接线 ——
  _createEnergyLines() {
    this.energyLines = [];
    const lineGroup = new THREE.Group();

    const outerGeo = new THREE.IcosahedronGeometry(9.0, 1);
    const posArr = outerGeo.getAttribute('position').array;
    const vertCount = posArr.length / 3;

    const usedIndices = new Set();
    for (let n = 0; n < 18; n++) {
      let vi;
      do { vi = Math.floor(Math.random() * vertCount); } while (usedIndices.has(vi));
      usedIndices.add(vi);

      const i9 = vi * 3;
      const sx = posArr[i9], sy = posArr[i9 + 1], sz = posArr[i9 + 2];
      const len = Math.sqrt(sx * sx + sy * sy + sz * sz);
      const nx = sx / len, ny = sy / len, nz = sz / len;
      const ext = 1.0 + Math.random() * 1.4;
      const ex = sx + nx * ext, ey = sy + ny * ext, ez = sz + nz * ext;

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position',
        new THREE.BufferAttribute(new Float32Array([sx, sy, sz, ex, ey, ez]), 3));

      const colorsArr = [0xff9977, 0xff7755, 0xff9977, 0xff6b4a, 0xffaa88];
      const color = colorsArr[Math.floor(Math.random() * colorsArr.length)];
      const lineMat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0.12 + Math.random() * 0.18,
        blending: THREE.AdditiveBlending, depthWrite: false
      });

      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = {
        baseEnd: { x: ex, y: ey, z: ez },
        pulseSpeed: 0.3 + Math.random() * 0.5,
        pulseAmp: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2
      };
      lineGroup.add(line);
      this.energyLines.push(line);
    }

    outerGeo.dispose();
    this.energyLineGroup = lineGroup;
    this.centralGroup.add(lineGroup);
  }

  _createParticles() {
    const count = 280;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const data = [];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 18;
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);

      const mix = Math.random();
      colors[i3] = 0.91 * mix + 0.45 * (1 - mix);
      colors[i3 + 1] = 0.35 * mix + 0.25 * (1 - mix);
      colors[i3 + 2] = 0.24 * mix + 0.12 * (1 - mix);

      data.push({
        baseR: r, baseTheta: theta, basePhi: phi,
        driftSpeed: 0.0002 + Math.random() * 0.0005,
        baseY: pos[i3 + 1],
        floatSpeed: 0.3 + Math.random() * 0.6,
        floatAmp: 0.15 + Math.random() * 0.8
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement("canvas");
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.2, "rgba(255,255,255,0.7)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.15)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 32);
    const tex = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      map: tex, vertexColors: true, size: 0.70,
      transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    this.particles = new THREE.Points(geo, mat);
    this.particleData = data;
    this.rootGroup.add(this.particles);
  }

  _createTextSprites() {
    const labels = ["WX.", "3D", "ART", "CREATIVE", "DIGITAL", "DESIGN"];
    const group = new THREE.Group();

    labels.forEach((text, i) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.font = "bold 36px Inter, Noto Sans SC, sans-serif";
      ctx.fillStyle = "rgba(232,90,60,0.15)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 64);

      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3.5, 1.75, 1);

      const phi = Math.acos(2 * i / labels.length - 1);
      const theta = i * Math.PI * 2 / labels.length;
      const r = 9;
      sprite.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      sprite.userData = {
        basePos: sprite.position.clone(),
        floatAmp: 0.3 + Math.random() * 0.5,
        floatSpeed: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2
      };

      group.add(sprite);
    });

    this.textSprites = group;
    this.rootGroup.add(group);
  }

  _bindEvents() {
    this._onMouse = (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.targetMouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    this._onScroll = () => { this.targetScrollY = window.scrollY || window.pageYOffset; };
    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("mousemove", this._onMouse, { passive: true });
    window.addEventListener("scroll", this._onScroll, { passive: true });
    window.addEventListener("resize", this._onResize, { passive: true });
  }

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    this.time += 0.016;

    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.04;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.04;
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.06;

    const dragging = window.__menuDragging === true;
    this._targetScale = dragging ? 1.5 : this._targetScale > 1.2 ? this._targetScale : 1.0;
    this._currentScale += (this._targetScale - this._currentScale) * 0.08;
    this.rootGroup.scale.setScalar(this._currentScale);

    if (this.centralGroup) {
      this.centralGroup.rotation.x += 0.002;
      this.centralGroup.rotation.y += 0.003;
      this.centralGroup.rotation.z += 0.001;
      this.centralGroup.position.set(0, 0, 0);
    }

    // —— 轨道环旋转动画 ——
    if (this.rings) {
      for (let i = 0; i < this.rings.length; i++) {
        const ring = this.rings[i];
        const ud = ring.userData;
        if (ud.axis === 'x') ring.rotation.x += ud.speed;
        else if (ud.axis === 'y') ring.rotation.y += ud.speed;
        else ring.rotation.z += ud.speed;
      }
    }

    // —— 宝石轨道动画 ——
    if (this.gems) {
      for (let i = 0; i < this.gems.length; i++) {
        const g = this.gems[i];
        const ud = g.userData;
        const angle = ud.orbitPhase + this.time * ud.orbitSpeed;
        const yOff = Math.sin(this.time * ud.floatFreq + i) * ud.floatAmp;
        g.position.x = ud.orbitR * Math.cos(angle) * Math.cos(ud.orbitTilt);
        g.position.y = ud.baseY + yOff;
        g.position.z = ud.orbitR * Math.sin(angle) * Math.cos(ud.orbitTilt);
        g.rotation.x += ud.rotSpeed;
        g.rotation.y += ud.rotSpeed * 0.7;
      }
    }

    // —— 脉动光环呼吸 ——
    if (this.pulseRings) {
      for (let i = 0; i < this.pulseRings.length; i++) {
        const ring = this.pulseRings[i];
        const ud = ring.userData;
        const pulse = 0.5 + 0.5 * Math.sin(this.time * ud.pulseSpeed + ud.phase);
        ring.material.opacity = ud.baseOpacity * (0.50 + pulse * 0.6);
        if (ud.axis === 'x') ring.rotation.x += ud.rotSpeed;
        else if (ud.axis === 'y') ring.rotation.y += ud.rotSpeed;
        else ring.rotation.z += ud.rotSpeed;
      }
    }

    // —— 能量线脉冲伸缩 ——
    if (this.energyLines) {
      for (let i = 0; i < this.energyLines.length; i++) {
        const line = this.energyLines[i];
        const ud = line.userData;
        const pulse = 0.5 + 0.5 * Math.sin(this.time * ud.pulseSpeed + ud.phase);
        const arr = line.geometry.attributes.position.array;
        const ext = 1.0 + pulse * ud.pulseAmp;
        const sx = arr[0], sy = arr[1], sz = arr[2];
        const dx = ud.baseEnd.x - sx, dy = ud.baseEnd.y - sy, dz = ud.baseEnd.z - sz;
        const baseExt = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (baseExt > 0.001) {
          arr[3] = sx + dx * (ext / baseExt);
          arr[4] = sy + dy * (ext / baseExt);
          arr[5] = sz + dz * (ext / baseExt);
        }
        line.geometry.attributes.position.needsUpdate = true;
        line.material.opacity = 0.18 + pulse * 0.28;
      }
    }

    if (this.particles && this.particleData) {
      const arr = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleData.length; i++) {
        const d = this.particleData[i];
        const i3 = i * 3;
        const theta = d.baseTheta + this.time * d.driftSpeed;
        const r = d.baseR + Math.sin(this.time * 0.35 + i) * 1.2;
        arr[i3] = r * Math.sin(d.basePhi) * Math.cos(theta);
        arr[i3 + 1] = d.baseY + Math.sin(this.time * d.floatSpeed + i) * d.floatAmp;
        arr[i3 + 2] = r * Math.cos(d.basePhi) * Math.sin(theta);
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.textSprites) {
      this.textSprites.children.forEach(sprite => {
        const ud = sprite.userData;
        sprite.position.copy(ud.basePos);
        sprite.position.y += Math.sin(this.time * ud.floatSpeed + ud.phase) * ud.floatAmp;
      });
    }

    this.camera.position.x += (this.mouse.x * 0.6 - this.camera.position.x) * 0.02;
    this.camera.position.y += (-this.mouse.y * 0.4 - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener("mousemove", this._onMouse);
    window.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onResize);
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.gems = null;
    this.pulseRings = null;
    this.energyLines = null;
    this.rings = null;
    this.gemGroup = null;
    this.haloGroup = null;
    this.energyLineGroup = null;
  }
}

(function boot() {
  if (window.__centralGeometry) return;
  const c = document.getElementById("centralGeometryContainer");
  if (!c) return;
  try {
    window.__centralGeometry = new CentralGeometry({ container: c });
  } catch (e) {
    console.warn("[CG] init failed:", e);
  }
})();

export default CentralGeometry;
