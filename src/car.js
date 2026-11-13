import * as THREE from '../vendor/three.module.js';
import { canvasTexture, cylinderBetween, makeTextCanvas, TAU } from './utils.js';

/* ═══════════════════════════════════════════════════════════════════
   F1 car — hand-built single seater
   ═══════════════════════════════════════════════════════════════════ */

function superellipseRing(w, h, count, power = 0.62) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * TAU;
    const c = Math.cos(t);
    const s = Math.sin(t);
    pts.push({
      x: Math.sign(c) * Math.pow(Math.abs(c), power) * w,
      y: Math.sign(s) * Math.pow(Math.abs(s), power) * h
    });
  }
  return pts;
}

function loft(sections, material, { radial = 14, power = 0.62 } = {}) {
  const positions = [];
  const indices = [];
  const rings = sections.map((s) => superellipseRing(s.w, s.h, radial, power).map((p) => [p.x, s.y + p.y, s.z]));
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    for (const p of ring) positions.push(...p);
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      indices.push(a, c, b, b, c, d);
    }
  }
  // caps
  const firstCenter = positions.length / 3;
  positions.push(0, sections[0].y, sections[0].z);
  for (let j = 0; j < radial; j++) {
    indices.push(firstCenter, j, (j + 1) % radial);
  }
  const lastBase = (rings.length - 1) * radial;
  const lastCenter = positions.length / 3;
  positions.push(0, sections[sections.length - 1].y, sections[sections.length - 1].z);
  for (let j = 0; j < radial; j++) {
    indices.push(lastCenter, lastBase + ((j + 1) % radial), lastBase + j);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

function topStripe(sections, width, material) {
  const positions = [];
  const indices = [];
  const half = width / 2;
  sections.forEach((s, i) => {
    const y = s.y + s.h + 0.012;
    positions.push(-half, y, s.z, half, y, s.z);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = false;
  return mesh;
}

function makeTextPlane(w, h, text, { color = '#f7f2e7', bg = null, font = '700 74px Rajdhani', stroke = null } = {}) {
  const c = makeTextCanvas(512, 128, (ctx) => {
    ctx.clearRect(0, 0, 512, 128);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128); }
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.strokeText(text, 256, 66); }
    ctx.fillText(text, 256, 66);
  });
  const tex = canvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: !bg, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return mesh;
}

function makeWheel(front, accentMat) {
  const radius = front ? 0.355 : 0.395;
  const width = front ? 0.34 : 0.46;
  const steer = new THREE.Group();
  const spin = new THREE.Group();
  steer.add(spin);

  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.92, metalness: 0.05 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x2c2f34, roughness: 0.35, metalness: 0.9 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xff4d1f, emissive: 0x401005, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.3 });

  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 28, 1);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, rubber);
  tire.castShadow = true;
  spin.add(tire);

  // sidewall rings
  for (const side of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.79, 0.012, 6, 32), accent);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * (width / 2 + 0.004);
    spin.add(ring);
  }

  // rim + spokes
  const rimGeo = new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width + 0.01, 24, 1);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  spin.add(rim);

  for (let k = 0; k < 5; k++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, 0.045, radius * 1.24), rimMat);
    spoke.rotation.x = (k / 5) * Math.PI;
    spin.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, width + 0.08, 12), accentMat);
  hub.geometry.rotateZ(Math.PI / 2);
  spin.add(hub);

  return { steer, spin, radius, width };
}

