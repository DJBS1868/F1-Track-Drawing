import * as THREE from '../vendor/three.module.js';
import { DrawScreen, EXAMPLE_TRACKS } from './draw.js';
import { createTrackData, analyzePreview, trackNameFor, TrackLocator, sampleAtDistance } from './track.js';
import { createCar, AI_TEAMS } from './car.js';
import { createRaceWorld, createShowroom } from './world.js';
import { audio } from './audio.js';
import {
  clamp, lerp, damp, dampAngle, smoothstep, formatTime, formatShortTime, TAU
} from './utils.js';

/* ═══════════════════════════════════════════════════════════════════
   DOM
   ═══════════════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const dom = {
  webgl: $('webgl'),
  menu: $('screen-menu'), draw: $('screen-draw'), build: $('screen-build'), garage: $('screen-garage'),
  pause: $('screen-pause'), results: $('screen-results'), hud: $('race-hud'),
  loading: $('loading'), toast: $('toast'),
  btnStart: $('btn-start'), btnLastTrack: $('btn-last-track'), lastTrackLabel: $('last-track-label'),
  btnGarage: $('btn-garage'), btnGarageExit: $('btn-garage-exit'),
  setupLaps: $('setup-laps'), setupAI: $('setup-ai'),
  menuCard: $('menu-card'), menuCardChip: $('menu-card-chip'), menuMinimap: $('menu-minimap'),
  menuStatLength: $('menu-stat-length'), menuStatTurns: $('menu-stat-turns'),
  menuStatBest: $('menu-stat-best'), menuCardFoot: $('menu-card-foot'),
  drawStatus: $('draw-status'), drawCoords: $('draw-coords'),
  readoutLength: $('readout-length'), readoutTurns: $('readout-turns'),
  statLength: $('stat-length'), statTurns: $('stat-turns'), statStraight: $('stat-straight'),
  validation: $('validation'), validationTitle: $('validation-title'), validationBody: $('validation-body'),
  validationInline: $('draw-validation-inline'),
  buildName: $('build-name'), buildBar: $('build-progress-bar'), buildNote: $('build-note'),
  btnBuild: $('btn-build'), btnExample: $('btn-example'), btnClear: $('btn-clear'), btnUndo: $('btn-undo'),
  btnBackMenu: $('btn-back-menu'),
  hudPosition: $('hud-position'), hudPositionTotal: $('hud-position-total'), hudLap: $('hud-lap'),
  leaderboardRows: $('leaderboard-rows'),
  hudTime: $('hud-time'), hudLast: $('hud-last'), hudBest: $('hud-best'),
  btnPause: $('btn-pause'),
  hudSpeed: $('hud-speed'), hudGear: $('hud-gear'), speedoFill: $('speedo-fill'),
  speedoTicks: $('speedo-ticks'), throttleFill: $('throttle-fill'),
  minimap: $('minimap'), minimapTrackName: $('minimap-track-name'), hudDrs: $('hud-drs'),
  hudAssist: $('hud-assist'),
  raceMessage: $('race-message'), offTrack: $('off-track'),
  countdown: $('countdown'), countdownValue: $('countdown-value'),
  controlsHint: $('controls-hint'), touchControls: $('touch-controls'),
  btnResume: $('btn-resume'), btnRestartRace: $('btn-restart-race'), btnNewTrack: $('btn-new-track'),
  pausePosition: $('pause-position'), pauseLap: $('pause-lap'), pauseBest: $('pause-best'),
  btnSoundPause: $('btn-sound-pause'),
  resultsPosition: $('results-position'), resultsPlaceLabel: $('results-place-label'),
  resultsTrackName: $('results-track-name'), resultsTitle: $('results-title'),
  resultsSummary: $('results-summary'), resultsTime: $('results-time'), resultsBest: $('results-best'),
  resultsTop: $('results-top'), resultsLength: $('results-length'), resultsRows: $('results-rows'),
  btnRaceAgain: $('btn-race-again'), btnResultsNew: $('btn-results-new'),
  garageSwatches: $('garage-swatches'), garageColorWheel: $('garage-color-wheel'),
  garageHexForm: $('garage-hex-form'), garageHex: $('garage-hex'), garageReset: $('garage-reset'),
  garageLiveDot: $('garage-live-dot'), garageLiveHex: $('garage-live-hex'),
  garageLiveName: $('garage-live-name'), garageLivePart: $('garage-live-part'),
  garageHint: $('garage-hint'), garagePresetLabel: $('garage-preset-label'),
  garageCustomLabel: $('garage-custom-label'), garageParts: $('garage-parts'),
  garageStickerTargets: $('garage-sticker-targets'), garageStickers: $('garage-stickers'),
  garageStickerClear: $('garage-sticker-clear'),
  soundButtons: [$('btn-sound-menu'), $('btn-sound-draw'), $('btn-sound-garage')],
  difficultyButtons: [...document.querySelectorAll('#difficulty button')]
};

/* ═══════════════════════════════════════════════════════════════════
   State
   ═══════════════════════════════════════════════════════════════════ */
const renderer = new THREE.WebGLRenderer({
  canvas: dom.webgl, antialias: true, powerPreference: 'high-performance', alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.5 : 1.8));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let appState = 'boot';
let showroom = null;
let showroomCar = null;
let race = null;
let drawScreen = null;
let building = false;
let toastTimer = 0;
let diffLevel = 'pro';
try { diffLevel = localStorage.getItem('apexink.difficulty') || 'pro'; } catch {}

/* Player livery is shared by the garage, the showroom and the race car. */
const FACTORY_PAINT = '#C90D19';
const GARAGE_PRESETS = [
  { name: 'FACTORY RED', hex: '#C90D19' },
  { name: 'PAPAYA', hex: '#FF7A20' },
  { name: 'SOLAR', hex: '#F0D329' },
  { name: 'LIME', hex: '#B9F34A' },
  { name: 'MINT', hex: '#56BD75' },
  { name: 'TEAL', hex: '#17C9A4' },
  { name: 'ICE', hex: '#79E6FF' },
  { name: 'AZURE', hex: '#25B8D8' },
  { name: 'ULTRAMARINE', hex: '#2E6BFF' },
  { name: 'VIOLET', hex: '#9B6CFF' },
  { name: 'MAGENTA', hex: '#E83E8C' },
  { name: 'COPPER', hex: '#B64C35' },
  { name: 'SILVER', hex: '#E7E9ED' },
  { name: 'MIDNIGHT', hex: '#17191C' }
];

const LIVERY_PARTS = [
  { id: 'body', label: 'BODY' },
  { id: 'frontWing', label: 'FRONT WING' },
  { id: 'rearWing', label: 'REAR WING' },
  { id: 'trim', label: 'TRIM' },
  { id: 'helmet', label: 'HELMET' },
  { id: 'wheels', label: 'WHEELS' }
];

const STICKER_SLOTS = [
  { id: 'nose', label: 'NOSE' },
  { id: 'side', label: 'SIDEPODS' },
  { id: 'wing', label: 'REAR WING' }
];

const STICKER_CHOICES = [
  { id: 'number', label: '07' },
  { id: 'apex', label: 'APEX' },
  { id: 'stripe', label: 'STRIPES' },
  { id: 'bolt', label: 'BOLT' },
  { id: 'star', label: 'STAR' },
  { id: 'checker', label: 'CHECKER' },
  { id: 'flame', label: 'FLAME' }
];

const FACTORY_LIVERY = {
  body: FACTORY_PAINT,
  frontWing: '#F3EFE5',
  rearWing: '#F3EFE5',
  trim: '#F3EFE5',
  helmet: '#F3EFE5',
  wheels: '#FF4D1F',
  stickers: { nose: null, side: null, wing: null }
};

function normalizeHex(value, { allowShort = true } = {}) {
  if (typeof value !== 'string') return null;
  let hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  if (allowShort && hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6) return null;
  return `#${hex.toUpperCase()}`;
}

function hexToInt(hex) { return parseInt(hex.slice(1), 16); }

function paintName(hex) {
  const preset = GARAGE_PRESETS.find((p) => p.hex === hex);
  return preset ? preset.name : 'CUSTOM PAINT';
}

function sanitizeLivery(raw) {
  const livery = {
    ...FACTORY_LIVERY,
    stickers: { ...FACTORY_LIVERY.stickers }
  };
  if (!raw || typeof raw !== 'object') return livery;
  for (const part of LIVERY_PARTS) {
    const hex = normalizeHex(raw[part.id]);
    if (hex) livery[part.id] = hex;
  }
  for (const slot of STICKER_SLOTS) {
    const choice = raw.stickers?.[slot.id];
    livery.stickers[slot.id] = STICKER_CHOICES.some((item) => item.id === choice) ? choice : null;
  }
  return livery;
}

function loadPlayerLivery() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem('apexink.livery') || 'null');
  } catch {}
  const livery = sanitizeLivery(raw);
  if (!raw) {
    try {
      const legacy = normalizeHex(localStorage.getItem('apexink.paint') || '');
      if (legacy) livery.body = legacy;
    } catch {}
  }
  return livery;
}

function savePlayerLivery() {
  try {
    localStorage.setItem('apexink.livery', JSON.stringify(playerLivery));
    localStorage.setItem('apexink.paint', playerLivery.body);
  } catch {}
}

let playerLivery = loadPlayerLivery();
let playerPaint = playerLivery.body;
let selectedGaragePart = 'body';
let selectedStickerSlot = 'nose';

const RACE_SETUP_DEFAULTS = { laps: 3, ai: 3 };
try {
  const savedLaps = localStorage.getItem('apexink.laps');
  const savedAI = localStorage.getItem('apexink.ai');
  if (savedLaps !== null && Number.isInteger(Number(savedLaps)) && Number(savedLaps) >= 1 && Number(savedLaps) <= 10) {
    dom.setupLaps.value = savedLaps;
  }
  if (savedAI !== null && Number.isInteger(Number(savedAI)) && Number(savedAI) >= 0 && Number(savedAI) <= 9) {
    dom.setupAI.value = savedAI;
  }
} catch {}

function getRaceSetup() {
  const laps = Number(dom.setupLaps.value);
  const ai = Number(dom.setupAI.value);
  return {
    totalLaps: Number.isInteger(laps) ? clamp(laps, 1, 10) : RACE_SETUP_DEFAULTS.laps,
    aiCount: Number.isInteger(ai) ? clamp(ai, 0, 9) : RACE_SETUP_DEFAULTS.ai
  };
}

const input = {
  gas: false, brake: false, left: false, right: false, handbrake: false,
  touchGas: false, touchBrake: false, touchLeft: false, touchRight: false
};

const DIFFICULTY = {
  rookie: { factor: 0.84, accel: 9.5, label: 'ROOKIE' },
  pro: { factor: 0.915, accel: 11.2, label: 'PRO' },
  ace: { factor: 0.975, accel: 13.0, label: 'ACE' }
};

/* ═══════════════════════════════════════════════════════════════════
   UI helpers
   ═══════════════════════════════════════════════════════════════════ */
function toast(message, duration = 2400) {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), duration);
}

function setScreen(name) {
  for (const el of [dom.menu, dom.draw, dom.build, dom.garage]) {
    el.classList.toggle('is-active', el === dom[name]);
  }
}

function showRaceHud(show) {
  dom.hud.classList.toggle('is-hidden', !show);
}

function showModal(el, show) {
  el.classList.toggle('is-active', show);
}

function refreshSoundUI() {
  dom.soundButtons.forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle('is-muted', audio.muted);
    btn.setAttribute('aria-label', audio.muted ? 'Enable sound' : 'Mute sound');
    btn.title = audio.muted ? 'Sound off' : 'Sound on';
  });
  if (dom.btnSoundPause) dom.btnSoundPause.textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON';
}

function initDifficultyUI() {
  dom.difficultyButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.level === diffLevel);
    btn.addEventListener('click', () => {
      diffLevel = btn.dataset.level;
      try { localStorage.setItem('apexink.difficulty', diffLevel); } catch {}
      initDifficultyUI();
      audio.click(520);
    });
  });
}

function buildSpeedoTicks() {
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const r1 = 74, r2 = i % 2 === 0 ? 63 : 68;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', 100 + Math.cos(a) * r1);
    line.setAttribute('y1', 108 + Math.sin(a) * r1);
    line.setAttribute('x2', 100 + Math.cos(a) * r2);
    line.setAttribute('y2', 108 + Math.sin(a) * r2);
    dom.speedoTicks.appendChild(line);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Saved circuit
   ═══════════════════════════════════════════════════════════════════ */
let lastCircuit = null;

function readSavedCircuit() {
  try {
    const raw = localStorage.getItem('apexink.lastCircuit');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data.points) || data.points.length < 8) return null;
    if (typeof data.name !== 'string' || !data.name.trim() || /undefined|null/i.test(data.name)) {
      data.name = trackNameFor(data.points).name;
    }
    return data;
  } catch { return null; }
}

function saveLastCircuit(data) {
  try { localStorage.setItem('apexink.lastCircuit', JSON.stringify(data)); } catch {}
}

function bestKey(seed) { return `apexink.best.${seed}`; }

