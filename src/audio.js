/* ═══════════════════════════════════════════════════════════════════
   Tiny WebAudio engine — synthesized F1 engine, tyres and UI
   ═══════════════════════════════════════════════════════════════════ */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineGain = null;
    this.running = false;
    this.muted = false;
    try { this.muted = localStorage.getItem('apexink.muted') === '1'; } catch {}
    this.lastSpeed = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    return this.ctx;
  }

  setMuted(muted, persist = true) {
    this.muted = muted;
    if (persist) { try { localStorage.setItem('apexink.muted', muted ? '1' : '0'); } catch {} }
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, this.ctx.currentTime + 0.15);
    }
  }

  toggle() {
    this.setMuted(!this.muted);
    if (!this.muted) this.click(880, 0.03, 0.1);
    return this.muted;
  }

  tone(freq, dur = 0.08, gain = 0.06, type = 'sine', when = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  click(freq = 660) {
    this.tone(freq, 0.05, 0.035, 'triangle');
  }

  countdown(step) {
    if (step === 'go') {
      this.tone(880, 0.4, 0.09, 'sawtooth');
      this.tone(1320, 0.35, 0.04, 'sine');
    } else {
      this.tone(440, 0.12, 0.07, 'square');
    }
  }

  buildStep(index) {
    this.tone(300 + index * 90, 0.1, 0.03, 'triangle');
  }

  // Wheel-to-wheel contact: a low thump plus a short carbon crunch.
  impact(strength = 0.5) {
    const ctx = this.ensure();
    if (!ctx) return;
    const power = Math.max(0, Math.min(1, strength));
    const t = ctx.currentTime;

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(120 + power * 90, t);
    thump.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    thumpGain.gain.setValueAtTime(0.0001, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.06 + power * 0.1, t + 0.01);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    thump.connect(thumpGain);
    thumpGain.connect(this.master);
    thump.start(t);
    thump.stop(t + 0.26);

    const crunch = ctx.createBufferSource();
    crunch.buffer = this._noiseBuffer(0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 + power * 2200;
    filter.Q.value = 0.8;
    const crunchGain = ctx.createGain();
    crunchGain.gain.setValueAtTime(0.0001, t);
    crunchGain.gain.exponentialRampToValueAtTime(0.03 + power * 0.07, t + 0.006);
    crunchGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    crunch.connect(filter);
    filter.connect(crunchGain);
    crunchGain.connect(this.master);
    crunch.start(t);
    crunch.stop(t + 0.2);
  }

  _noiseBuffer(seconds = 2) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // Short exhaust pop / overrun crackle.
  _crackle(when, power = 0.6) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this._crackleBuffer) this._crackleBuffer = this._noiseBuffer(0.25);
    const dur = 0.035 + Math.random() * 0.05;
    const src = ctx.createBufferSource();
    src.buffer = this._crackleBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800 + Math.random() * 2800;
    bp.Q.value = 0.7 + Math.random() * 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.05 * power, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.raceBus);
    src.start(when, Math.random() * 0.1);
    src.stop(when + dur + 0.02);
  }

  startRace() {
    const ctx = this.ensure();
    if (!ctx || this.running) return;
    this.running = true;
    const now = ctx.currentTime;

    // Everything on the car routes through one bus so pause silences the lot.
    this.raceBus = ctx.createGain();
    this.raceBus.gain.setValueAtTime(0.0001, now);
    this.raceBus.gain.exponentialRampToValueAtTime(1, now + 0.4);
    this.raceBus.connect(this.master);

    // ── engine core ────────────────────────────────────────────────
    // A V6 four-stroke fires three times per crank revolution: at 15,000 rpm
    // that is a 750 Hz fundamental, rich with harmonics. That high, hard
    // buzz is what makes an F1 car sound like an F1 car.
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, now);
    this.engineGain.gain.exponentialRampToValueAtTime(0.085, now + 0.55);
    this.engineGain.connect(this.raceBus);

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 1200;
    this.engineFilter.Q.value = 1.15;

    // Resonant exhaust peak adds the metallic snarl on top of the buzz.
    this.exhaustFilter = ctx.createBiquadFilter();
    this.exhaustFilter.type = 'peaking';
    this.exhaustFilter.frequency.value = 2400;
    this.exhaustFilter.Q.value = 0.85;
    this.exhaustFilter.gain.value = 5;

    this.raspShaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 2.3) * 0.82;
    }
    this.raspShaper.curve = curve;
    this.raspShaper.oversample = '2x';

    const mix = ctx.createGain();
    mix.gain.value = 0.5;
    this.engineFilter.connect(mix);
    mix.connect(this.exhaustFilter);
    this.exhaustFilter.connect(this.raspShaper);
    this.raspShaper.connect(this.engineGain);

    const addOsc = (type, freq, gain) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(this.engineFilter);
      o.start(now);
      return o;
    };
    this.oscA = addOsc('sawtooth', 225, 0.55);   // firing frequency
    this.oscB = addOsc('sawtooth', 226.4, 0.4);  // detuned twin, gives bite
    this.oscC = addOsc('square', 112.5, 0.13);   // half-order body
    this.oscD = addOsc('sawtooth', 450, 0.2);    // upper harmonic scream
    this.oscE = addOsc('sine', 56, 0.18);        // sub thump

    // ── turbo / MGU-H whine ────────────────────────────────────────
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0.0001;
    this.turboGain.connect(this.raceBus);
    this.turboOsc = ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.value = 2600;
    this.turboOsc.connect(this.turboGain);
    this.turboOsc.start(now);
    const turbo2Gain = ctx.createGain();
    turbo2Gain.gain.value = 0.35;
    this.turboOsc2 = ctx.createOscillator();
    this.turboOsc2.type = 'triangle';
    this.turboOsc2.frequency.value = 3900;
    this.turboOsc2.connect(turbo2Gain);
    turbo2Gain.connect(this.turboGain);
    this.turboOsc2.start(now);

    // ── intake roar ────────────────────────────────────────────────
    this.intakeGain = ctx.createGain();
    this.intakeGain.gain.value = 0.0001;
    this.intakeGain.connect(this.raceBus);
    const intakeSrc = ctx.createBufferSource();
    intakeSrc.buffer = this._noiseBuffer(2);
    intakeSrc.loop = true;
    const intakeFilter = ctx.createBiquadFilter();
    intakeFilter.type = 'bandpass';
    intakeFilter.frequency.value = 1100;
    intakeFilter.Q.value = 0.6;
    intakeSrc.connect(intakeFilter);
    intakeFilter.connect(this.intakeGain);
    intakeSrc.start(now);
    this.intakeSrc = intakeSrc;
    this.intakeFilter = intakeFilter;

    // ── tyre noise ─────────────────────────────────────────────────
    this.tyreGain = ctx.createGain();
    this.tyreGain.gain.value = 0.0001;
    const tyreSrc = ctx.createBufferSource();
    tyreSrc.buffer = this._noiseBuffer(2);
    tyreSrc.loop = true;
    const tyreFilter = ctx.createBiquadFilter();
    tyreFilter.type = 'bandpass';
    tyreFilter.frequency.value = 1600;
    tyreFilter.Q.value = 1.2;
    tyreSrc.connect(tyreFilter);
    tyreFilter.connect(this.tyreGain);
    this.tyreGain.connect(this.raceBus);
    tyreSrc.start(now);

    // ── wind rush ──────────────────────────────────────────────────
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0001;
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this._noiseBuffer(3);
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 900;
    windSrc.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.raceBus);
    windSrc.start(now);

    this.tyreSrc = tyreSrc;
    this.windSrc = windSrc;

    // gear / rpm memory for shifts and overrun pops
    this.lastGear = 0;
    this.lastRpm = 0.3;
    this.lastThrottle = 0;
    this.crackleCooldown = 0;
    this.shiftUntil = 0;
  }

  stopRace() {
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    this.raceBus?.gain.cancelScheduledValues(t);
    this.raceBus?.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    const oscs = [this.oscA, this.oscB, this.oscC, this.oscD, this.oscE, this.turboOsc, this.turboOsc2];
    oscs.forEach((o) => { try { o?.stop(t + 0.5); } catch {} });
    [this.tyreSrc, this.windSrc, this.intakeSrc].forEach((s) => { try { s?.stop(t + 0.5); } catch {} });
    this.running = false;
    this.oscA = this.oscB = this.oscC = this.oscD = this.oscE = null;
    this.turboOsc = this.turboOsc2 = null;
    this.tyreSrc = this.windSrc = this.intakeSrc = null;
  }

  setPaused(paused) {
    if (!this.ctx || !this.raceBus) return;
    const t = this.ctx.currentTime;
    this.raceBus.gain.cancelScheduledValues(t);
    this.raceBus.gain.setTargetAtTime(paused ? 0.0001 : 1, t, 0.06);
  }

  update({ speed = 0, throttle = 0, brake = 0, slip = 0, offroad = false, running = true }) {
    if (!this.ctx || !this.engineGain || !this.running) return;
    const t = this.ctx.currentTime;
    const kmh = speed * 3.6;

    // Eight-speed gearbox: the note climbs through each gear and snaps back
    // on the upshift, just like a real onboard.
    const gearTops = [70, 115, 158, 200, 242, 280, 316, 360];
    let gear = 0;
    while (gear < gearTops.length - 1 && kmh > gearTops[gear]) gear++;
    const gearLo = gear === 0 ? 0 : gearTops[gear - 1];
    const gearFrac = Math.min(1, Math.max(0, (kmh - gearLo) / (gearTops[gear] - gearLo)));
    let rpm = kmh < 1.5 ? 0.3 : 0.3 + gearFrac * 0.7;
    rpm = Math.min(1.02, rpm + throttle * 0.025);

    const prevGear = this.lastGear;
    this.lastGear = gear;
    const prevThrottle = this.lastThrottle;
    this.lastThrottle = throttle;

    if (gear !== prevGear && prevGear !== 0 && kmh > 20) {
      this.shiftUntil = t + 0.1;
      this._crackle(t + 0.01, 0.9);
    }

    // Overrun: off-throttle at revs spits unburnt fuel out of the exhaust.
    if (prevThrottle > 0.3 && throttle < 0.12 && rpm > 0.4 && t > this.crackleCooldown) {
      this.crackleCooldown = t + 0.12 + Math.random() * 0.28;
      const pops = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pops; i++) {
        this._crackle(t + 0.02 + Math.random() * 0.09, 0.35 + Math.random() * 0.6);
      }
    }
    this.crackleCooldown = Math.max(0, this.crackleCooldown);

    // 750 Hz at 15,000 rpm — the classic F1 firing frequency.
    const f = rpm * 750;
    this.oscA.frequency.setTargetAtTime(f, t, 0.03);
    this.oscB.frequency.setTargetAtTime(f * 1.006 + 1.7, t, 0.03);
    this.oscC.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.oscD.frequency.setTargetAtTime(f * 2.005, t, 0.03);
    this.oscE.frequency.setTargetAtTime(f * 0.25 + 18, t, 0.03);

    // Brightness and snarl track revs and throttle.
    this.engineFilter.frequency.setTargetAtTime(750 + rpm * 3900 + throttle * 950, t, 0.06);
    this.exhaustFilter.frequency.setTargetAtTime(1500 + rpm * 1900, t, 0.08);
    this.exhaustFilter.gain.setTargetAtTime(3.5 + throttle * 4.5, t, 0.1);

    const shifting = this.shiftUntil > t;
    const level = 0.05 + throttle * 0.05 + rpm * 0.025;
    this.engineGain.gain.setTargetAtTime(shifting ? level * 0.7 : level, t, 0.035);

    // Turbo whistle rises with revs and boost.
    const turboF = 1500 + rpm * 2900 + throttle * 280;
    this.turboOsc.frequency.setTargetAtTime(turboF, t, 0.08);
    this.turboOsc2.frequency.setTargetAtTime(turboF * 1.51, t, 0.08);
    this.turboGain.gain.setTargetAtTime(0.0015 + throttle * 0.007 * rpm + Math.max(0, rpm - 0.3) * 0.003, t, 0.1);

    // Intake roar builds with throttle.
    this.intakeFilter.frequency.setTargetAtTime(800 + rpm * 1500, t, 0.1);
    this.intakeGain.gain.setTargetAtTime(0.002 + throttle * 0.013 + rpm * 0.003, t, 0.08);

    const tyreLevel = Math.min(0.06, slip * 0.012 + (brake > 0.5 ? slip * 0.009 : 0));
    this.tyreGain.gain.setTargetAtTime(offroad ? 0.02 + speed * 0.0003 : tyreLevel, t, 0.06);
    this.windGain.gain.setTargetAtTime(Math.min(0.03, speed * 0.00028), t, 0.15);
  }
}

export const audio = new AudioEngine();
