/* ========================================
   InfiniteMenu — 精确匹配 reactbits.dev 原始效果
   WebGL2 + gl-matrix + 二十面体球 + 纹理图集
   ======================================== */
import { mat4, quat, vec2, vec3 } from 'gl-matrix';

/* ── 着色器 (完全匹配原始) ── */
const discVertShaderSource = `#version 300 es

uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);

    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}
`;

const discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
    int itemIndex = vInstanceId % uItemCount;
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

    ivec2 texSize = textureSize(uTex, 0);
    float imageAspect = float(texSize.x) / float(texSize.y);
    float containerAspect = 1.0;

    float scale = max(imageAspect / containerAspect,
                     containerAspect / imageAspect);

    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = (st - 0.5) * scale + 0.5;

    st = clamp(st, 0.0, 1.0);

    st = st * cellSize + cellOffset;

    outColor = texture(uTex, st);
    outColor.a *= vAlpha;
}
`;

/* ── 几何体 ── */
class Face {
  constructor(a, b, c) { this.a = a; this.b = b; this.c = c; }
}

class Vertex {
  constructor(x, y, z) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

class Geometry {
  constructor() { this.vertices = []; this.faces = []; }

  addVertex(...args) {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  addFace(...args) {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    }
    return this;
  }

  get lastVertex() { return this.vertices[this.vertices.length - 1]; }

  subdivide(divisions = 1) {
    const midPointCache = {};
    let f = this.faces;
    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array(f.length * 4);
      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);
        const i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      });
      f = newFaces;
    }
    this.faces = f;
    return this;
  }

  spherize(radius = 1) {
    this.vertices.forEach(vertex => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get data() {
    return {
      vertices: this.vertexData,
      indices: this.indexData,
      normals: this.normalData,
      uvs: this.uvData
    };
  }

  get vertexData() { return new Float32Array(this.vertices.flatMap(v => Array.from(v.position))); }
  get normalData() { return new Float32Array(this.vertices.flatMap(v => Array.from(v.normal))); }
  get uvData() { return new Float32Array(this.vertices.flatMap(v => Array.from(v.uv))); }
  get indexData() { return new Uint16Array(this.faces.flatMap(f => [f.a, f.b, f.c])); }

  getMidPoint(ndxA, ndxB, cache) {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) return cache[cacheKey];
    const a = this.vertices[ndxA].position;
    const b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    return ndx;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
      0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
      t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1
    ).addFace(
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1
    );
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    steps = Math.max(4, steps);
    const alpha = (2 * Math.PI) / steps;
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;
    for (let i = 0; i < steps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;
      if (i > 0) this.addFace(0, i, i + 1);
    }
    this.addFace(0, steps, 1);
  }
}

/* ── WebGL 工具 ── */
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error('[InfiniteMenu] shader error:', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function createProgram(gl, shaderSources, attribLocations) {
  const program = gl.createProgram();
  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
    const shader = createShader(gl, type, shaderSources[ndx]);
    if (shader) gl.attachShader(program, shader);
  });
  if (attribLocations) {
    for (const attrib in attribLocations) {
      gl.bindAttribLocation(program, attribLocations[attrib], attrib);
    }
  }
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  console.error('[InfiniteMenu] program error:', gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function makeVertexArray(gl, bufLocNumElmPairs, indices) {
  const va = gl.createVertexArray();
  gl.bindVertexArray(va);
  for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
    if (loc === -1) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }
  if (indices) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  return va;
}

function resizeCanvasToDisplaySize(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio);
  const rect = canvas.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;
  if (cw === 0 || ch === 0) {
    // 如果尺寸为0，尝试用父元素尺寸
    var parent = canvas.parentElement;
    if (parent) {
      var pr = parent.getBoundingClientRect();
      if (pr.width > 0 && pr.height > 0) {
        canvas.width = Math.round(pr.width * dpr);
        canvas.height = Math.round(pr.height * dpr);
        return true;
      }
    }
    return false;
  }
  const dw = Math.round(cw * dpr);
  const dh = Math.round(ch * dpr);
  const needResize = canvas.width !== dw || canvas.height !== dh;
  if (needResize) {
    canvas.width = dw;
    canvas.height = dh;
  }
  return needResize;
}

function makeBuffer(gl, data, usage) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

function createTexture(gl, minF, magF, wrapS, wrapT) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minF);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magF);
  return tex;
}

/* ── Arcball 控制器 (完全匹配原始) ── */
class ArcballControl {
  constructor(canvas, updateCallback) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || (() => {});
    this.isPointerDown = false;
    this.orientation = quat.create();
    this.pointerRotation = quat.create();
    this.rotationVelocity = 0;
    this.rotationAxis = vec3.fromValues(1, 0, 0);
    this.snapDirection = vec3.fromValues(0, 0, -1);
    this.snapTargetDirection = null;
    this.pointerPos = vec2.create();
    this.previousPointerPos = vec2.create();
    this._rotationVelocity = 0;
    this._combinedQuat = quat.create();
    this.IDENTITY_QUAT = quat.create();

    canvas.addEventListener('pointerdown', e => {
      vec2.set(this.pointerPos, e.clientX, e.clientY);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
    });
    const onUp = () => { this.isPointerDown = false; };
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);
    canvas.addEventListener('pointermove', e => {
      if (this.isPointerDown) vec2.set(this.pointerPos, e.clientX, e.clientY);
    });
    canvas.style.touchAction = 'none';
  }

  update(deltaTime, targetFrameDuration = 16) {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let snapRotation = quat.create();
    let angleFactor = timeScale;

    if (this.isPointerDown) {
      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, 0.3 * timeScale);

      if (vec2.sqrLen(midPointerPos) > 0.1) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        const p = this._project(midPointerPos);
        const q = this._project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        this._quatFromVectors(a, b, this.pointerRotation, (5 / timeScale) * angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, 0.3 * timeScale);
      }
    } else {
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, 0.1 * timeScale);
      if (this.snapTargetDirection) {
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const sqrDist = vec3.squaredDistance(a, b);
        const df = Math.max(0.1, 1 - sqrDist * 10);
        this._quatFromVectors(a, b, snapRotation, 0.2 * df * angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, 0.8 * timeScale);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(this._combinedQuat[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }
    this._rotationVelocity += (rv - this._rotationVelocity) * 0.5 * timeScale;
    this.rotationVelocity = this._rotationVelocity / timeScale;
    this.updateCallback(deltaTime);
  }

  _quatFromVectors(a, b, out, angleFactor) {
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    quat.setAxisAngle(out, axis, Math.acos(d) * angleFactor);
  }

  _project(pos) {
    const r = 2;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const s = Math.max(w, h) - 1;
    const x = (2 * (pos[0] - rect.left) - w - 1) / s;
    const y = (2 * (pos[1] - rect.top) - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;
    if (xySq <= rSq / 2.0) z = Math.sqrt(rSq - xySq);
    else z = rSq / Math.sqrt(xySq);
    return vec3.fromValues(-x, y, z);
  }
}

/* ── InfiniteGridMenu 主类 ── */
export class InfiniteGridMenu {
  SPHERE_RADIUS = 2;
  TARGET_FRAME_DURATION = 1000 / 60;

  constructor(canvas, items, onActiveItemChange, onMovementChange, onInit, scale = 1.0) {
    this.canvas = canvas;
    this.items = items || [];
    this.onActiveItemChange = onActiveItemChange || (() => {});
    this.onMovementChange = onMovementChange || (() => {});
    this.scaleFactor = scale;
    this.movementActive = false;
    this.smoothRotationVelocity = 0;
    this._time = 0;
    this._frames = 0;

    this.camera = {
      matrix: mat4.create(),
      near: 0.1,
      far: 40,
      fov: Math.PI / 4,
      aspect: 1,
      position: vec3.fromValues(0, 0, 3 * scale),
      up: vec3.fromValues(0, 1, 0),
      matrices: {
        view: mat4.create(),
        projection: mat4.create(),
        inversProjection: mat4.create()
      }
    };

    this._init(onInit);
  }

  resize() {
    const gl = this.gl;
    if (!gl) return;
    if (resizeCanvasToDisplaySize(gl.canvas)) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    this._updateProjectionMatrix();
  }

  run(time = 0) {
    const deltaTime = Math.min(32, time - this._time);
    this._time = time;
    this._frames += deltaTime / this.TARGET_FRAME_DURATION;

    this._animate(deltaTime);
    this._render();

    requestAnimationFrame(t => this.run(t));
  }

  /* ── 内部初始化 ── */
  _init(onInit) {
    const gl = this.canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.viewportSize = vec2.fromValues(this.canvas.clientWidth, this.canvas.clientHeight);

    /* 着色器 */
    this.discProgram = createProgram(gl, [discVertShaderSource, discFragShaderSource], {
      aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3
    });
    this.discLocs = {
      aModelPosition:      gl.getAttribLocation(this.discProgram, 'aModelPosition'),
      aModelUvs:           gl.getAttribLocation(this.discProgram, 'aModelUvs'),
      aInstanceMatrix:     gl.getAttribLocation(this.discProgram, 'aInstanceMatrix'),
      uWorldMatrix:        gl.getUniformLocation(this.discProgram, 'uWorldMatrix'),
      uViewMatrix:         gl.getUniformLocation(this.discProgram, 'uViewMatrix'),
      uProjectionMatrix:   gl.getUniformLocation(this.discProgram, 'uProjectionMatrix'),
      uCameraPosition:     gl.getUniformLocation(this.discProgram, 'uCameraPosition'),
      uRotationAxisVelocity: gl.getUniformLocation(this.discProgram, 'uRotationAxisVelocity'),
      uTex:                gl.getUniformLocation(this.discProgram, 'uTex'),
      uFrames:             gl.getUniformLocation(this.discProgram, 'uFrames'),
      uItemCount:          gl.getUniformLocation(this.discProgram, 'uItemCount'),
      uAtlasSize:          gl.getUniformLocation(this.discProgram, 'uAtlasSize')
    };

    /* 圆片几何体 */
    this.discGeo = new DiscGeometry(56, 1);
    this.discBuffers = this.discGeo.data;
    this.discVAO = makeVertexArray(gl, [
      [makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW), this.discLocs.aModelPosition, 3],
      [makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW), this.discLocs.aModelUvs, 2]
    ], this.discBuffers.indices);

    /* 二十面体 → 实例位置 */
    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map(v => vec3.clone(v.position));
    this.DISC_INSTANCE_COUNT = this.instancePositions.length;
    this._initDiscInstances(this.DISC_INSTANCE_COUNT);

    /* 纹理 */
    this.worldMatrix = mat4.create();
    this._initTexture();

    /* 控制器 */
    this.control = new ArcballControl(this.canvas, dt => this._onControlUpdate(dt));

    this._updateCameraMatrix();
    this._updateProjectionMatrix();
    this.resize();

    console.log('[InfiniteMenu] init OK — instances:', this.DISC_INSTANCE_COUNT, 'items:', this.items.length);

    if (onInit) onInit(this);
  }

  _initTexture() {
    const gl = this.gl;
    this.tex = createTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));
    const cellSize = 512;
    const atlasW = this.atlasSize * cellSize;
    const atlasH = this.atlasSize * cellSize;

    const cnv = document.createElement('canvas');
    cnv.width = atlasW;
    cnv.height = atlasH;
    const ctx = cnv.getContext('2d');

    /* 占位图：深色底 + 发光圆点 (加载期间可见) */
    ctx.fillStyle = '#141420';
    ctx.fillRect(0, 0, atlasW, atlasH);
    for (let i = 0; i < itemCount; i++) {
      const cx = (i % this.atlasSize) * cellSize + cellSize / 2;
      const cy = Math.floor(i / this.atlasSize) * cellSize + cellSize / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellSize * 0.38);
      grad.addColorStop(0, '#3a3050');
      grad.addColorStop(0.5, '#1e1c30');
      grad.addColorStop(1, '#141420');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - cellSize / 2, cy - cellSize / 2, cellSize, cellSize);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
    gl.generateMipmap(gl.TEXTURE_2D);

    /* 异步加载真实图片 */
    Promise.all(this.items.map(item =>
      new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = item.image;
      })
    )).then(images => {
      ctx.fillStyle = '#141420';
      ctx.fillRect(0, 0, atlasW, atlasH);
      images.forEach((img, i) => {
        if (!img) return;
        const x = (i % this.atlasSize) * cellSize;
        const y = Math.floor(i / this.atlasSize) * cellSize;
        /* 先用深色填满 cell，防止相邻图溢出 */
        ctx.fillStyle = '#141420';
        ctx.fillRect(x, y, cellSize, cellSize);
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        /* cover 模式：从原图中心取正方形区域填满 cell */
        const minSide = Math.min(iw, ih);
        const sx = (iw - minSide) / 2;
        const sy = (ih - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, x, y, cellSize, cellSize);
      });
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cnv);
      gl.generateMipmap(gl.TEXTURE_2D);
      console.log('[InfiniteMenu] textures loaded');
    });
  }

  _initDiscInstances(count) {
    const gl = this.gl;
    this.discInstances = {
      matricesArray: new Float32Array(count * 16),
      matrices: [],
      buffer: gl.createBuffer()
    };
    for (let i = 0; i < count; i++) {
      const arr = new Float32Array(this.discInstances.matricesArray.buffer, i * 16 * 4, 16);
      arr.set(mat4.create());
      this.discInstances.matrices.push(arr);
    }
    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    const bytesPerMatrix = 16 * 4;
    for (let j = 0; j < 4; j++) {
      const loc = this.discLocs.aInstanceMatrix + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, j * 4 * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  /* ── 动画 ── */
  _animate(deltaTime) {
    const gl = this.gl;
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);
    const scale = 0.25;
    const SCALE_INTENSITY = 0.6;

    this.instancePositions.forEach((pos, ndx) => {
      const p = vec3.transformQuat(vec3.create(), pos, this.control.orientation);
      const s = (Math.abs(p[2]) / this.SPHERE_RADIUS) * SCALE_INTENSITY + (1 - SCALE_INTENSITY);
      const finalScale = s * scale;

      const m = mat4.create();
      mat4.multiply(m, m, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
      mat4.multiply(m, m, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(m, m, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]));
      mat4.multiply(m, m, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));
      mat4.copy(this.discInstances.matrices[ndx], m);
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  /* ── 渲染 ── */
  _render() {
    const gl = this.gl;
    if (gl.drawingBufferWidth === 0 || gl.drawingBufferHeight === 0) {
      return; // canvas 尺寸为0时跳过
    }
    gl.useProgram(this.discProgram);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const l = this.discLocs;
    gl.uniformMatrix4fv(l.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(l.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(l.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(l.uCameraPosition,
      this.camera.position[0], this.camera.position[1], this.camera.position[2]);
    gl.uniform4f(l.uRotationAxisVelocity,
      this.control.rotationAxis[0], this.control.rotationAxis[1],
      this.control.rotationAxis[2], this.smoothRotationVelocity * 1.1);
    gl.uniform1i(l.uItemCount, this.items.length);
    gl.uniform1i(l.uAtlasSize, this.atlasSize);
    gl.uniform1f(l.uFrames, this._frames);
    gl.uniform1i(l.uTex, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(gl.TRIANGLES, this.discBuffers.indices.length,
      gl.UNSIGNED_SHORT, 0, this.DISC_INSTANCE_COUNT);
  }

  /* ── 相机 ── */
  _updateCameraMatrix() {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  _updateProjectionMatrix() {
    const gl = this.gl;
    this.camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const height = this.SPHERE_RADIUS * 0.35;
    const dist = this.camera.position[2];
    this.camera.fov = this.camera.aspect > 1
      ? 2 * Math.atan(height / dist)
      : 2 * Math.atan(height / this.camera.aspect / dist);
    mat4.perspective(this.camera.matrices.projection, this.camera.fov,
      this.camera.aspect, this.camera.near, this.camera.far);
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  }

  /* ── 控制回调 ── */
  _onControlUpdate(deltaTime) {
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 3 * this.scaleFactor;

    const isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;
    window.__menuDragging = isMoving; // 每帧通知中心几何体
    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }

    if (!this.control.isPointerDown) {
      const nearestIdx = this._findNearestVertexIndex();
      const itemIdx = nearestIdx % Math.max(1, this.items.length);
      this.onActiveItemChange(itemIdx);
      const snapDir = vec3.normalize(vec3.create(), this._getVertexWorldPosition(nearestIdx));
      this.control.snapTargetDirection = snapDir;
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }

    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this._updateCameraMatrix();
  }

  _findNearestVertexIndex() {
    const n = this.control.snapDirection;
    const invOri = quat.conjugate(quat.create(), this.control.orientation);
    const nt = vec3.transformQuat(vec3.create(), n, invOri);
    let maxD = -Infinity, nearest;
    for (let i = 0; i < this.instancePositions.length; i++) {
      const d = vec3.dot(nt, this.instancePositions[i]);
      if (d > maxD) { maxD = d; nearest = i; }
    }
    return nearest;
  }

  _getVertexWorldPosition(index) {
    return vec3.transformQuat(vec3.create(), this.instancePositions[index], this.control.orientation);
  }
}