function readBest(seed) {
  try {
    const v = Number(localStorage.getItem(bestKey(seed)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

function writeBest(seed, lap) {
  try {
    const cur = readBest(seed);
    if (!cur || lap < cur) localStorage.setItem(bestKey(seed), String(Math.round(lap)));
  } catch {}
}

function drawMenuMinimap(last) {
  const canvas = dom.menuMinimap;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(5,7,10,.4)';
  ctx.fillRect(0, 0, w, h);

  // faint grid
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
  ctx.lineWidth = 1;
  for (let x = 20; x < w; x += 42) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 16; y < h; y += 42) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  if (!last) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.setLineDash([4, 10]);
    ctx.strokeStyle = 'rgba(255,77,31,.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.33, h * 0.27, -0.18, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
    ctx.restore();
    return;
  }

  const preview = analyzePreview(last.points, { targetLength: 1900 });
  if (!preview.prepared.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of preview.prepared) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const pad = 30;
  const scale = Math.min((w - pad * 2) / (maxX - minX || 1), (h - pad * 2) / (maxY - minY || 1));
  const ox = (w - (maxX - minX) * scale) / 2 - minX * scale;
  const oy = (h - (maxY - minY) * scale) / 2 - minY * scale;
  const map = (p) => ({ x: p.x * scale + ox, y: p.y * scale + oy });

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  preview.prepared.forEach((p, i) => {
    const q = map(p);
    if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
  });
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,77,31,.16)';
  ctx.lineWidth = 13;
  ctx.shadowColor = 'rgba(255,77,31,.7)';
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(7,9,12,.9)';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = '#f3efe5';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // start marker
  const start = map(preview.prepared[0]);
  ctx.fillStyle = '#ff4d1f';
  ctx.beginPath();
  ctx.arc(start.x, start.y, 3.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,77,31,.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 8, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function updateMenuCard() {
  lastCircuit = readSavedCircuit();
  const has = !!lastCircuit;
  dom.menuCard.classList.toggle('has-track', has);
  dom.btnLastTrack.classList.toggle('is-hidden', !has);
  dom.menuCardChip.textContent = has ? 'ON FILE' : 'NEW';

  if (!has) {
    dom.menuStatLength.textContent = '—';
    dom.menuStatTurns.textContent = '—';
    dom.menuStatBest.textContent = '—';
    dom.menuCardFoot.innerHTML = 'NO CIRCUIT ON FILE.<br><span>YOUR FIRST DESIGN IS WAITING.</span>';
  } else {
    dom.menuStatLength.textContent = `${(lastCircuit.length / 1000).toFixed(2)} km`;
    dom.menuStatTurns.textContent = lastCircuit.turns ?? '—';
    const best = readBest(lastCircuit.seed);
    dom.menuStatBest.textContent = best ? formatShortTime(best) : '—';
    dom.menuCardFoot.innerHTML = `${lastCircuit.name}<br><span>BEST LAP ${best ? formatTime(best) : 'NOT SET'}</span>`;
    dom.lastTrackLabel.textContent = `${lastCircuit.name} · ${(lastCircuit.length / 1000).toFixed(2)} KM`;
  }
  drawMenuMinimap(has ? lastCircuit : null);
}

/* ═══════════════════════════════════════════════════════════════════
   Draw screen wiring
   ═══════════════════════════════════════════════════════════════════ */
function setValidation(kind, title, body) {
  dom.validation.classList.toggle('is-valid', kind === 'valid');
  dom.validation.classList.toggle('is-warning', kind === 'warning');
  dom.validationTitle.textContent = title;
  dom.validationBody.textContent = body;
}

function updateDrawStats(preview) {
  if (!preview) {
    dom.statLength.textContent = '—';
    dom.statTurns.textContent = '—';
    dom.statStraight.textContent = '—';
    dom.readoutLength.textContent = '0 m';
    dom.readoutTurns.textContent = '0 turns';
    dom.drawStatus.textContent = 'DRAW A CLOSED LOOP';
    dom.btnBuild.disabled = true;
    dom.validationInline.classList.remove('show');
    setValidation('error', 'CIRCUIT INCOMPLETE', 'Draw one continuous loop to unlock the build.');
    return;
  }

  dom.statLength.textContent = preview.length.toLocaleString();
  dom.statTurns.textContent = preview.turns;
  dom.statStraight.textContent = preview.longestStraight.toLocaleString();
  dom.readoutLength.textContent = `${preview.length.toLocaleString()} m`;
  dom.readoutTurns.textContent = `${preview.turns} turns`;

  if (preview.selfIntersects) {
    dom.drawStatus.textContent = 'SELF-INTERSECTION DETECTED';
    dom.btnBuild.disabled = true;
    setValidation('error', 'TRACK CROSSES ITSELF', 'Erase and redraw one clean loop. Bridges arrive in APEX INK 2.');
    dom.validationInline.textContent = 'FIX THE CROSSING';
    dom.validationInline.classList.add('show');
  } else if (preview.tooFew) {
    dom.drawStatus.textContent = 'KEEP DRAWING';
    dom.btnBuild.disabled = true;
    setValidation('error', 'THAT IS A SCRIBBLE', 'Hold and drag to sketch a full circuit — bigger than a dot.');
    dom.validationInline.textContent = 'LOOP TOO SHORT';
    dom.validationInline.classList.add('show');
  } else if (preview.tooSmall) {
    dom.drawStatus.textContent = 'DRAW BIGGER';
    dom.btnBuild.disabled = true;
    setValidation('error', 'A LITTLE TOO POCKET-SIZED', 'Give us a larger loop so the car has somewhere to breathe.');
    dom.validationInline.textContent = 'TRY A BIGGER LOOP';
    dom.validationInline.classList.add('show');
  } else if (preview.valid && preview.minRadius > 0 && preview.minRadius < 26) {
    dom.drawStatus.textContent = 'CIRCUIT READY · TIGHT';
    dom.btnBuild.disabled = false;
    setValidation('warning', 'TIGHT & TECHNICAL', 'Approved — but those hairpins will bite. The AI will struggle too.');
    dom.validationInline.classList.remove('show');
  } else if (preview.valid) {
    dom.drawStatus.textContent = 'CIRCUIT APPROVED';
    dom.btnBuild.disabled = false;
    setValidation('valid', 'CIRCUIT APPROVED', `${preview.turns} corners · start/finish locked. Ready to pour asphalt.`);
    dom.validationInline.textContent = 'READY TO BUILD';
    dom.validationInline.classList.add('show');
  } else {
    dom.drawStatus.textContent = 'DRAW A CLOSED LOOP';
    dom.btnBuild.disabled = true;
    setValidation('error', 'CIRCUIT INCOMPLETE', 'Keep the line continuous and close the loop.');
  }
}

function initDrawScreen() {
  drawScreen = new DrawScreen($('draw-canvas'), $('canvas-stage'), {
    onChange: (preview) => updateDrawStats(preview),
    onCoords: (p) => {
      dom.drawCoords.textContent = `X ${Math.round(p.x)} · Y ${Math.round(p.y)}`;
    },
    onNotice: (msg) => toast(msg),
    onExampleDone: () => {
      if (drawScreen.getResult()) toast('Inspiration loaded. Build it or draw your own.');
      audio.click(740);
    },
    onDrawStart: () => { audio.tone(220, 0.04, 0.02, 'sine'); }
  });
  updateDrawStats(null);
}

/* ═══════════════════════════════════════════════════════════════════
   Showroom
   ═══════════════════════════════════════════════════════════════════ */
function initShowroom() {
  showroomCar = createCar({
    paint: hexToInt(playerLivery.body), accent: 0xf3efe5, accent2: 0xff4d1f,
    driver: 0xf3efe5, number: '07', livery: playerLivery
  });
  showroom = createShowroom(showroomCar);
  showroom.camera.aspect = window.innerWidth / window.innerHeight;
  showroom.camera.updateProjectionMatrix();
}

function enterMenu() {
  appState = 'menu';
  setScreen('menu');
  showModal(dom.pause, false);
  showModal(dom.results, false);
  showRaceHud(false);
  dom.webgl.classList.remove('is-hidden', 'is-dim');
  drawScreen?.stop();
  updateMenuCard();
  if (!showroom) initShowroom();
  showroom?.setMode('menu');
}

/* ═══════════════════════════════════════════════════════════════════
   Garage — player livery
   ═══════════════════════════════════════════════════════════════════ */
function garagePart() {
  return LIVERY_PARTS.find((part) => part.id === selectedGaragePart) || LIVERY_PARTS[0];
}

function applyLiveryToCar(car) {
  if (!car) return;
  for (const part of LIVERY_PARTS) car.setPart?.(part.id, playerLivery[part.id]);
  car.setStickers?.(playerLivery.stickers);
}

function updateGarageUI() {
  if (!dom.garageLiveHex) return;
  const part = garagePart();
  const color = playerLivery[part.id] || FACTORY_LIVERY[part.id];
  const sticker = playerLivery.stickers[selectedStickerSlot];
  const stickerChoice = STICKER_CHOICES.find((item) => item.id === sticker);
  const stickerSlot = STICKER_SLOTS.find((slot) => slot.id === selectedStickerSlot);

  dom.garageLivePart.textContent = `${part.label} COLOUR`;
  dom.garageLiveHex.textContent = color;
  dom.garageLiveName.textContent = paintName(color);
  dom.garageLiveDot.style.background = color;
  dom.garageLiveDot.style.boxShadow = `0 0 22px ${color}`;
  dom.garageColorWheel.value = color.toLowerCase();
  dom.garagePresetLabel.textContent = `${part.label} PRESETS`;
  dom.garageCustomLabel.textContent = `CUSTOM ${part.label} COLOUR`;
  dom.garageReset.textContent = `RESET ${part.label}`;
  if (document.activeElement !== dom.garageHex) dom.garageHex.value = color.slice(1);

  for (const swatch of dom.garageSwatches?.children || []) {
    const active = swatch.dataset.hex === color;
    swatch.classList.toggle('is-active', active);
    swatch.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  for (const button of dom.garageParts?.children || []) {
    const active = button.dataset.part === selectedGaragePart;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    const dot = button.querySelector('i');
    if (dot) dot.style.background = playerLivery[button.dataset.part] || FACTORY_LIVERY[button.dataset.part];
  }

  for (const button of dom.garageStickerTargets?.children || []) {
    const slot = STICKER_SLOTS.find((item) => item.id === button.dataset.slot);
    if (!slot) continue;
    const selected = slot.id === selectedStickerSlot;
    const current = STICKER_CHOICES.find((item) => item.id === playerLivery.stickers[slot.id]);
    button.textContent = current ? `${slot.label} · ${current.label}` : slot.label;
    button.classList.toggle('is-active', selected);
    button.classList.toggle('has-sticker', Boolean(current));
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
  }

  for (const button of dom.garageStickers?.children || []) {
    const active = button.dataset.sticker === sticker;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  if (dom.garageStickerClear) {
    dom.garageStickerClear.disabled = !stickerChoice;
    dom.garageStickerClear.title = stickerChoice
      ? `Remove ${stickerChoice.label} from the ${stickerSlot?.label || 'selected'} slot`
      : 'No sticker in this slot';
  }
}

function applyGarageColor(value, { persist = true, announce = false } = {}) {
  const hex = normalizeHex(value);
  if (!hex) return false;
  const part = garagePart();
  playerLivery[part.id] = hex;
  if (part.id === 'body') playerPaint = hex;
  applyLiveryToCar(showroomCar);
  applyLiveryToCar(race?.playerCar);
  if (persist) savePlayerLivery();
  dom.garageHex?.classList.remove('is-invalid');
  if (dom.garageHint) dom.garageHint.textContent = 'ANY #RRGGBB VALUE ACCEPTED';
  updateGarageUI();
  if (announce) {
    audio.click(720);
    toast(`${part.label} UPDATED · ${hex}`);
  }
  return true;
}

function selectGaragePart(id) {
  if (!LIVERY_PARTS.some((part) => part.id === id) || id === selectedGaragePart) return;
  selectedGaragePart = id;
  audio.ensure();
  audio.click(560);
  updateGarageUI();
}

function selectStickerSlot(id) {
  if (!STICKER_SLOTS.some((slot) => slot.id === id)) return;
  selectedStickerSlot = id;
  audio.ensure();
  audio.click(520);
  updateGarageUI();
}

function applyGarageSticker(id) {
  if (!STICKER_CHOICES.some((choice) => choice.id === id)) return;
  const current = playerLivery.stickers[selectedStickerSlot];
  playerLivery.stickers[selectedStickerSlot] = current === id ? null : id;
  savePlayerLivery();
  applyLiveryToCar(showroomCar);
  applyLiveryToCar(race?.playerCar);
  updateGarageUI();
  const slot = STICKER_SLOTS.find((item) => item.id === selectedStickerSlot);
  const choice = STICKER_CHOICES.find((item) => item.id === id);
  audio.ensure();
  audio.click(700);
  toast(playerLivery.stickers[selectedStickerSlot]
    ? `${choice.label} STUCK ON · ${slot?.label || 'CAR'}`
    : `${choice.label} REMOVED · ${slot?.label || 'CAR'}`);
}

function buildGarageParts() {
  if (!dom.garageParts) return;
  dom.garageParts.replaceChildren();
  for (const part of LIVERY_PARTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'garage-part';
    button.dataset.part = part.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', 'false');
    button.innerHTML = `<i aria-hidden="true"></i><span>${part.label}</span>`;
    button.addEventListener('click', () => selectGaragePart(part.id));
    dom.garageParts.appendChild(button);
  }
}

function buildGarageSwatches() {
  if (!dom.garageSwatches) return;
  dom.garageSwatches.replaceChildren();
  GARAGE_PRESETS.forEach((preset) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'garage-swatch';
    swatch.dataset.hex = preset.hex;
    swatch.style.setProperty('--swatch', preset.hex);
    swatch.title = `${preset.name} · ${preset.hex}`;
    swatch.setAttribute('aria-label', `${preset.name}, ${preset.hex}`);
    swatch.setAttribute('aria-pressed', 'false');
    swatch.innerHTML = '<span aria-hidden="true"></span>';
    swatch.addEventListener('click', () => {
      audio.ensure();
      applyGarageColor(preset.hex, { announce: true });
    });
    dom.garageSwatches.appendChild(swatch);
  });
  updateGarageUI();
}

function buildGarageStickers() {
  if (dom.garageStickerTargets) {
    dom.garageStickerTargets.replaceChildren();
    for (const slot of STICKER_SLOTS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'garage-sticker-target';
      button.dataset.slot = slot.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.textContent = slot.label;
      button.addEventListener('click', () => selectStickerSlot(slot.id));
      dom.garageStickerTargets.appendChild(button);
    }
  }
  if (dom.garageStickers) {
    dom.garageStickers.replaceChildren();
    for (const choice of STICKER_CHOICES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'garage-sticker-choice';
      button.dataset.sticker = choice.id;
      button.setAttribute('aria-pressed', 'false');
      button.title = `Apply ${choice.label} sticker`;
      button.textContent = choice.label;
      button.addEventListener('click', () => applyGarageSticker(choice.id));
      dom.garageStickers.appendChild(button);
    }
  }
  updateGarageUI();
}

function enterGarage() {
  audio.ensure();
  audio.click(620);
  appState = 'garage';
  setScreen('garage');
  showModal(dom.pause, false);
  showModal(dom.results, false);
  showRaceHud(false);
  dom.webgl.classList.remove('is-hidden', 'is-dim');
  drawScreen?.stop();
  if (!showroom) initShowroom();
  showroom?.setMode('garage');
  updateGarageUI();
}

/* ═══════════════════════════════════════════════════════════════════
   Build flow
   ═══════════════════════════════════════════════════════════════════ */
const BUILD_NOTES = [
  'Reading your line…',
  'Paving asphalt, painting white lines…',
  'Shaping kerbs and gravel traps…',
  'Growing scenery, hoisting grandstands…',
  'Warming tyres, briefing the rivals…'
];

function setBuildStage(stage) {
  const bar = clamp(stage / 5, 0, 1) * 100;
  dom.buildBar.style.width = `${bar}%`;
  dom.buildNote.textContent = BUILD_NOTES[Math.min(stage, BUILD_NOTES.length - 1)];
  document.querySelectorAll('[data-build-step]').forEach((el) => {
    const idx = Number(el.dataset.buildStep);
    el.classList.toggle('is-done', idx < stage);
  });
  if (stage > 0 && stage <= 5) audio.buildStep(stage);
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function beginBuild(rawPoints, { instant = false } = {}) {
  if (building) return;
  building = true;
  audio.ensure();
  audio.click(520);
  const trackData = createTrackData(rawPoints, { targetLength: 1900, halfWidth: 7.2 });
  if (!trackData.valid) {
    building = false;
    toast('That circuit could not be paved. Try a cleaner loop.');
    return;
  }
  const saved = {
    points: rawPoints.map((p) => ({ x: p.x, y: p.y })),
    name: trackData.name,
    seed: trackData.seed,
    length: Math.round(trackData.length),
    turns: trackData.turns,
    difficulty: diffLevel
  };
  saveLastCircuit(saved);
  lastCircuit = saved;

  if (!instant) {
    setScreen('build');
    dom.webgl.classList.add('is-hidden');
    dom.buildName.textContent = trackData.name;
    setBuildStage(0);
    drawScreen.stop();
    await sleep(260); setBuildStage(1);
    await sleep(360); setBuildStage(2);
    await sleep(380); setBuildStage(3);
    await sleep(420); setBuildStage(4);
    await sleep(400); setBuildStage(5);
    await sleep(340);
  }

  enterRace(trackData);
  building = false;
}

/* ═══════════════════════════════════════════════════════════════════
   Smoke / dust particles
   ═══════════════════════════════════════════════════════════════════ */
class SmokeSystem {
  constructor(scene) {
    this.count = 260;
    this.cursor = 0;
    this.positions = new Float32Array(this.count * 3);
    this.colors = new Float32Array(this.count * 3);
    this.sizes = new Float32Array(this.count);
    this.alphas = new Float32Array(this.count);
    this.life = new Float32Array(this.count);
    this.maxLife = new Float32Array(this.count);
    this.vel = new Float32Array(this.count * 3);
    this.baseSize = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3 + 1] = -999;
      this.alphas[i] = 0;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geo = geo;
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (340.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.08, d));
        }
      `
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.dirty = false;
  }

  emit(x, y, z, color, size = 0.55, life = 1.1, spread = 1.4) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    this.positions[i * 3] = x + (Math.random() - 0.5) * 0.5;
    this.positions[i * 3 + 1] = y + Math.random() * 0.2;
    this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
    this.colors[i * 3] = color.r;
    this.colors[i * 3 + 1] = color.g;
    this.colors[i * 3 + 2] = color.b;
    this.vel[i * 3] = (Math.random() - 0.5) * spread;
    this.vel[i * 3 + 1] = 0.4 + Math.random() * spread;
    this.vel[i * 3 + 2] = (Math.random() - 0.5) * spread;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.baseSize[i] = size;
    this.sizes[i] = size;
    this.alphas[i] = 0.5;
    this.dirty = true;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        this.positions[i * 3 + 1] = -999;
        this.dirty = true;
        continue;
      }
      const k = this.life[i] / this.maxLife[i];
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3] *= 0.985;
      this.vel[i * 3 + 2] *= 0.985;
      this.vel[i * 3 + 1] += dt * 0.2;
      this.sizes[i] = this.baseSize[i] * (1.6 - k * 0.6);
      this.alphas[i] = k * 0.42;
      this.dirty = true;
    }
    if (this.dirty) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.aColor.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
      this.geo.attributes.aAlpha.needsUpdate = true;
      this.dirty = false;
    }
  }

  reset() {
    for (let i = 0; i < this.count; i++) {
      this.life[i] = 0;
      this.alphas[i] = 0;
      this.positions[i * 3 + 1] = -999;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.cursor = 0;
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
    this.points.parent?.remove(this.points);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Race setup
   ═══════════════════════════════════════════════════════════════════ */
const GRID_GAP = 11;
const GRID_FIRST = 10;
const GRID_STAGGER = 5.2;
const GRID_LATERAL = 2.75;

// Proper staggered grid: two cars per row, one either side of the centre line,
// with the right-hand car a few metres further back. Slot order is decided by
// the caller, so grid position and driver pace stay independent.
function gridDistance(slot) {
  const row = Math.floor(slot / 2);
  const col = slot % 2;
  return -(GRID_FIRST + row * GRID_GAP + col * GRID_STAGGER);
}

function gridPose(slot) {
  const dist = gridDistance(slot);
  const lateral = (slot % 2 === 0 ? -1 : 1) * GRID_LATERAL;
  const s = sampleAtDistance(race.track, dist);
  return {
    x: s.x + s.nx * lateral,
    z: s.z + s.nz * lateral,
    yaw: Math.atan2(s.tx, s.tz),
    lateral,
    dist,
    s
  };
}

function hideAllScreens() {
  for (const el of [dom.menu, dom.draw, dom.build, dom.garage]) el.classList.remove('is-active');
}

// Invisible timing gates spaced around the lap. They are never rendered: they
// simply stop the nearest-point lookup from mistaking a nearby part of the
// circuit for the part the player is actually racing on.
function createRaceCheckpoints(track) {
  const count = clamp(Math.round(track.length / 55), 20, 48);
  const spacing = track.length / count;
  return Array.from({ length: count }, (_, i) => {
    const s = sampleAtDistance(track, i * spacing);
    return { dist: i * spacing, x: s.x, z: s.z, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz };
  });
}

function enterRace(trackData) {
  if (race) {
    race.smoke?.dispose();
    race.world?.dispose();
    race.playerCar?.dispose();
    race.ai?.forEach((a) => a.model.dispose());
    race = null;
  }

  const setup = getRaceSetup();
  const world = createRaceWorld(trackData);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 7000);
  const playerCar = createCar({
    paint: hexToInt(playerLivery.body), accent: 0xf3efe5, accent2: 0xff4d1f,
    driver: 0xf3efe5, number: '07', player: true, livery: playerLivery
  });
  world.scene.add(playerCar.root);

  const ai = AI_TEAMS.slice(0, setup.aiCount).map((team) => {
    const model = createCar({
      paint: team.paint, accent: team.accent, accent2: team.accent2, driver: team.driver,
      number: team.number, showDecals: true
    });
    world.scene.add(model.root);
    return {
      name: team.name,
      color: `#${team.paint.toString(16).padStart(6, '0')}`,
      model,
      dist: 0,
      speed: 0,
      lateral: 0,
      lastX: 0,
      lastZ: 0,
      lastYaw: 0,
      finished: false,
      finishTime: null,
      history: [],
      phase: Math.random() * TAU,
      pace: 0.945 + Math.random() * 0.103,
      form: 1,
      formTarget: 1,
      formTimer: 2 + Math.random() * 5,
      pushAt: 0.3 + Math.random() * 0.55,
      pushFor: 0.08 + Math.random() * 0.07,
      slumpAt: Math.random() < 0.45 ? 0.3 + Math.random() * 0.55 : 2,
      slumpFor: 0.06 + Math.random() * 0.06,
      nerve: 0.72 + Math.random() * 0.4,
      launch: 0.95 + Math.random() * 0.22,
      startDelay: 0.15 + Math.random() * 0.6,
      slowBias: 0.985 + Math.random() * 0.03,
      fastBias: 0.985 + Math.random() * 0.03,
      passSide: 0,
      passLat: 0,
      passUntil: 0,
      mistakeTimer: 10 + Math.random() * 18,
      mistakeTime: 0,
      mistakeSide: 1,
      blocker: null,
      blockerGap: Infinity
    };
  });
  // Grid order is decided fresh in resetRaceState(), where pace is also drawn.

  const smoke = new SmokeSystem(world.scene);

  race = {
    track: trackData,
    totalLaps: setup.totalLaps,
    aiCount: setup.aiCount,
    world,
    camera,
    playerCar,
    ai,
    smoke,
    locator: new TrackLocator(trackData, 18),
    checkpoints: createRaceCheckpoints(trackData),
    map: null,
    state: 'countdown',
    time: 0,
    countdownT: 0,
    countdownStep: -1,
    resultsTimer: 0,
    resultsShown: false,
    cameraReady: false,
    cameraMode: 0,
    camLook: new THREE.Vector3(),
    camSmooth: new THREE.Vector3(),
    camYaw: 0,
    shakeT: 0,
    leaderTimer: 0,
    player: {
      pos: { x: 0, z: 0 }, vel: { x: 0, z: 0 }, yaw: 0, steer: 0, throttle: 0, brake: 0,
      vLong: 0, vLat: 0, prevVLong: 0, yawRate: 0, offroad: false, offTimer: 0,
      lapsCompleted: 0, lapStart: 0, sNorm: 0, lastIndex: 0,
      progressDist: 0, cpNext: 0, cpArmed: false, sectors: [false, false, false],
      bestLap: null, lastLap: null, topSpeed: 0, finished: false, finishTime: null,
      finishPosition: setup.aiCount + 1, drs: false, trackDist: 0, assistState: 'auto', history: []
    }
  };

  race.map = buildMinimapBase(trackData);
  dom.minimapTrackName.textContent = trackData.name;
  resetRaceState();

  appState = 'race';
  hideAllScreens();
  showModal(dom.pause, false);
  showModal(dom.results, false);
  showRaceHud(true);
  dom.webgl.classList.remove('is-hidden', 'is-dim');
  dom.minimap.width = 520;
  dom.minimap.height = 220;
  dom.minimapTrackName.textContent = trackData.name;
}

