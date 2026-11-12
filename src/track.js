import {
  clamp, lerp, TAU, wrapAngle, hashString, mulberry32, formatTime
} from './utils.js';
import { CIRCUIT_TEMPLATES } from './circuits.js';

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
  }

  // Measure the longest straight cyclically so a straight crossing the
  // start/finish seam is not split in half.
  let scan = 0;
  while (scan < sampleCount && sm[scan] <= cornerThreshold) scan++;
  if (scan >= sampleCount) {
    straightBest = targetLength;
  } else {
    for (let k = 1; k <= sampleCount; k++) {
      const i = (scan + k) % sampleCount;
      if (sm[i] <= cornerThreshold) {
        straightRun += step;
        if (straightRun > straightBest) straightBest = straightRun;
      } else straightRun = 0;
    }
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

/* ═══════════════════════════════════════════════════════════════════
   Endless inspiration tracks
   A real Grand Prix centre line is mirrored, stretched, rotated and
   deformed by a smooth warp field. The underlying shape keeps the straights
   and corner sequences that make a circuit feel real; the warp makes every
   roll a new layout. Mutations that fold the loop are rejected and rerolled.
   Every roll is seeded from the clock, so the well is infinite.
   ═══════════════════════════════════════════════════════════════════ */

const recentTrackPrints = [];

function trackFingerprint(prepared) {
  const stride = Math.max(1, Math.floor(prepared.length / 24));
  let print = '';
  for (let i = 0; i < prepared.length; i += stride) {
    print += `${Math.round(prepared[i].x / 10)},${Math.round(prepared[i].y / 10)};`;
  }
  return print;
}

const vSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const vCross = (a, b) => a.x * b.y - a.y * b.x;
const vDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const vUnit = (a) => {
  const len = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / len, y: a.y / len };
};

// ── real-circuit DNA ─────────────────────────────────────────────────
// The templates in circuits.js are sampled centre lines of real Grand Prix
// circuits. Each roll mirrors, stretches, rotates and warps one of them with
// a smooth displacement field plus a few localised bulges. That keeps the
// essential shape language — long straights, proper hairpins, tight street
// corners — while producing a brand-new layout every time.
const TRACK_TEMPLATES = CIRCUIT_TEMPLATES.map((template) => {
  const points = [];
  for (let i = 0; i < template.points.length; i += 2) {
    points.push({ x: template.points[i], y: template.points[i + 1] });
  }
  return { name: template.name, points };
});

function mutateCircuit(template, rng) {
  const points = template.points;
  const n = points.length;

  const mirror = rng() < 0.5 ? -1 : 1;
  const rotation = rng() * TAU;
  const stretchX = 0.92 + rng() * 0.16;
  const stretchY = 0.92 + rng() * 0.16;
  const warpX = (rng() * 2 - 1) * 0.016;
  const warpX2 = (rng() * 2 - 1) * 0.008;
  const warpY = (rng() * 2 - 1) * 0.016;
  const warpY2 = (rng() * 2 - 1) * 0.008;
  const freq1 = 1 + Math.floor(rng() * 2);
  const freq2 = 2 + Math.floor(rng() * 2);
  const phase1 = rng() * TAU;
  const phase2 = rng() * TAU;
  const phase3 = rng() * TAU;
  const phase4 = rng() * TAU;

  // Normalised distance around the lap, used to place local bulges.
  const arc = new Float64Array(n);
  let total = 0;
  const seg = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    seg[i] = Math.hypot(b.x - a.x, b.y - a.y);
    total += seg[i];
  }
  let acc = 0;
  for (let i = 0; i < n; i++) {
    arc[i] = acc / total;
    acc += seg[i];
  }

  // One to three smooth bulges / pinches. These are what turn a familiar
  // circuit into a new one without breaking it into a scribble.
  const bumps = [];
  const bumpCount = 1 + Math.floor(rng() * 3);
  for (let k = 0; k < bumpCount; k++) {
    bumps.push({
      center: rng(),
      width: 0.045 + rng() * 0.06,
      amp: (rng() * 2 - 1) * (0.012 + rng() * 0.02)
    });
  }

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return points.map((point, i) => {
    let px = (point.x - 0.5) * mirror * stretchX;
    let py = (point.y - 0.5) * stretchY;

    px += warpX * Math.sin(TAU * freq1 * py + phase1)
      + warpX2 * Math.sin(TAU * freq2 * px + phase2);
    py += warpY * Math.sin(TAU * freq1 * px + phase3)
      + warpY2 * Math.sin(TAU * freq2 * py + phase4);

    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tl = Math.hypot(tx, ty) || 1;
    let offset = 0;
    for (const bump of bumps) {
      let d = Math.abs(arc[i] - bump.center);
      d = Math.min(d, 1 - d);
      offset += bump.amp * Math.exp(-(d * d) / (2 * bump.width * bump.width));
    }
    px += (-ty / tl) * offset;
    py += (tx / tl) * offset;

    const rx = px * cos - py * sin;
    const ry = px * sin + py * cos;
    return { x: 0.5 + rx, y: 0.5 + ry };
  });
}