export function createCar({
  paint = 0xd20f1c,
  accent = 0xffffff,
  accent2 = 0xff4d1f,
  driver = 0xf3efe5,
  number = '07',
  showDecals = true,
  player = false
} = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paint, roughness: 0.3, metalness: 0.25,
    clearcoat: 1, clearcoatRoughness: 0.22
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: accent, roughness: 0.34, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.3
  });
  const hotMat = new THREE.MeshStandardMaterial({
    color: accent2, roughness: 0.35, metalness: 0.35,
    emissive: accent2, emissiveIntensity: 0.08
  });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x121317, roughness: 0.5, metalness: 0.55 });
  const matteMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.88, metalness: 0.15 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xa6a9ae, roughness: 0.22, metalness: 1 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x161b22, roughness: 0.08, metalness: 0.8, clearcoat: 1, transparent: true, opacity: 0.92
  });

  /* ── monocoque ─────────────────────────────────────────────── */
  const sections = [
    { z: -2.45, w: 0.16, h: 0.11, y: 0.46 },
    { z: -2.15, w: 0.27, h: 0.19, y: 0.5 },
    { z: -1.7, w: 0.38, h: 0.28, y: 0.56 },
    { z: -1.15, w: 0.47, h: 0.36, y: 0.61 },
    { z: -0.6, w: 0.53, h: 0.43, y: 0.6 },
    { z: -0.15, w: 0.58, h: 0.4, y: 0.52 },
    { z: 0.25, w: 0.61, h: 0.32, y: 0.47 },
    { z: 0.8, w: 0.52, h: 0.27, y: 0.43 },
    { z: 1.35, w: 0.42, h: 0.22, y: 0.39 },
    { z: 1.9, w: 0.3, h: 0.16, y: 0.34 },
    { z: 2.35, w: 0.19, h: 0.11, y: 0.29 },
    { z: 2.62, w: 0.1, h: 0.06, y: 0.25 }
  ];
  const tub = loft(sections, paintMat);
  body.add(tub);
  const stripe = topStripe(sections.filter((s) => s.z > 0.55), 0.15, accentMat);
  body.add(stripe);

  // floor / plank
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.045, 4.6), carbonMat);
  floor.position.set(0, 0.095, -0.05);
  floor.castShadow = true;
  body.add(floor);

  // diffuser
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.5), carbonMat);
  diffuser.position.set(0, 0.2, -2.35);
  diffuser.rotation.x = -0.18;
  body.add(diffuser);

  /* ── sidepods ──────────────────────────────────────────────── */
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), paintMat);
    pod.scale.set(0.36, 0.26, 0.94);
    pod.position.set(side * 0.55, 0.42, -0.35);
    pod.castShadow = true;
    body.add(pod);

    // top livery blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 1.2), accentMat);
    blade.position.set(side * 0.56, 0.68, -0.35);
    blade.rotation.z = side * -0.02;
    body.add(blade);

    // intake
    const intake = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), matteMat);
    intake.scale.set(0.22, 0.17, 0.09);
    intake.position.set(side * 0.58, 0.44, 0.53);
    body.add(intake);

    // bargeboard
    const barge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.3, 0.5), carbonMat);
    barge.position.set(side * 0.72, 0.25, 0.72);
    barge.rotation.z = side * 0.16;
    body.add(barge);

    // sidepod decal
    if (showDecals) {
      const decal = makeTextPlane(0.58, 0.14, `APEX ${number}`, { color: '#f5f0e6', font: '700 60px Rajdhani' });
      decal.position.set(side * 0.902, 0.48, -0.38);
      decal.rotation.y = side * Math.PI / 2;
      body.add(decal);
    }
  }

  /* ── cockpit, halo, driver ─────────────────────────────────── */
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), matteMat);
  cockpit.scale.set(0.28, 0.06, 0.36);
  cockpit.position.set(0, 0.77, 0.14);
  body.add(cockpit);

  const haloMat = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.4, metalness: 0.7 });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.026, 8, 30), haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.96, 0.17);
  body.add(halo);
  const haloPillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.06), haloMat);
  haloPillar.position.set(0, 0.86, 0.52);
  haloPillar.rotation.x = 0.3;
  body.add(haloPillar);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), new THREE.MeshPhysicalMaterial({
    color: driver, roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.15
  }));
  helmet.position.set(0, 0.94, 0.14);
  helmet.scale.set(1, 1.05, 1.12);
  body.add(helmet);
  const helmetStripe = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.028, 6, 20, Math.PI), new THREE.MeshStandardMaterial({ color: accent2, roughness: 0.4 }));
  helmetStripe.rotation.set(0, 0, Math.PI / 2);
  helmetStripe.position.set(0, 0.94, 0.14);
  body.add(helmetStripe);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.065, 0.03), glassMat);
  visor.position.set(0, 0.965, 0.305);
  body.add(visor);

  // headrest
  const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.16), matteMat);
  headrest.position.set(0, 0.86, -0.18);
  body.add(headrest);

  // mirrors
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.025), carbonMat);
    stalk.position.set(side * 0.5, 0.83, 0.42);
    body.add(stalk);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.06), paintMat);
    mirror.position.set(side * 0.6, 0.84, 0.42);
    body.add(mirror);
  }

  // airbox
  const airbox = loft([
    { z: -0.8, w: 0.16, h: 0.14, y: 1.02 },
    { z: -0.58, w: 0.15, h: 0.17, y: 1.09 },
    { z: -0.32, w: 0.11, h: 0.12, y: 1.02 }
  ], paintMat, { radial: 10 });
  body.add(airbox);
  const airboxIntake = new THREE.Mesh(new THREE.CircleGeometry(0.095, 14), matteMat);
  airboxIntake.position.set(0, 1.1, -0.31);
  airboxIntake.rotation.x = -0.1;
  body.add(airboxIntake);

  // engine cover spine
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 1.5), carbonMat);
  spine.position.set(0, 0.94, -1.1);
  spine.rotation.x = -0.02;
  body.add(spine);

  /* ── front wing ────────────────────────────────────────────── */
  const wingMain = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.032, 0.56), accentMat);
  wingMain.position.set(0, 0.14, 2.5);
  wingMain.rotation.x = -0.08;
  wingMain.castShadow = true;
  body.add(wingMain);
  const wingFlap = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.03, 0.32), paintMat);
  wingFlap.position.set(0, 0.24, 2.32);
  wingFlap.rotation.x = 0.26;
  wingFlap.castShadow = true;
  body.add(wingFlap);
  const wingFlap2 = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.025, 0.22), carbonMat);
  wingFlap2.position.set(0, 0.3, 2.15);
  wingFlap2.rotation.x = 0.34;
  body.add(wingFlap2);
  for (const side of [-1, 1]) {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.36, 0.62), paintMat);
    endplate.position.set(side * 0.985, 0.22, 2.46);
    endplate.castShadow = true;
    body.add(endplate);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.62), hotMat);
    tip.position.set(side * 0.985, 0.4, 2.46);
    body.add(tip);
  }

  /* ── rear wing ─────────────────────────────────────────────── */
  for (const side of [-1, 1]) {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.56, 0.74), paintMat);
    endplate.position.set(side * 0.53, 1.0, -2.14);
    endplate.castShadow = true;
    body.add(endplate);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.56, 0.1), accentMat);
    accent.position.set(side * 0.53, 1.0, -2.45);
    body.add(accent);
  }
  const rearMain = new THREE.Mesh(new THREE.BoxGeometry(1.07, 0.04, 0.4), accentMat);
  rearMain.position.set(0, 1.19, -2.12);
  rearMain.rotation.x = 0.12;
  rearMain.castShadow = true;
  body.add(rearMain);
  const beamWing = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.035, 0.26), carbonMat);
  beamWing.position.set(0, 0.7, -2.12);
  beamWing.rotation.x = 0.12;
  body.add(beamWing);

  const drsGroup = new THREE.Group();
  drsGroup.position.set(0, 1.28, -2.26);
  const drsFlap = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.032, 0.27), hotMat);
  drsFlap.position.set(0, 0, -0.1);
  drsFlap.castShadow = true;
  drsGroup.add(drsFlap);
  body.add(drsGroup);

  const wingPylon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.2), carbonMat);
  wingPylon.position.set(0, 0.96, -2.2);
  body.add(wingPylon);

  if (showDecals) {
    const rearText = makeTextPlane(0.98, 0.19, 'APEX INK', { color: '#101114', font: '700 70px Rajdhani' });
    rearText.position.set(0, 1.22, -2.335);
    rearText.rotation.y = Math.PI;
    body.add(rearText);
  }

  // rain light
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff1a0a, emissiveIntensity: 1.2, roughness: 0.3 });
  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), brakeMat);
  rainLight.position.set(0, 0.52, -2.56);
  body.add(rainLight);

  /* ── wheels & suspension ───────────────────────────────────── */
  const wheels = [];
  const wheelDefs = [
    { x: -0.86, z: 1.63, front: true },
    { x: 0.86, z: 1.63, front: true },
    { x: -0.84, z: -1.56, front: false },
    { x: 0.84, z: -1.56, front: false }
  ];
  for (const def of wheelDefs) {
    const w = makeWheel(def.front, hotMat);
    w.steer.position.set(def.x, w.radius, def.z);
    w.front = def.front;
    w.x = def.x;
    w.z = def.z;
    root.add(w.steer);
    wheels.push(w);

    for (const dz of [-0.16, 0.16]) {
      const arm = cylinderBetween(
        new THREE.Vector3(def.x * 0.32, 0.32 + (def.front ? 0 : 0.05), def.z + dz),
        new THREE.Vector3(def.x, w.radius, def.z + dz * 0.7),
        0.022, carbonMat, 6
      );
      body.add(arm);
    }
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.1), carbonMat);
    upright.position.set(def.x, w.radius, def.z);
    body.add(upright);
  }

  // number decal on the nose
  if (showDecals) {
    const noseNo = makeTextPlane(0.38, 0.16, number, { color: '#f6f1e7', font: '700 96px Rajdhani' });
    noseNo.position.set(0, 0.49, 1.28);
    noseNo.rotation.x = -Math.PI / 2 + 0.22;
    body.add(noseNo);
  }

  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  return {
    root, body, wheels,
    brakeMat, drsGroup, drsFlap,
    get paint() { return paint; },
    player,
    setPaint(value) {
      paintMat.color.set(value);
      paint = typeof value === 'number' ? value : paintMat.color.getHex();
    },
    setBrake(on) { brakeMat.emissiveIntensity = on ? 5 : 1.2; },
    setDRS(open) { drsGroup.rotation.x = open ? -0.55 : 0; },
    dispose() {
      root.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) {
            for (const key of Object.keys(m)) {
              if (m[key] && m[key].isTexture) m[key].dispose();
            }
            m.dispose();
          }
        }
      });
    }
  };
}

