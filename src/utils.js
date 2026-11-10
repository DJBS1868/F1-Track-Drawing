import * as THREE from '../vendor/three.module.js';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const TAU = Math.PI * 2;

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export function shortestAngle(a, b) {
  return wrapAngle(b - a);
}

export function dampAngle(a, b, lambda, dt) {
  return a + shortestAngle(a, b) * (1 - Math.exp(-lambda * dt));
}

export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—:—.———';
  const total = Math.floor(ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = total % 1000;
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(3, '0')}`;
}

export function formatShortTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const total = Math.floor(ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}` : `${s}.${String(cs).padStart(2, '0')}`;
}

export function formatGap(ms) {
  if (!Number.isFinite(ms)) return '—';
  return `+${(ms / 1000).toFixed(1)}`;
}

export function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

export function titleCase(str) {
  return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

/** Canvas texture helper */
export function createCanvasTexture(size, draw, { repeat = [1, 1], colorSpace = 'srgb', anisotropy = 8 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function makeTextCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

export function canvasTexture(canvas, { repeat = [1, 1], colorSpace = 'srgb' } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        for (const key of Object.keys(m)) {
          const val = m[key];
          if (val && val.isTexture) val.dispose();
        }
        m.dispose();
      }
    }
  });
}

export function cylinderBetween(a, b, radius, material, radialSegments = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, radialSegments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

export function seededShuffle(array, rng) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;
