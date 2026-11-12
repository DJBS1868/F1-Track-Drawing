import { analyzePreview, generateRandomTrack } from './track.js';
import { clamp } from './utils.js';

export const EXAMPLE_TRACKS = [
  {
    name: 'VELVET HARBOUR',
    points: [
      [0.50, 0.90], [0.60, 0.86], [0.70, 0.77], [0.76, 0.64], [0.73, 0.52],
      [0.79, 0.43], [0.90, 0.36], [0.91, 0.25], [0.83, 0.18], [0.70, 0.19],
      [0.60, 0.14], [0.47, 0.15], [0.34, 0.12], [0.21, 0.15], [0.12, 0.23],
      [0.10, 0.35], [0.18, 0.42], [0.13, 0.52], [0.08, 0.65], [0.13, 0.76],
      [0.26, 0.81], [0.37, 0.86]
    ]
  },
  {
    name: 'IRON RIDGE',
    points: [
      [0.48, 0.88], [0.62, 0.84], [0.70, 0.72], [0.69, 0.58], [0.62, 0.47],
      [0.68, 0.36], [0.82, 0.33], [0.90, 0.24], [0.86, 0.15], [0.72, 0.12],
      [0.58, 0.18], [0.47, 0.12], [0.33, 0.14], [0.22, 0.23], [0.24, 0.35],
      [0.34, 0.42], [0.30, 0.54], [0.18, 0.58], [0.10, 0.68], [0.13, 0.81],
      [0.26, 0.87], [0.37, 0.84]
    ]
  }
];

function orientation(a, b, c) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

export class DrawScreen {
  constructor(canvas, stage, callbacks = {}) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.points = [];
    this.analyzed = null;
    this.drawing = false;
    this.pointerId = null;
    this.hover = null;
    this.t = 0;
    this.raf = 0;
    this.active = false;
    this.history = [];
    this.exampleProgress = 0;
    this.exampleAnimating = false;
    this.examplePoints = null;
    this.lastRaw = null;