export const AI_TEAMS = [
  { name: 'VEGA', number: '21', paint: 0x25b8d8, accent: 0xf3efe5, accent2: 0x79e6ff, driver: 0x1d242b },
  { name: 'KOSMO', number: '03', paint: 0xb9f34a, accent: 0x17191c, accent2: 0xd7ff6b, driver: 0xe6ffb0 },
  { name: 'RUSH', number: '88', paint: 0xff7a20, accent: 0xf3efe5, accent2: 0xffb27a, driver: 0x2b160a },
  { name: 'NOVA', number: '14', paint: 0x9b6cff, accent: 0xf3efe5, accent2: 0xc3a7ff, driver: 0x211637 },
  { name: 'VOLT', number: '62', paint: 0xf0d329, accent: 0x17191c, accent2: 0xffed73, driver: 0x3a3212 },
  { name: 'APEX', number: '09', paint: 0xe83e8c, accent: 0xf3efe5, accent2: 0xff8fbd, driver: 0x351326 },
  { name: 'DRIFT', number: '35', paint: 0x56bd75, accent: 0x17191c, accent2: 0x91e8a9, driver: 0x173321 },
  { name: 'ORBIT', number: '77', paint: 0xe7e9ed, accent: 0x17191c, accent2: 0xffffff, driver: 0x252a32 },
  { name: 'EMBER', number: '48', paint: 0xb64c35, accent: 0xf3efe5, accent2: 0xf18a70, driver: 0x35180f }
];