function setCarPose(model, x, z, yaw) {
  model.root.position.set(x, 0, z);
  model.root.rotation.y = yaw;
}

function resetRaceState() {
  const r = race;
  const p = r.player;

  // The player starts behind the selected AI field on a fresh staggered grid.
  const playerGridSlot = r.ai.length;
  const pose = gridPose(playerGridSlot);
  p.pos = { x: pose.x, z: pose.z };
  p.vel = { x: 0, z: 0 };
  p.yaw = pose.yaw;
  p.lateral = pose.lateral;
  p.steer = 0; p.throttle = 0; p.brake = 0;
  p.vLong = 0; p.vLat = 0; p.prevVLong = 0; p.yawRate = 0;
  p.offroad = false; p.offTimer = 0;
  p.lapsCompleted = 0; p.lapStart = 0;
  p.sectors = [false, false, false];
  p.bestLap = readBest(r.track.seed);
  p.lastLap = null; p.topSpeed = 0;
  p.finished = false; p.finishTime = null; p.finishPosition = r.ai.length + 1;
  p.drs = false; p.trackDist = 0;
  p.assistState = 'auto';
  p.history = [];
  const startIndex = r.locator.nearest(pose.x, pose.z).index;
  p.lastIndex = startIndex;
  p.progressDist = pose.dist;
  p.cpNext = 0;
  p.cpArmed = false;
  p.sNorm = (startIndex % r.track.N) / r.track.N;
  r.camYaw = pose.yaw;
  r.shakeT = 0;
  r.impactShake = 0;
  setCarPose(r.playerCar, pose.x, pose.z, pose.yaw);
  r.playerCar.body.rotation.set(0, 0, 0);
  r.playerCar.setDRS(false);
  r.playerCar.setBrake(false);

  // Fresh pace, form and grid order for the field every race. Pace is dealt out
  // as a spread ladder, so there is always a genuinely quick car and a genuinely
  // slow one, and the quick one has to pass people to win.
  const paceLadder = r.ai.length > 1
    ? r.ai.map((_, i) => 0.945 + (i / (r.ai.length - 1)) * 0.103)
    : [0.995];
  for (let i = paceLadder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [paceLadder[i], paceLadder[j]] = [paceLadder[j], paceLadder[i]];
  }
  r.ai.forEach((a, i) => {
    a.pace = paceLadder[i] + (Math.random() - 0.5) * 0.01;
    a.slowBias = 0.985 + Math.random() * 0.03;
    a.fastBias = 0.985 + Math.random() * 0.03;
    a.launch = 0.95 + Math.random() * 0.22;
  });
  // The quickest third is held back: they draw random slots at the back of the
  // grid while everyone else fills the front at random. The fastest cars always
  // have real work to do, but the grid still looks different every race.
  const shuffleInPlace = (list) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const byPace = [...r.ai].sort((a, b) => b.pace - a.pace);
  const heldBack = byPace.length >= 3 ? Math.floor(byPace.length / 3) : 0;
  const frontCount = byPace.length - heldBack;
  // Shuffle the two groups separately so every grid slot is filled exactly once.
  const gridOrder = new Array(byPace.length);
  const frontSlots = shuffleInPlace(Array.from({ length: frontCount }, (_, i) => i));
  const backSlots = shuffleInPlace(Array.from({ length: heldBack }, (_, i) => frontCount + i));
  byPace.slice(heldBack).forEach((a, i) => { gridOrder[frontSlots[i]] = a; });
  byPace.slice(0, heldBack).forEach((a, i) => { gridOrder[backSlots[i]] = a; });
  gridOrder.forEach((a, i) => {
    const gp = gridPose(i);
    a.dist = gp.dist;
    a.speed = 0;
    a.lateral = gp.lateral;
    a.lastX = gp.x;
    a.lastZ = gp.z;
    a.lastYaw = gp.yaw;
    a.finished = false;
    a.finishTime = null;
    a.history = [];
    a.form = 1;
    a.formTarget = 1;
    a.formTimer = 2 + Math.random() * 5;
    a.pushAt = 0.3 + Math.random() * 0.55;
    a.pushFor = 0.08 + Math.random() * 0.07;
    a.slumpAt = Math.random() < 0.45 ? 0.3 + Math.random() * 0.55 : 2;
    a.slumpFor = 0.06 + Math.random() * 0.06;
    a.startDelay = 0.15 + Math.random() * 0.6;
    a.nerve = 0.72 + Math.random() * 0.4;
    a.phase = Math.random() * TAU;
    a.passSide = 0;
    a.passLat = gp.lateral;
    a.passUntil = 0;
    a.mistakeTimer = 10 + Math.random() * 18;
    a.mistakeTime = 0;
    a.blocker = null;
    a.blockerGap = Infinity;
    setCarPose(a.model, gp.x, gp.z, gp.yaw);
    a.model.body.rotation.set(0, 0, 0);
    a.model.setDRS(false);
  });

  r.time = 0;
  r.countdownT = 0;
  r.countdownStep = -1;
  r.countdownElapsed = 0;
  r.resultsTimer = 0;
  r.resultsShown = false;
  r.cameraReady = false;
  r.cameraMode = 0;
  r.leaderTimer = 0;
  r.gapShown = {};
  r.state = 'countdown';
  r.world.setStartLights(0);
  r.smoke.reset();
  audio.setPaused(false);

  dom.countdown.classList.add('show');
  dom.countdownValue.textContent = '3';
  dom.countdownValue.classList.remove('go');
  dom.raceMessage.classList.remove('show');
  dom.offTrack.classList.remove('show');
  dom.controlsHint.classList.remove('is-faded');
  dom.hudTime.textContent = '0:00.000';
  dom.hudLast.textContent = '—:—.———';
  dom.hudBest.textContent = p.bestLap ? formatTime(p.bestLap) : '—:—.———';
  dom.hudPosition.textContent = String(r.ai.length + 1);
  dom.hudPositionTotal.textContent = `/${r.ai.length + 1}`;
  dom.hudLap.innerHTML = `LAP 1<em>/${r.totalLaps}</em>`;
  dom.hudSpeed.textContent = '0';
  dom.hudGear.textContent = 'N';
  dom.speedoFill.style.strokeDashoffset = '100';
  dom.throttleFill.style.height = '0%';
  dom.hudDrs.classList.remove('is-active');
  showModal(dom.results, false);
  showModal(dom.pause, false);
  audio.startRace();
  audio.setPaused(false);
  audio.countdown(3);
}