function filletPolygon(verts, rng) {
  const n = verts.length;
  const corners = [];
  for (let i = 0; i < n; i++) {
    const a = verts[(i - 1 + n) % n];
    const b = verts[i];
    const c = verts[(i + 1) % n];
    const uBA = vUnit(vSub(a, b));
    const uBC = vUnit(vSub(c, b));
    // The angle between the two edges, always measured as the smaller of
    // the pair. Reflex corners (interior > 180°) still fillet on the
    // outside of the turn, so using the smaller angle keeps the radius
    // positive and the arc on the correct side.
    const phi = Math.acos(clamp(uBA.x * uBC.x + uBA.y * uBC.y, -1, 1));
    const edge = Math.min(vDist(a, b), vDist(b, c));
    // Tight corners need enough tangent to make a real hairpin; fast
    // sweepers need only a little so the main straight stays long.
    let frac;
    if (phi < 1.15) frac = 0.18 + rng() * 0.16;
    else if (phi > 2.05) frac = 0.07 + rng() * 0.09;
    else frac = 0.11 + rng() * 0.13;
    const tangent = Math.min(edge * frac, edge * 0.42);
    const radius = tangent * Math.tan(phi / 2);
    const bisector = vUnit({ x: uBA.x + uBC.x, y: uBA.y + uBC.y });
    const offset = radius / Math.sin(phi / 2);
    const center = { x: b.x + bisector.x * offset, y: b.y + bisector.y * offset };
    const p = { x: b.x + uBA.x * tangent, y: b.y + uBA.y * tangent };
    const q = { x: b.x + uBC.x * tangent, y: b.y + uBC.y * tangent };
    const aP = Math.atan2(p.y - center.y, p.x - center.x);
    const aQ = Math.atan2(q.y - center.y, q.x - center.x);
    let sweep = aQ - aP;
    while (sweep > Math.PI) sweep -= TAU;
    while (sweep < -Math.PI) sweep += TAU;
    corners.push({ p, q, center, radius, aP, sweep });
  }

  let pts = [];
  const straights = [];
  const pushArc = (corner, includeStart) => {
    const steps = Math.max(5, Math.ceil(Math.abs(corner.sweep) * corner.radius / 0.02));
    for (let k = includeStart ? 0 : 1; k <= steps; k++) {
      const ang = corner.aP + corner.sweep * (k / steps);
      pts.push({
        x: corner.center.x + Math.cos(ang) * corner.radius,
        y: corner.center.y + Math.sin(ang) * corner.radius
      });
    }
  };
  const pushLine = (from, to, includeEnd = true) => {
    const steps = Math.max(2, Math.ceil(vDist(from, to) / 0.03));
    const last = includeEnd ? steps : steps - 1;
    const startIdx = pts.length;
    for (let k = 1; k <= last; k++) {
      const t = k / steps;
      pts.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    }
    if (pts.length > startIdx) {
      straights.push({ start: startIdx, end: pts.length, length: vDist(from, to) });
    }
  };

  // Start on the entry tangent of the first corner; close the loop last.
  pushArc(corners[0], true);
  for (let i = 1; i < n; i++) {
    pushLine(corners[i - 1].q, corners[i].p);
    pushArc(corners[i], false);
  }
  pushLine(corners[n - 1].q, corners[0].p, false);

  // Put the start/finish line halfway down the longest straight.
  let best = straights[0];
  for (const s of straights) if (s.length > best.length) best = s;
  if (best) {
    const mid = best.start + Math.floor((best.end - best.start) / 2);
    if (mid > 0) pts = pts.slice(mid).concat(pts.slice(0, mid));
  }
  return pts;
}

