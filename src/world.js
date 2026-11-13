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

function garageTexture() {
  return createCanvasTexture([512, 256], (ctx, w, h) => {
    ctx.fillStyle = '#14171d';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const x = 20 + i * 124;
      ctx.fillStyle = '#252a32';
      ctx.fillRect(x, 70, 104, 166);
      for (let y = 80; y < 230; y += 8) {
        ctx.fillStyle = y % 16 === 0 ? '#2d333b' : '#20252c';
        ctx.fillRect(x + 5, y, 94, 4);
      }
      ctx.fillStyle = i % 2 === 0 ? '#ff4d1f' : '#f1ede2';
      ctx.fillRect(x, 62, 104, 5);
    }
    ctx.fillStyle = '#f2ede1';
    ctx.font = '600 34px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText('APEX INK  ·  PIT LANE', w / 2, 42);
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

export function createRaceWorld(track) {
  const scene = new THREE.Scene();
  const rng = mulberry32(track.seed);
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
    ctx.fillText('APEX INK', w / 2 - 30, h / 2 + 2);
    ctx.fillStyle = '#ff4d1f'; ctx.fillRect(w - 96, 0, 96, h);
    ctx.fillStyle = '#111318'; ctx.font = '700 30px Rajdhani'; ctx.fillText('GP', w - 48, h / 2 + 2);
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

  /* ── pit building ────────────────────────────────────────────── */
  const pitIdx = (track.N - Math.round(52 / track.step) + track.N) % track.N;
  const pitSample = track.samples[pitIdx];
  const pit = new THREE.Group();
  const pitBody = new THREE.Mesh(new THREE.BoxGeometry(64, 9, 12), new THREE.MeshStandardMaterial({ color: 0xe4dfd3, roughness: 0.7, metalness: 0.1 }));
  pitBody.position.y = 4.5;
  pitBody.castShadow = true;
  pitBody.receiveShadow = true;
  pit.add(pitBody);
  const garageTex = garageTexture();
  disposables.push(garageTex);
  const garage = new THREE.Mesh(new THREE.PlaneGeometry(60, 5.4), new THREE.MeshStandardMaterial({ map: garageTex, roughness: 0.8 }));
  garage.position.set(0, 3.2, 6.06);
  pit.add(garage);
  const pitRoof = new THREE.Mesh(new THREE.BoxGeometry(66, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0x1a1d23, roughness: 0.6, metalness: 0.5 }));
  pitRoof.position.set(0, 9.1, 0);
  pit.add(pitRoof);
  for (let i = -5; i <= 5; i += 2) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a3a47, roughness: 0.15, metalness: 0.6, emissive: 0x0b1418, emissiveIntensity: 0.5 }));
    window.position.set(i * 5, 7.1, 6.1);
    pit.add(window);
  }
  const pitOffset = -(track.halfWidth + 22);
  pit.position.set(pitSample.x + pitSample.nx * pitOffset, 0, pitSample.z + pitSample.nz * pitOffset);
  pit.rotation.y = Math.atan2(pitSample.tx, pitSample.tz) + Math.PI / 2;
  scene.add(pit);

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

  return {
    scene, camera,
    setMode(next) { mode = next === 'garage' ? 'garage' : 'menu'; },
    update(t, dt) {
      const portrait = camera.aspect < 0.85;
      if (mode === 'garage') {
        car.root.rotation.y = -0.52 + t * 0.16;
        car.root.position.y = baseY + Math.sin(t * 0.9) * 0.006;
        if (portrait) {
          camera.position.x = 8.9 + Math.sin(t * 0.16) * 0.12;
          camera.position.y = 3.45 + Math.sin(t * 0.21) * 0.06;
          camera.position.z = 16.4;
          camera.lookAt(1.5, 0.72, 0);
        } else {
          camera.position.x = 7.15 + Math.sin(t * 0.16) * 0.12;
          camera.position.y = 2.75 + Math.sin(t * 0.21) * 0.06;
          camera.position.z = 8.9;
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
