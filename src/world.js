import * as THREE from '../vendor/three.module.js';
import {
  clamp, lerp, mulberry32, createCanvasTexture, makeTextCanvas, canvasTexture,
  disposeObject, TAU
} from './utils.js';

/* ═══════════════════════════════════════════════════════════════════
   Procedural textures
   ═══════════════════════════════════════════════════════════════════ */

function noiseFill(ctx, w, h, base, colors, count, size = 2) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = size * (0.4 + Math.random() * 1.8);
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

function asphaltTexture() {
  return createCanvasTexture([512, 512], (ctx, w, h) => {
    noiseFill(ctx, w, h, '#3d4045', ['#34373b', '#45484d', '#2f3236', '#4b4e53', '#383b40'], 14000, 1.6);
    // faint aggregate
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(180,180,175,${0.02 + Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }
    // rubbered-in racing lines
    const grad1 = ctx.createLinearGradient(0, 0, w, 0);
    grad1.addColorStop(0, 'rgba(15,16,18,0)');
    grad1.addColorStop(0.24, 'rgba(15,16,18,.24)');
    grad1.addColorStop(0.36, 'rgba(15,16,18,.05)');
    grad1.addColorStop(0.64, 'rgba(15,16,18,.05)');
    grad1.addColorStop(0.76, 'rgba(15,16,18,.24)');
    grad1.addColorStop(1, 'rgba(15,16,18,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(20,21,23,${0.05 + Math.random() * 0.1})`;
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      const x = Math.random() * w;
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 8, h * 0.3, x - 8, h * 0.7, x + 3, h);
      ctx.stroke();
    }
  }, { repeat: [2, 1] });
}

