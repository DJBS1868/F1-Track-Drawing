import * as THREE from '../vendor/three.module.js';
import {
  clamp, lerp, damp, dampAngle, mulberry32, createCanvasTexture, makeTextCanvas, canvasTexture,
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

function cityGroundTexture() {
  return createCanvasTexture([512, 512], (ctx, w, h) => {
    noiseFill(ctx, w, h, '#55585a', ['#4d5052', '#606264', '#515456', '#686a6b'], 7000, 1.8);
    ctx.strokeStyle = 'rgba(25,27,29,.42)';
    ctx.lineWidth = 3;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(205,196,170,.26)';
    ctx.lineWidth = 2;
    for (let x = 16; x < w; x += 128) {
      ctx.setLineDash([12, 12]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.setLineDash([]);
  }, { repeat: [72, 72] });
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
  // A packed row of fans for one terrace riser. Bodies run almost the full
  // height of the strip so the colours read from a moving car instead of
  // collapsing into a thin dotted line.
  return createCanvasTexture([512, 128], (ctx, w, h) => {
    const backdrop = ctx.createLinearGradient(0, 0, 0, h);
    backdrop.addColorStop(0, '#171b21');
    backdrop.addColorStop(1, '#0c0f13');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, w, h);

    // Seat backs behind the fans.
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    for (let y = 16; y < h; y += 19) ctx.fillRect(0, y, w, 2);

    // Concrete aisle with steps, drawn twice once the texture tiles.
    const aisleX = 250;
    ctx.fillStyle = '#2c3036';
    ctx.fillRect(aisleX, 0, 16, h);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    for (let y = 8; y < h; y += 11) ctx.fillRect(aisleX + 1, y, 14, 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(aisleX, 0, 2, h);
    ctx.fillRect(aisleX + 14, 0, 2, h);

    const shirts = [
      '#e0d8c6', '#c23a30', '#3d78a8', '#e0a83c', '#2f7d55', '#d6d6d6',
      '#803c67', '#e2672b', '#5c7fa6', '#f0d34a', '#8b2f24', '#26313d',
      '#b8452f', '#4b9a8a', '#ef8c3a', '#f1e6cf'
    ];
    const skins = ['#e8b48f', '#c58c63', '#8d5a3b', '#f0c9a6', '#6b432d'];
    const hats = ['#c23a30', '#e0a83c', '#2f7d55', '#3d78a8', '#f3efe5', '#26313d'];

    for (let x = 8; x < w - 4; x += 11 + Math.random() * 4.5) {
      if (x > aisleX - 10 && x < aisleX + 21) continue;
      const headY = 23 + (Math.random() - 0.5) * 8;
      const shirt = shirts[(Math.random() * shirts.length) | 0];
      const skin = skins[(Math.random() * skins.length) | 0];
      const bodyW = 8.5 + Math.random() * 3;
      const bodyTop = headY + 4;

      // Torso and shoulders, outlined so individual fans stay legible.
      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.roundRect(x - bodyW * 0.5, bodyTop, bodyW, 58, 2.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(6,8,10,.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      // Arms: one raised for a good part of the crowd.
      ctx.fillStyle = shirt;
      const raised = Math.random() < 0.2;
      ctx.fillRect(x - bodyW * 0.5 - 2.4, bodyTop + 4, 3.1, raised ? 20 : 28);
      ctx.fillRect(x + bodyW * 0.5 - 0.7, bodyTop + 4, 3.1, raised ? 30 : 28);
      if (raised) {
        ctx.strokeStyle = skin;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(x + bodyW * 0.5 + 0.8, bodyTop + 6);
        ctx.lineTo(x + bodyW * 0.5 + 5.2, headY - 13);
        ctx.stroke();
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(x + bodyW * 0.5 + 5.4, headY - 14.5, 1.9, 0, TAU);
        ctx.fill();
      }

      // Head with optional cap or bucket hat.
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(x, headY, 4.6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(6,8,10,.55)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      if (Math.random() < 0.26) {
        const hat = hats[(Math.random() * hats.length) | 0];
        ctx.fillStyle = hat;
        ctx.beginPath();
        ctx.arc(x, headY - 1.6, 4.8, Math.PI, TAU);
        ctx.fill();
        ctx.fillRect(x - 5.9, headY - 2.1, 11.8, 1.9);
      }

      // Dark trousers below the torso.
      ctx.fillStyle = Math.random() < 0.45 ? '#22262c' : '#34383e';
      ctx.fillRect(x - bodyW * 0.46, bodyTop + 52, bodyW * 0.92, 26);

      // Scarves, flags and the odd phone screen above the heads.
      if (Math.random() < 0.1) {
        ctx.fillStyle = shirts[(Math.random() * shirts.length) | 0];
        ctx.fillRect(x + 4.2, headY - 20, 2.2, 16);
      }
      if (Math.random() < 0.08) {
        ctx.fillStyle = 'rgba(230,240,255,.9)';
        ctx.fillRect(x - bodyW * 0.5 - 1.5, bodyTop + 16, 2.4, 3.4);
      }
    }

    // Roof shadow across the top and seat shadow at the bottom.
    const topShade = ctx.createLinearGradient(0, 0, 0, 20);
    topShade.addColorStop(0, 'rgba(6,8,10,.85)');
    topShade.addColorStop(1, 'rgba(6,8,10,0)');
    ctx.fillStyle = topShade;
    ctx.fillRect(0, 0, w, 20);
    const bottomShade = ctx.createLinearGradient(0, h - 18, 0, h);
    bottomShade.addColorStop(0, 'rgba(4,6,8,0)');
    bottomShade.addColorStop(1, 'rgba(4,6,8,.9)');
    ctx.fillStyle = bottomShade;
    ctx.fillRect(0, h - 18, w, 18);
  }, { repeat: [2, 1] });
}

function catchFenceTexture() {
  return createCanvasTexture([128, 128], (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(188,198,204,.85)';
    ctx.lineWidth = 1.4;
    for (let x = 0; x <= w; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,132,140,.9)';
    ctx.lineWidth = 2.6;
    ctx.strokeRect(0, 0, w, h);
  }, { repeat: [4, 2] });
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

function grandstandBannerTexture(text, sub = '') {
  // Wider than sponsorTexture so the trackside wall banner repeats as legible
  // sponsor panels instead of one stretched smear.
  return createCanvasTexture([1024, 128], (ctx, w, h) => {
    ctx.fillStyle = '#101216';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#191c22';
    for (let x = 0; x < w; x += 52) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.35);
      ctx.fillRect(0, -30, 10, 220);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,77,31,.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = '#f3efe5';
    ctx.font = '700 62px Rajdhani';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, 50);
    ctx.fillStyle = '#ff4d1f';
    ctx.font = '600 25px Rajdhani';
    ctx.fillText(sub, w / 2, 93);
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
  const isCity = options.scenery === 'city';
  const aiTeams = Array.isArray(options.aiTeams) ? options.aiTeams : [];
  const sunDir = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();
  const sunPos = sunDir.clone().multiplyScalar(620);
  const disposables = [];

  // Pit-lane dimensions are needed by the scenery pass (grandstand and tree
  // placement must leave the paddock clear) as well as by the pit builder.
  const PIT_ENTRY_LEAD = 190;
  const PIT_SPAN = 380;
  const PIT_ZONE_PAD = 42;

  scene.fog = new THREE.FogExp2(isCity ? 0xb9bec1 : 0xcfd9d8, isCity ? 0.00058 : 0.00072);

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
  const groundTex = isCity ? cityGroundTexture() : grassTexture();
  disposables.push(groundTex);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: isCity ? 0xbfc0bd : 0xb7b79a,
    roughness: 1,
    metalness: isCity ? 0.04 : 0
  });
  const groundSize = Math.max(3600, Math.max(track.bbox.width, track.bbox.depth) * 6);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundSize, groundSize), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(track.centerX, -0.03, track.centerZ);
  ground.receiveShadow = true;
  scene.add(ground);

  if (isCity) {
    const infieldShape = new THREE.Shape();
    const infieldStride = Math.max(1, Math.floor(track.N / 420));
    for (let i = 0; i < track.N; i += infieldStride) {
      const sample = track.samples[i];
      if (i === 0) infieldShape.moveTo(sample.x, -sample.z);
      else infieldShape.lineTo(sample.x, -sample.z);
    }
    infieldShape.closePath();
    const infieldTex = grassTexture();
    disposables.push(infieldTex);
    const infield = new THREE.Mesh(new THREE.ShapeGeometry(infieldShape), new THREE.MeshStandardMaterial({
      map: infieldTex, color: 0xb7b79a, roughness: 1
    }));
    infield.rotation.x = -Math.PI / 2;
    infield.position.y = -0.018;
    infield.receiveShadow = true;
    scene.add(infield);
  }

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

  // Grid boxes are built in main.js from the exact same poses the cars use,
  // so every car sits inside its own painted slot before the lights go out.

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
  const startPos = track.start;
  const nearStart = (x, z, r = 95) => Math.hypot(x - startPos.x, z - startPos.z) < r;
  const worldExtent = Math.max(track.bbox.width, track.bbox.depth) * 0.5 + 300;
  const roadPts = [];
  for (let i = 0; i < track.N; i += 2) roadPts.push(track.samples[i]);
  const circuitPolygon = [];
  const polygonStride = Math.max(1, Math.floor(track.N / 360));
  for (let i = 0; i < track.N; i += polygonStride) {
    const sample = track.samples[i];
    circuitPolygon.push({ x: sample.x, z: sample.z });
  }
  let circuitArea = 0;
  for (let i = 0; i < circuitPolygon.length; i++) {
    const a = circuitPolygon[i];
    const b = circuitPolygon[(i + 1) % circuitPolygon.length];
    circuitArea += a.x * b.z - b.x * a.z;
  }
  const outwardSide = circuitArea >= 0 ? 1 : -1;
  function insideCircuit(x, z) {
    let inside = false;
    for (let i = 0, j = circuitPolygon.length - 1; i < circuitPolygon.length; j = i++) {
      const a = circuitPolygon[i];
      const b = circuitPolygon[j];
      if ((a.z > z) !== (b.z > z)
        && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
    }
    return inside;
  }

  // Nearest point on the racing surface. Besides distance, this reports which
  // side of the road the point lies on and which part of the lap it is beside.
  function nearestRoad(x, z) {
    let best = Infinity;
    let bestP = roadPts[0];
    for (const p of roadPts) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < best) { best = d; bestP = p; }
    }
    const lateral = (x - bestP.x) * bestP.nx + (z - bestP.z) * bestP.nz;
    return { dist: Math.sqrt(best), p: bestP, lateral };
  }

  // The pit lane runs through the last PIT_ENTRY_LEAD metres of the lap and
  // the first PIT_SPAN - PIT_ENTRY_LEAD metres after the start line. Scenery
  // must leave that whole corridor (lane, boxes and garages) clear.
  function inPitZone(s) {
    const wrapped = ((s % track.length) + track.length) % track.length;
    return wrapped > track.length - PIT_ENTRY_LEAD - PIT_ZONE_PAD
      || wrapped < PIT_SPAN - PIT_ENTRY_LEAD + PIT_ZONE_PAD;
  }

  /* ── grandstand planning ─────────────────────────────────────── */
  // Every structure is checked against the whole circuit, not just its own
  // straight, so a stand can never land inside a hairpin or another stand.
  const standPlans = [];

  function standClearance(s, side, offset, width, depth) {
    let min = Infinity;
    const front = Math.max(11, offset - depth * 0.5);
    const back = offset + depth * 0.5;
    for (const d of [front, (front + back) * 0.5, back]) {
      for (let k = 0; k <= 6; k++) {
        const lx = -width * 0.5 + (width * k) / 6;
        const px = s.x + s.tx * lx + s.nx * side * d;
        const pz = s.z + s.tz * lx + s.nz * side * d;
        for (let i = 0; i < track.N; i += 2) {
          const q = track.samples[i];
          const dd = Math.hypot(q.x - px, q.z - pz);
          if (dd < min) min = dd;
        }
      }
    }
    return min;
  }

  function planGrandstand(index, width, depth, opts = {}) {
    const s = track.samples[((Math.round(index) % track.N) + track.N) % track.N];
    const sides = opts.side ? [opts.side] : [-1, 1];
    for (const side of sides) {
      // The pit side is occupied by the lane, pit boxes and garages.
      if (side > 0 && inPitZone(s.s)) continue;
      let offset = track.halfWidth + (opts.frontGap ?? 26) + depth * 0.5;
      for (let attempt = 0; attempt < 7; attempt++) {
        const clearance = standClearance(s, side, offset, width, depth);
        if (clearance >= (opts.minClearance ?? 15)) {
          const x = s.x + s.nx * side * offset;
          const z = s.z + s.nz * side * offset;
          const radius = Math.hypot(width * 0.5, depth * 0.5);
          const overlaps = standPlans.some((p) => (
            Math.hypot(p.x - x, p.z - z) < p.radius + radius + 10
          ));
          if (!overlaps) {
            const plan = {
              s, side, offset, width, depth, x, z, radius,
              style: opts.style || 'roof',
              label: opts.label || 'GRANDSTAND'
            };
            standPlans.push(plan);
            return plan;
          }
        }
        offset += 5 + Math.max(0, 20 - clearance);
      }
    }
    return null;
  }

  // Showpiece start-line stand on the non-pit side, a second start stand, then
  // a spread of trackside stands with varied widths and styles.
  planGrandstand(0, 68, 26, {
    side: -1, style: 'main', label: 'APEX INK GRANDSTAND',
    minClearance: 17, frontGap: 20
  });
  planGrandstand(-Math.round(118 / track.step), 38, 19, {
    side: -1, style: 'roof', frontGap: 23
  });
  planGrandstand(Math.round(112 / track.step), 32, 17, {
    side: -1, style: 'terrace', frontGap: 23
  });
  const standCount = clamp(Math.round(track.length / 240), 2, 6);
  for (let i = 0; i < standCount; i++) {
    const fraction = 0.17 + (i * 0.7) / Math.max(1, standCount - 1);
    const style = rng() < 0.26 ? 'terrace' : 'roof';
    planGrandstand(Math.round(fraction * track.N), 24 + rng() * 14, 17 + rng() * 5, { style });
  }

  const nearStand = (x, z, pad = 10) => standPlans.some((p) => (
    Math.hypot(p.x - x, p.z - z) < p.radius + pad
  ));

  const spot = (minRoad = 20, opts = {}) => {
    for (let tries = 0; tries < 90; tries++) {
      const ang = rng() * TAU;
      const rad = Math.sqrt(rng()) * worldExtent;
      const x = track.centerX + Math.cos(ang) * rad;
      const z = track.centerZ + Math.sin(ang) * rad;
      const isInside = insideCircuit(x, z);
      if (isCity && (opts.outside ? isInside : !isInside)) continue;
      const info = nearestRoad(x, z);
      if (info.dist < minRoad) continue;
      if (nearStart(x, z, opts.nearStartPad ?? 90)) continue;
      if (info.lateral > 0 && inPitZone(info.p.s) && info.dist < 58) continue;
      if (nearStand(x, z, opts.standPad ?? 10)) continue;
      return { x, z, info };
    }
    return null;
  };

  const vergeSpot = (minOffset, maxOffset, opts = {}) => {
    for (let tries = 0; tries < 70; tries++) {
      const s = track.samples[(rng() * track.N) | 0];
      const side = rng() < 0.5 ? -1 : 1;
      if (side > 0 && inPitZone(s.s)) continue;
      if (nearStart(s.x, s.z, opts.nearStartPad ?? 70)) continue;
      const off = minOffset + rng() * Math.max(0.1, maxOffset - minOffset);
      const x = s.x + s.nx * side * off;
      const z = s.z + s.nz * side * off;
      if (isCity && !insideCircuit(x, z)) continue;
      const info = nearestRoad(x, z);
      if (info.dist < minOffset - 2.5) continue;
      if (nearStand(x, z, 9)) continue;
      return { x, z, s, side, info };
    }
    return null;
  };

  const dummy = new THREE.Object3D();
  /* ── vegetation ──────────────────────────────────────────────── */
  const broadleafData = [];
  const coniferData = [];
  const shrubData = [];
  const flowerData = [];
  const grassData = [];
  const greenPalette = [
    0x3f5f2e, 0x4b7034, 0x35552a, 0x557c3b, 0x2f4b28,
    0x668c45, 0x486b30, 0x5f813c
  ];
  const pickGreen = () => greenPalette[(rng() * greenPalette.length) | 0];

  function addBroadleaf(x, z, boost = 1) {
    broadleafData.push({
      x, z,
      scale: (0.72 + rng() * 1.25) * boost,
      trunkH: (2.2 + rng() * 2.0) * boost,
      rot: rng() * TAU,
      color: pickGreen(),
      crown: 0.9 + rng() * 0.35
    });
  }

  function addConifer(x, z, boost = 1) {
    coniferData.push({
      x, z,
      scale: (0.65 + rng() * 0.9) * boost,
      height: (4.4 + rng() * 3.4) * boost,
      rot: rng() * TAU,
      color: pickGreen()
    });
  }

  function addShrub(x, z, scale, stretch = 1) {
    shrubData.push({ x, z, scale, stretch, rot: rng() * TAU, color: pickGreen() });
  }

  // 1. Tree lines down the verges. Deliberately dense so the circuit feels
  // carved through parkland instead of dropped on an empty field.
  const lineStep = Math.max(1, Math.round(23 / track.step));
  for (let i = 0; i < track.N; i += lineStep) {
    const s = track.samples[i];
    if (inPitZone(s.s)) continue;
    if (nearStart(s.x, s.z, 104)) continue;
    if (rng() < 0.26) continue;
    const side = rng() < 0.5 ? -1 : 1;
    const off = 18 + rng() * 15;
    const x = s.x + s.nx * side * off;
    const z = s.z + s.nz * side * off;
    if (isCity && !insideCircuit(x, z)) continue;
    if (nearestRoad(x, z).dist < 16) continue;
    if (nearStand(x, z, 10)) continue;
    if (rng() < 0.62) addBroadleaf(x, z, 0.9 + rng() * 0.35);
    else addConifer(x, z, 0.9 + rng() * 0.3);
    if (rng() < 0.42) {
      addShrub(x + (rng() - 0.5) * 7, z + (rng() - 0.5) * 7, 0.5 + rng() * 0.7);
    }
  }

  // 2. Woods and scrub filling the wider landscape.
  for (let i = 0; i < 520; i++) {
    const p = spot(22);
    if (!p) continue;
    if (rng() < 0.7) addBroadleaf(p.x, p.z, 0.9 + rng() * 0.7);
    else addConifer(p.x, p.z, 0.9 + rng() * 0.5);
  }
  for (let i = 0; i < 190; i++) {
    const p = spot(15);
    if (!p) continue;
    addShrub(p.x, p.z, 0.45 + rng() * 1.15, 1 + rng() * 0.9);
  }

  // 3. Hedgerow runs following some straights, set back beyond the run-off.
  for (let run = 0; run < 12; run++) {
    const startIdx = (rng() * track.N) | 0;
    const runStep = Math.max(1, Math.round(7 / track.step));
    const target = 6 + ((rng() * 14) | 0);
    let placed = 0;
    for (let k = 0; k < target * runStep; k += runStep) {
      const s = track.samples[(startIdx + k) % track.N];
      if (inPitZone(s.s) || nearStart(s.x, s.z, 90)) continue;
      const side = run % 2 === 0 ? -1 : 1;
      const off = 13.5 + rng() * 2.2;
      const x = s.x + s.nx * side * off;
      const z = s.z + s.nz * side * off;
      if (isCity && !insideCircuit(x, z)) continue;
      if (nearestRoad(x, z).dist < 12) continue;
      if (nearStand(x, z, 9)) continue;
      addShrub(x, z, 0.9 + rng() * 0.5, 1.5 + rng() * 0.9);
      placed++;
      if (placed >= target) break;
    }
  }

  // 3b. A broken low hedge follows the verge so the tree line does not read
  // as isolated specimens on open grass.
  const hedgeStep = Math.max(1, Math.round(11 / track.step));
  for (let i = 0; i < track.N; i += hedgeStep) {
    const s = track.samples[i];
    if (inPitZone(s.s) || nearStart(s.x, s.z, 110)) continue;
    for (const side of [-1, 1]) {
      if (rng() < 0.4) continue;
      const off = 13.5 + rng() * 4;
      const x = s.x + s.nx * side * off;
      const z = s.z + s.nz * side * off;
      if (isCity && !insideCircuit(x, z)) continue;
      if (nearestRoad(x, z).dist < 11.8) continue;
      if (nearStand(x, z, 8)) continue;
      addShrub(x, z, 0.35 + rng() * 0.55, 1.1 + rng() * 0.6);
    }
  }

  // 4. Wildflower patches and grass tufts close to the verges.
  const flowerColors = [0xf0d34a, 0xf3efe5, 0xe0604a, 0xa878d8, 0xf0a83c];
  for (let patch = 0; patch < 60; patch++) {
    const p = vergeSpot(12, 32);
    if (!p) continue;
    const color = flowerColors[(rng() * flowerColors.length) | 0];
    const n = 4 + ((rng() * 9) | 0);
    for (let k = 0; k < n; k++) {
      const x = p.x + (rng() - 0.5) * 7;
      const z = p.z + (rng() - 0.5) * 7;
      if (nearestRoad(x, z).dist < 10.5) continue;
      flowerData.push({ x, z, y: 0.16 + rng() * 0.16, scale: 0.5 + rng() * 0.9, color });
    }
  }
  // 4b. Landscaping around the grandstands: clipped hedges down the side
  // edges and flower beds along the front of the concourse.
  for (const plan of standPlans) {
    const yaw = standYaw(plan);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const toWorld = (lx, lz) => ({
      x: plan.x + lx * cos + lz * sin,
      z: plan.z - lx * sin + lz * cos
    });
    const halfW = plan.width * 0.5;
    const frontZ = plan.depth * 0.5;
    for (const lx of [-halfW - 7.4, halfW + 7.4]) {
      for (let lz = -frontZ - 2; lz <= frontZ + 5; lz += 3.3) {
        const w = toWorld(lx + (rng() - 0.5) * 1.2, lz);
        if (isCity && !insideCircuit(w.x, w.z)) continue;
        if (nearestRoad(w.x, w.z).dist < 13) continue;
        addShrub(w.x, w.z, 0.62 + rng() * 0.38, 1.4 + rng() * 0.5);
      }
    }
    for (const lx of [-halfW + 4.5, halfW - 4.5]) {
      const color = flowerColors[(rng() * flowerColors.length) | 0];
      for (let k = 0; k < 9; k++) {
        const w = toWorld(lx + (rng() - 0.5) * 6, frontZ + 11.4 + (rng() - 0.5) * 3);
        if (isCity && !insideCircuit(w.x, w.z)) continue;
        if (nearestRoad(w.x, w.z).dist < 12.5) continue;
        flowerData.push({
          x: w.x, z: w.z,
          y: 0.18 + rng() * 0.1,
          scale: 0.6 + rng() * 0.75,
          color
        });
      }
    }
  }

  for (let i = 0; i < 1500; i++) {
    const p = vergeSpot(10.5, 34);
    if (!p) continue;
    grassData.push({
      x: p.x, z: p.z,
      scale: 0.45 + rng() * 1.2,
      rot: rng() * TAU,
      lean: (rng() - 0.5) * 0.35,
      color: rng() < 0.24 ? 0x8b8a4c : pickGreen()
    });
  }

  // 5. Forest bands on the horizon so the world does not stop at the last tree.
  const forestCones = [];
  const forestRounds = [];
  const forestGreens = [0x2f4a2c, 0x355430, 0x2a4028, 0x3c5a33];
  const forestRadius = Math.max(320, Math.max(track.bbox.width, track.bbox.depth) * 0.72);
  if (!isCity) {
    for (let i = 0; i < 620; i++) {
      const ang = rng() * TAU;
      const rad = forestRadius + Math.sqrt(rng()) * 460;
      const x = track.centerX + Math.cos(ang) * rad;
      const z = track.centerZ + Math.sin(ang) * rad;
      if (nearestRoad(x, z).dist < 48) continue;
      const scale = 3.4 + rng() * 5.6;
      if (rng() < 0.7) {
        forestCones.push({
          x, z, scale,
          h: scale * (2.2 + rng() * 0.9),
          color: forestGreens[(rng() * forestGreens.length) | 0]
        });
      } else {
        forestRounds.push({ x, z, scale, color: pickGreen() });
      }
    }
  }

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4936, roughness: 0.95 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, flatShading: true });
  const treeTrunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1, 6);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const bushGeo = new THREE.IcosahedronGeometry(1, 0);
  const flowerGeo = new THREE.IcosahedronGeometry(1, 0);
  const grassGeo = new THREE.ConeGeometry(0.16, 0.72, 4);
  const coniferGeo = new THREE.ConeGeometry(1, 1, 7);
  const forestGeo = new THREE.ConeGeometry(1, 1, 5);
  const colorOf = (hex) => new THREE.Color(hex);

  // Broadleaf trunks and layered crowns.
  if (broadleafData.length) {
    const trunks = new THREE.InstancedMesh(treeTrunkGeo, trunkMat, broadleafData.length);
    broadleafData.forEach((t, i) => {
      dummy.position.set(t.x, t.trunkH * 0.5, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.set(t.scale, t.trunkH, t.scale);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
    });
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    scene.add(trunks);

    const crowns = new THREE.InstancedMesh(canopyGeo, canopyMat, broadleafData.length * 2);
    broadleafData.forEach((t, i) => {
      const c = colorOf(t.color);
      dummy.position.set(t.x, t.trunkH + 0.55 * t.scale, t.z);
      dummy.rotation.set(rng() * 0.25, rng() * TAU, rng() * 0.25);
      dummy.scale.set(1.55 * t.scale * t.crown, 1.35 * t.scale * t.crown, 1.55 * t.scale * t.crown);
      dummy.updateMatrix();
      crowns.setMatrixAt(i * 2, dummy.matrix);
      crowns.setColorAt(i * 2, c);

      dummy.position.set(
        t.x + (rng() - 0.5) * 0.9,
        t.trunkH + 1.75 * t.scale * t.crown,
        t.z + (rng() - 0.5) * 0.9
      );
      dummy.rotation.set(rng() * 0.4, rng() * TAU, rng() * 0.4);
      dummy.scale.set(1.0 * t.scale * t.crown, 1.05 * t.scale * t.crown, 1.0 * t.scale * t.crown);
      dummy.updateMatrix();
      crowns.setMatrixAt(i * 2 + 1, dummy.matrix);
      crowns.setColorAt(i * 2 + 1, c.clone().offsetHSL(0, 0.02, 0.035));
    });
    crowns.castShadow = true;
    crowns.receiveShadow = true;
    scene.add(crowns);
  }

  // Conifers: trunk plus three stacked skirts.
  if (coniferData.length) {
    const trunks = new THREE.InstancedMesh(treeTrunkGeo, trunkMat, coniferData.length);
    coniferData.forEach((t, i) => {
      dummy.position.set(t.x, 1.1, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.set(t.scale * 0.75, 2.2, t.scale * 0.75);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
    });
    trunks.castShadow = true;
    scene.add(trunks);

    const layers = [
      { y: 0.2, r: 1.75, h: 0.62 },
      { y: 0.52, r: 1.25, h: 0.56 },
      { y: 0.8, r: 0.8, h: 0.48 }
    ];
    for (const layer of layers) {
      const mesh = new THREE.InstancedMesh(coniferGeo, canopyMat, coniferData.length);
      coniferData.forEach((t, i) => {
        dummy.position.set(t.x, 1.2 + t.height * layer.y, t.z);
        dummy.rotation.set(0, t.rot, 0);
        dummy.scale.set(t.scale * layer.r, t.height * layer.h, t.scale * layer.r);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, colorOf(t.color).offsetHSL(0, 0, layer.y * 0.03));
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }

  // Shrubs and hedges.
  if (shrubData.length) {
    const bushes = new THREE.InstancedMesh(bushGeo, canopyMat, shrubData.length);
    shrubData.forEach((b, i) => {
      dummy.position.set(b.x, 0.42 * b.scale, b.z);
      dummy.rotation.set(0, b.rot, 0);
      dummy.scale.set(b.scale * 1.3 * b.stretch, b.scale * 0.8, b.scale * 1.15);
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
      bushes.setColorAt(i, colorOf(b.color));
    });
    bushes.castShadow = true;
    bushes.receiveShadow = true;
    scene.add(bushes);
  }

  // Wildflowers.
  if (flowerData.length) {
    const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.85, emissive: 0x1a1508, emissiveIntensity: 0.5
    }), flowerData.length);
    flowerData.forEach((f, i) => {
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(0, rng() * TAU, 0);
      dummy.scale.setScalar(0.12 * f.scale);
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
      flowers.setColorAt(i, colorOf(f.color));
    });
    scene.add(flowers);
  }

  // Grass tufts.
  if (grassData.length) {
    const tufts = new THREE.InstancedMesh(grassGeo, new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.95, flatShading: true
    }), grassData.length);
    grassData.forEach((g, i) => {
      dummy.position.set(g.x, 0.34 * g.scale, g.z);
      dummy.rotation.set(g.lean, g.rot, g.lean * 0.6);
      dummy.scale.set(g.scale, g.scale, g.scale);
      dummy.updateMatrix();
      tufts.setMatrixAt(i, dummy.matrix);
      tufts.setColorAt(i, colorOf(g.color));
    });
    scene.add(tufts);
  }

  // Distant forest silhouettes.
  if (forestCones.length) {
    const mesh = new THREE.InstancedMesh(forestGeo, canopyMat, forestCones.length);
    forestCones.forEach((t, i) => {
      dummy.position.set(t.x, t.h * 0.5, t.z);
      dummy.rotation.set(0, rng() * TAU, 0);
      dummy.scale.set(t.scale, t.h, t.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, colorOf(t.color));
    });
    scene.add(mesh);
  }
  if (forestRounds.length) {
    const mesh = new THREE.InstancedMesh(canopyGeo, canopyMat, forestRounds.length);
    forestRounds.forEach((t, i) => {
      dummy.position.set(t.x, t.scale * 1.4, t.z);
      dummy.rotation.set(0, rng() * TAU, 0);
      dummy.scale.set(t.scale * 1.5, t.scale * 1.3, t.scale * 1.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, colorOf(t.color));
    });
    scene.add(mesh);
  }

  if (!isCity) {
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
  }

  if (isCity) {
    /* ── city blocks and trackside fencing ─────────────────────── */
    const fencePosts = [];
    const fenceRails = [];
    const fenceStep = Math.max(1, Math.round(10 / track.step));
    const fenceOffset = track.halfWidth + 15;
    for (let i = 0; i < track.N; i += fenceStep) {
      const next = (i + fenceStep) % track.N;
      const a = track.samples[i];
      const b = track.samples[next];
      if (inPitZone(a.s) || inPitZone(b.s) || nearStart(a.x, a.z, 118) || nearStart(b.x, b.z, 118)) continue;
      for (const side of [-1, 1]) {
        const ax = a.x + a.nx * side * fenceOffset;
        const az = a.z + a.nz * side * fenceOffset;
        const bx = b.x + b.nx * side * fenceOffset;
        const bz = b.z + b.nz * side * fenceOffset;
        const midX = (ax + bx) * 0.5;
        const midZ = (az + bz) * 0.5;
        if (nearStand(midX, midZ, 5) || Math.hypot(bx - ax, bz - az) > 16) continue;
        const length = Math.hypot(bx - ax, bz - az);
        const yaw = -Math.atan2(bz - az, bx - ax);
        fencePosts.push({ x: ax, z: az }, { x: bx, z: bz });
        fenceRails.push({ x: midX, z: midZ, y: 0.78, length, yaw });
        fenceRails.push({ x: midX, z: midZ, y: 1.58, length, yaw });
      }
    }
    const fencePostMat = new THREE.MeshStandardMaterial({ color: 0x343b40, roughness: 0.72, metalness: 0.58 });
    const fenceRailMat = new THREE.MeshStandardMaterial({ color: 0x92999b, roughness: 0.62, metalness: 0.56 });
    if (fencePosts.length) {
      const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 2.05, 0.18), fencePostMat, fencePosts.length);
      fencePosts.forEach((p, i) => {
        dummy.position.set(p.x, 1.02, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(i, dummy.matrix);
      });
      posts.castShadow = true;
      scene.add(posts);
    }
    if (fenceRails.length) {
      const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.11, 0.1), fenceRailMat, fenceRails.length);
      fenceRails.forEach((r, i) => {
        dummy.position.set(r.x, r.y, r.z);
        dummy.rotation.set(0, r.yaw, 0);
        dummy.scale.set(r.length, 1, 1);
        dummy.updateMatrix();
        rails.setMatrixAt(i, dummy.matrix);
      });
      rails.castShadow = true;
      scene.add(rails);
    }

    // A continuous perimeter wall sits well behind the grandstands. Its height
    // leaves the outer city skyline visible above it without crowding the track.
    const wallSegments = [];
    const wallOffset = track.halfWidth + 105;
    const wallStep = Math.max(1, Math.round(9 / track.step));
    for (let i = 0; i < track.N; i += wallStep) {
      const next = (i + wallStep) % track.N;
      const a = track.samples[i];
      const b = track.samples[next];
      const ax = a.x + a.nx * outwardSide * wallOffset;
      const az = a.z + a.nz * outwardSide * wallOffset;
      const bx = b.x + b.nx * outwardSide * wallOffset;
      const bz = b.z + b.nz * outwardSide * wallOffset;
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 0.1) continue;
      wallSegments.push({
        x: (ax + bx) * 0.5,
        z: (az + bz) * 0.5,
        length: length + 1.4,
        yaw: -Math.atan2(bz - az, bx - ax)
      });
    }
    const perimeterWall = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 8.5, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x777a78, roughness: 0.94 }),
      wallSegments.length
    );
    wallSegments.forEach((wall, i) => {
      dummy.position.set(wall.x, 4.25, wall.z);
      dummy.rotation.set(0, wall.yaw, 0);
      dummy.scale.set(wall.length, 1, 1);
      dummy.updateMatrix();
      perimeterWall.setMatrixAt(i, dummy.matrix);
    });
    perimeterWall.castShadow = true;
    perimeterWall.receiveShadow = true;
    scene.add(perimeterWall);

    const buildingPalette = [0x777b7d, 0x96928a, 0x60696d, 0xb0a99b, 0x747478, 0x8e9897, 0x5e626a];
    const buildings = [];
    for (let tries = 0; tries < 700 && buildings.length < 105; tries++) {
      const p = spot(track.halfWidth + 125, { outside: true, nearStartPad: 145, standPad: 30 });
      if (!p) continue;
      const width = 13 + rng() * 22;
      const depth = 12 + rng() * 20;
      const radius = Math.hypot(width, depth) * 0.5;
      if (buildings.some((b) => Math.hypot(b.x - p.x, b.z - p.z) < b.radius + radius + 8)) continue;
      buildings.push({
        x: p.x, z: p.z, width, depth, radius,
        height: 14 + Math.pow(rng(), 0.72) * 62,
        yaw: (rng() - 0.5) * 0.28,
        color: buildingPalette[(rng() * buildingPalette.length) | 0]
      });
    }
    if (buildings.length) {
      const blockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.08 });
      const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), blockMat, buildings.length);
      const windowRecords = [];
      buildings.forEach((b, i) => {
        dummy.position.set(b.x, b.height * 0.5, b.z);
        dummy.rotation.set(0, b.yaw, 0);
        dummy.scale.set(b.width, b.height, b.depth);
        dummy.updateMatrix();
        blocks.setMatrixAt(i, dummy.matrix);
        blocks.setColorAt(i, new THREE.Color(b.color));
        const cols = Math.max(2, Math.floor(b.width / 4.2));
        const rows = Math.max(2, Math.floor((b.height - 3) / 4.6));
        for (let row = 0; row < rows; row++) {
          const y = 2.8 + row * 4.4;
          if (y > b.height - 1.5) break;
          for (let col = 0; col < cols; col++) {
            const lx = -b.width * 0.5 + ((col + 0.5) * b.width) / cols;
            const front = new THREE.Vector3(lx, 0, b.depth * 0.5 + 0.025).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
            windowRecords.push({ x: b.x + front.x, y, z: b.z + front.z, yaw: b.yaw });
            const back = new THREE.Vector3(lx, 0, -b.depth * 0.5 - 0.025).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
            windowRecords.push({ x: b.x + back.x, y, z: b.z + back.z, yaw: b.yaw + Math.PI });
          }
          const sideCols = Math.max(2, Math.floor(b.depth / 4.2));
          for (let col = 0; col < sideCols; col++) {
            const lz = -b.depth * 0.5 + ((col + 0.5) * b.depth) / sideCols;
            const right = new THREE.Vector3(b.width * 0.5 + 0.025, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
            windowRecords.push({ x: b.x + right.x, y, z: b.z + right.z, yaw: b.yaw + Math.PI / 2 });
            const left = new THREE.Vector3(-b.width * 0.5 - 0.025, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
            windowRecords.push({ x: b.x + left.x, y, z: b.z + left.z, yaw: b.yaw - Math.PI / 2 });
          }
        }
      });
      blocks.castShadow = true;
      blocks.receiveShadow = true;
      scene.add(blocks);
      if (windowRecords.length) {
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x9fc1c8, emissive: 0x354b50, emissiveIntensity: 0.35,
          roughness: 0.28, metalness: 0.35, side: THREE.DoubleSide
        });
        const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.25, 1.65), glassMat, windowRecords.length);
        windowRecords.forEach((w, i) => {
          dummy.position.set(w.x, w.y, w.z);
          dummy.rotation.set(0, w.yaw, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          windows.setMatrixAt(i, dummy.matrix);
        });
        scene.add(windows);
      }
    }
  }

  /* ── grandstands ─────────────────────────────────────────────── */
  const crowdTex = crowdTexture();
  disposables.push(crowdTex);
  const crowdRowMat = new THREE.MeshStandardMaterial({
    map: crowdTex, roughness: 0.88, side: THREE.DoubleSide,
    emissive: 0xffffff, emissiveMap: crowdTex, emissiveIntensity: 0.14
  });
  const standConcrete = new THREE.MeshStandardMaterial({ color: 0x9b978c, roughness: 0.9 });
  const standConcourse = new THREE.MeshStandardMaterial({ color: 0x8b8a83, roughness: 0.96 });
  const standDark = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.68, metalness: 0.35 });
  const standRoof = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.62, metalness: 0.2 });
  const standGlass = new THREE.MeshStandardMaterial({
    color: 0x1d2d36, roughness: 0.18, metalness: 0.65,
    emissive: 0x0d1a22, emissiveIntensity: 0.6
  });
  const standTrimMat = new THREE.MeshStandardMaterial({
    color: 0xff4d1f, roughness: 0.5, emissive: 0x3a0c02, emissiveIntensity: 0.45
  });
  const standLightMat = new THREE.MeshBasicMaterial({ color: 0xfff0cf });
  const bannerSponsors = [
    ['APEX INK', 'DRAW IT. RACE IT.'],
    ['REDLINE', 'PERFORMANCE INK'],
    ['V-MAX', 'AERODYNAMICS'],
    ['SLIPSTREAM', 'SOCIAL CLUB'],
    ['GRIP', 'ENGINEERED'],
    ['PACE', 'MOTORSPORT'],
    ['INK & ASPHALT', 'EST. 2026'],
    ['NO BRAKES', 'JUST BALLS']
  ];
  const flagPalette = [0xff4d1f, 0xf3efe5, 0x3d78a8, 0xe0a83c, 0x2f7d55, 0xc23a30];
  const wavingFlags = [];

  function addWaveFlag(parent, x, y, z, w, h, material, phase = rng() * TAU) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const poleH = h + 1.1;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, poleH, 6), standDark);
    pole.position.y = poleH * 0.5;
    pole.castShadow = true;
    pivot.add(pole);
    const flagPivot = new THREE.Group();
    flagPivot.position.y = poleH - h * 0.5;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    flag.position.x = w * 0.5;
    flag.castShadow = true;
    flagPivot.add(flag);
    pivot.add(flagPivot);
    parent.add(pivot);
    wavingFlags.push({ pivot: flagPivot, phase, speed: 2.2 + rng() * 1.7, baseYaw: 0 });
    return pivot;
  }

  function makeTent(accent) {
    const tent = new THREE.Group();
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xe9e4d8, roughness: 0.8, side: THREE.DoubleSide
    });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.5, 4), canopyMat);
    roof.position.y = 3.35;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    tent.add(roof);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 3.4), standDark);
    counter.position.y = 0.55;
    counter.castShadow = true;
    tent.add(counter);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.24, 3.44), new THREE.MeshStandardMaterial({
      color: accent, roughness: 0.55
    }));
    stripe.position.y = 1.16;
    tent.add(stripe);
    for (const sx of [-1.7, 1.7]) {
      for (const sz of [-1.35, 1.35]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.8, 0.09), standDark);
        post.position.set(sx, 1.5, sz);
        tent.add(post);
      }
    }
    return tent;
  }

  function standYaw(plan) {
    return Math.atan2(plan.s.tx, plan.s.tz) + (plan.side > 0 ? -Math.PI / 2 : Math.PI / 2);
  }

  function makeGrandstand(plan) {
    const { width, depth, style } = plan;
    const g = new THREE.Group();
    const rows = style === 'main' ? 7 : style === 'terrace' ? 4 : 5;
    const tierW = width - 4.2;
    const rowDepth = Math.max(1.7, (depth - 3.5) / rows);
    const frontZ = depth * 0.5;
    const baseH = 1.0;
    const rise = style === 'main' ? 1.02 : 0.92;
    const topY = baseH + rows * rise;
    const roofY = topY + 3.4;
    const hasRoof = style !== 'terrace';
    const accent = flagPalette[(rng() * flagPalette.length) | 0];

    // Scale the crowd strip to the stand: one texture tile per ~34 m keeps the
    // fans roughly the same size on a small terrace and the feature stand.
    const standCrowdMat = crowdRowMat.clone();
    standCrowdMat.map = crowdTex.clone();
    standCrowdMat.map.repeat.set(Math.max(1, Math.round(width / 34)), 1);
    standCrowdMat.map.needsUpdate = true;
    standCrowdMat.emissiveMap = standCrowdMat.map;
    disposables.push(standCrowdMat.map);

    // Paved concourse grounds the structure and gives spectators a walkway
    // between the stand and the track-side grass.
    const concourse = new THREE.Mesh(
      new THREE.BoxGeometry(width + 12, 0.14, depth + 14),
      standConcourse
    );
    concourse.position.set(0, 0.07, 3.5);
    concourse.receiveShadow = true;
    g.add(concourse);

    // Podium slab and low front wall. Keeping the wall below seat height lets
    // the front row of fans stay visible from a car.
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.7, depth), standConcrete);
    base.position.y = 0.42;
    base.receiveShadow = true;
    base.castShadow = true;
    g.add(base);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(width, 1.3, 0.55), standConcrete);
    frontWall.position.set(0, 0.79, frontZ + 0.28);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    g.add(frontWall);

    // Trackside sponsor panel on the front wall.
    const sponsor = bannerSponsors[(rng() * bannerSponsors.length) | 0];
    const bannerTex = grandstandBannerTexture(sponsor[0], sponsor[1]);
    bannerTex.repeat.set(Math.max(1, Math.round(width / 10)), 1);
    disposables.push(bannerTex);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 1.2, 1.05),
      new THREE.MeshStandardMaterial({
        map: bannerTex, roughness: 0.62,
        emissive: 0xffffff, emissiveMap: bannerTex, emissiveIntensity: 0.09
      })
    );
    banner.position.set(0, 0.72, frontZ + 0.58);
    g.add(banner);

    // Stepped terrace: each row steps up and back, with a tiled crowd strip on
    // its front face.
    for (let r = 0; r < rows; r++) {
      const y = baseH + r * rise;
      const z = frontZ - rowDepth * r;
      const platform = new THREE.Mesh(new THREE.BoxGeometry(tierW, 0.24, rowDepth + 0.1), standConcrete);
      platform.position.set(0, y, z - rowDepth * 0.5);
      platform.castShadow = true;
      platform.receiveShadow = true;
      g.add(platform);
      const riser = new THREE.Mesh(new THREE.BoxGeometry(tierW, rise, 0.14), standDark);
      riser.position.set(0, y + rise * 0.5, z + 0.02);
      g.add(riser);
      const crowdH = rise + 0.35;
      const crowd = new THREE.Mesh(new THREE.PlaneGeometry(tierW - 0.4, crowdH), standCrowdMat);
      crowd.position.set(0, y - 0.1 + crowdH * 0.5, z + 0.14);
      g.add(crowd);
    }

    // Side walls frame the seating and hide the ends of the terraces.
    for (const sx of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.42, topY + 0.8, depth), standConcrete);
      wall.position.set(sx * (width * 0.5 - 0.21), (topY + 0.8) * 0.5, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      g.add(wall);
      for (let r = 0; r < rows; r += 2) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, rowDepth * 0.7), standTrimMat);
        step.position.set(sx * (width * 0.5 + 0.04), baseH + r * rise + 0.05, frontZ - rowDepth * (r + 0.5));
        g.add(step);
      }
    }

    // Back wall / service block.
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, topY + 1.2, 0.7), standConcrete);
    backWall.position.set(0, (topY + 1.2) * 0.5, -frontZ + 0.35);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    g.add(backWall);
    const backBand = new THREE.Mesh(new THREE.BoxGeometry(width - 1.5, 0.4, 0.12), standTrimMat);
    backBand.position.set(0, topY + 0.55, -frontZ + 0.74);
    g.add(backBand);

    // Glass hospitality box for the feature stand.
    if (style === 'main') {
      const club = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, 3.4, 4.2), standGlass);
      club.position.set(0, roofY - 4.4, -frontZ + 2.6);
      club.castShadow = true;
      g.add(club);
      const clubBand = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5 + 0.4, 0.3, 4.5), standTrimMat);
      clubBand.position.set(0, roofY - 2.6, -frontZ + 2.6);
      g.add(clubBand);
    }

    let scoreScreen = null;
    if (hasRoof) {
      // Cantilevered roof with trusses and a lit leading edge.
      const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 5.5, 0.5, depth + 4.5), standRoof);
      roof.position.set(0, roofY, -0.9);
      roof.rotation.x = 0.045;
      roof.castShadow = true;
      g.add(roof);

      for (const x of [-width * 0.5 + 2, 0, width * 0.5 - 2]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.42, roofY, 0.42), standDark);
        col.position.set(x, roofY * 0.5, -frontZ + 1.1);
        col.castShadow = true;
        g.add(col);
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.16, roofY * 0.62, 0.16), standDark);
        brace.position.set(x, roofY * 0.53, -frontZ + 4.2);
        brace.rotation.x = -0.45;
        g.add(brace);
      }
      for (let b = 0; b < 4; b++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 5, 0.22, 0.26), standDark);
        beam.position.set(0, roofY - 0.34, -frontZ + 2 + b * (depth / 4));
        g.add(beam);
      }
      const lip = new THREE.Mesh(new THREE.BoxGeometry(width + 5.5, 0.28, 0.4), standTrimMat);
      lip.position.set(0, roofY - 0.16, frontZ + 1.9);
      g.add(lip);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(width + 2, 0.12, 0.24), standLightMat);
      strip.position.set(0, roofY - 0.42, frontZ + 1.4);
      g.add(strip);

      // Hanging fascia banner at the roof edge. Smaller stands tile a wide
      // banner so the sponsor name stays readable along the whole roof.
      const fasciaTex = style === 'main'
        ? sponsorTexture(sponsor[0], plan.label)
        : grandstandBannerTexture(sponsor[0], 'GRANDSTAND');
      if (style !== 'main') {
        fasciaTex.repeat.set(Math.max(1, Math.round((width + 4) / 12)), 1);
      }
      disposables.push(fasciaTex);
      const fascia = new THREE.Mesh(
        new THREE.PlaneGeometry(width + 4, 1.5),
        new THREE.MeshStandardMaterial({
          map: fasciaTex, roughness: 0.6, side: THREE.DoubleSide,
          emissive: 0xffffff, emissiveMap: fasciaTex, emissiveIntensity: 0.05
        })
      );
      fascia.position.set(0, roofY - 1.05, frontZ + 2.15);
      g.add(fascia);

      if (style === 'main') {
        // Big start-line scoreboard above the roof.
        const scoreTex = canvasTexture(makeTextCanvas(512, 192, (ctx, w, h) => {
          ctx.fillStyle = '#0b0e12';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#171b21';
          for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 2, h);
          ctx.strokeStyle = '#ff4d1f';
          ctx.lineWidth = 6;
          ctx.strokeRect(4, 4, w - 8, h - 8);
          ctx.fillStyle = '#f3efe5';
          ctx.font = '700 64px Rajdhani';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('APEX INK', w / 2, 62);
          ctx.fillStyle = '#ff4d1f';
          ctx.font = '600 30px Rajdhani';
          ctx.fillText('LIVE TIMING', w / 2, 116);
          ctx.fillStyle = '#8e949d';
          ctx.font = '600 22px Rajdhani';
          ctx.fillText('SECTOR 1  ·  LAP 1 / 3', w / 2, 156);
        }));
        disposables.push(scoreTex);
        const screen = new THREE.Mesh(
          new THREE.PlaneGeometry(17, 6.4),
          new THREE.MeshBasicMaterial({ map: scoreTex })
        );
        screen.position.set(0, roofY + 5.7, -1.2);
        screen.rotation.y = 0;
        g.add(screen);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(18.4, 7.6, 0.4), standDark);
        frame.position.set(0, roofY + 5.7, -1.45);
        g.add(frame);
        for (const x of [-6.2, 6.2]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.8, 0.35), standDark);
          post.position.set(x, roofY + 2.9, -1.6);
          post.castShadow = true;
          g.add(post);
        }
        scoreScreen = screen;
      }

      // Roof flags in the stand's accent colours, mounted on the front lip so
      // the poles stay visible from the track.
      for (const sx of [-1, 1]) {
        addWaveFlag(
          g,
          sx * (width * 0.5 - 1.2),
          roofY + 0.18,
          frontZ + 0.7,
          2.2, 1.3,
          new THREE.MeshStandardMaterial({
            color: flagPalette[(rng() * flagPalette.length) | 0],
            roughness: 0.8, side: THREE.DoubleSide
          })
        );
      }
    } else {
      // Open terrace: low back wall with rail and flags.
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.12), standTrimMat);
      rail.position.set(0, topY + 0.8, -frontZ + 0.4);
      g.add(rail);
      for (const sx of [-1, 1]) {
        addWaveFlag(
          g,
          sx * (width * 0.5 - 1.4),
          topY + 0.3,
          -frontZ + 0.7,
          1.8, 1.1,
          new THREE.MeshStandardMaterial({
            color: flagPalette[(rng() * flagPalette.length) | 0],
            roughness: 0.8, side: THREE.DoubleSide
          })
        );
      }
    }

    // A couple of hospitality tents behind the feature stand.
    if (style === 'main') {
      for (const tx of [-width * 0.5 + 9, width * 0.5 - 9]) {
        const tent = makeTent(accent);
        tent.position.set(tx, 0.05, -frontZ - 3.4);
        g.add(tent);
      }
    }

    g.position.set(plan.x, 0, plan.z);
    g.rotation.y = standYaw(plan);
    scene.add(g);
    return g;
  }

  for (const plan of standPlans) makeGrandstand(plan);

  /* ── pit lane, boxes and ten detailed team garages ───────────── */
  const pitSide = 1;
  const pitOffset = track.halfWidth + 8.2;
  const pitEntryLead = PIT_ENTRY_LEAD;
  const pitSpan = PIT_SPAN;
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
      yaw,
      crew: []
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

    // A lit team strip across the rear of the bay. The four tyre changers wait
    // inside the garage with a fresh tyre each, then deploy when their car is near.
    const bayStrip = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.14, 0.1), teamMat);
    bayStrip.position.set(0, 5.62, 4.02);
    g.add(bayStrip);

    // The pit box sits out on the apron, in front of the garage. In the
    // garage's local frame the box is at crewBoxZ, so the idle spots must stay
    // on the workshop floor (local z -4.05 .. 4.45) while the working spots
    // step out to the car's four corners.
    const crewBoxZ = PIT_BOX_LATERAL - GARAGE_LATERAL;
    const crewDefs = [
      { wheel: 'fl', ix: -3.35, iz: -1.9, tx: -1.63, tz: crewBoxZ - 0.86 - 0.75, yaw: 0 },
      { wheel: 'fr', ix: -3.35, iz: -0.3, tx: -1.63, tz: crewBoxZ + 0.86 + 0.75, yaw: Math.PI },
      { wheel: 'rl', ix: 3.35, iz: -1.9, tx: 1.56, tz: crewBoxZ - 0.84 - 0.75, yaw: 0 },
      { wheel: 'rr', ix: 3.35, iz: -0.3, tx: 1.56, tz: crewBoxZ + 0.84 + 0.75, yaw: Math.PI }
    ];
    for (let crewIndex = 0; crewIndex < crewDefs.length; crewIndex++) {
      const def = crewDefs[crewIndex];
      const crew = new THREE.Group();
      crew.name = `pit-crew-${team.number}-${def.wheel}`;
      const lean = (crewIndex % 2 === 0 ? 1 : -1) * 0.035;

      const legPivotA = new THREE.Group();
      legPivotA.position.set(-0.09, 0.62, 0);
      const legA = new THREE.Mesh(crewLegGeo, crewSuitMat);
      legA.position.y = -0.28;
      legPivotA.add(legA);
      const legPivotB = new THREE.Group();
      legPivotB.position.set(0.09, 0.62, 0);
      const legB = new THREE.Mesh(crewLegGeo, crewSuitMat);
      legB.position.y = -0.28;
      legPivotB.add(legB);

      const torso = new THREE.Mesh(crewTorsoGeo, crewSuitMat);
      torso.position.set(0, 0.96, 0);
      torso.rotation.z = lean;

      const armPivotA = new THREE.Group();
      armPivotA.position.set(-0.25, 1.2, 0.02);
      armPivotA.rotation.z = -0.09;
      const armA = new THREE.Mesh(crewArmGeo, crewSuitMat);
      armA.position.y = -0.26;
      armPivotA.add(armA);
      const armPivotB = new THREE.Group();
      armPivotB.position.set(0.25, 1.2, 0.02);
      armPivotB.rotation.z = 0.09;
      const armB = new THREE.Mesh(crewArmGeo, crewSuitMat);
      armB.position.y = -0.26;
      armPivotB.add(armB);

      const head = new THREE.Mesh(crewHeadGeo, crewSkinMat);
      head.position.set(0, 1.44, 0);
      const helmet = new THREE.Mesh(crewHelmetGeo, teamMat);
      helmet.position.set(0, 1.47, 0);
      // Each changer carries the fresh tyre for their own corner, held up in
      // front of the chest until that wheel is actually fitted.
      const carried = new THREE.Mesh(tyreGeo, tyreMat);
      carried.position.set(0, 0.76, 0.33);
      carried.rotation.x = Math.PI / 2;
      carried.scale.setScalar(0.82);
      crew.add(legPivotA, legPivotB, torso, armPivotA, armPivotB, head, helmet, carried);
      crew.traverse((child) => { if (child.isMesh) child.castShadow = true; });
      crew.position.set(def.ix, 0, def.iz);
      const idleYaw = Math.atan2(def.tx - def.ix, def.tz - def.iz);
      crew.rotation.y = idleYaw;
      g.add(crew);
      box.crew.push({
        wheel: def.wheel,
        group: crew,
        tyre: carried,
        legA: legPivotA,
        legB: legPivotB,
        armA: armPivotA,
        armB: armPivotB,
        torso,
        idle: { x: def.ix, z: def.iz, yaw: idleYaw },
        target: { x: def.tx, z: def.tz, yaw: def.yaw },
        x: def.ix,
        z: def.iz,
        walk: Math.random() * TAU,
        idleT: Math.random() * TAU,
        speed: 4.4 + Math.random() * 0.6
      });
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

  /* ── paddock support vehicles behind the garages ─────────────── */
  const truckBodyMat = new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.55, metalness: 0.15 });
  const truckGlassMat = new THREE.MeshStandardMaterial({ color: 0x1b252d, roughness: 0.18, metalness: 0.55 });
  const truckChassisMat = new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.7, metalness: 0.4 });
  const truckTyreMat = new THREE.MeshStandardMaterial({ color: 0x131416, roughness: 0.95 });
  const truckTyreGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 14);
  truckTyreGeo.rotateZ(Math.PI / 2);
  const truckTrailerGeo = new THREE.BoxGeometry(2.55, 2.75, 6.5);
  const truckCabGeo = new THREE.BoxGeometry(2.35, 1.95, 2.3);
  const truckGlassGeo = new THREE.BoxGeometry(2.05, 0.78, 0.08);
  const truckSillGeo = new THREE.BoxGeometry(2.6, 0.5, 6.6);

  function makeTeamTruck(team) {
    const truck = new THREE.Group();
    const stripe = new THREE.MeshStandardMaterial({
      color: team.color, roughness: 0.5, metalness: 0.22,
      emissive: team.color, emissiveIntensity: 0.08
    });
    const trailer = new THREE.Mesh(truckTrailerGeo, truckBodyMat);
    trailer.position.set(0, 2.05, 2.5);
    trailer.castShadow = true;
    trailer.receiveShadow = true;
    truck.add(trailer);
    const skirt = new THREE.Mesh(truckSillGeo, stripe);
    skirt.position.set(0, 0.95, 2.5);
    truck.add(skirt);
    const roofRail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 6.6), truckChassisMat);
    roofRail.position.set(0, 3.46, 2.5);
    truck.add(roofRail);
    const cab = new THREE.Mesh(truckCabGeo, truckBodyMat);
    cab.position.set(0, 1.55, -2.15);
    cab.castShadow = true;
    truck.add(cab);
    const windshield = new THREE.Mesh(truckGlassGeo, truckGlassMat);
    windshield.position.set(0, 1.92, -3.32);
    truck.add(windshield);
    const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(2.39, 0.34, 2.34), stripe);
    cabStripe.position.set(0, 0.98, -2.15);
    truck.add(cabStripe);
    for (const x of [-1.18, 1.18]) {
      for (const z of [0.1, 2.6, 4.6, -2.4]) {
        const wheel = new THREE.Mesh(truckTyreGeo, truckTyreMat);
        wheel.position.set(x, 0.48, z);
        wheel.castShadow = true;
        truck.add(wheel);
      }
    }
    return truck;
  }

  for (let i = 0; i < garages.length; i++) {
    const truck = makeTeamTruck(garageTeams[i]);
    truck.position.set(0, 0.02, 9.6);
    truck.rotation.y = rng() < 0.5 ? 0 : Math.PI;
    garages[i].add(truck);
  }

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
  const marshalHutMat = new THREE.MeshStandardMaterial({ color: 0xe3ded2, roughness: 0.8 });
  const marshalRoofMat = new THREE.MeshStandardMaterial({ color: 0xff4d1f, roughness: 0.6 });
  const marshalSuitMat = new THREE.MeshStandardMaterial({ color: 0xe06a1f, roughness: 0.75 });
  const marshalSkinMat = new THREE.MeshStandardMaterial({ color: 0xc08b66, roughness: 0.85 });
  const checkFlagMat = new THREE.MeshStandardMaterial({
    map: checkTex, side: THREE.DoubleSide, roughness: 0.9
  });
  for (let i = 0; i < 8; i++) {
    const idx = Math.round((i + 0.6) * track.N / 8) % track.N;
    const s = track.samples[idx];
    const side = i % 2 === 0 ? 1 : -1;
    const g = new THREE.Group();
    const hut = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 2.4), marshalHutMat);
    hut.position.y = 1.1;
    hut.castShadow = true;
    hut.receiveShadow = true;
    g.add(hut);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.22, 2.85), marshalRoofMat);
    roof.position.y = 2.3;
    roof.castShadow = true;
    g.add(roof);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x22323a, roughness: 0.2, metalness: 0.5,
      emissive: 0x142228, emissiveIntensity: 0.5
    });
    const window = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), windowMat);
    window.position.set(0, 1.45, -1.21);
    window.rotation.y = Math.PI;
    g.add(window);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.42), marshalHutMat);
    counter.position.set(0, 2.0, -1.35);
    g.add(counter);

    // Marshal figure watching the track.
    const marshal = new THREE.Group();
    const torso = new THREE.Mesh(crewTorsoGeo, marshalSuitMat);
    torso.position.y = 0.98;
    marshal.add(torso);
    const head = new THREE.Mesh(crewHeadGeo, marshalSkinMat);
    head.position.y = 1.48;
    marshal.add(head);
    const helmet = new THREE.Mesh(crewHelmetGeo, new THREE.MeshStandardMaterial({
      color: 0xf0c020, roughness: 0.6
    }));
    helmet.position.y = 1.5;
    marshal.add(helmet);
    marshal.position.set(2.65, 0, -0.3);
    marshal.rotation.y = side > 0 ? -0.6 : 0.6;
    g.add(marshal);

    // Extinguisher by the hut door.
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.62, 8), new THREE.MeshStandardMaterial({
      color: 0xb8231c, roughness: 0.5, metalness: 0.3
    }));
    bottle.position.set(-1.85, 0.31, -1.3);
    g.add(bottle);

    addWaveFlag(g, 1.7, 2.2, 0, 1.9, 1.2, checkFlagMat);
    addWaveFlag(g, -1.6, 2.2, 0, 1.4, 0.9, new THREE.MeshStandardMaterial({
      color: 0xe0a83c, roughness: 0.8, side: THREE.DoubleSide
    }));

    const offset = side * (track.halfWidth + 15);
    g.position.set(s.x + s.nx * offset, 0, s.z + s.nz * offset);
    g.rotation.y = Math.atan2(-side * s.nx, -side * s.nz);
    scene.add(g);
  }

  /* ── catch fencing around the gravel traps ───────────────────── */
  const fenceTex = catchFenceTexture();
  disposables.push(fenceTex);
  const fenceMat = new THREE.MeshStandardMaterial({
    map: fenceTex, color: 0x9aa4aa, roughness: 0.72, metalness: 0.3,
    transparent: true, alphaTest: 0.22, side: THREE.DoubleSide
  });
  const fencePanels = [];
  const fencePostData = [];
  const fenceStep = Math.max(1, Math.round(7.4 / track.step));
  for (let i = 0; i < track.N; i += fenceStep) {
    const s = track.samples[i];
    if (track.kerbFlags[i] !== 1) continue;
    if (Math.abs(s.k) < 1 / 125) continue;
    if (inPitZone(s.s)) continue;
    const side = s.k > 0 ? -1 : 1;
    const off = side * (track.halfWidth + 10.4);
    const x = s.x + s.nx * off;
    const z = s.z + s.nz * off;
    const yaw = Math.atan2(s.nx, s.nz);
    fencePanels.push({ x, z, yaw });
    for (const along of [-3.6, 3.6]) {
      fencePostData.push({
        x: x + s.tx * along,
        z: z + s.tz * along
      });
    }
  }
  if (fencePanels.length) {
    const panelGeo = new THREE.PlaneGeometry(7.8, 3.6);
    const panels = new THREE.InstancedMesh(panelGeo, fenceMat, fencePanels.length);
    fencePanels.forEach((p, i) => {
      dummy.position.set(p.x, 2.0, p.z);
      dummy.rotation.set(0, p.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      panels.setMatrixAt(i, dummy.matrix);
    });
    scene.add(panels);

    const postGeo = new THREE.BoxGeometry(0.1, 4.2, 0.1);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x6c747a, roughness: 0.5, metalness: 0.6 });
    const posts = new THREE.InstancedMesh(postGeo, postMat, fencePostData.length);
    fencePostData.forEach((p, i) => {
      dummy.position.set(p.x, 2.1, p.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
    });
    scene.add(posts);
  }

  /* ── distance boards on the run to the first corner ──────────── */
  for (const metres of [50, 100, 150, 200, 300]) {
    const idx = Math.round(metres / track.step) % track.N;
    const s = track.samples[idx];
    if (inPitZone(s.s)) continue;
    const tex = canvasTexture(makeTextCanvas(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#12151a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#f3efe5';
      ctx.lineWidth = 5;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#f3efe5';
      ctx.font = '700 72px Rajdhani';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(metres), w / 2, h / 2 - 12);
      ctx.fillStyle = '#ff4d1f';
      ctx.font = '600 22px Rajdhani';
      ctx.fillText('METRES', w / 2, h / 2 + 38);
    }));
    disposables.push(tex);
    const g = new THREE.Group();
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.25),
      new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.7, side: THREE.DoubleSide,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.05
      })
    );
    panel.position.y = 2.15;
    panel.rotation.y = Math.PI;
    g.add(panel);
    for (const px of [-0.95, 0.95]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.9, 0.1), boardFrameMat);
      post.position.set(px, 1.45, 0);
      g.add(post);
    }
    const off = -(track.halfWidth + 4.6);
    g.position.set(s.x + s.nx * off, 0, s.z + s.nz * off);
    g.rotation.y = Math.atan2(-s.tx, -s.tz) + Math.PI;
    scene.add(g);
  }

  /* ── floodlight masts ────────────────────────────────────────── */
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, emissive: 0xfff3d8, emissiveIntensity: 0.5, roughness: 0.4 });
  const glowTex = createCanvasTexture([128, 128], (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,246,220,.95)');
    grad.addColorStop(0.35, 'rgba(255,224,160,.28)');
    grad.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  disposables.push(glowTex);
  for (let i = 0; i < 4; i++) {
    const idx = Math.round((i + 0.2) * track.N / 4) % track.N;
    const s = track.samples[idx];
    const side = i % 2 === 0 ? 1 : -1;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 18, 8), metalMat);
    pole.position.y = 9;
    pole.castShadow = true;
    g.add(pole);
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 0.16), metalMat);
    crossbar.position.y = 17.4;
    g.add(crossbar);
    for (const lx of [-1.6, 0, 1.6]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.3), lampMat);
      lamp.position.set(lx, 17.8, 0);
      g.add(lamp);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    glow.position.set(0, 17.9, 0.2);
    glow.scale.set(6.5, 6.5, 1);
    g.add(glow);
    const offset = side * (track.halfWidth + 26);
    g.position.set(s.x + s.nx * offset, 0, s.z + s.nz * offset);
    g.rotation.y = Math.atan2(s.tx, s.tz) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    scene.add(g);
  }

  /* ── flag poles near start ───────────────────────────────────── */
  for (const [side, height, width] of [[-1, 11, 2.6], [1, 9, 2.2], [-1, 8, 2.0], [1, 12, 2.9]]) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, height, 8), matteMetal());
    pole.position.y = height * 0.5;
    g.add(pole);
    addWaveFlag(
      g, 0, height - 1.4, 0,
      width, width * 0.58,
      checkFlagMat,
      rng() * TAU
    );
    const offset = side * (track.halfWidth + 4.4 + (height > 10 ? 2.4 : 0));
    g.position.set(track.start.x + track.start.nx * offset, 0, track.start.z + track.start.nz * offset);
    g.rotation.y = Math.atan2(track.start.tx, track.start.tz) + Math.PI;
    scene.add(g);
  }

  function matteMetal() {
    return new THREE.MeshStandardMaterial({ color: 0x2b2e34, roughness: 0.45, metalness: 0.8 });
  }

  /* ── pit entry and exit gantries ─────────────────────────────── */
  const pitSignTextures = [
    { index: 3, label: 'PIT ENTRY', sub: '60 KM/H' },
    { index: pitRoute.length - 4, label: 'PIT EXIT', sub: 'MERGE WITH CARE' }
  ];
  for (const sign of pitSignTextures) {
    const route = pitRoute[Math.max(0, Math.min(pitRoute.length - 1, sign.index))];
    const g = new THREE.Group();
    const postH = 6.4;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, postH, 0.32), metalMat);
      post.position.set(side * (PIT_ROAD_HALF + 1.1), postH * 0.5, 0);
      post.castShadow = true;
      g.add(post);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), darkMetalMat);
      foot.position.set(side * (PIT_ROAD_HALF + 1.1), 0.15, 0);
      g.add(foot);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(PIT_ROAD_HALF * 2 + 2.9, 0.55, 0.55), metalMat);
    beam.position.y = postH;
    beam.castShadow = true;
    g.add(beam);
    const tex = canvasTexture(makeTextCanvas(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#12151a';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff4d1f';
      ctx.fillRect(0, 0, w, 9);
      ctx.fillRect(0, h - 9, w, 9);
      ctx.fillStyle = '#f3efe5';
      ctx.font = '700 58px Rajdhani';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign.label, w / 2, 52);
      ctx.fillStyle = '#e0a83c';
      ctx.font = '600 26px Rajdhani';
      ctx.fillText(sign.sub, w / 2, 98);
    }));
    disposables.push(tex);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(PIT_ROAD_HALF * 2 + 2.2, 1.55),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    panel.position.set(0, postH - 1.15, -0.32);
    panel.rotation.y = Math.PI;
    g.add(panel);
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(PIT_ROAD_HALF * 2 + 2.5, 1.9, 0.22),
      signMat
    );
    back.position.set(0, postH - 1.15, 0.05);
    g.add(back);
    g.position.set(route.x, 0, route.z);
    g.rotation.y = Math.atan2(route.tx, route.tz);
    scene.add(g);
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
      // Flags ripple around their poles; different phases keep the grandstands
      // from waving in lockstep.
      for (const f of wavingFlags) {
        f.pivot.rotation.y = f.baseYaw + Math.sin(t * f.speed + f.phase) * 0.22;
        f.pivot.scale.x = 1 + Math.sin(t * f.speed * 1.6 + f.phase) * 0.08;
      }
    },
    setStartLights(count) {
      startLights.forEach((mat, i) => {
        mat.emissiveIntensity = i < count ? 4.5 : 0.05;
      });
    },
    // Walk the chosen box's crew between their waiting spots inside the garage
    // and one tyre each at the box. Every team's crew can be driven this way, so
    // AI stops get the same treatment as the player's.
    updatePitCrew(dt, box = playerPitBox, deployed = false, working = false, fitted = null) {
      if (!box?.crew) return;
      const stepTime = Math.max(0, dt);
      for (const actor of box.crew) {
        // The fresh tyre stays in the changer's hands until that corner has
        // actually been fitted, then it is no longer carried.
        if (actor.tyre) actor.tyre.visible = fitted?.[actor.wheel] !== 'new';
        const goal = deployed ? actor.target : actor.idle;
        const dx = goal.x - actor.x;
        const dz = goal.z - actor.z;
        const dist = Math.hypot(dx, dz);
        const workPose = deployed && working && dist <= 0.012;
        if (dist > 0.012) {
          const step = Math.min(dist, actor.speed * stepTime);
          actor.x += (dx / dist) * step;
          actor.z += (dz / dist) * step;
          actor.walk += stepTime * 13;
          actor.group.position.set(actor.x, Math.abs(Math.sin(actor.walk)) * 0.035, actor.z);
          const walkYaw = Math.atan2(dx, dz);
          actor.group.rotation.y = dampAngle(actor.group.rotation.y, walkYaw, 14, stepTime);
          const swing = Math.sin(actor.walk) * 0.6;
          actor.legA.rotation.x = swing;
          actor.legB.rotation.x = -swing;
          actor.armA.rotation.x = -swing * 0.7;
          actor.armB.rotation.x = swing * 0.7;
          actor.torso.rotation.x = damp(actor.torso.rotation.x, 0.06, 10, stepTime);
        } else {
          actor.x = goal.x;
          actor.z = goal.z;
          actor.idleT += stepTime * (workPose ? 7 : 2.2);
          const crouch = workPose ? -0.15 : 0;
          const bob = Math.sin(actor.idleT) * (workPose ? 0.012 : 0.004);
          actor.group.position.set(actor.x, crouch + bob, actor.z);
          actor.group.rotation.y = dampAngle(actor.group.rotation.y, goal.yaw, 9, stepTime);
          actor.legA.rotation.x = damp(actor.legA.rotation.x, 0, 10, stepTime);
          actor.legB.rotation.x = damp(actor.legB.rotation.x, 0, 10, stepTime);
          const armTarget = workPose ? -1.05 : 0;
          actor.armA.rotation.x = damp(actor.armA.rotation.x, armTarget, 9, stepTime);
          actor.armB.rotation.x = damp(actor.armB.rotation.x, armTarget, 9, stepTime);
          actor.torso.rotation.x = damp(actor.torso.rotation.x, workPose ? 0.36 : 0, 8, stepTime);
        }
      }
    },
    resetPitCrew(box = playerPitBox) {
      if (!box?.crew) return;
      for (const actor of box.crew) {
        actor.x = actor.idle.x;
        actor.z = actor.idle.z;
        actor.walk = Math.random() * TAU;
        actor.idleT = Math.random() * TAU;
        actor.group.position.set(actor.x, 0, actor.z);
        actor.group.rotation.y = actor.idle.yaw;
        if (actor.tyre) actor.tyre.visible = true;
        actor.legA.rotation.x = 0;
        actor.legB.rotation.x = 0;
        actor.armA.rotation.x = 0;
        actor.armB.rotation.x = 0;
        actor.torso.rotation.x = 0;
      }
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
