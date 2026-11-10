import {
  clamp, lerp, TAU, wrapAngle, hashString, mulberry32, formatTime
} from './utils.js';

/* ═══════════════════════════════════════════════════════════════════
   Canvas-line analysis
   ═══════════════════════════════════════════════════════════════════ */

export function polylineLength(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

function dedupe(points, minDist = 1.8) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minDist) out.push({ x: p.x, y: p.y });
  }
  if (out.length > 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < minDist) out.pop();
  }
  return out;
}

function chaikinClosed(points, iterations = 2) {
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      out.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    pts = out;
  }
  return pts;
}

function catmullRomClosed(points, tess = 7) {
  const n = points.length;
  if (n < 3) return points.slice();
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let t = 0; t < tess; t++) {
      const u = t / tess;
      const u2 = u * u;
      const u3 = u2 * u;
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);
      out.push({ x, y });
    }
  }
  return out;
}

export function prepareLoop(rawPoints) {
  const dense = dedupe(rawPoints, 2.2);
  if (dense.length < 3) return dense;
  const smoothed = chaikinClosed(dense, 2);
  return catmullRomClosed(smoothed, 6);
}

export function resampleClosedUniform(points, count) {
  const n = points.length;
  if (n < 2) return points.slice();
  const seg = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    seg.push(len);
    total += len;
  }
  const out = [];
  const step = total / count;
  let target = 0;
  let dist = 0;
  let idx = 0;
  for (let i = 0; i < count; i++) {
    target = i * step;
    while (dist + seg[idx] < target && idx < n - 1) {
      dist += seg[idx];
      idx++;
    }
    const a = points[idx];
    const b = points[(idx + 1) % n];
    const t = seg[idx] > 0 ? (target - dist) / seg[idx] : 0;
    out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
  }
  return out;
}

function segmentsIntersect(a, b, c, d) {
  const orient = (p, q, r) => (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 * o2 < -1e-9 && o3 * o4 < -1e-9) return true;
  const onSeg = (p, q, r) => Math.min(p.x, q.x) <= r.x + 1e-9 && r.x <= Math.max(p.x, q.x) + 1e-9 &&
    Math.min(p.y, q.y) <= r.y + 1e-9 && r.y <= Math.max(p.y, q.y) + 1e-9;
  if (Math.abs(o1) < 1e-9 && onSeg(a, b, c)) return true;
  if (Math.abs(o2) < 1e-9 && onSeg(a, b, d)) return true;
  if (Math.abs(o3) < 1e-9 && onSeg(c, d, a)) return true;
  if (Math.abs(o4) < 1e-9 && onSeg(c, d, b)) return true;
  return false;
}

export function findSelfIntersection(points) {
  const n = points.length;
  if (n < 8) return false;
  const stride = Math.max(1, Math.floor(n / 420));
  const pts = [];
  for (let i = 0; i < n; i += stride) pts.push(points[i]);
  const m = pts.length;
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % m];
    const axMin = Math.min(a.x, b.x), axMax = Math.max(a.x, b.x);
    const ayMin = Math.min(a.y, b.y), ayMax = Math.max(a.y, b.y);
    for (let j = i + 2; j < m; j++) {
      if (i === 0 && j === m - 1) continue;
      if (j - i < 2) continue;
      const c = pts[j];
      const d = pts[(j + 1) % m];
      if (Math.max(c.x, d.x) < axMin || Math.min(c.x, d.x) > axMax) continue;
      if (Math.max(c.y, d.y) < ayMin || Math.min(c.y, d.y) > ayMax) continue;
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

function polygonArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) * 0.5;
}