function disposeRace() {
  if (!race) return;
  audio.stopRace();
  race.smoke?.dispose();
  race.world?.dispose();
  race.playerCar?.dispose();
  race.ai?.forEach((a) => a.model.dispose());
  race = null;
}

/* ═══════════════════════════════════════════════════════════════════
   Minimap
   ═══════════════════════════════════════════════════════════════════ */
function buildMinimapBase(track) {
  const c = document.createElement('canvas');
  c.width = 520; c.height = 220;
  const ctx = c.getContext('2d');
  const pad = 24;
  const scale = Math.min(
    (c.width - pad * 2) / Math.max(track.bbox.width, 1),
    (c.height - pad * 2) / Math.max(track.bbox.depth, 1)
  );
  const ox = c.width / 2 - track.centerX * scale;
  const oy = c.height / 2 - track.centerZ * scale;
  const map = (x, z) => ({ x: x * scale + ox, y: z * scale + oy });

  ctx.clearRect(0, 0, c.width, c.height);
  const bg = ctx.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, c.width * 0.6);
  bg.addColorStop(0, 'rgba(255,255,255,.025)');
  bg.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);

  const path = new Path2D();
  track.samples.forEach((s, i) => {
    const q = map(s.x, s.z);
    if (i === 0) path.moveTo(q.x, q.y); else path.lineTo(q.x, q.y);
  });
  path.closePath();

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,77,31,.15)';
  ctx.lineWidth = 14;
  ctx.shadowColor = 'rgba(255,77,31,.8)';
  ctx.shadowBlur = 12;
  ctx.stroke(path);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(6,8,11,.9)';
  ctx.lineWidth = 8;
  ctx.stroke(path);
  ctx.strokeStyle = '#f3efe5';
  ctx.lineWidth = 3;
  ctx.stroke(path);

  // sector dots
  for (const frac of [0.25, 0.5, 0.75]) {
    const s = track.samples[Math.floor(track.N * frac)];
    const q = map(s.x, s.z);
    ctx.fillStyle = 'rgba(255,77,31,.9)';
    ctx.beginPath();
    ctx.arc(q.x, q.y, 2.2, 0, TAU);
    ctx.fill();
  }

  // start line
  const st = track.samples[0];
  const a = map(st.x, st.z);
  const normal = { x: st.nx, y: st.nz };
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x - normal.x * 6, a.y - normal.y * 6);
  ctx.lineTo(a.x + normal.x * 6, a.y + normal.y * 6);
  ctx.stroke();
  ctx.restore();

  return { canvas: c, scale, ox, oy };
}

function mapPoint(x, z) {
  return { x: x * race.map.scale + race.map.ox, y: z * race.map.scale + race.map.oy };
}

function drawMinimap() {
  if (!race || !race.map) return;
  const ctx = dom.minimap.getContext('2d');
  ctx.clearRect(0, 0, dom.minimap.width, dom.minimap.height);
  ctx.drawImage(race.map.canvas, 0, 0);

  for (const a of race.ai) {
    const q = mapPoint(a.lastX, a.lastZ);
    ctx.save();
    ctx.fillStyle = a.color;
    ctx.strokeStyle = 'rgba(4,6,9,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(q.x, q.y, 4.2, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const p = race.player;
  const q = mapPoint(p.pos.x, p.pos.z);
  const dirX = Math.sin(p.yaw), dirZ = Math.cos(p.yaw);
  const perpX = dirZ, perpZ = -dirX;
  ctx.save();
  ctx.shadowColor = playerPaint;
  ctx.shadowBlur = 10;
  ctx.fillStyle = playerPaint;
  ctx.strokeStyle = '#07090c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(q.x + dirX * 9, q.y + dirZ * 9);
  ctx.lineTo(q.x - dirX * 5 + perpX * 5.5, q.y - dirZ * 5 + perpZ * 5.5);
  ctx.lineTo(q.x - dirX * 2, q.y - dirZ * 2);
  ctx.lineTo(q.x - dirX * 5 - perpX * 5.5, q.y - dirZ * 5 - perpZ * 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════════════
   Standings / progress
   ═══════════════════════════════════════════════════════════════════ */
function playerProgress() {
  const p = race.player;
  if (p.finished) return race.totalLaps;
  return p.progressDist / race.track.length;
}

// Keep a short timeline of every car's race progress. Comparing the leader's
// timeline against a chaser's current progress gives the time gap you would
// see on an F1 timing tower, rather than a guessed distance/speed division.
function recordGapHistory() {
  if (!race || race.state !== 'racing') return;
  const now = race.time;
  const push = (history, progress) => {
    const last = history[history.length - 1];
    if (last && now - last.t < 90) return;
    history.push({ t: now, p: progress });
    if (history.length > 2600) history.splice(0, 400);
  };
  push(race.player.history, playerProgress());
  for (const a of race.ai) {
    const progress = a.finished ? race.totalLaps : Math.min(race.totalLaps, a.dist / race.track.length);
    push(a.history, progress);
  }
}

function gapToLeaderSeconds(leader, progress, speed) {
  const history = leader.history;
  if (!history || history.length < 2) return 0;
  const first = history[0];
  const last = history[history.length - 1];
  if (progress >= last.p) return 0;
  if (progress < first.p) {
    // Before the leader's first sample (the grid): no elapsed race time yet.
    if (race.time < 600) return 0;
    const metres = (first.p - progress) * race.track.length;
    return metres / Math.max(24, speed);
  }
  // Binary search for the first timeline sample at or beyond this progress.
  let lo = 0, hi = history.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (history[mid].p >= progress) hi = mid; else lo = mid + 1;
  }
  const b = history[lo];
  const a = history[Math.max(0, lo - 1)];
  if (b === a) return Math.max(0, (race.time - b.t) / 1000);
  const f = clamp((progress - a.p) / Math.max(1e-6, b.p - a.p), 0, 1);
  const tAt = a.t + (b.t - a.t) * f;
  return Math.max(0, (race.time - tAt) / 1000);
}

function getStandings() {
  const p = race.player;
  const playerP = playerProgress();
  const rows = [{
    name: 'YOU', color: playerPaint, progress: playerP, history: p.history,
    speed: Math.abs(p.vLong), finishTime: p.finishTime,
    isPlayer: true, lap: Math.min(race.totalLaps, p.lapsCompleted + 1), finished: p.finished
  }];
  for (const a of race.ai) {
    const raw = a.dist / race.track.length;
    rows.push({
      name: a.name, color: a.color, progress: a.finished ? race.totalLaps : Math.min(race.totalLaps, raw),
      history: a.history, speed: a.speed, finishTime: a.finishTime,
      isPlayer: false, lap: clamp(Math.floor(a.dist / race.track.length) + 1, 1, race.totalLaps),
      finished: a.finished
    });
  }
  rows.sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.progress - a.progress;
  });
  return rows;
}

/* ═══════════════════════════════════════════════════════════════════
   Player physics
   ═══════════════════════════════════════════════════════════════════ */
const DUST_COLOR = new THREE.Color(0xc9b28a);
const SMOKE_COLOR = new THREE.Color(0xdad7d0);
let emitAccum = 0;
let minimapFrame = 0;

// Arcade-first handling. The car turns in almost immediately, carries more
// cornering force than a real F1 car, and bleeds off sideways slide quickly so
// the nose goes where you point it instead of washing wide into the scenery.
const HANDLING = {
  steerLowSpeed: 0.60,   // max steering angle at a crawl (rad)
  steerHighSpeed: 0.19,  // max steering angle at speed (rad)
  steerSpeedRef: 58,
  steerResponse: 18,     // how fast your input reaches the wheels
  yawResponse: 15,       // how fast the chassis follows the wheels
  gripTrack: 46,         // lateral acceleration budget on asphalt (m/s²)
  gripKerb: 38,
  gripOffroad: 27,
  gripHandbrake: 19,
  sideGripTrack: 12.5,   // how quickly sideways velocity is killed
  sideGripKerb: 11,
  sideGripOffroad: 5.5,
  sideGripHandbrake: 2.1,
  offroadPower: 0.55,    // engine output on grass, so you can drive back
  offroadDrag: 5.5
};

// The car drives its own throttle and brakes. The player owns the steering;
// W/S are always available as a direct override for extra speed or stopping.
const AUTODRIVE = {
  lateral: 31,        // cornering budget used to plan safe corner speeds (m/s²)
  brakeDecel: 24,     // braking force assumed when looking ahead (m/s²)
  maxSpeed: 84,       // cruise ceiling in m/s (≈302 km/h)
  offroadMax: 30,     // don't keep charging across the grass
  minSpeed: 20,
  cruiseThrottle: 0.4 // throttle that balances drag near the target speed
};

function autoDriveDemand(p, track) {
  const N = track.N;
  const base = Math.floor((((p.sNorm % 1) + 1) % 1) * N) % N;
  const speed = Math.max(0, p.vLong);
  const lookAhead = clamp(55 + speed * 1.55, 55, 190);
  const stride = Math.max(1, Math.round(5 / track.step));
  const maxSteps = Math.round(lookAhead / track.step);
  let target = AUTODRIVE.maxSpeed;

  // Scan the road ahead and find the fastest speed we can still brake down to
  // every upcoming corner from. This does the "when do I lift?" thinking.
  for (let d = 0; d <= maxSteps; d += stride) {
    const s = track.samples[(base + d) % N];
    const radius = Math.max(1 / Math.max(Math.abs(s.k), 1e-5), 24);
    const corner = Math.sqrt(AUTODRIVE.lateral * radius);
    const dist = d * track.step;
    target = Math.min(target, Math.sqrt(corner * corner + 2 * AUTODRIVE.brakeDecel * dist));
  }
  if (p.offroad) target = Math.min(target, AUTODRIVE.offroadMax);
  target = clamp(target, AUTODRIVE.minSpeed, AUTODRIVE.maxSpeed);

  const gap = target - speed;
  const throttle = clamp(AUTODRIVE.cruiseThrottle + gap * 0.55, 0, 1);
  const brake = speed > target + 0.8
    ? clamp((speed - target - 0.8) / 5, 0.12, 1)
    : 0;
  return { throttle, brake, target };
}

function readControls() {
  const active = race.state === 'racing';
  return {
    active,
    gas: active && (input.gas || input.touchGas),
    brake: active && (input.brake || input.touchBrake),
    steer: active ? ((input.left || input.touchLeft ? 1 : 0) - (input.right || input.touchRight ? 1 : 0)) : 0,
    handbrake: active && input.handbrake
  };
}