function polygonLoop(rng) {
  if (!TRACK_TEMPLATES.length) return null;
  const template = TRACK_TEMPLATES[Math.floor(rng() * TRACK_TEMPLATES.length)];
  return mutateCircuit(template, rng);
}

function fitToCanvas(unitPts, width, height) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of unitPts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const pad = Math.min(width, height) * 0.075;
  const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
  const offX = (width - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = (height - (maxY - minY) * scale) / 2 - minY * scale;
  return unitPts.map((p) => ({ x: p.x * scale + offX, y: p.y * scale + offY }));
}

export function generateRandomTrack(width = 960, height = 540, seed = 0) {
  const safeW = Math.max(240, width);
  const safeH = Math.max(180, height);
  const baseSeed = (seed >>> 0) || ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  let fallback = null;

  for (let attempt = 0; attempt < 20; attempt++) {
    const attemptSeed = (baseSeed + Math.imul(attempt, 0x9e3779b9)) >>> 0;
    const rng = mulberry32(attemptSeed);
    const loop = polygonLoop(rng);
    if (!loop) continue;
    const points = fitToCanvas(loop, safeW, safeH);
    const preview = analyzePreview(points, { targetLength: 1900 });
    if (preview.valid && !fallback) fallback = { points, preview };

    if (!preview.valid) continue;
    if (preview.turns < 4 || preview.turns > 18) continue;
    if (preview.minRadius > 0 && preview.minRadius < 16) continue;
    if (recentTrackPrints.includes(trackFingerprint(preview.prepared))) continue;

    recentTrackPrints.push(trackFingerprint(preview.prepared));
    if (recentTrackPrints.length > 30) recentTrackPrints.shift();
    const named = trackNameFor(points);
    // Report the corner/straight numbers the built circuit will actually
    // have, not the cheaper preview estimate.
    const data = createTrackData(points, { targetLength: 1900 });
    if (data.valid) {
      preview.turns = data.turns;
      preview.longestStraight = data.longestStraight;
    }
    return {
      points,
      name: named.name,
      suffix: named.suffix,
      seed: named.seed,
      generatedSeed: attemptSeed,
      preview
    };
  }

  // Last resort: the first valid roll is still a unique, closed circuit
  // even when it missed a quality gate, so use it rather than an oval that
  // would look identical on every click.
  let pts = fallback?.points ?? null;
  if (!pts) {
    const rng = mulberry32((baseSeed ^ 0x7f4a7c15) >>> 0);
    const count = 6 + Math.floor(rng() * 3);
    const rot = rng() * TAU;
    const sx = 0.88 + rng() * 0.24;
    const sy = 0.88 + rng() * 0.24;
    const verts = [];
    for (let i = 0; i < count; i++) {
      const a = rot + (i / count) * TAU;
      verts.push({ x: Math.cos(a) * sx, y: Math.sin(a) * sy });
    }
    pts = fitToCanvas(filletPolygon(verts, rng), safeW, safeH);
  }
  const preview = pts === fallback?.points ? fallback.preview : analyzePreview(pts);
  const data = createTrackData(pts, { targetLength: 1900 });
  if (data.valid) {
    preview.turns = data.turns;
    preview.longestStraight = data.longestStraight;
  }
  recentTrackPrints.push(trackFingerprint(preview.prepared));
  if (recentTrackPrints.length > 30) recentTrackPrints.shift();
  const named = trackNameFor(pts);
  return { points: pts, name: named.name, suffix: named.suffix, seed: named.seed, preview };
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
  for (let i = 0; i < N; i++) {
    const idx = i;
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
  let straightStart = 0;
  while (straightStart < N && Math.abs(K[straightStart]) >= 1 / 260) straightStart++;
  if (straightStart < N) {
    let straightRun = 0;
    for (let k = 1; k <= N; k++) {
      const i = (straightStart + k) % N;
      if (Math.abs(K[i]) < 1 / 260) {
        straightRun += step;
        if (straightRun > straightBest) straightBest = straightRun;
      } else straightRun = 0;
    }
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