export function analyzePreview(rawPoints, opts = {}) {
  const prepared = prepareLoop(rawPoints);
  const rawLength = polylineLength(prepared);
  const bbox = prepared.reduce((b, p) => ({
    minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y),
    maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  const targetLength = opts.targetLength ?? 1900;
  const scale = rawLength > 0 ? targetLength / rawLength : 1;
  const world = prepared.map((p) => ({ x: p.x * scale, y: p.y * scale }));

  // world-space stats after a uniform resample
  const sampleCount = Math.max(260, Math.min(900, Math.round(rawLength / 2)));
  const uniform = resampleClosedUniform(world, sampleCount);
  const step = targetLength / sampleCount;
  let turns = 0;
  let straightBest = 0;
  let straightRun = 0;
  let inTurn = false;
  let gap = 0;
  let minRadius = Infinity;

  // curvature from heading change over 3 steps
  const curv = [];
  for (let i = 0; i < sampleCount; i++) {
    const look = 3;
    const a = uniform[(i - look + sampleCount) % sampleCount];
    const b = uniform[i];
    const c = uniform[(i + look) % sampleCount];
    const a1 = Math.atan2(b.x - a.x, b.y - a.y);
    const a2 = Math.atan2(c.x - b.x, c.y - b.y);
    const d = wrapAngle(a2 - a1);
    const dist = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    curv.push(Math.abs(d) / dist);
  }
  // smooth curvature
  const sm = [];
  const win = Math.max(2, Math.round(24 / step));
  for (let i = 0; i < sampleCount; i++) {
    let sum = 0;
    for (let k = -win; k <= win; k++) sum += curv[(i + k + sampleCount) % sampleCount];
    sm.push(sum / (win * 2 + 1));
  }
  const cornerThreshold = 1 / 100;
  for (let i = 0; i < sampleCount; i++) {
    const isTurn = sm[i] > cornerThreshold;
    if (isTurn) {
      if (!inTurn) { turns++; inTurn = true; }
      gap = 0;
      minRadius = Math.min(minRadius, 1 / Math.max(sm[i], 1e-5));
    } else if (inTurn) {
      gap++;
      if (gap > 7) { inTurn = false; gap = 0; }
    }
    if (!isTurn) {
      straightRun += step;
      straightBest = Math.max(straightBest, straightRun);
    } else straightRun = 0;
  }

  const closed = prepared.length > 3;
  const area = polygonArea(prepared);
  const selfIntersects = findSelfIntersection(prepared);
  const tooSmall = rawLength < 280 || area < 6000 || (bbox.maxX - bbox.minX) < 80 || (bbox.maxY - bbox.minY) < 80;
  const tooFew = dedupe(rawPoints, 2).length < 12;

  return {
    prepared, rawLength, scale, bbox, area, selfIntersects, closed,
    tooSmall, tooFew,
    length: Math.round(targetLength),
    turns: Math.max(0, turns),
    longestStraight: Math.round(straightBest),
    minRadius: Number.isFinite(minRadius) ? Math.round(minRadius) : 0,
    valid: closed && !selfIntersects && !tooSmall && !tooFew,
    targetLength
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Full track data
   ═══════════════════════════════════════════════════════════════════ */

const NAME_A = ['VELVET', 'IRON', 'SABLE', 'CROWN', 'NEON', 'HOLLOW', 'GOLDEN', 'MIDNIGHT', 'CRIMSON', 'SILVER', 'WILD', 'UPPER', 'LOST', 'APEX', 'TORQUE', 'EMBER', 'SOLAR', 'RAPID', 'NORTH', 'SCARLET'];
const NAME_B = ['HARBOUR', 'RIDGE', 'VALE', 'SPUR', 'BASIN', 'CIRCUIT', 'HEIGHTS', 'RUN', 'GATE', 'FIELDS', 'COAST', 'WORKS', 'PASS', 'YARD', 'PARK', 'MILE', 'QUAY', 'DOWNS', 'REACH', 'LINE'];
const NAME_C = ['GRAND PRIX', 'INTERNATIONAL', 'CIRCUIT', 'SPEEDWAY', 'MOTORPARK'];

export function trackNameFor(points) {
  let seedStr = '';
  for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 18))) {
    seedStr += `${Math.round(points[i].x)},${Math.round(points[i].y)};`;
  }
  const h = hashString(seedStr);
  const a = NAME_A[h % NAME_A.length];
  const b = NAME_B[(h >>> 5) % NAME_B.length];
  const c = NAME_C[(h >>> 11) % NAME_C.length];
  return { name: `${a} ${b}`, suffix: c, seed: h };
}

export function createTrackData(rawPoints, opts = {}) {
  const targetLength = opts.targetLength ?? 1900;
  const halfWidth = opts.halfWidth ?? 7.2;
  const preview = analyzePreview(rawPoints, { targetLength });
  if (!preview.valid) return { valid: false, preview };

  const { prepared } = preview;
  const scale = preview.scale;
  const named = trackNameFor(rawPoints);

  // smooth points in world units
  const center = { x: (preview.bbox.minX + preview.bbox.maxX) / 2, y: (preview.bbox.minY + preview.bbox.maxY) / 2 };
  let worldPts = prepared.map((p) => ({ x: (p.x - center.x) * scale, y: (p.y - center.y) * scale }));

  // rotate so tangent at the user's starting point points toward +Z
  const start = worldPts[0];
  let tangent = { x: 0, y: 1 };
  for (let i = 1; i < Math.min(worldPts.length, 20); i++) {
    const p = worldPts[i];
    const dx = p.x - start.x, dy = p.y - start.y;
    if (Math.hypot(dx, dy) > 4) { tangent = { x: dx, y: dy }; break; }
  }
  const startAngle = Math.atan2(tangent.x, tangent.y);
  const cos = Math.cos(-startAngle);
  const sin = Math.sin(-startAngle);
  worldPts = worldPts.map((p) => {
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  });

  // uniform resample, keeping the start at index 0
  const N = clamp(Math.round(targetLength / 1.15), 900, 2400);
  const step = targetLength / N;
  const pts = resampleClosedUniform(worldPts, N);
  const samples = [];
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const prev = pts[(i - 1 + N) % N];
    const next = pts[(i + 1) % N];
    let tx = next.x - prev.x;
    let tz = next.y - prev.y;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    const nx = tz;
    const nz = -tx;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.y); maxZ = Math.max(maxZ, p.y);
    samples.push({ x: p.x, z: p.y, tx, tz, nx, nz, y: 0, s: i * step });
  }

  // signed curvature + smoothing
  const rawK = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = samples[(i - 1 + N) % N];
    const b = samples[(i + 1) % N];
    const a1 = Math.atan2(a.tx, a.tz);
    const a2 = Math.atan2(b.tx, b.tz);
    rawK[i] = wrapAngle(a2 - a1) / (2 * step);
  }
  const K = new Float32Array(N);
  const kWin = Math.max(3, Math.round(9 / step));
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let k = -kWin; k <= kWin; k++) sum += rawK[(i + k + N) % N];
    K[i] = sum / (kWin * 2 + 1);
  }
  for (let i = 0; i < N; i++) {
    samples[i].k = K[i];
    samples[i].radius = 1 / Math.max(Math.abs(K[i]), 1e-5);
  }

  // corners / kerbs / straights
  const cornerFlags = new Uint8Array(N);
  const cornerThreshold = 1 / 110;
  let inTurn = false;
  let gap = 0;
  let turns = 0;
  for (let i = 0; i < N * 2; i++) {
    const idx = i % N;
    const isTurn = Math.abs(K[idx]) > cornerThreshold;
    if (isTurn) {
      if (!inTurn) turns++;
      inTurn = true;
      gap = 0;
    } else if (inTurn) {
      gap++;
      if (gap > Math.round(14 / step)) { inTurn = false; gap = 0; }
    }
    if (inTurn || gap < Math.round(14 / step)) cornerFlags[idx] = 1;
  }
  // dilate corner zones for kerbs and run-off
  const dilate = Math.round(20 / step);
  const kerbFlags = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (!cornerFlags[i]) continue;
    for (let k = -dilate; k <= dilate; k++) kerbFlags[(i + k + N) % N] = 1;
  }

  let straightBest = 0;
  let straightRun = 0;
  for (let i = 0; i < N; i++) {
    if (Math.abs(K[i]) < 1 / 260) {
      straightRun += step;
      straightBest = Math.max(straightBest, straightRun);
    } else straightRun = 0;
  }

  // AI speed profile
  const profile = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = Math.max(1 / Math.max(Math.abs(K[i]), 1e-5), 26);
    profile[i] = clamp(Math.sqrt(24 * r), 19, 84);
  }
  const ds = step;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = N - 1; i >= 0; i--) {
      const next = profile[(i + 1) % N];
      profile[i] = Math.min(profile[i], Math.sqrt(next * next + 2 * 17 * ds));
    }
    for (let i = 0; i < N; i++) {
      const prev = profile[(i - 1 + N) % N];
      profile[i] = Math.min(profile[i], Math.sqrt(prev * prev + 2 * 11 * ds));
    }
  }

  const bbox = { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ };
  const radius = Math.max(bbox.width, bbox.depth) * 0.5;

  return {
    valid: true,
    preview,
    name: named.name,
    suffix: named.suffix,
    seed: named.seed,
    samples,
    N,
    step,
    length: N * step,
    halfWidth,
    scale,
    bbox,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    radius,
    turns,
    longestStraight: Math.round(straightBest),
    cornerFlags,
    kerbFlags,
    speedProfile: profile,
    start: samples[0],
    targetLength
  };
}