function updatePlayerPhysics(dt) {
  const p = race.player;
  const tr = race.track;
  const controls = readControls();
  const manualGas = controls.gas;
  const manualBrake = controls.brake;
  const handbrake = controls.handbrake;

  let throttleDemand = 0;
  let brakeDemand = 0;
  let assistState = 'auto';

  if (controls.active) {
    if (manualBrake) {
      // Player brake always wins — it is stronger than the auto brake.
      brakeDemand = 1;
      assistState = 'manual';
    } else if (manualGas) {
      // Player throttle overrides the speed planner so you can chase a faster lap.
      throttleDemand = 1;
      assistState = 'manual';
    } else if (!handbrake) {
      const auto = autoDriveDemand(p, race.track);
      throttleDemand = auto.throttle;
      brakeDemand = auto.brake;
      assistState = auto.brake > 0.15 ? 'auto-brake' : 'auto';
    } else {
      assistState = 'manual';
    }
  }
  p.assistState = assistState;

  p.throttle = damp(p.throttle, throttleDemand, 11, dt);
  p.brake = damp(p.brake, brakeDemand, 16, dt);
  p.steer = damp(p.steer, controls.steer, HANDLING.steerResponse, dt);

  const speed0 = Math.hypot(p.vel.x, p.vel.z);
  const f0x = Math.sin(p.yaw), f0z = Math.cos(p.yaw);
  const vLong0 = p.vel.x * f0x + p.vel.z * f0z;

  const maxSteer = lerp(
    HANDLING.steerLowSpeed,
    HANDLING.steerHighSpeed,
    clamp(speed0 / HANDLING.steerSpeedRef, 0, 1)
  );
  const steerAngle = p.steer * maxSteer;
  const gripAccel = p.offroad
    ? HANDLING.gripOffroad
    : handbrake
      ? HANDLING.gripHandbrake
      : p.onKerb
        ? HANDLING.gripKerb
        : HANDLING.gripTrack;
  const maxYaw = gripAccel / Math.max(4, speed0);
  let yawTarget = (vLong0 / 3.05) * Math.tan(steerAngle);
  if (handbrake) yawTarget *= 1.55;
  yawTarget = clamp(yawTarget, -maxYaw, maxYaw);
  p.yawRate = damp(p.yawRate, yawTarget, HANDLING.yawResponse, dt);
  p.yaw += p.yawRate * dt;
  p.yaw = ((p.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;

  const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
  const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);

  let vLong = p.vel.x * fx + p.vel.z * fz;
  let vLat = p.vel.x * rx + p.vel.z * rz;

  const drs = race.state === 'racing' && vLong > 55 && Math.abs(p.lastK || 0) < 1 / 420 && p.throttle > 0.35;
  p.drs = drs;

  let accel = 0;
  if (p.throttle > 0.01) {
    const maxSpeed = drs ? 96 : 90;
    const ratio = clamp(vLong / maxSpeed, -1, 1);
    const engine = 18.5 * Math.max(0, 1 - ratio * ratio);
    accel += engine * p.throttle * (p.offroad ? HANDLING.offroadPower : 1);
  }
  if (p.brake > 0.01) {
    if (vLong > 0.35) accel -= 33 * p.brake;
    else accel -= 6.8 * p.brake;
  }
  if (handbrake) accel -= 9;
  const dragCoef = drs ? 0.000165 : 0.00022;
  const drag = dragCoef * vLong * Math.abs(vLong) + 0.6 * Math.sign(vLong) + (p.offroad ? HANDLING.offroadDrag : 0);
  accel -= drag;
  vLong += accel * dt;
  if (vLong < -12) vLong = -12;
  if (p.throttle < 0.02 && p.brake < 0.02 && !handbrake && Math.abs(vLong) < 0.2) vLong = 0;

  const sideGrip = p.offroad
    ? HANDLING.sideGripOffroad
    : handbrake
      ? HANDLING.sideGripHandbrake
      : p.onKerb
        ? HANDLING.sideGripKerb
        : HANDLING.sideGripTrack;
  vLat *= Math.exp(-sideGrip * dt);

  p.vLong = vLong;
  p.vLat = vLat;
  p.vel.x = fx * vLong + rx * vLat;
  p.vel.z = fz * vLong + rz * vLat;
  p.pos.x += p.vel.x * dt;
  p.pos.z += p.vel.z * dt;

  const near = nearestTrackSample(tr, p.pos.x, p.pos.z, p.lastIndex);
  const sample = tr.samples[near.index];
  p.lastIndex = near.index;
  p.sNorm = (near.index % tr.N) / tr.N;
  p.trackDist = near.dist;
  p.lateral = (p.pos.x - sample.x) * sample.nx + (p.pos.z - sample.z) * sample.nz;
  p.lastK = sample.k;
  p.offroad = near.dist > tr.halfWidth + 1.15;
  p.onKerb = !p.offroad && near.dist > tr.halfWidth - 0.55 && near.dist < tr.halfWidth + 1.6;
  if (p.offroad) {
    p.offTimer += dt * (near.dist > tr.halfWidth + 25 ? 2 : 1);
  } else {
    p.offTimer = Math.max(0, p.offTimer - dt * 2.5);
  }
  if (race.state === 'racing' && p.offTimer > 2.7) recoverPlayer();

  const kmh = Math.abs(vLong) * 3.6;
  if (race.state === 'racing') p.topSpeed = Math.max(p.topSpeed, kmh);
}

function updatePlayerVisual(dt) {
  const p = race.player;
  const car = race.playerCar;
  car.root.position.set(p.pos.x, 0, p.pos.z);
  car.root.rotation.y = p.yaw;

  const longAccel = (p.vLong - p.prevVLong) / Math.max(dt, 0.001);
  p.prevVLong = p.vLong;
  car.body.rotation.x = damp(car.body.rotation.x, clamp(-longAccel * 0.0022, -0.055, 0.055), 7, dt);
  car.body.rotation.z = damp(car.body.rotation.z, clamp(p.vLong * p.yawRate * 0.0032, -0.07, 0.07), 7, dt);

  const steerVisual = p.steer * lerp(
    HANDLING.steerLowSpeed * 0.82,
    HANDLING.steerHighSpeed * 1.2,
    clamp(Math.abs(p.vLong) / HANDLING.steerSpeedRef, 0, 1)
  );
  for (const w of car.wheels) {
    w.spin.rotation.x += (p.vLong / w.radius) * dt;
    if (w.front) w.steer.rotation.y = damp(w.steer.rotation.y, steerVisual, 18, dt);
  }
  car.setBrake(p.brake > 0.08 || race.state === 'finished');
  car.setDRS(p.drs);

  // tyre smoke and grass dust
  const slip = Math.abs(p.vLat);
  const speed = Math.abs(p.vLong);
  const rate = p.offroad && speed > 4 ? 42 : (slip > 2.4 && speed > 6 ? 26 : 0);
  if (rate && race.state !== 'countdown') {
    emitAccum += dt * rate;
    while (emitAccum >= 1) {
      emitAccum -= 1;
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = p.pos.x - fx * 1.65 + rx * side * 0.85;
      const z = p.pos.z - fz * 1.65 + rz * side * 0.85;
      const color = p.offroad ? DUST_COLOR : SMOKE_COLOR;
      race.smoke.emit(x, 0.22, z, color, p.offroad ? 0.9 : 0.7, p.offroad ? 1.25 : 1.0, p.offroad ? 2.4 : 1.6);
    }
  }
}

function nearestTrackSample(track, x, z, hint = -1, windowMeters = 26) {
  const N = track.N;
  let best = -1;
  let bestD = Infinity;
  if (Number.isInteger(hint) && hint >= 0 && hint < N) {
    const span = Math.max(6, Math.round(windowMeters / track.step));
    for (let k = -span; k <= span; k++) {
      const i = (hint + k + N) % N;
      const s = track.samples[i];
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    // If the car is well off the road (or has been recovered), fall back to the
    // spatial lookup so it can always find its way back to the nearest asphalt.
    if (best >= 0 && bestD > (track.halfWidth + 36) ** 2) {
      const global = race.locator.nearest(x, z);
      const d = global.dist * global.dist;
      if (global.index >= 0 && d < bestD) { bestD = d; best = global.index; }
    }
  }
  if (best < 0) {
    const global = race.locator.nearest(x, z);
    best = global.index >= 0 ? global.index : 0;
    bestD = global.dist * global.dist;
  }
  return { index: best, dist: Math.sqrt(bestD) };
}

function trackDistanceAt(track, index, x, z) {
  const s = track.samples[index];
  const along = (x - s.x) * s.tx + (z - s.z) * s.tz;
  return (s.s ?? index * track.step) + clamp(along, -track.step, track.step);
}

function unwrapTrackDistance(candidate, reference, length) {
  let out = candidate;
  const half = length * 0.5;
  while (out - reference > half) out -= length;
  while (out - reference < -half) out += length;
  return out;
}

function recoverPlayer(showToast = true) {
  const p = race.player;
  const near = nearestTrackSample(race.track, p.pos.x, p.pos.z, p.lastIndex);
  const s = race.track.samples[near.index];
  p.pos = { x: s.x, z: s.z };
  p.vel = { x: 0, z: 0 };
  p.vLong = 0; p.vLat = 0;
  p.yaw = Math.atan2(s.tx, s.tz);
  p.offroad = false;
  p.offTimer = 0;
  p.lastIndex = near.index;
  p.sNorm = (near.index % race.track.N) / race.track.N;
  p.progressDist = unwrapTrackDistance(trackDistanceAt(race.track, near.index, s.x, s.z), p.progressDist, race.track.length);
  race.locator.lastIndex = near.index;
  // Cut the camera with the car rather than letting it swoop across the
  // circuit to the recovery point.
  race.camYaw = p.yaw;
  race.cameraReady = false;
  race.camLook.set(s.x + Math.sin(p.yaw) * 7, 0.92, s.z + Math.cos(p.yaw) * 7);
  race.smoke.reset();
  if (showToast) {
    toast('Recovered to the racing line');
    audio.tone(330, 0.1, 0.04, 'triangle');
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Lap logic
   ═══════════════════════════════════════════════════════════════════ */
function completeLap() {
  const p = race.player;
  const lapTime = race.time - p.lapStart;
  if (lapTime > 3000) {
    p.lastLap = lapTime;
    if (!p.bestLap || lapTime < p.bestLap) {
      p.bestLap = lapTime;
      writeBest(race.track.seed, lapTime);
      toast(`NEW BEST LAP · ${formatTime(lapTime)}`);
    }
  }
  p.lapsCompleted++;
  p.lapStart = race.time;
  p.sectors = [false, false, false];
  if (p.lapsCompleted >= race.totalLaps) {
    finishRace();
  } else if (p.lapsCompleted === race.totalLaps - 1) {
    showRaceMessage('FINAL LAP', 'EVERYTHING YOU HAVE', 2300, true);
    audio.tone(880, 0.18, 0.06, 'triangle');
  } else {
    showRaceMessage(`LAP ${p.lapsCompleted + 1} / ${race.totalLaps}`, 'KEEP IT CLEAN', 1900);
    audio.tone(660, 0.1, 0.04, 'triangle');
  }
}

function updatePlayerProgress(dt) {
  const p = race.player;
  if (p.finished) return;
  const tr = race.track;
  const L = tr.length;
  const near = nearestTrackSample(tr, p.pos.x, p.pos.z, p.lastIndex);
  const candidate = unwrapTrackDistance(
    trackDistanceAt(tr, near.index, p.pos.x, p.pos.z),
    p.progressDist,
    L
  );

  // A car can only advance a sensible distance in one physics step. Clamping
  // rejected huge jumps from nearby track sections while still letting the
  // progress catch up after a recovery.
  const allowed = Math.max(16, Math.abs(p.vLong) * Math.max(dt, 0.001) * 4 + 3);
  const delta = candidate - p.progressDist;
  p.progressDist += Math.abs(delta) <= allowed ? delta : clamp(delta, -allowed, allowed);
  p.lastIndex = near.index;
  p.trackDist = near.dist;
  p.sNorm = (((p.progressDist % L) + L) % L) / L;

  // Hidden checkpoints. The lap only counts after every gate has been crossed
  // in order, which keeps the timing tower honest even on circuits that fold
  // back alongside themselves.
  const cpCount = race.checkpoints.length;
  const cpSpacing = L / cpCount;
  if (p.cpArmed) {
    if (p.progressDist >= (p.lapsCompleted + 1) * L) {
      p.cpArmed = false;
      p.cpNext = 1;
      completeLap();
    }
  } else {
    const target = p.lapsCompleted * L + p.cpNext * cpSpacing;
    if (p.progressDist >= target) {
      if (p.cpNext >= cpCount - 1) {
        p.cpArmed = true;
        p.cpNext = 0;
      } else {
        p.cpNext++;
      }
    }
  }

  const lapFrac = (((p.progressDist % L) + L) % L) / L;
  if (lapFrac > 0.13) p.sectors[0] = true;
  if (lapFrac > 0.38) p.sectors[1] = true;
  if (lapFrac > 0.64) p.sectors[2] = true;
}

/* ═══════════════════════════════════════════════════════════════════
   AI drivers
   ═══════════════════════════════════════════════════════════════════ */
/* Cars are three overlapping circles rather than one big invisible circle, so
   contact happens where the bodywork actually is. When you run into another
   car you scrub speed and get nudged along it — the closing speed is killed,
   never reflected, so you are not fired backwards like a rubber ball. */
const CONTACT = {
  offsets: [1.45, 0, -1.45],
  radii: [1.02, 1.06, 1.02]
};
const SPARK_COLOR = new THREE.Color(0xffb257);
const playerCircles = new Float32Array(6);
const aiCircles = new Float32Array(6);
let contactCooldown = 0;

function fillCarCircles(x, z, yaw, out) {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  for (let i = 0; i < 3; i++) {
    const o = CONTACT.offsets[i];
    out[i * 2] = x + fx * o;
    out[i * 2 + 1] = z + fz * o;
  }
  return out;
}

function resolveCarCollisions(dt = 1 / 60) {
  const p = race.player;
  const tr = race.track;
  if (contactCooldown > 0) contactCooldown = Math.max(0, contactCooldown - dt);

  fillCarCircles(p.pos.x, p.pos.z, p.yaw, playerCircles);

  for (const a of race.ai) {
    const ax = a.model.root.position.x;
    const az = a.model.root.position.z;
    const ayaw = a.model.root.rotation.y;
    fillCarCircles(ax, az, ayaw, aiCircles);

    let overlap = 0;
    let nx = 0;
    let nz = 0;
    let contactX = 0;
    let contactZ = 0;
    for (let i = 0; i < 3; i++) {
      const px = playerCircles[i * 2];
      const pz = playerCircles[i * 2 + 1];
      for (let j = 0; j < 3; j++) {
        const cx = aiCircles[j * 2];
        const cz = aiCircles[j * 2 + 1];
        const dx = px - cx;
        const dz = pz - cz;
        const dist = Math.hypot(dx, dz) || 0.0001;
        const deep = CONTACT.radii[i] + CONTACT.radii[j] - dist;
        if (deep <= overlap) continue;
        overlap = deep;
        nx = dx / dist;
        nz = dz / dist;
        contactX = (px + cx) * 0.5;
        contactZ = (pz + cz) * 0.5;
      }
    }
    if (overlap <= 0) continue;

    const aFx = Math.sin(ayaw);
    const aFz = Math.cos(ayaw);
    const aRx = Math.cos(ayaw);
    const aRz = -Math.sin(ayaw);
    const aiVx = aFx * a.speed;
    const aiVz = aFz * a.speed;
    const relVx = p.vel.x - aiVx;
    const relVz = p.vel.z - aiVz;
    const vn = relVx * nx + relVz * nz;

    // Split the positional separation between the two cars. The player is
    // shoved sideways off the other car; the AI takes the rest as a shove
    // along the track, so you can lean on it and muscle past instead of
    // bouncing back down the road.
    const push = Math.min(overlap, 0.7);
    p.pos.x += nx * push * 0.55;
    p.pos.z += nz * push * 0.55;

    const s = sampleAtDistance(tr, a.dist);
    const shove = push * 0.5;
    a.dist += (s.tx * -nx + s.tz * -nz) * shove;
    const latLimit = Math.max(2.4, tr.halfWidth - 1.6);
    a.lateral = clamp(a.lateral + (s.nx * -nx + s.nz * -nz) * shove, -latLimit, latLimit);

    // Contact is always worth a small scrub and a side-step, even when the
    // relative speed is tiny, so cars rub instead of sticking together.
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);
    let impact = 0;
    if (vn < 0) {
      impact = Math.min(1, Math.abs(vn) / 26);
      // Remove only the speed heading into the other car. Whatever speed you
      // carry along the contact patch stays, so you keep driving forward.
      p.vel.x -= nx * vn;
      p.vel.z -= nz * vn;
      const tanVx = relVx - nx * vn;
      const tanVz = relVz - nz * vn;
      const scrub = 0.07 + impact * 0.16;
      p.vel.x -= tanVx * scrub;
      p.vel.z -= tanVz * scrub;

      // How square-on the hit is: 1 = straight up the gearbox, 0 = pure
      // side swipe. Square-on hits get a firm side-step so you peel around
      // the car ahead instead of grinding along behind it.
      const squareOn = Math.abs(nx * fx + nz * fz);
      const sideOff = (p.pos.x - ax) * aRx + (p.pos.z - az) * aRz;
      const side = Math.abs(sideOff) > 0.12 ? Math.sign(sideOff) : (p.vLat >= 0 ? 1 : -1);
      const escape = (0.5 + impact * 3.2) * (0.35 + squareOn * 0.65);
      p.vel.x += aRx * side * escape;
      p.vel.z += aRz * side * escape;

      // A shove up the road for the car ahead, so it does not feel like a wall.
      a.speed += impact * 1.8;
    }

    p.vLong = p.vel.x * fx + p.vel.z * fz;
    p.vLat = p.vel.x * rx + p.vel.z * rz;
    // The shove changed where the player is; refresh its circles before the
    // next car is tested so a three-wide squeeze resolves in one frame.
    fillCarCircles(p.pos.x, p.pos.z, p.yaw, playerCircles);

    // Keep the AI model where we just shoved it so the next frame agrees.
    const as = sampleAtDistance(tr, a.dist);
    const ax2 = as.x + as.nx * a.lateral;
    const az2 = as.z + as.nz * a.lateral;
    a.model.root.position.set(ax2, 0, az2);
    a.model.root.rotation.y = Math.atan2(as.tx, as.tz);
    a.lastX = ax2;
    a.lastZ = az2;
    a.lastYaw = a.model.root.rotation.y;

    if (vn < -1.4 && contactCooldown <= 0) {
      contactCooldown = 0.22;
      const power = clamp(Math.abs(vn) / 24, 0.15, 1);
      for (let k = 0; k < 7; k++) {
        race.smoke.emit(contactX, 0.45 + Math.random() * 0.5, contactZ, SPARK_COLOR,
          0.2 + Math.random() * 0.18, 0.24 + Math.random() * 0.2, 3.4);
      }
      race.impactShake = Math.max(race.impactShake || 0, 0.25 + power * 0.45);
      audio.impact(power);
    }
  }
}

const AI_LINE_MARGIN = 1.9;
const AI_PASS_GAP = 3.15;
const AI_MIN_SIDE_GAP = 2.5;

function aiTrackLimit() {
  return Math.max(2.8, race.track.halfWidth - AI_LINE_MARGIN);
}

function findAiBlocker(a, field) {
  let blocker = null;
  let gap = Infinity;
  for (const b of field) {
    if (b === a) continue;
    const d = b.dist - a.dist;
    // Only cars close enough ahead and sharing our piece of road can block us.
    if (d < 0.2 || d > 34) continue;
    if (Math.abs(b.lateral - a.lateral) > 2.9) continue;
    if (d < gap) { blocker = b; gap = d; }
  }
  return { blocker, gap };
}

// The racing line: cut the apex, run wide on exit, and gradually settle back to
// the middle on straights. Every driver leans on the kerbs a little differently.
function aiRacingLine(a, s, limit) {
  const tight = clamp(Math.abs(s.k) / (1 / 58), 0, 1);
  const apex = Math.sign(s.k) * limit * (0.62 + a.nerve * 0.22) * tight;
  const weave = Math.sin(a.dist / 74 + a.phase) * 0.28 * (1 - tight);
  if (a.finished) return -Math.sign(s.k || 1) * limit * 0.55;
  return apex + weave;
}

function aiPassCandidate(a, field, blocker, limit, tr) {
  const s = sampleAtDistance(tr, blocker.dist);
  const inside = Math.sign(s.k) || 1;
  const options = [];
  for (const side of [-1, 1]) {
    const lat = clamp(blocker.lateral + side * AI_PASS_GAP, -limit, limit);
    if (Math.abs(lat - blocker.lateral) < AI_PASS_GAP - 0.35) continue;
    let clear = true;
    for (const b of field) {
      if (b === a || b === blocker) continue;
      const d = b.dist - a.dist;
      if (d < -4 || d > 15) continue;
      if (Math.abs(b.lateral - lat) < AI_MIN_SIDE_GAP) { clear = false; break; }
    }
    const room = side < 0 ? blocker.lateral + limit : limit - blocker.lateral;
    options.push({
      side, lat, clear, room,
      score: (clear ? 20 : 0) + room + (side === inside ? 1.2 : 0)
    });
  }
  options.sort((x, y) => y.score - x.score);
  return options[0] || null;
}

function planAiOvertake(a, field, limit, tr) {
  const blocker = a.blocker;
  if (!blocker || a.finished) return;
  const gap = a.blockerGap;
  if (gap > 28) return;
  const closing = a.speed - blocker.speed;
  // A faster car commits early and gets alongside before it arrives. A car that
  // is simply about to run into the back of someone also has to react.
  if (closing < 0.35 && gap > 7.5) return;
  const pick = aiPassCandidate(a, field, blocker, limit, tr);
  if (!pick) return;
  if (!pick.clear && gap > 6.5) return;
  a.passSide = pick.side;
  a.passLat = pick.lat;
  a.passUntil = race.time + 1600 + Math.random() * 1300;
}

// Keep the field from driving through itself. Cars that are side by side stay a
// car's width apart; a car that is still directly behind lifts and tucks in.
function separateAiCars(ai, limit) {
  for (let i = 0; i < ai.length; i++) {
    const a = ai[i];
    for (let j = i + 1; j < ai.length; j++) {
      const b = ai[j];
      const d = b.dist - a.dist;
      if (Math.abs(d) > 5.2) continue;
      const sideGap = b.lateral - a.lateral;
      if (Math.abs(sideGap) >= AI_MIN_SIDE_GAP) continue;
      const side = Math.sign(sideGap) || (a.passSide || 1);
      const push = (AI_MIN_SIDE_GAP - Math.abs(sideGap)) * 0.5;
      a.lateral = clamp(a.lateral - side * push, -limit, limit);
      b.lateral = clamp(b.lateral + side * push, -limit, limit);
      if (Math.abs(b.lateral - a.lateral) < 1.85) {
        const front = d > 0 ? b : a;
        const back = d > 0 ? a : b;
        back.speed = Math.min(back.speed, Math.max(0, front.speed * 0.965));
      }
    }
  }
}

function updateAI(dt) {
  const tr = race.track;
  const L = tr.length;
  const diff = DIFFICULTY[diffLevel] || DIFFICULTY.pro;
  const ai = race.ai;
  const limit = aiTrackLimit();
  const now = race.time;

  // Everyone races everyone, including the player. A single grid of rivals lets
  // the AI pick a side and actually fight for the place instead of following.
  const p = race.player;
  const field = ai.slice();
  if (!p.finished) {
    field.push({
      isPlayer: true,
      name: 'YOU',
      dist: p.progressDist,
      lateral: p.lateral || 0,
      speed: Math.abs(p.vLong),
      finished: false
    });
  }

  // Form and mistakes give each driver a rhythm across the race. Nobody is a
  // metronome, and a small error opens a real passing opportunity.
  for (const a of ai) {
    a.formTimer -= dt;
    if (a.formTimer <= 0) {
      a.formTimer = 6 + Math.random() * 6;
      a.formTarget = 0.975 + Math.random() * 0.05;
    }
    a.form = damp(a.form, a.formTarget, 0.5, dt);

    a.mistakeTimer -= dt;
    if (a.mistakeTimer <= 0) {
      a.mistakeTimer = 13 + Math.random() * 22;
      if (Math.random() < 0.45 && !a.finished) {
        a.mistakeTime = 0.7 + Math.random() * 1.1;
        a.mistakeSide = Math.random() < 0.5 ? -1 : 1;
      }
    }
    if (a.mistakeTime > 0) a.mistakeTime = Math.max(0, a.mistakeTime - dt);

    const look = findAiBlocker(a, field);
    a.blocker = look.blocker;
    a.blockerGap = look.gap;
  }

  for (const a of ai) planAiOvertake(a, field, limit, tr);

  for (const a of ai) {
    const norm = ((a.dist % L) + L) % L;
    const idx = Math.floor(norm / tr.step) % tr.N;
    const s = tr.samples[idx];
    let target = tr.speedProfile[idx] * diff.factor * a.pace * a.form;

    // Some drivers are brave in the slow stuff, others carry more through the
    // fast corners. That difference is what turns a queue into a race.
    const tight = clamp((Math.abs(s.k) - 1 / 170) / (1 / 55 - 1 / 170), 0, 1);
    target *= lerp(a.fastBias, a.slowBias, tight);

    // Tyres fade a little over a long run, and the launch is a personal thing.
    const raceFrac = clamp(a.dist / (race.totalLaps * L), 0, 1);
    target *= 1 - Math.max(0, raceFrac - 0.2) * 0.022;
    // Second wind / mid-race slump: a driver finds extra pace (or loses the
    // tyres) for a stretch, which is what creates late-race position changes.
    if (raceFrac > a.pushAt && raceFrac < a.pushAt + a.pushFor) target *= 1.038;
    if (raceFrac > a.slumpAt && raceFrac < a.slumpAt + a.slumpFor) target *= 0.975;
    const sinceGo = now - a.startDelay * 1000;
    if (sinceGo < 0) target = 0;
    else if (sinceGo < 1200) target *= clamp(0.22 + (sinceGo / 1200) * 0.92, 0, 1);

    // Slipstream: tuck in behind the car ahead and get a run on it.
    if (a.blocker && a.blockerGap < 16 && !a.finished) target *= 1.018;

    // Overtake mode: once committed, the passing car leans on the car ahead and
    // finishes the move instead of sitting in dirty air. The big gain arrives on
    // the straights, where a slipstream pass actually happens.
    if (a.passUntil > now && a.blocker && a.blockerGap < 22 && !a.finished) {
      target *= Math.abs(s.k) < 1 / 120 ? 1.055 : 1.015;
    }

    const latGap = a.blocker ? Math.abs(a.lateral - a.blocker.lateral) : 99;
    const boxed = a.blocker && a.blockerGap < 5.0 && latGap < 2.2;
    if (boxed && !a.finished) {
      // Directly behind and boxed in: lift to avoid driving through the car,
      // while the line logic works on getting us out of the pocket.
      target = Math.min(target, Math.max(6, a.blocker.speed * 0.99));
    } else if (a.blocker && latGap < 2.2 && a.blockerGap < 11 && !a.finished) {
      target = Math.min(target, a.blocker.speed + (a.blockerGap - 5) * 0.55);
    }
    if (a.finished) target *= 0.5;

    if (a.speed < target) a.speed = Math.min(target, a.speed + diff.accel * a.launch * dt);
    else a.speed = Math.max(target, a.speed - 30 * dt);
    a.dist += a.speed * dt;

    if (!a.finished && a.dist >= race.totalLaps * L) {
      a.finished = true;
      a.finishTime = race.time;
    }

    // Choose where on the road to put the car: racing line, or a pass down one
    // side. Avoid any car we are already alongside, so we never steer into it.
    let targetLat = aiRacingLine(a, s, limit);
    if (a.passUntil > now && !a.finished) targetLat = a.passLat;
    if (a.mistakeTime > 0) targetLat = clamp(targetLat + a.mistakeSide * 1.6, -limit, limit);

    for (const b of field) {
      if (b === a) continue;
      const d = b.dist - a.dist;
      if (Math.abs(d) > 4.8) continue;
      if (Math.abs(targetLat - b.lateral) >= AI_MIN_SIDE_GAP + 0.08) continue;
      const side = Math.sign(targetLat - b.lateral) || a.passSide || Math.sign(targetLat) || 1;
      targetLat = clamp(b.lateral + side * (AI_MIN_SIDE_GAP + 0.08), -limit, limit);
    }

    // Rate-limit the sideways move so a lane change looks like a car changing
    // its line, not a snap across the circuit.
    const latRate = 4.6 + a.nerve * 1.8;
    a.lateral += clamp(targetLat - a.lateral, -latRate * dt, latRate * dt);
    a.lateral = clamp(a.lateral, -limit, limit);
  }

  separateAiCars(ai, limit);

  for (const a of ai) {
    const s = sampleAtDistance(tr, a.dist);
    const x = s.x + s.nx * a.lateral;
    const z = s.z + s.nz * a.lateral;
    const yaw = Math.atan2(s.tx, s.tz);
    a.lastX = x;
    a.lastZ = z;
    a.lastYaw = yaw;
    a.model.root.position.set(x, 0, z);
    a.model.root.rotation.y = yaw;
    a.model.body.rotation.z = damp(a.model.body.rotation.z, clamp(-s.k * a.speed * a.speed * 0.0016, -0.06, 0.06), 6, dt);
    a.model.body.rotation.x = 0;
    const steer = clamp(s.k * 6 + (a.passUntil > now ? a.passSide * 0.08 : 0), -0.45, 0.45);
    for (const w of a.model.wheels) {
      w.spin.rotation.x += (a.speed / w.radius) * dt;
      if (w.front) w.steer.rotation.y = damp(w.steer.rotation.y, steer, 10, dt);
    }
    const braking = a.speed > 1 && (a.blockerGap < 5.6 || Math.abs(s.k) > 1 / 95);
    a.model.setDRS(a.speed > 58 && Math.abs(s.k) < 1 / 420);
    a.model.setBrake(braking);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HUD
   ═══════════════════════════════════════════════════════════════════ */
let messageTimer = 0;

function showRaceMessage(main, sub = '', duration = 1900, final = false) {
  dom.raceMessage.innerHTML = `${main}${sub ? `<small>${sub}</small>` : ''}`;
  dom.raceMessage.classList.toggle('is-final', final);
  dom.raceMessage.classList.add('show');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => dom.raceMessage.classList.remove('show'), duration);
}

function gearFor(kmh, vLong) {
  if (vLong < -0.4) return 'R';
  if (kmh < 1.5) return 'N';
  const steps = [30, 56, 84, 114, 148, 184, 226, 270, 320];
  for (let i = 0; i < steps.length; i++) if (kmh < steps[i]) return String(i + 1);
  return '8';
}

function updateHUD(dt) {
  const p = race.player;
  const standings = getStandings();
  const pos = standings.findIndex((r) => r.isPlayer) + 1;
  const kmh = Math.abs(p.vLong) * 3.6;

  dom.hudPosition.textContent = String(pos);
  dom.hudPositionTotal.textContent = `/${race.ai.length + 1}`;
  const lap = Math.min(race.totalLaps, p.lapsCompleted + 1);
  dom.hudLap.innerHTML = `LAP ${lap}<em>/${race.totalLaps}</em>`;
  dom.hudTime.textContent = formatTime(race.time);
  dom.hudLast.textContent = p.lastLap ? formatTime(p.lastLap) : '—:—.———';
  dom.hudBest.textContent = p.bestLap ? formatTime(p.bestLap) : '—:—.———';
  dom.hudSpeed.textContent = String(Math.round(kmh));
  dom.hudGear.textContent = gearFor(kmh, p.vLong);
  dom.speedoFill.style.strokeDashoffset = String(100 - clamp(kmh / 320, 0, 1) * 100);
  dom.throttleFill.style.height = `${Math.round(p.throttle * 100)}%`;
  const assist = p.assistState || 'auto';
  dom.hudAssist.textContent = assist === 'manual' ? 'MANUAL' : assist === 'auto-brake' ? 'BRAKING' : 'AUTO';
  dom.hudAssist.classList.toggle('is-manual', assist === 'manual');
  dom.hudAssist.classList.toggle('is-braking', assist === 'auto-brake');
  dom.hudDrs.classList.toggle('is-active', p.drs);
  dom.hudDrs.textContent = p.drs ? 'DRS OPEN' : 'DRS READY';
  dom.offTrack.classList.toggle('show', race.state === 'racing' && p.offroad && Math.abs(p.vLong) > 2.5);

  race.leaderTimer -= dt;
  if (race.leaderTimer <= 0) {
    race.leaderTimer = 0.24;
    const leader = standings[0];
    race.gapShown = race.gapShown || {};
    dom.leaderboardRows.innerHTML = standings.map((row, i) => {
      let gapSec = 0;
      if (i > 0) {
        if (row.finished && leader.finished && row.finishTime != null && leader.finishTime != null) {
          gapSec = Math.max(0, (row.finishTime - leader.finishTime) / 1000);
        } else {
          gapSec = gapToLeaderSeconds(leader, row.progress, (row.speed + leader.speed) * 0.5);
        }
      }
      const prev = race.gapShown[row.name];
      const shown = prev == null ? gapSec : prev + (gapSec - prev) * 0.5;
      race.gapShown[row.name] = shown;
      const gap = i === 0 ? 'LEADER' : race.state === 'countdown' ? '—' : `+${shown.toFixed(3)}`;
      return `<div class="lb-row${row.isPlayer ? ' is-player' : ''}${i === 0 ? ' is-leader' : ''}">
        <span class="lb-pos">${i + 1}</span>
        <i class="lb-col" style="background:${row.color}"></i>
        <span class="lb-name">${row.name}</span>
        <span class="lb-gap">${gap}</span>
      </div>`;
    }).join('');
  }

  minimapFrame++;
  if (minimapFrame % 3 === 0) drawMinimap();
  if (race.state === 'racing' && race.time > 9000) dom.controlsHint.classList.add('is-faded');
}

/* ═══════════════════════════════════════════════════════════════════
   Camera
   ═══════════════════════════════════════════════════════════════════ */
const camVecA = new THREE.Vector3();
const camVecB = new THREE.Vector3();
const camVecC = new THREE.Vector3();
const camVecD = new THREE.Vector3();
const camUp = new THREE.Vector3(0, 1, 0);

function updateRaceCamera(dt) {
  if (!race) return;
  const p = race.player;
  const carPos = camVecA.set(p.pos.x, 0, p.pos.z);
  const speed = Math.hypot(p.vel.x, p.vel.z);
  const speedT = clamp(speed / 90, 0, 1);
  let fov = 58;

  // Ease the camera heading instead of locking it to the car's instantaneous
  // yaw. Small steering corrections then glide past the lens instead of
  // twitching it, and the car stays planted in frame.
  if (!Number.isFinite(race.camYaw)) race.camYaw = p.yaw;
  const yawLambda = race.state === 'countdown' ? 3.2 : 8.5;
  race.camYaw = dampAngle(race.camYaw, p.yaw, yawLambda, dt);
  const fx = Math.sin(race.camYaw), fz = Math.cos(race.camYaw);
  const rx = Math.cos(race.camYaw), rz = -Math.sin(race.camYaw);
  // Onboard view is bolted to the real car heading.
  const cfx = Math.sin(p.yaw), cfz = Math.cos(p.yaw);

  const chaseBack = 7.1 + speedT * 3.4;
  const chaseHeight = 2.42 + speedT * 1.1;
  const chasePos = camVecB.set(
    carPos.x - fx * chaseBack + rx * 0.18,
    chaseHeight,
    carPos.z - fz * chaseBack + rz * 0.18
  );
  const lookAhead = 7 + speedT * 6;
  const chaseLook = camVecC.set(
    carPos.x + fx * lookAhead,
    0.92,
    carPos.z + fz * lookAhead
  );
  fov = 58 + speedT * 14;

  let desired = chasePos;
  let look = chaseLook;
  let rigid = false;

  if (race.cameraMode === 1) {
    desired = camVecB.set(
      carPos.x - fx * 17 + rx * 5,
      7.2,
      carPos.z - fz * 17 + rz * 5
    );
    look = camVecC.set(carPos.x + fx * 14, 1.0, carPos.z + fz * 14);
    fov = 48;
  } else if (race.cameraMode === 2) {
    // Cockpit: rigidly attached, no smoothing lag at all.
    desired = camVecB.set(
      carPos.x + cfx * 0.34 + Math.cos(p.yaw) * 0.02,
      1.16,
      carPos.z + cfz * 0.34 - Math.sin(p.yaw) * 0.02
    );
    look = camVecC.set(carPos.x + cfx * 34, 0.82, carPos.z + cfz * 34);
    fov = 76;
    rigid = true;
  }

  if (race.state === 'countdown') {
    const k = smoothstep(0, 1, clamp(race.countdownT / 3.2, 0, 1));
    const introPos = camVecD.set(
      carPos.x - fx * 32 + rx * 16,
      24,
      carPos.z - fz * 32 + rz * 16
    );
    const introLook = camVecC.set(carPos.x + fx * 14, 0.6, carPos.z + fz * 14);
    desired = introPos.clone().lerp(chasePos, k);
    look = introLook.clone().lerp(chaseLook, k);
    fov = lerp(52, 60, k);
    rigid = false;
  }

  if (race.state === 'finished') {
    race.resultsOrbit = (race.resultsOrbit || 0) + dt * 0.22;
    const a = race.resultsOrbit + 1.2;
    desired = camVecB.set(carPos.x + Math.cos(a) * 9.5, 3.4 + Math.sin(a * 0.7) * 0.6, carPos.z + Math.sin(a) * 9.5);
    look = camVecC.set(carPos.x, 0.8, carPos.z);
    fov = 44;
    rigid = false;
  }

  if (!race.cameraReady) {
    race.camSmooth.copy(desired);
    race.camLook.copy(look);
    race.camera.fov = fov;
    race.cameraReady = true;
  } else if (rigid) {
    race.camSmooth.copy(desired);
    race.camLook.copy(look);
    race.camera.fov = fov;
  } else {
    // The heading is already smoothed, so a firm spring keeps the camera
    // glued to the car without wobbling or overshooting.
    const posLambda = race.state === 'countdown' ? 4.8 : 15 + speedT * 9;
    race.camSmooth.lerp(desired, 1 - Math.exp(-posLambda * dt));
    race.camLook.lerp(look, 1 - Math.exp(-20 * dt));
    race.camera.fov = damp(race.camera.fov, fov, 5, dt);
  }
  race.camera.updateProjectionMatrix();
  race.camera.position.copy(race.camSmooth);

  const impactKick = race.impactShake || 0;
  race.impactShake = impactKick * Math.exp(-7 * dt);
  const shake = ((p.onKerb ? 0.028 : 0) + (p.offroad ? 0.055 : 0) + impactKick + speedT * 0.006) *
    (rigid ? 0.35 : 1);
  if (shake > 0.001 && race.state !== 'paused') {
    // Smooth pseudo-noise instead of per-frame random: a rumble, not a glitch.
    race.shakeT = (race.shakeT || 0) + dt;
    const s = race.shakeT;
    const sx = Math.sin(s * 43.7) * 0.55 + Math.sin(s * 19.3 + 1.1) * 0.45;
    const sy = Math.sin(s * 37.1 + 2.3) * 0.6 + Math.sin(s * 26.9) * 0.4;
    const sz = Math.sin(s * 51.3 + 0.7) * 0.5 + Math.sin(s * 15.7 + 3.1) * 0.5;
    race.camera.position.x += sx * shake;
    race.camera.position.y += sy * shake * 0.65;
    race.camera.position.z += sz * shake;
  }
  race.camera.lookAt(race.camLook);
}

/* ═══════════════════════════════════════════════════════════════════
   Countdown & race tick
   ═══════════════════════════════════════════════════════════════════ */
const COUNT_STEPS = [[0, '3'], [1.1, '2'], [2.2, '1'], [3.2, 'GO']];

function startRaceNow() {
  const r = race;
  r.state = 'racing';
  r.time = 0;
  r.player.lapStart = 0;
  r.goVisibleUntil = 950;
  r.world.setStartLights(0);
  audio.countdown('go');
  dom.countdown.classList.add('show');
  setTimeout(() => {
    if (race && race.state === 'racing') {
      showRaceMessage('AUTO THROTTLE', 'FOCUS ON STEERING · W/S OVERRIDE', 2400);
    }
  }, 1100);
}

function updateCountdown(dt) {
  const r = race;
  r.countdownT += dt;
  const c = r.countdownT;
  let step = -1;
  for (let i = 0; i < COUNT_STEPS.length; i++) if (c >= COUNT_STEPS[i][0]) step = i;
  if (step !== r.countdownStep) {
    r.countdownStep = step;
    if (step >= 0) {
      const label = COUNT_STEPS[step][1];
      dom.countdownValue.textContent = label === 'GO' ? 'LIGHTS OUT' : label;
      dom.countdownValue.classList.toggle('go', label === 'GO');
      const small = dom.countdown.querySelector('small');
      if (small) small.textContent = label === 'GO' ? 'GO GO GO' : 'LIGHTS OUT IN';
      dom.countdown.classList.remove('tick');
      void dom.countdown.offsetWidth;
      dom.countdown.classList.add('tick');
      if (label !== 'GO') audio.countdown(3);
    }
  }
  const lights = c < 0.35 ? 0 : clamp(Math.floor((c - 0.35) / 0.47) + 1, 0, 5);
  r.world.setStartLights(c >= 3.2 ? 0 : lights);
  if (c >= 3.2 && r.state === 'countdown') startRaceNow();
}

function finishRace() {
  const p = race.player;
  if (p.finished) return;
  p.finished = true;
  p.finishTime = race.time;
  p.finishPosition = 1 + race.ai.filter((a) => a.finished && a.finishTime != null && a.finishTime <= p.finishTime).length;
  p.drs = false;
  race.state = 'finished';
  race.resultsTimer = 0;
  race.resultsShown = false;
  race.resultsOrbit = 0;
  race.playerCar.setDRS(false);
  if (p.bestLap) writeBest(race.track.seed, p.bestLap);
  try {
    const saved = readSavedCircuit();
    if (saved && saved.seed === race.track.seed && p.bestLap) {
      saved.bestLap = Math.round(p.bestLap);
      saveLastCircuit(saved);
    }
  } catch {}
  audio.setPaused(true);
  showRaceMessage('FINISH', 'CHECKERED FLAG', 2400, true);
  dom.controlsHint.classList.add('is-faded');
  dom.offTrack.classList.remove('show');
}

function updateRace(dt) {
  if (!race) return;
  const t = performance.now() / 1000;
  race.world.update(t, dt);
  audio.update({
    speed: Math.abs(race.player.vLong),
    throttle: race.player.throttle,
    brake: race.player.brake,
    slip: Math.abs(race.player.vLat),
    offroad: race.player.offroad,
    running: race.state === 'racing'
  });

  if (race.state === 'countdown') {
    updateCountdown(dt);
    updateRaceCamera(dt);
    updateHUD(dt);
    return;
  }

  if (race.state === 'racing') {
    race.time += dt * 1000;
    updatePlayerPhysics(dt);
    updateAI(dt);
    resolveCarCollisions(dt);
    updatePlayerVisual(dt);
    updatePlayerProgress(dt);
    recordGapHistory();
    race.smoke.update(dt);
    updateRaceCamera(dt);
    updateHUD(dt);
    if (race.goVisibleUntil && race.time > race.goVisibleUntil) {
      dom.countdown.classList.remove('show');
      race.goVisibleUntil = 0;
    }
    return;
  }

  if (race.state === 'finished') {
    updatePlayerPhysics(dt);
    updateAI(dt);
    resolveCarCollisions(dt);
    updatePlayerVisual(dt);
    race.smoke.update(dt);
    updateRaceCamera(dt);
    updateHUD(dt);
    race.resultsTimer += dt;
    if (race.resultsTimer > 1.7 && !race.resultsShown) showResults();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Results / pause / navigation
   ═══════════════════════════════════════════════════════════════════ */
function showResults() {
  const p = race.player;
  const tr = race.track;
  const playerTime = p.finishTime || race.time;
  const rows = race.ai.map((a) => {
    const progress = a.dist / tr.length;
    const lap = clamp(Math.floor(a.dist / tr.length) + 1, 1, race.totalLaps);
    if (a.finished && a.finishTime != null) {
      return { name: a.name, color: a.color, time: a.finishTime, lap: `${lap}/${race.totalLaps}`, finished: true, progress };
    }
    const remaining = Math.max(0, race.totalLaps * tr.length - a.dist);
    const eta = playerTime + (remaining / Math.max(a.speed, 24)) * 1000;
    return { name: a.name, color: a.color, time: eta, lap: `${Math.min(lap, race.totalLaps)}/${race.totalLaps}`, finished: false, progress };
  });
  rows.push({ name: 'YOU', color: playerPaint, time: playerTime, lap: `${race.totalLaps}/${race.totalLaps}`, finished: true, isPlayer: true, progress: race.totalLaps });
  rows.sort((a, b) => a.time - b.time);
  const pos = rows.findIndex((r) => r.isPlayer) + 1;
  p.finishPosition = pos;

  dom.resultsPosition.textContent = `P${pos}`;
  dom.resultsPlaceLabel.textContent = pos === 1 ? 'WINNER' : pos === 2 ? 'RUNNER-UP' : pos === 3 ? 'PODIUM' : 'FINISHER';
  dom.resultsTrackName.textContent = `${tr.name.toUpperCase()} · ${tr.suffix}`;
  const titles = {
    1: ['LIGHTS', 'OUT.', 'You drew it. You owned it.', 'A perfect first lap of your own imagination.'],
    2: ['SO', 'CLOSE.', 'Half a breath from victory.', 'The line was yours. The win was almost yours too.'],
    3: ['ON THE', 'PODIUM.', 'A trophy on debut.', 'Your hand drew a circuit worth spraying champagne over.'],
    4: ['ROOKIE', 'RUN.', 'The track won this round.', 'Shake it off. Redraw. Come back angrier.']
  };
  const t = titles[pos] || titles[4];
  dom.resultsTitle.innerHTML = `${t[0]}<br><em>${t[1]}</em>`;
  dom.resultsSummary.textContent = t[2];
  dom.resultsTime.textContent = formatTime(playerTime);
  dom.resultsBest.textContent = p.bestLap ? formatTime(p.bestLap) : '—:—.———';
  dom.resultsTop.innerHTML = `${Math.round(p.topSpeed)}<small>KM/H</small>`;
  dom.resultsLength.innerHTML = `${Math.round(tr.length).toLocaleString()}<small>M</small>`;
  dom.resultsRows.innerHTML = rows.map((r, i) => {
    const time = r.finished ? formatTime(r.time) : `+${Math.max(0, (r.time - playerTime) / 1000).toFixed(1)}s`;
    return `<div class="results-row${r.isPlayer ? ' is-player' : ''}">
      <span class="r-pos">${i + 1}</span>
      <span class="r-name"><i style="background:${r.color}"></i>${r.name}</span>
      <span class="r-lap">${r.lap}</span>
      <span class="r-time">${time}</span>
    </div>`;
  }).join('');
  showModal(dom.results, true);
  race.resultsShown = true;
  audio.setPaused(true);
  if (p.bestLap) writeBest(tr.seed, p.bestLap);
  updateMenuCard();
}

function pauseRace() {
  if (!race || race.state !== 'racing') return;
  race.state = 'paused';
  const standings = getStandings();
  const pos = standings.findIndex((r) => r.isPlayer) + 1;
  dom.pausePosition.textContent = `P${pos}`;
  dom.pauseLap.textContent = `${Math.min(race.totalLaps, race.player.lapsCompleted + 1)} / ${race.totalLaps}`;
  dom.pauseBest.textContent = race.player.bestLap ? formatTime(race.player.bestLap) : '—';
  showModal(dom.pause, true);
  audio.setPaused(true);
  dom.controlsHint.classList.add('is-faded');
}

function resumeRace() {
  if (!race || race.state !== 'paused') return;
  race.state = 'racing';
  showModal(dom.pause, false);
  audio.setPaused(false);
}

function restartRace() {
  if (!race) return;
  showModal(dom.pause, false);
  showModal(dom.results, false);
  resetRaceState();
  showRaceHud(true);
}

function goToDraw() {
  showModal(dom.pause, false);
  showModal(dom.results, false);
  showRaceHud(false);
  dom.webgl.classList.add('is-hidden');
  disposeRace();
  appState = 'draw';
  hideAllScreens();
  setScreen('draw');
  dom.webgl.classList.add('is-hidden');
  drawScreen.start();
  drawScreen.reset();
  updateMenuCard();
  updateDrawStats(null);
  dom.drawStatus.textContent = 'DRAW A CLOSED LOOP';
}

/* ═══════════════════════════════════════════════════════════════════
   Navigation
   ═══════════════════════════════════════════════════════════════════ */
function startDrawing() {
  audio.ensure();
  audio.click(620);
  appState = 'draw';
  hideAllScreens();
  setScreen('draw');
  dom.webgl.classList.add('is-hidden');
  showRaceHud(false);
  drawScreen.start();
  drawScreen.reset();
  updateMenuCard();
  updateDrawStats(null);
}

/* ═══════════════════════════════════════════════════════════════════
   Input
   ═══════════════════════════════════════════════════════════════════ */
const KEYMAP = {
  KeyW: 'gas', ArrowUp: 'gas',
  KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'handbrake'
};

function setKey(code, down) {
  const action = KEYMAP[code];
  if (!action) return false;
  input[action] = down;
  return true;
}

window.addEventListener('keydown', (e) => {
  if (setKey(e.code, true)) {
    if (appState === 'race') e.preventDefault();
    return;
  }
  if (e.repeat) return;
  if (e.code === 'Escape' && appState === 'garage') {
    if (document.activeElement === dom.garageHex) dom.garageHex.blur();
    else enterMenu();
    e.preventDefault();
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (appState !== 'race' || !race) return;
    if (race.state === 'paused') resumeRace();
    else if (race.state === 'racing') pauseRace();
    e.preventDefault();
  } else if (e.code === 'KeyM') {
    audio.toggle();
    refreshSoundUI();
  } else if (e.code === 'KeyC' && appState === 'race' && race) {
    race.cameraMode = (race.cameraMode + 1) % 3;
    const names = ['CHASE CAM', 'WIDE CAM', 'ONBOARD CAM'];
    toast(names[race.cameraMode]);
    audio.click(520);
  } else if (e.code === 'KeyR' && appState === 'race' && race && race.state === 'racing') {
    recoverPlayer(false);
    toast('Reset to the racing line');
  }
});

window.addEventListener('keyup', (e) => {
  if (setKey(e.code, false) && appState === 'race') e.preventDefault();
});

window.addEventListener('blur', () => {
  for (const k of Object.keys(input)) input[k] = false;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && appState === 'race' && race?.state === 'racing') pauseRace();
});

function wireTouchControls() {
  const buttons = document.querySelectorAll('[data-touch]');
  for (const btn of buttons) {
    const key = btn.dataset.touch;
    const prop = key === 'left' ? 'touchLeft' : key === 'right' ? 'touchRight' : key === 'gas' ? 'touchGas' : 'touchBrake';
    const set = (v) => {
      input[prop] = v;
      btn.classList.toggle('is-down', v);
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audio.ensure();
      set(true);
      btn.setPointerCapture?.(e.pointerId);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      btn.addEventListener(ev, () => set(false));
    }
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Events
   ═══════════════════════════════════════════════════════════════════ */

function wireEvents() {
  dom.setupLaps.addEventListener('change', () => {
    try { localStorage.setItem('apexink.laps', dom.setupLaps.value); } catch {}
  });
  dom.setupAI.addEventListener('change', () => {
    try { localStorage.setItem('apexink.ai', dom.setupAI.value); } catch {}
  });
  dom.btnStart.addEventListener('click', startDrawing);
  dom.btnGarage.addEventListener('click', enterGarage);
  dom.btnGarageExit.addEventListener('click', () => {
    audio.click(520);
    enterMenu();
  });
  dom.garageColorWheel.addEventListener('input', () => {
    applyGarageColor(dom.garageColorWheel.value, { persist: false });
  });
  dom.garageColorWheel.addEventListener('change', () => {
    audio.ensure();
    applyGarageColor(dom.garageColorWheel.value, { announce: true });
  });
  dom.garageHex.addEventListener('input', () => {
    dom.garageHex.classList.remove('is-invalid');
    const raw = dom.garageHex.value.trim().replace(/^#/, '');
    if (raw.length === 6) {
      const hex = normalizeHex(raw);
      if (hex) applyGarageColor(hex, { persist: false });
    }
  });
  dom.garageHex.addEventListener('blur', () => {
    const hex = normalizeHex(dom.garageHex.value);
    const current = playerLivery[selectedGaragePart] || FACTORY_LIVERY[selectedGaragePart];
    if (hex) {
      applyGarageColor(hex);
      dom.garageHex.value = hex.slice(1);
    } else {
      dom.garageHex.value = current.slice(1);
    }
    dom.garageHex.classList.remove('is-invalid');
  });
  dom.garageHexForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const hex = normalizeHex(dom.garageHex.value);
    if (!hex) {
      dom.garageHex.classList.add('is-invalid');
      dom.garageHint.textContent = 'INVALID HEX · USE #RGB OR #RRGGBB';
      toast('That is not a valid hex colour. Try #FF7A20.');
      audio.click(220);
      return;
    }
    dom.garageHex.classList.remove('is-invalid');
    dom.garageHint.textContent = 'ANY #RRGGBB VALUE ACCEPTED';
    dom.garageHex.value = hex.slice(1);
    applyGarageColor(hex, { announce: true });
  });
  dom.garageReset.addEventListener('click', () => {
    const part = garagePart();
    playerLivery[part.id] = FACTORY_LIVERY[part.id];
    if (part.id === 'body') playerPaint = playerLivery[part.id];
    savePlayerLivery();
    applyLiveryToCar(showroomCar);
    applyLiveryToCar(race?.playerCar);
    updateGarageUI();
    audio.click(520);
    toast(`${part.label} RESET · FACTORY SPEC`);
  });
  dom.garageStickerClear?.addEventListener('click', () => {
    if (!playerLivery.stickers[selectedStickerSlot]) return;
    playerLivery.stickers[selectedStickerSlot] = null;
    savePlayerLivery();
    applyLiveryToCar(showroomCar);
    applyLiveryToCar(race?.playerCar);
    updateGarageUI();
    audio.click(420);
    toast('STICKER REMOVED');
  });
  dom.btnBackMenu.addEventListener('click', () => {
    drawScreen.stop();
    enterMenu();
  });
  dom.btnClear.addEventListener('click', () => { drawScreen.clear(); audio.click(520); });
  dom.btnUndo.addEventListener('click', () => { drawScreen.undo(); audio.click(480); });
  dom.btnExample.addEventListener('click', () => {
    audio.ensure();
    drawScreen.loadRandom();
    audio.click(740);
  });
  dom.btnBuild.addEventListener('click', () => {
    const result = drawScreen.getResult();
    if (!result) return;
    beginBuild(result.points);
  });
  dom.btnLastTrack.addEventListener('click', () => {
    if (!lastCircuit) return;
    audio.ensure();
    beginBuild(lastCircuit.points);
  });

  dom.soundButtons.forEach((btn) => {
    btn?.addEventListener('click', () => {
      audio.ensure();
      audio.toggle();
      refreshSoundUI();
    });
  });
  dom.btnSoundPause.addEventListener('click', () => {
    audio.ensure();
    audio.toggle();
    refreshSoundUI();
  });

  dom.btnPause.addEventListener('click', pauseRace);
  dom.btnResume.addEventListener('click', resumeRace);
  dom.btnRestartRace.addEventListener('click', restartRace);
  dom.btnNewTrack.addEventListener('click', goToDraw);
  dom.btnRaceAgain.addEventListener('click', restartRace);
  dom.btnResultsNew.addEventListener('click', goToDraw);
  wireTouchControls();
}

/* ═══════════════════════════════════════════════════════════════════
   Resize
   ═══════════════════════════════════════════════════════════════════ */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 800 ? 1.5 : 1.8));
  renderer.setSize(w, h, false);
  if (showroom) {
    showroom.camera.aspect = w / h;
    showroom.camera.updateProjectionMatrix();
  }
  if (race) {
    race.camera.aspect = w / h;
    race.camera.updateProjectionMatrix();
  }
}
window.addEventListener('resize', onResize);

/* ═══════════════════════════════════════════════════════════════════
   Main loop
   ═══════════════════════════════════════════════════════════════════ */
let lastFrame = performance.now();

function loop(now) {
  const dt = Math.min(0.05, Math.max(0.0001, (now - lastFrame) / 1000));
  lastFrame = now;

  if ((appState === 'menu' || appState === 'garage') && showroom) {
    showroom.update(now / 1000, dt);
    renderer.render(showroom.scene, showroom.camera);
  } else if ((appState === 'race') && race) {
    if (race.state !== 'paused') updateRace(dt);
    renderer.render(race.world.scene, race.camera);
  }
  requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════════════
   Boot
   ═══════════════════════════════════════════════════════════════════ */
function demoPoints(index = 0) {
  const ex = EXAMPLE_TRACKS[index % EXAMPLE_TRACKS.length];
  return ex.points.map(([x, y]) => ({ x: 80 + x * 1000, y: 60 + y * 560 }));
}

async function boot() {
  buildSpeedoTicks();
  initDifficultyUI();
  buildGarageParts();
  buildGarageSwatches();
  buildGarageStickers();
  initDrawScreen();
  refreshSoundUI();
  wireEvents();
  initShowroom();
  updateMenuCard();
  enterMenu();
  onResize();
  dom.loading.classList.add('is-done');
  setTimeout(() => { dom.loading.style.display = 'none'; }, 900);
  requestAnimationFrame(loop);

  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (demo === 'garage') {
    setTimeout(enterGarage, 300);
  } else if (demo === 'draw') {
    setTimeout(() => {
      startDrawing();
      setTimeout(() => drawScreen.loadExample(0), 450);
    }, 300);
  } else if (demo === 'race') {
    setTimeout(async () => {
      await beginBuild(demoPoints(Number(params.get('track') || 0)), { instant: true });
      if (params.get('go') === '1' && race) {
        race.countdownT = 3.4;
        race.countdownStep = 3;
        startRaceNow();
        dom.countdownValue.textContent = 'LIGHTS OUT';
        dom.countdownValue.classList.add('go');
        setTimeout(() => dom.countdown.classList.remove('show'), 200);
      }
      if (params.get('input') === '1') {
        input.gas = true;
        setTimeout(() => { input.right = true; }, 1200);
      }
    }, 350);
  }

  window.__apex = {
    get state() { return appState; },
    get race() { return race; },
    get drawScreen() { return drawScreen; },
    startDrawing,
    beginBuild,
    enterMenu,
    enterGarage,
    goToDraw,
    startRaceNow,
    pauseRace,
    resumeRace,
    restartRace,
    setPaint: (hex) => {
      const value = normalizeHex(hex);
      if (!value) return false;
      playerLivery.body = value;
      playerPaint = value;
      savePlayerLivery();
      applyLiveryToCar(showroomCar);
      applyLiveryToCar(race?.playerCar);
      updateGarageUI();
      return true;
    },
    demoPoints,
    demoRace: (index = 0, opts = {}) => beginBuild(demoPoints(index), { instant: true, ...opts }),
    setDemoInput: (obj) => Object.assign(input, obj),
    tick: (dt = 1 / 60) => { if (race && race.state !== 'paused') updateRace(dt); }
  };
}

boot().catch((err) => {
  console.error(err);
  dom.loading.classList.add('is-done');
  toast('Something went wrong starting the engine. Check the console.');
});