    this._onDown = this.onDown.bind(this);
    this._onMove = this.onMove.bind(this);
    this._onUp = this.onUp.bind(this);
    this._onResize = this.resize.bind(this);

    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
    canvas.addEventListener('pointerleave', () => { this.hover = null; });
    new ResizeObserver(this._onResize).observe(stage);
    this.resize();
  }

  start() {
    this.active = true;
    this.resize();
    const loop = (now) => {
      if (!this.active) return;
      this.t += 1 / 60;
      if (this.exampleAnimating) {
        this.exampleProgress = Math.min(1, this.exampleProgress + 0.018);
        if (this.exampleProgress >= 1) this.finishExample();
      }
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.active = false;
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const rect = this.stage.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const oldW = this.width || rect.width;
    const oldH = this.height || rect.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    if (oldW > 10 && oldH > 10 && (Math.abs(oldW - rect.width) > 2 || Math.abs(oldH - rect.height) > 2)) {
      const sx = rect.width / oldW;
      const sy = rect.height / oldH;
      this.points = this.points.map((p) => ({ x: p.x * sx, y: p.y * sy }));
      if (this.examplePoints) this.examplePoints = this.examplePoints.map((p) => ({ x: p.x * sx, y: p.y * sy }));
      if (this.points.length > 3) this.analyze();
    }
    this.render();
  }

  reset() {
    this.points = [];
    this.analyzed = null;
    this.drawing = false;
    this.exampleAnimating = false;
    this.examplePoints = null;
    this.stage.classList.remove('has-line', 'is-valid');
    this.cb.onChange?.(null);
  }

  undo() {
    if (this.drawing) return;
    if (this.points.length) {
      this.reset();
      this.cb.onNotice?.('Canvas cleared. Draw a new line.');
      return;
    }
    if (this.history.length) {
      const prev = this.history.pop();
      this.points = prev;
      this.analyze();
    }
  }

  clear() {
    if (this.points.length) this.history.push(this.points.map((p) => ({ ...p })));
    this.reset();
  }

  loadExample(index = 0) {
    const ex = EXAMPLE_TRACKS[index % EXAMPLE_TRACKS.length];
    const pad = Math.min(this.width, this.height) * 0.09;
    const w = this.width - pad * 2;
    const h = this.height - pad * 2;
    const points = ex.points.map(([x, y]) => ({ x: pad + x * w, y: pad + y * h }));
    this._loadInspiration(points, ex.name);
  }

  // Endless inspiration: a brand new, always-valid circuit every click.
  loadRandom() {
    const generated = generateRandomTrack(this.width, this.height);
    this._loadInspiration(generated.points, `${generated.name} · ${generated.suffix}`);
    return generated;
  }

  _loadInspiration(points, label) {
    this.reset();
    this.examplePoints = points.map((p) => ({ ...p }));
    this.exampleProgress = 0;
    this.exampleAnimating = true;
    this.stage.classList.add('has-line');
    this.cb.onNotice?.(`Loading ${label}…`);
  }

  finishExample() {
    this.exampleAnimating = false;
    this.points = this.examplePoints.map((p) => ({ ...p }));
    this.stage.classList.add('has-line');
    this.analyze();
    this.cb.onExampleDone?.(this.analyzed);
  }

  localPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  onDown(e) {
    if (!this.active) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const p = this.localPoint(e);
    if (p.x < 2 || p.y < 2 || p.x > this.width - 2 || p.y > this.height - 2) return;
    this.pointerId = e.pointerId;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.history.push(this.points.map((q) => ({ ...q })));
    if (this.history.length > 12) this.history.shift();
    this.points = [p];
    this.analyzed = null;
    this.drawing = true;
    this.exampleAnimating = false;
    this.stage.classList.add('has-line');
    this.stage.classList.remove('is-valid');
    this.cb.onChange?.(null);
    this.cb.onDrawStart?.();
  }

  onMove(e) {
    if (!this.active) return;
    const p = this.localPoint(e);
    this.hover = p;
    this.cb.onCoords?.(p);
    if (!this.drawing || e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const last = this.points[this.points.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1.4) {
      this.points.push(p);
      if (this.points.length > 2600) this.points.shift();
    }
  }

  onUp(e) {
    if (!this.drawing || (e.pointerId !== undefined && e.pointerId !== this.pointerId && e.type !== 'pointercancel')) return;
    this.drawing = false;
    this.pointerId = null;
    if (this.points.length > 4) {
      this.analyze();
    } else {
      this.reset();
      this.cb.onNotice?.('That was a dot. Draw a loop.');
    }
  }

  analyze() {
    const preview = analyzePreview(this.points, { targetLength: 1900 });
    this.analyzed = preview;
    this.lastRaw = this.points.map((p) => ({ ...p }));
    this.stage.classList.toggle('is-valid', preview.valid);
    this.cb.onChange?.(preview);
  }

  setEnabled(on) {
    this.canvas.style.pointerEvents = on ? 'auto' : 'none';
  }

  getResult() {
    return this.analyzed?.valid ? { points: this.lastRaw, preview: this.analyzed } : null;
  }

  /* ───────────────────────── rendering ───────────────────────── */
  render() {
    const ctx = this.ctx;
    if (!this.width || !this.height) return;
    const w = this.width, h = this.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // backdrop
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a0d12');
    bg.addColorStop(0.55, '#070a0e');
    bg.addColorStop(1, '#080b0f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * 0.82, h * 0.12, 0, w * 0.82, h * 0.12, Math.max(w, h) * 0.55);
    glow.addColorStop(0, 'rgba(255,77,31,.075)');
    glow.addColorStop(0.55, 'rgba(255,77,31,.015)');
    glow.addColorStop(1, 'rgba(255,77,31,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // blueprint grid
    const step = 28;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (w % step) / 2; x < w; x += step) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = (h % step) / 2; y < h; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.028)';
    ctx.stroke();

    // major grid
    ctx.beginPath();
    for (let x = (w % (step * 5)) / 2; x < w; x += step * 5) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = (h % (step * 5)) / 2; y < h; y += step * 5) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.stroke();

    // crosshair in centre
    ctx.strokeStyle = 'rgba(255,77,31,.16)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
    ctx.moveTo(w / 2 - 9, h / 2); ctx.lineTo(w / 2 + 9, h / 2);
    ctx.moveTo(w / 2, h / 2 - 9); ctx.lineTo(w / 2, h / 2 + 9);
    ctx.stroke();

    // vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (this.exampleAnimating && this.examplePoints) {
      this.drawExampleAnimation(ctx);
      return;
    }

    if (this.drawing) {
      this.drawLiveLine(ctx);
      return;
    }

    if (this.analyzed?.prepared?.length > 3) {
      this.drawCompleteLine(ctx, this.analyzed);
    } else if (this.points.length > 1) {
      this.drawLiveLine(ctx, true);
    } else {
      this.drawGhost(ctx);
    }

    if (this.hover && !this.drawing) {
      this.drawCursor(ctx);
    }
  }

  drawGhost(ctx) {
    // faint suggestion arc
    ctx.save();
    ctx.translate(this.width * 0.5, this.height * 0.5);
    ctx.strokeStyle = 'rgba(243,239,229,.05)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 9]);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.min(this.width, this.height) * 0.32, Math.min(this.width, this.height) * 0.22, -0.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawLiveLine(ctx, finished = false) {
    const pts = this.points;
    if (pts.length < 2) {
      if (pts.length) {
        ctx.fillStyle = '#ff4d1f';
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    // preview closure hint
    if (!finished && pts.length > 8) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 26) {
        ctx.save();
        ctx.setLineDash([2, 8]);
        ctx.strokeStyle = 'rgba(243,239,229,.22)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
        ctx.restore();
      }
      // orbiting start marker
      ctx.save();
      ctx.strokeStyle = 'rgba(255,77,31,.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 8 + Math.sin(this.t * 4) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff4d1f';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,77,31,.8)';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = 'rgba(255,77,31,.55)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
    }
    ctx.stroke();

    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#f3efe5';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();

    // pen head
    const head = pts[pts.length - 1];
    ctx.save();
    ctx.fillStyle = '#f3efe5';
    ctx.shadowColor = '#ff4d1f';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCompleteLine(ctx, preview) {
    const pts = preview.prepared;
    const valid = preview.valid;
    const color = valid ? '#f3efe5' : '#ff6b5c';
    const glowCol = valid ? 'rgba(255,77,31,.55)' : 'rgba(255,80,70,.45)';

    // road ribbon shadow
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const path = new Path2D();
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
    path.closePath();

    ctx.shadowColor = glowCol;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = valid ? 'rgba(255,77,31,.18)' : 'rgba(255,70,60,.16)';
    ctx.lineWidth = 21;
    ctx.stroke(path);

    ctx.shadowBlur = 16;
    ctx.strokeStyle = valid ? 'rgba(255,77,31,.65)' : 'rgba(255,80,70,.55)';
    ctx.lineWidth = 8;
    ctx.stroke(path);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#090b0e';
    ctx.lineWidth = 4.2;
    ctx.stroke(path);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.stroke(path);

    // animated direction dashes
    ctx.setLineDash([2, 30]);
    ctx.lineDashOffset = -this.t * 42;
    ctx.strokeStyle = valid ? 'rgba(255,77,31,.9)' : 'rgba(255,90,80,.8)';
    ctx.lineWidth = 2;
    ctx.stroke(path);
    ctx.restore();

    // sector markers
    if (valid) {
      const n = pts.length;
      for (let s = 1; s <= 3; s++) {
        const p = pts[Math.floor((n * s) / 4)];
        const q = pts[Math.min(n - 1, Math.floor((n * s) / 4) + 2)];
        ctx.save();
        ctx.fillStyle = 'rgba(10,12,15,.9)';
        ctx.strokeStyle = 'rgba(255,77,31,.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(243,239,229,.75)';
        ctx.font = '600 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`S${s}`, p.x, p.y + 0.5);
        ctx.restore();
        void q;
      }
    }

    this.drawStartMarker(ctx, pts, valid);

    if (!valid) {
      const mid = pts[Math.floor(pts.length / 2)];
      ctx.save();
      ctx.fillStyle = 'rgba(255,80,70,.95)';
      ctx.font = '700 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SELF-INTERSECTION', mid.x, mid.y - 24);
      ctx.restore();
    }

    // corner count dots
    if (valid) {
      const step = Math.max(1, Math.floor(pts.length / 10));
      for (let i = 0; i < pts.length; i += step) {
        const p = pts[i];
        ctx.fillStyle = 'rgba(243,239,229,.22)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawStartMarker(ctx, pts, valid) {
    const a = pts[0];
    const b = pts[2] || pts[1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    const size = 15;
    const cells = 3;
    const cell = size / cells;
    ctx.globalAlpha = valid ? 1 : 0.5;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#f3efe5' : '#11151a';
        ctx.fillRect(-size / 2 + x * cell, -size / 2 + y * cell, cell, cell);
      }
    }
    ctx.strokeStyle = valid ? '#ff4d1f' : '#ff6b5c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = valid ? 'rgba(255,77,31,.85)' : 'rgba(255,107,92,.7)';
    ctx.font = '600 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('START / FINISH', a.x + 13, a.y - 12);
    ctx.restore();
  }

  drawExampleAnimation(ctx) {
    const pts = this.examplePoints;
    const count = Math.max(2, Math.floor(pts.length * this.exampleProgress));
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255,77,31,.8)';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = 'rgba(255,77,31,.65)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < count; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#f3efe5';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    const head = pts[Math.max(0, count - 1)];
    ctx.fillStyle = '#f3efe5';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCursor(ctx) {
    const p = this.hover;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - 18, p.y); ctx.lineTo(p.x - 7, p.y);
    ctx.moveTo(p.x + 7, p.y); ctx.lineTo(p.x + 18, p.y);
    ctx.moveTo(p.x, p.y - 18); ctx.lineTo(p.x, p.y - 7);
    ctx.moveTo(p.x, p.y + 7); ctx.lineTo(p.x, p.y + 18);
    ctx.stroke();
    ctx.restore();
  }
}