function grassTexture() {
  return createCanvasTexture([512, 512], (ctx, w, h) => {
    ctx.fillStyle = '#526b39';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const g = 60 + Math.random() * 70;
      ctx.fillStyle = `rgba(${40 + Math.random() * 40},${g},${30 + Math.random() * 30},${0.2 + Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    for (let i = 0; i < 700; i++) {
      ctx.strokeStyle = `rgba(${60 + Math.random() * 30},${90 + Math.random() * 50},${40 + Math.random() * 20},.35)`;
      ctx.lineWidth = 1;
      const x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 4, y - 2 - Math.random() * 5);
      ctx.stroke();
    }
    // mown stripes
    for (let x = 0; x < w; x += 64) {
      ctx.fillStyle = x % 128 === 0 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.03)';
      ctx.fillRect(x, 0, 64, h);
    }
  }, { repeat: [140, 140] });
}

function gravelTexture() {
  return createCanvasTexture([256, 256], (ctx, w, h) => {
    noiseFill(ctx, w, h, '#9c927e', ['#8e8574', '#a89d86', '#7f7768', '#b4a994', '#918873'], 5000, 1.5);
  }, { repeat: [3, 1] });
}

function crowdTexture() {
  return createCanvasTexture([512, 256], (ctx, w, h) => {
    ctx.fillStyle = '#1b1f26';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const palette = ['#e0d8c6', '#c23a30', '#3d78a8', '#e0a83c', '#2f7d55', '#d6d6d6', '#803c67', '#3a3a44'];
      ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
      ctx.globalAlpha = 0.55 + Math.random() * 0.45;
      ctx.beginPath();
      ctx.arc(x, y, 0.9 + Math.random() * 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  });
}

function checkerTexture() {
  return createCanvasTexture([512, 64], (ctx, w, h) => {
    const cols = 24, rows = 3;
    const cw = w / cols, ch = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#f4efe3' : '#121317';
        ctx.fillRect(x * cw, y * ch, cw, ch);
      }
    }
  });
}

function garageInteriorTexture() {
  return createCanvasTexture([512, 320], (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#272b31');
    bg.addColorStop(0.62, '#1a1d22');
    bg.addColorStop(1, '#101216');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Corrugated rear panels.
    for (let x = 0; x < w; x += 22) {
      ctx.fillStyle = x % 44 === 0 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.12)';
      ctx.fillRect(x, 0, 10, h);
    }

    // Shelving with parts bins and tyres.
    for (let row = 0; row < 2; row++) {
      const y = 56 + row * 74;
      ctx.fillStyle = '#3b414a';
      ctx.fillRect(28, y, 208, 8);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = ['#d9d4c6', '#ff4d1f', '#5da9c8', '#767d86'][i % 4];
        ctx.fillRect(36 + i * 28, y - 22, 22, 20);
      }
    }

    // Tool chests along the floor.
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 96;
      ctx.fillStyle = '#a3231d';
      ctx.fillRect(x, 214, 84, 88);
      ctx.fillStyle = '#c9c3b5';
      ctx.fillRect(x + 5, 220, 74, 4);
      for (let y = 232; y < 292; y += 14) {
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.fillRect(x + 5, y, 74, 2);
      }
    }

    // Data screens and timing monitors.
    ctx.fillStyle = '#0b1214';
    ctx.fillRect(288, 52, 188, 112);
    ctx.fillStyle = '#13343a';
    ctx.fillRect(296, 60, 84, 44);
    ctx.fillStyle = '#54e0c4';
    ctx.fillRect(302, 68, 54, 3);
    ctx.fillRect(302, 78, 36, 3);
    ctx.fillStyle = '#ffb257';
    ctx.fillRect(302, 88, 44, 3);
    ctx.fillStyle = '#13343a';
    ctx.fillRect(390, 60, 76, 44);
    ctx.fillStyle = '#e83e8c';
    ctx.fillRect(398, 72, 32, 4);
    ctx.fillStyle = '#f3efe5';
    ctx.font = '600 18px Rajdhani';
    ctx.fillText('LIVE TIMING', 298, 130);
    ctx.fillStyle = '#606871';
    ctx.fillRect(288, 150, 188, 10);

    // Cabling and a wall-mounted air line.
    ctx.strokeStyle = '#0b0d10';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(280, 0);
    ctx.bezierCurveTo(300, 70, 260, 140, 286, 210);
    ctx.stroke();
    ctx.strokeStyle = '#b8491f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(468, 0);
    ctx.bezierCurveTo(440, 76, 476, 126, 456, 202);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fillRect(0, h - 22, w, 22);
  });
}

function garageCladdingTexture() {
  return createCanvasTexture([256, 256], (ctx, w, h) => {
    ctx.fillStyle = '#9a9b95';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#85867f';
    for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 2, h);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let x = 3; x < w; x += 32) ctx.fillRect(x, 0, 1, h);
    for (let y = 30; y < h; y += 64) {
      ctx.fillStyle = 'rgba(30,32,35,.18)';
      ctx.fillRect(0, y, w, 3);
    }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(35,38,42,${0.03 + Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
}

function garageDoorTexture() {
  return createCanvasTexture([256, 128], (ctx, w, h) => {
    ctx.fillStyle = '#20242a';
    ctx.fillRect(0, 0, w, h);
    for (let y = 3; y < h - 5; y += 10) {
      ctx.fillStyle = y % 20 === 0 ? '#2f343b' : '#272c32';
      ctx.fillRect(0, y, w, 5);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(0, y + 5, w, 2);
    }
    ctx.fillStyle = '#e7c521';
    for (let x = -12; x < w; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + 13, h);
      ctx.lineTo(x + 26, h - 10);
      ctx.lineTo(x + 13, h - 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(0, h - 10, w, 10);
  });
}

function garageSignTexture(name, number, color) {
  return createCanvasTexture([512, 128], (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#12151a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, 8);
    ctx.fillRect(0, 0, 12, h);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    ctx.font = '700 68px Rajdhani';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(number, 30, h / 2 + 3);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f3efe5';
    ctx.font = '700 43px Rajdhani';
    ctx.fillText(name, 138, h / 2 - 3);
    ctx.fillStyle = '#8e949d';
    ctx.font = '600 17px Rajdhani';
    ctx.fillText('PIT GARAGE', 140, h / 2 + 30);
    ctx.fillStyle = color;
    ctx.fillRect(w - 120, h - 20, 120, 20);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = '600 15px Rajdhani';
    ctx.textAlign = 'right';
    ctx.fillText('APEX INK MOTORSPORT', w - 12, h - 28);
  });
}

function pitBoxTexture(name, number, color) {
  return createCanvasTexture([256, 512], (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#17191d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, h - 12, w, 12);
    ctx.fillRect(0, 0, 10, h);
    ctx.fillRect(w - 10, 0, 10, h);
    ctx.globalAlpha = 1;
    for (let y = 24; y < h - 24; y += 34) {
      ctx.fillStyle = 'rgba(255,255,255,.045)';
      ctx.fillRect(18, y, w - 36, 2);
    }
    ctx.fillStyle = color;
    ctx.font = '700 166px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number, w / 2, h / 2 - 28);
    ctx.fillStyle = '#f3efe5';
    ctx.font = '700 34px Rajdhani';
    ctx.fillText(name, w / 2, h / 2 + 86);
    ctx.fillStyle = '#9ba0a7';
    ctx.font = '600 18px Rajdhani';
    ctx.fillText('PIT BOX', w / 2, h / 2 + 118);
  });
}

function sponsorTexture(text, sub = '') {
  const c = makeTextCanvas(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#101216';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#191c22';
    for (let x = 0; x < w; x += 46) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.35);
      ctx.fillRect(0, -40, 12, 260);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,77,31,.85)';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#f3efe5';
    ctx.font = '700 64px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2 + 2);
    if (sub) {
      ctx.fillStyle = '#ff4d1f';
      ctx.font = '600 26px Rajdhani';
      ctx.fillText(sub, w / 2, h / 2 + 42);
    }
  });
  return canvasTexture(c);
}

/* ═══════════════════════════════════════════════════════════════════
   Geometry helpers
   ═══════════════════════════════════════════════════════════════════ */

function ribbonGeometry(track, offA, offB, y, { tile = 8, uA = 0, uB = 1 } = {}) {
  const N = track.N;
  const pos = [];
  const uv = [];
  const idx = [];
  const total = track.length;
  for (let i = 0; i <= N; i++) {
    const s = track.samples[i % N];
    const a = offA;
    const b = offB;
    pos.push(s.x + s.nx * a, y, s.z + s.nz * a);
    pos.push(s.x + s.nx * b, y, s.z + s.nz * b);
    const v = (i === N ? total : s.s) / tile;
    uv.push(uA, v, uB, v);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function segmentRibbonGeometry(track, offsetA, offsetB, y, activeFn, colorFn, tileLen = 2.5) {
  const N = track.N;
  const pos = [];
  const col = [];
  const idx = [];
  let v = 0;
  for (let i = 0; i < N; i++) {
    if (!activeFn(i)) continue;
    const s = track.samples[i];
    const n = track.samples[(i + 1) % N];
    const oA = typeof offsetA === 'function' ? offsetA(i) : offsetA;
    const oB = typeof offsetB === 'function' ? offsetB(i) : offsetB;
    const lo = Math.min(oA, oB);
    const hi = Math.max(oA, oB);
    const ax = s.x + s.nx * lo, az = s.z + s.nz * lo;
    const bx = s.x + s.nx * hi, bz = s.z + s.nz * hi;
    const cx = n.x + n.nx * lo, cz = n.z + n.nz * lo;
    const dx = n.x + n.nx * hi, dz = n.z + n.nz * hi;
    const base = pos.length / 3;
    pos.push(ax, y, az, bx, y, bz, cx, y, cz, dx, y, dz);
    const c = colorFn(i, Math.floor(s.s / tileLen));
    for (let k = 0; k < 4; k++) col.push(c.r, c.g, c.b);
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    v++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function planeAt(sample, width, depth, y, material, angleOffset = 0) {
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(sample.x, y, sample.z);
  mesh.rotation.y = Math.atan2(sample.tx, sample.tz) + angleOffset;
  mesh.receiveShadow = true;
  return mesh;
}

/* ═══════════════════════════════════════════════════════════════════
   Sky
   ═══════════════════════════════════════════════════════════════════ */

function createSky(sunDir) {
  const vertex = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const fragment = `
    varying vec3 vDir;
    uniform vec3 uSun;
    void main() {
      vec3 d = normalize(vDir);
      float h = clamp(d.y, -0.15, 1.0);
      vec3 horizon = vec3(0.83, 0.80, 0.72);
      vec3 mid = vec3(0.60, 0.70, 0.76);
      vec3 top = vec3(0.24, 0.43, 0.63);
      vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
      col = mix(col, top, smoothstep(0.18, 0.72, h));
      float sun = max(dot(d, normalize(uSun)), 0.0);
      col += vec3(1.0, 0.62, 0.30) * pow(sun, 24.0) * 0.45;
      col += vec3(1.0, 0.78, 0.5) * pow(sun, 500.0) * 1.6;
      col = mix(col, vec3(0.95, 0.72, 0.52), pow(1.0 - max(h, 0.0), 8.0) * 0.22);
      gl_FragColor = vec4(col, 1.0);
    }`;
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uSun: { value: sunDir.clone().normalize() } },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4200, 32, 18), mat);
  mesh.frustumCulled = false;
  return mesh;
}

function cloudTexture() {
  const c = makeTextCanvas(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = 40 + Math.random() * (w - 80);
      const y = 45 + Math.random() * (h - 70);
      const r = 18 + Math.random() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.5)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  });
  return canvasTexture(c);
}

/* ═══════════════════════════════════════════════════════════════════
   Race world
   ═══════════════════════════════════════════════════════════════════ */

export function createRaceWorld(track, options = {}) {
  const scene = new THREE.Scene();
  const rng = mulberry32(track.seed);
  const playerColor = options.playerColor ?? 0xc90d19;
  const aiTeams = Array.isArray(options.aiTeams) ? options.aiTeams : [];
  const sunDir = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();
  const sunPos = sunDir.clone().multiplyScalar(620);
  const disposables = [];

  scene.fog = new THREE.FogExp2(0xcfd9d8, 0.00072);

  const sky = createSky(sunDir);
  scene.add(sky);

  // sun disc
  const sunMat = new THREE.SpriteMaterial({
    map: createCanvasTexture([256, 256], (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,247,225,1)');
      g.addColorStop(0.18, 'rgba(255,224,170,.9)');
      g.addColorStop(0.5, 'rgba(255,180,100,.18)');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const sunSprite = new THREE.Sprite(sunMat);
  sunSprite.position.copy(sunDir).multiplyScalar(2600);
  sunSprite.scale.set(700, 700, 1);
  scene.add(sunSprite);

  // clouds
  const clouds = new THREE.Group();
  const cloudTex = cloudTexture();
  for (let i = 0; i < 10; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.34, depthWrite: false }));
    const ang = rng() * TAU;
    const dist = 900 + rng() * 1400;
    sprite.position.set(Math.cos(ang) * dist, 260 + rng() * 320, Math.sin(ang) * dist);
    const sc = 380 + rng() * 560;
    sprite.scale.set(sc, sc * 0.42, 1);
    clouds.add(sprite);
  }
  scene.add(clouds);

  /* lighting */
  const hemi = new THREE.HemisphereLight(0xbcd4ee, 0x424c31, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffdfb8, 2.7);
  sun.position.copy(sunPos);
  sun.target.position.set(track.centerX, 0, track.centerZ);
  scene.add(sun.target);
  const shadowExtent = Math.max(track.bbox.width, track.bbox.depth) * 0.62 + 80;
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -shadowExtent;
  sun.shadow.camera.right = shadowExtent;
  sun.shadow.camera.top = shadowExtent;
  sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 1600;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fc2df, 0.5);
  fill.position.set(200, 180, -260);
  scene.add(fill);

  /* ground */
  const grassTex = grassTexture();
  disposables.push(grassTex);
  const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0xb7b79a, roughness: 1, metalness: 0 });
  const groundSize = Math.max(3600, Math.max(track.bbox.width, track.bbox.depth) * 6);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(track.centerX, -0.03, track.centerZ);
  ground.receiveShadow = true;
  scene.add(ground);

  /* road */
  const asphaltTex = asphaltTexture();
  disposables.push(asphaltTex);
  const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTex, color: 0xd8d8d8, roughness: 0.96, metalness: 0.02 });
  const road = new THREE.Mesh(ribbonGeometry(track, -track.halfWidth, track.halfWidth, 0.02, { tile: 9 }), roadMat);
  road.receiveShadow = true;
  scene.add(road);

  // white edge lines
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.72, metalness: 0.02 });
  for (const side of [-1, 1]) {
    const inner = side * (track.halfWidth - 0.42);
    const outer = side * (track.halfWidth - 0.1);
    const line = new THREE.Mesh(ribbonGeometry(track, inner, outer, 0.045), lineMat);
    line.receiveShadow = true;
    scene.add(line);
  }

  // run-off outside corners
  const gravelTex = gravelTexture();
  disposables.push(gravelTex);
  const runoffMat = new THREE.MeshStandardMaterial({ map: gravelTex, color: 0xc4bba6, roughness: 1 });
  const kerbRed = new THREE.Color(0xd93a2b);
  const kerbWhite = new THREE.Color(0xf0eadc);
  const outside = (i) => (track.samples[i].k > 0 ? -1 : 1);
  const runoff = new THREE.Mesh(
    segmentRibbonGeometry(track,
      (i) => outside(i) * (track.halfWidth + 1.35),
      (i) => outside(i) * (track.halfWidth + 9.5),
      0.006,
      (i) => track.kerbFlags[i] === 1,
      () => new THREE.Color(1, 1, 1),
      9), runoffMat);
  runoff.receiveShadow = true;
  scene.add(runoff);

  // kerbs
  const kerbMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.03 });
  for (const side of [-1, 1]) {
    const kerb = new THREE.Mesh(
      segmentRibbonGeometry(track,
        (i) => side * track.halfWidth,
        (i) => side * (track.halfWidth + 1.35),
        0.052,
        (i) => track.kerbFlags[i] === 1,
        (i, band) => (band % 2 === 0 ? kerbRed : kerbWhite),
        2.4),
      kerbMat
    );
    kerb.receiveShadow = true;
    scene.add(kerb);
  }

  // start/finish line
  const checkTex = checkerTexture();
  disposables.push(checkTex);
  const checkMat = new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.75 });
  const startLine = planeAt(track.start, track.halfWidth * 2 - 0.5, 2.2, 0.06, checkMat);
  scene.add(startLine);

  // grid slot markings
  const gridMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const dist = 8 + i * 9.5;
    const idx = (track.N - Math.round(dist / track.step) + track.N) % track.N;
    const s = track.samples[idx];
    const lat = i % 2 === 0 ? -3.4 : 3.4;
    const geo = new THREE.BoxGeometry(3.1, 0.012, 0.18);
    const bar = new THREE.Mesh(geo, gridMat);
    bar.position.set(s.x + s.nx * lat, 0.058, s.z + s.nz * lat);
    bar.rotation.y = Math.atan2(s.tx, s.tz);
    scene.add(bar);
  }

  /* ── start gantry ───────────────────────────────────────────── */
  const gantry = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.45, metalness: 0.8 });
  const signMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.5, metalness: 0.4 });
  const pillarGeo = new THREE.CylinderGeometry(0.26, 0.34, 7.6, 10);
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(pillarGeo, metalMat);
    p.position.set(side * (track.halfWidth + 2.6), 3.8, 0);
    p.castShadow = true;
    gantry.add(p);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(track.halfWidth * 2 + 6, 0.75, 0.9), metalMat);
  beam.position.set(0, 7.25, 0);
  beam.castShadow = true;
  gantry.add(beam);
  const banner = new THREE.Mesh(new THREE.BoxGeometry(track.halfWidth * 1.5, 1.5, 0.15), signMat);
  banner.position.set(0, 6.2, 0);
  gantry.add(banner);
  const bannerTex = canvasTexture(makeTextCanvas(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#111318'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f3efe5'; ctx.font = '700 52px Rajdhani'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('APEX INK', w / 2, h / 2 + 2);
  }));
  disposables.push(bannerTex);
  const bannerPlane = new THREE.Mesh(new THREE.PlaneGeometry(track.halfWidth * 1.5, 1.5), new THREE.MeshBasicMaterial({ map: bannerTex }));
  bannerPlane.position.set(0, 6.2, -0.09);
  bannerPlane.rotation.y = Math.PI;
  gantry.add(bannerPlane);

  const startLights = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x220606, emissive: 0xff1a0a, emissiveIntensity: 0.05, roughness: 0.3 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), mat);
    bulb.position.set(-1.44 + i * 0.72, 7.6, 0);
    gantry.add(bulb);
    startLights.push(mat);
  }
  gantry.position.set(track.start.x, 0, track.start.z);
  gantry.rotation.y = Math.atan2(track.start.tx, track.start.tz);
  scene.add(gantry);

  /* ── scenery placement helpers ───────────────────────────────── */
  const roadPts = [];
  for (let i = 0; i < track.N; i += 4) roadPts.push(track.samples[i]);
  const distanceToRoad = (x, z) => {
    let best = Infinity;
    for (const p of roadPts) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  const startPos = track.start;
  const nearStart = (x, z, r = 95) => Math.hypot(x - startPos.x, z - startPos.z) < r;
  const worldExtent = Math.max(track.bbox.width, track.bbox.depth) * 0.5 + 260;
  const spot = (minRoad = 20) => {
    for (let tries = 0; tries < 60; tries++) {
      const ang = rng() * TAU;
      const rad = Math.sqrt(rng()) * worldExtent;
      const x = track.centerX + Math.cos(ang) * rad;
      const z = track.centerZ + Math.sin(ang) * rad;
      if (distanceToRoad(x, z) < minRoad) continue;
      if (nearStart(x, z)) continue;
      return { x, z };
    }
    return null;
  };

  /* ── trees ───────────────────────────────────────────────────── */
  const treeCount = 340;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.8, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x554533, roughness: 0.95 });
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
  trunks.castShadow = true;
  canopies.castShadow = true;
  canopies.receiveShadow = true;
  const greenPalette = [0x3f5f2e, 0x4b7034, 0x35552a, 0x557c3b, 0x2f4b28, 0x668c45, 0x486b30];
  const dummy = new THREE.Object3D();
  let treeIdx = 0;
  let guard = 0;
  while (treeIdx < treeCount && guard++ < 3000) {
    const p = spot(17);
    if (!p) continue;
    const scale = 0.7 + rng() * 1.3;
    const h = 2.4 + rng() * 3.4;
    dummy.position.set(p.x, 0.9 * scale, p.z);
    dummy.rotation.set(0, rng() * TAU, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(treeIdx, dummy.matrix);
    dummy.position.set(p.x, h + 1.6 * scale, p.z);
    dummy.rotation.set(rng() * 0.2, rng() * TAU, rng() * 0.2);
    dummy.scale.set(1.3 * scale + rng(), h, 1.3 * scale + rng() * 1.1);
    dummy.updateMatrix();
    canopies.setMatrixAt(treeIdx, dummy.matrix);
    canopies.setColorAt(treeIdx, new THREE.Color(greenPalette[(rng() * greenPalette.length) | 0]));
    treeIdx++;
  }
  trunks.count = treeIdx;
  canopies.count = treeIdx;
  scene.add(trunks, canopies);

  // bushes
  const bushCount = 110;
  const bushGeo = new THREE.IcosahedronGeometry(1, 0);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d5b2d, roughness: 0.95, flatShading: true });
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
  let bushIdx = 0;
  guard = 0;
  while (bushIdx < bushCount && guard++ < 1200) {
    const p = spot(12);
    if (!p) continue;
    const s = 0.35 + rng() * 0.75;
    dummy.position.set(p.x, 0.35 * s, p.z);
    dummy.rotation.set(0, rng() * TAU, 0);
    dummy.scale.set(s * 1.4, s, s * 1.4);
    dummy.updateMatrix();
    bushes.setMatrixAt(bushIdx, dummy.matrix);
    bushes.setColorAt(bushIdx, new THREE.Color(greenPalette[(rng() * greenPalette.length) | 0]));
    bushIdx++;
  }
  bushes.count = bushIdx;
  bushes.castShadow = true;
  scene.add(bushes);

  /* ── distant mountains ───────────────────────────────────────── */
  const mountainGroup = new THREE.Group();
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x6d8291, roughness: 1, flatShading: true });
  const mountainMat2 = new THREE.MeshStandardMaterial({ color: 0x8799a4, roughness: 1, flatShading: true });
  const mountainRadius = Math.max(850, Math.max(track.bbox.width, track.bbox.depth) + 520);
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * TAU + rng() * 0.2;
    const dist = mountainRadius * (0.85 + rng() * 0.5);
    const h = 90 + rng() * 190;
    const w = 120 + rng() * 260;
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5 + Math.floor(rng() * 3)), rng() > 0.5 ? mountainMat : mountainMat2);
    m.position.set(track.centerX + Math.cos(ang) * dist, h * 0.42, track.centerZ + Math.sin(ang) * dist);
    m.rotation.y = rng() * TAU;
    mountainGroup.add(m);
  }
  scene.add(mountainGroup);

  /* ── grandstands ─────────────────────────────────────────────── */
  const crowdTex = crowdTexture();
  disposables.push(crowdTex);
  const crowdMat = new THREE.MeshStandardMaterial({ map: crowdTex, roughness: 0.9 });
  const standConcrete = new THREE.MeshStandardMaterial({ color: 0x9b978c, roughness: 0.9 });
  const standDark = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.7, metalness: 0.35 });
  const standRoof = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.65, metalness: 0.2 });

  function standClearance(s, side, offset, width) {
    let min = Infinity;
    const front = Math.max(12, offset - 8.5);
    for (let k = 0; k <= 4; k++) {
      const lx = -width / 2 + (width * k) / 4;
      const px = s.x + s.tx * lx + s.nx * side * front;
      const pz = s.z + s.tz * lx + s.nz * side * front;
      for (let i = 0; i < track.N; i += 2) {
        const q = track.samples[i];
        const d = Math.hypot(q.x - px, q.z - pz);
        if (d < min) min = d;
      }
    }
    return min;
  }

  function makeGrandstand(index, width = 40) {
    const s = track.samples[(index + track.N) % track.N];
    let side = 1;
    let offset = track.halfWidth + 30;
    let clearance = -Infinity;
    for (const candidate of [-1, 1]) {
      let dist = track.halfWidth + 30;
      let clr = standClearance(s, candidate, dist, width);
      for (let attempt = 0; attempt < 3 && clr < 24; attempt++) {
        dist += 24 - clr + 2;
        clr = standClearance(s, candidate, dist, width);
      }
      if (clr > clearance) {
        clearance = clr;
        side = candidate;
        offset = dist;
      }
    }
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, 17), standConcrete);
    base.position.y = 0.6;
    base.receiveShadow = true; base.castShadow = true;
    g.add(base);
    const seating = new THREE.Mesh(new THREE.BoxGeometry(width - 2, 7.4, 13), standDark);
    seating.position.set(0, 4.6, 0.6);
    seating.rotation.x = -0.12;
    seating.castShadow = true;
    g.add(seating);
    const crowd = new THREE.Mesh(new THREE.PlaneGeometry(width - 3, 6.8), crowdMat);
    crowd.position.set(0, 4.4, -5.4);
    crowd.rotation.x = 0.1;
    g.add(crowd);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 3, 0.45, 18), standRoof);
    roof.position.set(0, 10.1, -1);
    roof.rotation.x = 0.06;
    roof.castShadow = true;
    g.add(roof);
    for (const x of [-width / 2 + 2, 0, width / 2 - 2]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9.6, 0.35), standDark);
      col.position.set(x, 5.1, -8.4);
      g.add(col);
    }
    const trim = new THREE.Mesh(new THREE.BoxGeometry(width, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0xff4d1f, emissive: 0x3a0c02, emissiveIntensity: 0.4 }));
    trim.position.set(0, 10.35, -9.8);
    g.add(trim);
    g.position.set(s.x + s.nx * side * offset, 0, s.z + s.nz * side * offset);
    g.rotation.y = Math.atan2(s.tx, s.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    scene.add(g);
    return g;
  }
  makeGrandstand(track.N - Math.round(34 / track.step), 42);
  makeGrandstand(track.N - Math.round(95 / track.step), 34);

  /* ── pit lane, boxes and ten detailed team garages ───────────── */
  const pitSide = 1;
  const pitOffset = track.halfWidth + 8.2;
  const pitEntryLead = 190;
  const pitSpan = 380;
  const PIT_ROAD_HALF = 5.4;
  const PIT_BOX_LATERAL = 3.6;
  const GARAGE_LATERAL = 12.5;
  const pitEntryDistance = track.length - pitEntryLead;
  const pitSampleAt = (distance) => {
    const wrapped = ((distance % track.length) + track.length) % track.length;
    const i = Math.floor(wrapped / track.step) % track.N;
    const next = track.samples[(i + 1) % track.N];
    const a = track.samples[i];
    const f = (wrapped - a.s) / track.step;
    const mix = (x, y) => x + (y - x) * f;
    let tx = mix(a.tx, next.tx), tz = mix(a.tz, next.tz);
    const tangentLength = Math.hypot(tx, tz) || 1;
    tx /= tangentLength; tz /= tangentLength;
    const nx = tz, nz = -tx;
    return { s: wrapped, x: mix(a.x, next.x), z: mix(a.z, next.z), tx, tz, nx, nz };
  };
  const pitRoute = [];
  for (let d = 0; d <= pitSpan; d += 5) {
    const s = pitSampleAt(pitEntryDistance + d);
    const ramp = Math.min(1, d / 55, (pitSpan - d) / 55);
    const lateral = pitSide * pitOffset * Math.max(0, ramp);
    pitRoute.push({ x: s.x + s.nx * lateral, z: s.z + s.nz * lateral, tx: s.tx, tz: s.tz, trackDistance: s.s });
  }

  // Tarmac ribbon with proper UVs so the pit lane shares the circuit's asphalt.
  const routePositions = [];
  const routeUvs = [];
  const routeIndices = [];
  for (let i = 0; i < pitRoute.length; i++) {
    const p = pitRoute[i];
    const nx = p.tz, nz = -p.tx;
    routePositions.push(p.x + nx * PIT_ROAD_HALF, 0.025, p.z + nz * PIT_ROAD_HALF);
    routePositions.push(p.x - nx * PIT_ROAD_HALF, 0.025, p.z - nz * PIT_ROAD_HALF);
    const v = (i * 5) / 9;
    routeUvs.push(0, v, 1, v);
    if (i < pitRoute.length - 1) {
      const j = i * 2;
      routeIndices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
    }
  }
  const pitRoadGeo = new THREE.BufferGeometry();
  pitRoadGeo.setAttribute('position', new THREE.Float32BufferAttribute(routePositions, 3));
  pitRoadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(routeUvs, 2));
  pitRoadGeo.setIndex(routeIndices);
  pitRoadGeo.computeVertexNormals();
  const pitRoad = new THREE.Mesh(pitRoadGeo, new THREE.MeshStandardMaterial({
    map: asphaltTex, color: 0xb0b0ac, roughness: 0.94, side: THREE.DoubleSide
  }));
  pitRoad.receiveShadow = true;
  scene.add(pitRoad);

  const pitLineMat = new THREE.MeshStandardMaterial({ color: 0xece7db, roughness: 0.66 });
  for (const edge of [-1, 1]) {
    const lat = (PIT_ROAD_HALF - 0.45) * edge;
    const points = pitRoute.map((p) => new THREE.Vector3(p.x + p.tz * lat, 0.05, p.z - p.tx * lat));
    const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 2, 0.055, 5, false), pitLineMat);
    scene.add(line);
  }

  // Low pit wall separating the lane from the racing surface.
  const wallLat = -(PIT_ROAD_HALF + 0.65);
  const wallStart = 12;
  const wallEnd = pitRoute.length - 12;
  const wallPositions = [];
  const wallIndices = [];
  for (let i = wallStart; i <= wallEnd; i++) {
    const p = pitRoute[i];
    const nx = p.tz, nz = -p.tx;
    wallPositions.push(p.x + nx * wallLat, 0.02, p.z + nz * wallLat);
    wallPositions.push(p.x + nx * wallLat, 1.18, p.z + nz * wallLat);
  }
  for (let i = 0; i < wallEnd - wallStart; i++) {
    const j = i * 2;
    wallIndices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3));
  wallGeo.setIndex(wallIndices);
  wallGeo.computeVertexNormals();
  const pitWall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({
    color: 0xd7d2c6, roughness: 0.84, metalness: 0.02, side: THREE.DoubleSide
  }));
  pitWall.castShadow = true;
  pitWall.receiveShadow = true;
  scene.add(pitWall);
  const wallRailPoints = [];
  for (let i = wallStart; i <= wallEnd; i++) {
    const p = pitRoute[i];
    wallRailPoints.push(new THREE.Vector3(p.x + p.tz * wallLat, 1.23, p.z - p.tx * wallLat));
  }
  const wallRail = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wallRailPoints), wallRailPoints.length, 0.075, 6, false),
    new THREE.MeshStandardMaterial({ color: 0xff4d1f, roughness: 0.5, emissive: 0x3a0c02, emissiveIntensity: 0.26 })
  );
  wallRail.castShadow = true;
  scene.add(wallRail);

  // Shared garage materials and geometry.
  const interiorTex = garageInteriorTexture();
  const claddingTex = garageCladdingTexture();
  const garageDoorTex = garageDoorTexture();
  disposables.push(interiorTex, claddingTex, garageDoorTex);
  const claddingMat = new THREE.MeshStandardMaterial({ map: claddingTex, color: 0xd3cfc6, roughness: 0.82, metalness: 0.06 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.62, metalness: 0.42 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.48, metalness: 0.7 });
  // The bay backdrop is unlit so the workshop reads clearly from the pit lane
  // even though the garage interior receives almost no scene light.
  const interiorMat = new THREE.MeshBasicMaterial({
    map: interiorTex, color: 0xdedede, side: THREE.DoubleSide, toneMapped: false
  });
  const garageFloorMat = new THREE.MeshStandardMaterial({
    color: 0x7c8289, roughness: 0.88, metalness: 0.06,
    emissive: 0x33373c, emissiveIntensity: 0.75
  });
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x83837c, roughness: 0.96 });
  const tyreMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d20, roughness: 0.92, emissive: 0x0d0e10, emissiveIntensity: 0.9
  });
  const benchMat = new THREE.MeshStandardMaterial({
    color: 0x59606a, roughness: 0.55, metalness: 0.42,
    emissive: 0x22262b, emissiveIntensity: 0.7
  });
  const crewSuitMat = new THREE.MeshStandardMaterial({
    color: 0x23272d, roughness: 0.8, metalness: 0.05,
    emissive: 0x101215, emissiveIntensity: 0.8
  });
  const crewSkinMat = new THREE.MeshStandardMaterial({ color: 0xb98a6a, roughness: 0.85 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff3d9 });
  const crewTorsoGeo = new THREE.BoxGeometry(0.38, 0.66, 0.28);
  const crewLegGeo = new THREE.BoxGeometry(0.13, 0.56, 0.16);
  const crewArmGeo = new THREE.BoxGeometry(0.11, 0.52, 0.13);
  const crewHeadGeo = new THREE.SphereGeometry(0.145, 10, 8);
  const crewHelmetGeo = new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const sideWallGeo = new THREE.BoxGeometry(0.36, 6.4, 8.9);
  const backWallGeo = new THREE.BoxGeometry(10.36, 6.4, 0.36);
  const roofGeo = new THREE.BoxGeometry(11.1, 0.36, 9.5);
  const floorGeo = new THREE.BoxGeometry(9.7, 0.12, 8.5);
  const apronGeo = new THREE.BoxGeometry(11.9, 0.1, 11.0);
  const headerGeo = new THREE.BoxGeometry(10.0, 0.72, 0.42);
  const signGeo = new THREE.PlaneGeometry(9.3, 1.18);
  const pitCanopyGeo = new THREE.BoxGeometry(10.9, 0.2, 3.3);
  const canopyLipGeo = new THREE.BoxGeometry(10.9, 0.3, 0.16);
  const postGeo = new THREE.BoxGeometry(0.16, 6.0, 0.16);
  const ceilingLightGeo = new THREE.BoxGeometry(3.6, 0.07, 0.42);
  const wallPanelGeo = new THREE.PlaneGeometry(9.5, 5.2);
  const benchGeo = new THREE.BoxGeometry(6.4, 0.82, 0.86);
  const chestGeo = new THREE.BoxGeometry(1.55, 1.16, 0.72);
  const tyreGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.31, 12);
  const hvacGeo = new THREE.BoxGeometry(2.5, 0.72, 1.6);

  const fallbackTeams = [
    { name: 'SILVER', number: '11', color: 0xd9dadd },
    { name: 'SCUDERIA', number: '16', color: 0xe10600 },
    { name: 'ALPINE', number: '31', color: 0x2e8bd8 },
    { name: 'HAAS', number: '20', color: 0xefefea },
    { name: 'WILLIAMS', number: '23', color: 0x3a7bff },
    { name: 'SAUBER', number: '24', color: 0x6ad34b }
  ];
  const roster = aiTeams.slice(0, 9).map((team) => ({
    name: team.name || 'RACING',
    number: team.number || '00',
    color: team.paint ?? team.color ?? 0xcccccc
  }));
  for (let i = roster.length; i < 9; i++) roster.push(fallbackTeams[i % fallbackTeams.length]);
  const playerGarage = { name: 'APEX INK', number: '07', color: playerColor, player: true };
  const garageTeams = [...roster.slice(0, 4), playerGarage, ...roster.slice(4, 9)].slice(0, 10);
  while (garageTeams.length < 10) garageTeams.push(fallbackTeams[garageTeams.length % fallbackTeams.length]);

  const garages = [];
  const pitBoxes = [];
  for (let i = 0; i < garageTeams.length; i++) {
    const team = garageTeams[i];
    const color = team.color;
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
    const routeIndex = 21 + i * 4;
    const lanePoint = pitRoute[routeIndex];
    const nx = lanePoint.tz, nz = -lanePoint.tx;
    const yaw = Math.atan2(lanePoint.tx, lanePoint.tz);
    const center = { x: lanePoint.x + nx * GARAGE_LATERAL, z: lanePoint.z + nz * GARAGE_LATERAL };
    const box = {
      team: team.name,
      number: team.number,
      color,
      player: Boolean(team.player),
      garageIndex: i,
      routeProgress: routeIndex * 5,
      lateral: PIT_BOX_LATERAL,
      x: lanePoint.x + nx * PIT_BOX_LATERAL,
      z: lanePoint.z + nz * PIT_BOX_LATERAL,
      yaw
    };
    pitBoxes.push(box);

    const teamMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.48, metalness: 0.18,
      emissive: color, emissiveIntensity: 0.1
    });
    const g = new THREE.Group();

    // Concrete apron and workshop floor.
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, 0.05, -0.8);
    apron.receiveShadow = true;
    g.add(apron);
    const floor = new THREE.Mesh(floorGeo, garageFloorMat);
    floor.position.set(0, 0.11, 0.2);
    floor.receiveShadow = true;
    g.add(floor);
    const teamFloorStripe = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.02, 0.34), teamMat);
    teamFloorStripe.position.set(0, 0.18, -4.05);
    g.add(teamFloorStripe);

    // Open-fronted shell: two side walls, a back wall and a deep roof.
    for (const x of [-4.96, 4.96]) {
      const wall = new THREE.Mesh(sideWallGeo, claddingMat);
      wall.position.set(x, 3.2, 0.15);
      wall.castShadow = true;
      wall.receiveShadow = true;
      g.add(wall);
    }
    const backWall = new THREE.Mesh(backWallGeo, claddingMat);
    backWall.position.set(0, 3.2, 4.36);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    g.add(backWall);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 6.52, 0.1);
    roof.castShadow = true;
    g.add(roof);

    // Interior workshop backdrop.
    const wallPanel = new THREE.Mesh(wallPanelGeo, interiorMat);
    wallPanel.position.set(0, 2.88, 4.16);
    wallPanel.rotation.y = Math.PI;
    g.add(wallPanel);
    const ceilingLightA = new THREE.Mesh(ceilingLightGeo, lightMat);
    ceilingLightA.position.set(-2.2, 6.3, 1.2);
    g.add(ceilingLightA);
    const ceilingLightB = new THREE.Mesh(ceilingLightGeo, lightMat);
    ceilingLightB.position.set(2.2, 6.3, 1.2);
    g.add(ceilingLightB);

    // Benches, tool chests and tyre stacks inside the bay.
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(-0.9, 0.56, 3.55);
    bench.castShadow = true;
    g.add(bench);
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.07, 0.92), teamMat);
    benchTop.position.set(-0.9, 1.02, 3.55);
    g.add(benchTop);
    for (const x of [-3.7, 3.7]) {
      const chest = new THREE.Mesh(chestGeo, darkMetalMat);
      chest.position.set(x, 0.72, 3.45);
      chest.castShadow = true;
      g.add(chest);
      const chestTop = new THREE.Mesh(new THREE.BoxGeometry(1.57, 0.08, 0.74), teamMat);
      chestTop.position.set(x, 1.32, 3.45);
      g.add(chestTop);
    }
    for (const x of [-3.75, 3.75]) {
      for (let stack = 0; stack < 3; stack++) {
        const tyre = new THREE.Mesh(tyreGeo, tyreMat);
        tyre.position.set(x, 0.27 + stack * 0.31, 1.9);
        tyre.castShadow = true;
        g.add(tyre);
      }
    }

    // A lit team strip across the rear of the bay, plus the crew waiting on the
    // apron between the car and the garage.
    const bayStrip = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.14, 0.1), teamMat);
    bayStrip.position.set(0, 5.62, 4.02);
    g.add(bayStrip);
    for (let crewIndex = 0; crewIndex < 4; crewIndex++) {
      const crew = new THREE.Group();
      const x = -4.1 + crewIndex * 2.55;
      const lean = (crewIndex % 2 === 0 ? 1 : -1) * 0.035;
      const legA = new THREE.Mesh(crewLegGeo, crewSuitMat);
      legA.position.set(-0.09, 0.38, 0);
      const legB = new THREE.Mesh(crewLegGeo, crewSuitMat);
      legB.position.set(0.09, 0.38, 0);
      const torso = new THREE.Mesh(crewTorsoGeo, crewSuitMat);
      torso.position.set(0, 0.99, 0);
      torso.rotation.z = lean;
      const armA = new THREE.Mesh(crewArmGeo, crewSuitMat);
      armA.position.set(-0.25, 0.98, 0.02);
      armA.rotation.z = -0.09;
      const armB = new THREE.Mesh(crewArmGeo, crewSuitMat);
      armB.position.set(0.25, 0.98, 0.02);
      armB.rotation.z = 0.09;
      const head = new THREE.Mesh(crewHeadGeo, crewSkinMat);
      head.position.set(0, 1.47, 0);
      const helmet = new THREE.Mesh(crewHelmetGeo, teamMat);
      helmet.position.set(0, 1.5, 0);
      crew.add(legA, legB, torso, armA, armB, head, helmet);
      crew.position.set(x, 0.1, -5.35);
      crew.rotation.y = Math.PI + (crewIndex - 1.5) * 0.12;
      g.add(crew);
    }

    // Team-coloured front pillars, fascia and sign.
    for (const x of [-4.82, 4.82]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 5.8, 0.48), claddingMat);
      pillar.position.set(x, 2.9, -4.2);
      pillar.castShadow = true;
      g.add(pillar);
      const accent = new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.5, 0.1), teamMat);
      accent.position.set(x, 2.85, -4.47);
      g.add(accent);
    }
    const header = new THREE.Mesh(headerGeo, darkMetalMat);
    header.position.set(0, 5.7, -4.25);
    g.add(header);
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.42, 0.22), teamMat);
    fascia.position.set(0, 6.36, -4.5);
    g.add(fascia);
    const signTex = garageSignTexture(team.name, team.number, colorHex);
    disposables.push(signTex);
    const sign = new THREE.Mesh(signGeo, new THREE.MeshStandardMaterial({
      map: signTex, roughness: 0.62, metalness: 0.05,
      emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.12, side: THREE.DoubleSide
    }));
    sign.position.set(0, 5.62, -4.6);
    sign.rotation.y = Math.PI;
    g.add(sign);

    // Pit canopy over the box, with a lit leading edge.
    const canopy = new THREE.Mesh(pitCanopyGeo, roofMat);
    canopy.position.set(0, 6.0, -5.95);
    canopy.castShadow = true;
    g.add(canopy);
    const lip = new THREE.Mesh(canopyLipGeo, teamMat);
    lip.position.set(0, 5.94, -7.54);
    g.add(lip);
    for (const x of [-5.08, 5.08]) {
      const post = new THREE.Mesh(postGeo, darkMetalMat);
      post.position.set(x, 3.0, -7.4);
      post.castShadow = true;
      g.add(post);
    }
    const canopyLight = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.1, 0.3), lightMat);
    canopyLight.position.set(0, 5.82, -6.7);
    g.add(canopyLight);

    // Rooftop plant, cable tray and a small team pylon.
    const hvac = new THREE.Mesh(hvacGeo, darkMetalMat);
    hvac.position.set(-1.4, 6.98, 1.8);
    hvac.castShadow = true;
    g.add(hvac);
    const hvac2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.48, 1.1), darkMetalMat);
    hvac2.position.set(3.2, 6.86, -1.7);
    g.add(hvac2);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 0.24), darkMetalMat);
    pylon.position.set(4.7, 7.6, 3.8);
    g.add(pylon);
    const pylonFlag = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.72), teamMat);
    pylonFlag.position.set(5.45, 8.4, 3.8);
    g.add(pylonFlag);

    g.position.set(center.x, 0, center.z);
    g.rotation.y = yaw + Math.PI / 2;
    scene.add(g);
    garages.push(g);

    // Painted pit box and number on the tarmac.
    const boxTex = pitBoxTexture(team.name, team.number, colorHex);
    disposables.push(boxTex);
    const boxGroup = new THREE.Group();
    boxGroup.position.set(box.x, 0.065, box.z);
    boxGroup.rotation.y = yaw;
    const boxPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 7.3), new THREE.MeshStandardMaterial({
      map: boxTex, roughness: 0.86, metalness: 0.02,
      emissive: 0xffffff, emissiveMap: boxTex, emissiveIntensity: 0.08
    }));
    boxPlane.rotation.x = -Math.PI / 2;
    boxPlane.rotation.z = Math.PI;
    boxGroup.add(boxPlane);
    scene.add(boxGroup);
  }

  const playerPitBox = pitBoxes.find((b) => b.player) || pitBoxes[0];

  /* ── advertising boards ─────────────────────────────────────── */
  const sponsors = [
    ['APEX INK', 'DRAW IT. RACE IT.'],
    ['REDLINE', 'PERFORMANCE INK'],
    ['NO BRAKES', 'JUST BALLS'],
    ['TURN IT UP', 'SECTOR 02'],
    ['V-MAX', 'AERODYNAMICS'],
    ['SLIPSTREAM', 'SOCIAL CLUB'],
    ['GRIP', 'ENGINEERED'],
    ['PACE', 'MOTORSPORT'],
    ['INK & ASPHALT', 'EST. 2026']
  ];
  const sponsorTextures = sponsors.map(([a, b]) => {
    const tex = sponsorTexture(a, b);
    disposables.push(tex);
    return tex;
  });
  const boardFrameMat = new THREE.MeshStandardMaterial({ color: 0x24272d, roughness: 0.5, metalness: 0.7 });
  const boardCount = 14;
  const boardSpots = [];
  for (let i = 0; i < boardCount; i++) {
    const idx = Math.round((i + 0.4) * track.N / boardCount) % track.N;
    const s = track.samples[idx];
    if (Math.abs(s.s) < 45 || s.s > track.length - 60) continue;
    const side = i % 2 === 0 ? 1 : -1;
    boardSpots.push({ s, side, i });
  }
  for (const { s, side, i } of boardSpots) {
    const g = new THREE.Group();
    const panelMat = new THREE.MeshStandardMaterial({ map: sponsorTextures[i % sponsorTextures.length], roughness: 0.7, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.0), panelMat);
    panel.position.y = 2.2;
    g.add(panel);
    for (const x of [-2.4, 2.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), boardFrameMat);
      post.position.set(x, 1.2, 0.02);
      g.add(post);
    }
    const offset = side * (track.halfWidth + 10.5);
    g.position.set(s.x + s.nx * offset, 0, s.z + s.nz * offset);
    const inward = side > 0 ? -1 : 1;
    g.rotation.y = Math.atan2(inward * s.nx, inward * s.nz);
    scene.add(g);
  }

  /* ── tyre barriers at corners ────────────────────────────────── */
  const tyreTransforms = [];
  const bandTransforms = [];
  for (let i = 0; i < track.N; i += 1) {
    const s = track.samples[i];
    if (Math.abs(s.k) < 1 / 70) continue;
    // sample one apex every ~70m
    if (i % Math.max(1, Math.round(75 / track.step)) !== 0) continue;
    const side = s.k > 0 ? -1 : 1;
    for (let stack = 0; stack < 3; stack++) {
      const lateral = side * (track.halfWidth + 10.2 + stack * 1.3);
      const along = (stack - 1) * 2.0;
      const x = s.x + s.nx * lateral + s.tx * along;
      const z = s.z + s.nz * lateral + s.tz * along;
      for (let h = 0; h < 3; h++) {
        tyreTransforms.push({ x, z, y: 0.18 + h * 0.3, r: 0.4 });
        bandTransforms.push({ x, z, y: 0.18 + h * 0.3 });
      }
    }
  }
  if (tyreTransforms.length) {
    const tyreGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.28, 12);
    const tyreMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.95 });
    const tyres = new THREE.InstancedMesh(tyreGeo, tyreMat, tyreTransforms.length);
    tyreTransforms.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tyres.setMatrixAt(i, dummy.matrix);
    });
    tyres.castShadow = true;
    scene.add(tyres);

    const bandGeo = new THREE.CylinderGeometry(0.405, 0.405, 0.07, 12);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.7 });
    const bands = new THREE.InstancedMesh(bandGeo, bandMat, bandTransforms.length);
    bandTransforms.forEach((t, i) => {
      dummy.position.set(t.x, t.y + 0.07, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bands.setMatrixAt(i, dummy.matrix);
    });
    scene.add(bands);
  }

  /* ── marshal posts ───────────────────────────────────────────── */
  for (let i = 0; i < 4; i++) {
    const idx = Math.round((i + 0.7) * track.N / 4) % track.N;
    const s = track.samples[idx];
    const side = i % 2 === 0 ? 1 : -1;
    const g = new THREE.Group();
    const hut = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xe3ded2, roughness: 0.8 }));
    hut.position.y = 1.1;
    g.add(hut);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 2.8), new THREE.MeshStandardMaterial({ color: 0xff4d1f, roughness: 0.6 }));
    roof.position.y = 2.3;
    g.add(roof);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), boardFrameMat);
    pole.position.set(1.9, 3, 0);
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshStandardMaterial({ map: checkTex, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(2.8, 5.4, 0);
    g.add(flag);
    const offset = side * (track.halfWidth + 15);
    g.position.set(s.x + s.nx * offset, 0, s.z + s.nz * offset);
    g.rotation.y = Math.atan2(-side * s.nx, -side * s.nz);
    scene.add(g);
  }

  /* ── floodlight masts ────────────────────────────────────────── */
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, emissive: 0xfff3d8, emissiveIntensity: 0.5, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const idx = Math.round((i + 0.2) * track.N / 4) % track.N;
    const s = track.samples[idx];
    const side = i % 2 === 0 ? 1 : -1;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 18, 8), metalMat);
    pole.position.y = 9;
    pole.castShadow = true;
    g.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.3), lampMat);
    lamp.position.set(0, 18, 0);
    g.add(lamp);
    const offset = side * (track.halfWidth + 26);
    g.position.set(s.x + s.nx * offset, 0, s.z + s.nz * offset);
    g.rotation.y = Math.atan2(s.tx, s.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    scene.add(g);
  }

  /* ── flag poles near start ───────────────────────────────────── */
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 10, 8), matteMetal());
    pole.position.y = 5;
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshStandardMaterial({ map: checkTex, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(1.35, 9.1, 0);
    g.add(flag);
    const offset = side * (track.halfWidth + 4.4);
    g.position.set(track.start.x + track.start.nx * offset, 0, track.start.z + track.start.nz * offset);
    g.rotation.y = Math.atan2(track.start.tx, track.start.tz) + Math.PI;
    scene.add(g);
  }

  function matteMetal() {
    return new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.45, metalness: 0.8 });
  }

  /* ── dust haze ───────────────────────────────────────────────── */
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 240;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = track.centerX + (rng() - 0.5) * (track.bbox.width + 300);
    dustPos[i * 3 + 1] = 3 + rng() * 60;
    dustPos[i * 3 + 2] = track.centerZ + (rng() - 0.5) * (track.bbox.depth + 300);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xfff0cf, size: 1.1, transparent: true, opacity: 0.35, depthWrite: false, sizeAttenuation: true });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ambient audio cue objects not in here

  return {
    scene, sky, sun, clouds, dust, startLights, gantry, startLine,
    sunDir,
    startSample: track.start,
    pitRoute,
    pitBoxes,
    garageTeams,
    garages,
    playerPitBox,
    pitBoxDistance: playerPitBox.routeProgress,
    pitRouteLength: pitSpan,
    pitEntryLead,
    pitLaneHalfWidth: PIT_ROAD_HALF,
    pitBoxLateral: PIT_BOX_LATERAL,
    update(t, dt) {
      clouds.rotation.y = t * 0.0018;
      dust.rotation.y = t * 0.002;
      dust.position.y = Math.sin(t * 0.1) * 0.5;
      sunSprite.position.copy(sunDir).multiplyScalar(2600);
    },
    setStartLights(count) {
      startLights.forEach((mat, i) => {
        mat.emissiveIntensity = i < count ? 4.5 : 0.05;
      });
    },
    dispose() {
      disposeObject(scene);
      scene.clear();
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Showroom (menu background)
   ═══════════════════════════════════════════════════════════════════ */

export function createShowroom(car) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050608, 0.055);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(7.4, 3.1, 9.2);
  camera.lookAt(1.2, 0.9, 0);

  scene.add(new THREE.HemisphereLight(0x65758c, 0x090a0c, 0.55));

  // Portrait viewports pull the camera much further back to fit the car above
  // the workshop dock. Add a soft camera-side fill that only switches on for
  // those layouts so the livery stays readable instead of falling into shadow.
  const portraitFill = new THREE.HemisphereLight(0xffe6d5, 0x20242a, 0);
  scene.add(portraitFill);

  const key = new THREE.SpotLight(0xffe0bd, 260, 40, 0.52, 0.55, 1.6);
  key.position.set(6, 9, 7);
  key.target.position.set(1.6, 0.4, 0);
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0xff4d1f, 220, 30, 0.6, 0.7, 1.4);
  rim.position.set(-6, 5, -6);
  rim.target.position.set(1.6, 0.6, 0);
  scene.add(rim, rim.target);
  const cyan = new THREE.PointLight(0x79e6ff, 50, 22, 1.8);
  cyan.position.set(7, 1.8, -5);
  scene.add(cyan);
  const warm = new THREE.PointLight(0xffa064, 30, 18, 1.8);
  warm.position.set(-5, 1.2, 5);
  scene.add(warm);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(22, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.28, metalness: 0.72 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(44, 44, 0x22272e, 0x13171c);
  grid.position.y = 0.005;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 4.8, 0.22, 64),
    new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.32, metalness: 0.75 })
  );
  platform.position.set(1.6, -0.1, 0);
  platform.receiveShadow = true;
  scene.add(platform);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4d1f });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.018, 6, 120), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(1.6, 0.015, 0);
  scene.add(ring);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(5.9, 0.006, 4, 120),
    new THREE.MeshBasicMaterial({ color: 0xf3efe5, transparent: true, opacity: 0.24 })
  );
  ring2.rotation.x = Math.PI / 2;
  ring2.position.set(1.6, 0.01, 0);
  scene.add(ring2);

  // vertical light slashes behind
  for (let i = 0; i < 5; i++) {
    const slash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06 + i * 0.01, 8 + i),
      new THREE.MeshBasicMaterial({ color: i === 2 ? 0xff4d1f : 0xf3efe5, transparent: true, opacity: 0.05 + i * 0.012 })
    );
    slash.position.set(-7 + i * 3.4, 4, -9);
    slash.rotation.z = 0.1;
    scene.add(slash);
  }

  const particles = [];
  const dustGeo = new THREE.BufferGeometry();
  const count = 90;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = -6 + Math.random() * 16;
    pos[i * 3 + 1] = Math.random() * 8;
    pos[i * 3 + 2] = -6 + Math.random() * 12;
    particles.push({ speed: 0.1 + Math.random() * 0.3 });
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffb27a, size: 0.035, transparent: true, opacity: 0.65, depthWrite: false
  }));
  scene.add(dust);

  car.root.position.set(1.6, 0.02, 0);
  car.root.rotation.y = -0.52;
  scene.add(car.root);

  const baseY = 0.02;
  let mode = 'menu';
  let viewShift = 0;
  let viewShiftX = 0;
  let viewFit = 1;
  let autoAngle = 0;
  let manualAngle = 0;
  let spinVelocity = 0;
  let dragging = false;
  let hasInteracted = false;

  function applyViewShift() {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    if (Math.abs(viewShift) < 0.5 && Math.abs(viewShiftX) < 0.5) {
      camera.clearViewOffset();
    } else {
      // Shift the frustum so the car sits inside the open stage above the
      // workshop dock instead of behind it.
      camera.setViewOffset(w, h, viewShiftX, viewShift, w, h);
    }
  }

  return {
    scene, camera, car,
    setMode(next) {
      mode = next === 'garage' ? 'garage' : 'menu';
      if (mode !== 'garage') {
        dragging = false;
        spinVelocity = 0;
      }
    },
    setViewShift(pixels, horizontal = 0, fit = 1) {
      viewShift = Number.isFinite(pixels) ? pixels : 0;
      viewShiftX = Number.isFinite(horizontal) ? horizontal : 0;
      viewFit = Number.isFinite(fit) ? Math.max(0.5, Math.min(2.2, fit)) : 1;
      applyViewShift();
    },
    beginOrbit() {
      dragging = true;
      hasInteracted = true;
      spinVelocity = 0;
    },
    orbitBy(dx, dt = 1 / 60) {
      if (!dragging || !dx) return;
      const delta = dx * 0.0085;
      manualAngle += delta;
      spinVelocity = Math.max(-9, Math.min(9, delta / Math.max(0.008, dt)));
    },
    endOrbit() {
      dragging = false;
    },
    nudgeOrbit(radians) {
      hasInteracted = true;
      dragging = false;
      spinVelocity = 0;
      manualAngle += radians;
    },
    resetOrbit() {
      dragging = false;
      hasInteracted = false;
      manualAngle = 0;
      autoAngle = 0;
      spinVelocity = 0;
    },
    get orbitAngle() { return manualAngle; },
    update(t, dt) {
      const portrait = camera.aspect < 0.85;
      portraitFill.intensity = portrait ? 1.35 : 0;
      if (mode === 'garage') {
        if (!hasInteracted) autoAngle += dt * 0.18;
        if (!dragging && spinVelocity) {
          manualAngle += spinVelocity * dt;
          spinVelocity *= Math.exp(-3.6 * dt);
          if (Math.abs(spinVelocity) < 0.02) spinVelocity = 0;
        }
        car.root.rotation.y = -0.52 + manualAngle + autoAngle;
        car.root.position.y = baseY + Math.sin(t * 0.9) * 0.006;
        if (portrait) {
          camera.position.x = 8.9 + Math.sin(t * 0.16) * 0.1;
          camera.position.y = 3.35 + Math.sin(t * 0.21) * 0.05;
          camera.position.z = 15.1;
          camera.lookAt(1.5, 0.72, 0);
        } else {
          // Pull the camera back on narrower desktops so the car never
          // sprawls across the headline.
          const distScale = clamp(21.3 / Math.max(0.9, camera.aspect) / 11.4, 0.85, 1.7) * viewFit;
          camera.position.x = 1.45 + 5.7 * distScale + Math.sin(t * 0.16) * 0.12;
          camera.position.y = 0.8 + 1.95 * distScale + Math.sin(t * 0.21) * 0.06;
          camera.position.z = 8.9 * distScale;
          camera.lookAt(1.45, 0.8, 0);
        }
        if (camera.fov !== (portrait ? 40 : 34)) {
          camera.fov = portrait ? 40 : 34;
          camera.updateProjectionMatrix();
        }
      } else {
        car.root.rotation.y = -0.52 + Math.sin(t * 0.24) * 0.22;
        car.root.position.y = baseY + Math.sin(t * 0.9) * 0.006;
        camera.position.x = 7.4 + Math.sin(t * 0.12) * 0.55;
        camera.position.y = 3.1 + Math.sin(t * 0.19) * 0.16;
        camera.position.z = 9.2;
        camera.lookAt(1.2, 0.86, 0);
        if (camera.fov !== 34) {
          camera.fov = 34;
          camera.updateProjectionMatrix();
        }
      }
      ring.rotation.z = t * 0.08;
      ring2.rotation.z = -t * 0.05;
      const attr = dust.geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        attr.array[i * 3 + 1] += particles[i].speed * dt;
        if (attr.array[i * 3 + 1] > 8) attr.array[i * 3 + 1] = 0;
      }
      attr.needsUpdate = true;
      dust.material.opacity = 0.5 + Math.sin(t) * 0.1;
    },
    dispose() {
      disposeObject(scene);
      scene.clear();
    }
  };
}