export function sampleAtDistance(track, dist) {
  const N = track.N;
  let idx = dist / track.step;
  idx = ((idx % N) + N) % N;
  const i = Math.floor(idx);
  const t = idx - i;
  const a = track.samples[i];
  const b = track.samples[(i + 1) % N];
  return {
    x: lerp(a.x, b.x, t),
    z: lerp(a.z, b.z, t),
    tx: lerp(a.tx, b.tx, t),
    tz: lerp(a.tz, b.tz, t),
    nx: lerp(a.nx, b.nx, t),
    nz: lerp(a.nz, b.nz, t),
    k: lerp(a.k, b.k, t)
  };
}

/* Nearest sample index using a spatial hash */
export class TrackLocator {
  constructor(track, cell = 16) {
    this.track = track;
    this.cell = cell;
    this.grid = new Map();
    const N = track.N;
    for (let i = 0; i < N; i++) {
      const s = track.samples[i];
      const key = this.key(s.x, s.z);
      let arr = this.grid.get(key);
      if (!arr) { arr = []; this.grid.set(key, arr); }
      arr.push(i);
    }
    this.lastIndex = 0;
  }
  key(x, z) {
    return `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
  }
  nearest(x, z, radius = 2) {
    let best = -1;
    let bestD = Infinity;
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    for (let ox = -radius; ox <= radius; ox++) {
      for (let oz = -radius; oz <= radius; oz++) {
        const arr = this.grid.get(`${cx + ox},${cz + oz}`);
        if (!arr) continue;
        for (const i of arr) {
          const s = this.track.samples[i];
          const d = (s.x - x) ** 2 + (s.z - z) ** 2;
          if (d < bestD) { bestD = d; best = i; }
        }
      }
    }
    if (best === -1) {
      const N = this.track.N;
      for (let i = 0; i < N; i += 3) {
        const s = this.track.samples[i];
        const d = (s.x - x) ** 2 + (s.z - z) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    if (best >= 0) this.lastIndex = best;
    return { index: best, dist: Math.sqrt(bestD) };
  }
}

export function bearingOf(sample) {
  return Math.atan2(sample.tx, sample.tz);
}

export function directionFromPoints(points) {
  return points.map((p) => ({ x: p.x, y: p.y }));
}
