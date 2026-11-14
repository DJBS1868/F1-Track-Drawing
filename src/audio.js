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

  // Team-radio chirp: two short squelch blips before the pit call.
  radio() {
    this.tone(1450, 0.045, 0.028, 'square');
    this.tone(1180, 0.05, 0.026, 'square', 0.07);
    this.tone(1620, 0.07, 0.022, 'square', 0.17);
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
    this.raceBus.gain.exponentialRampToValueAtTime(1, now + 0.35);
    this.raceBus.connect(this.master);

    // ── engine core ────────────────────────────────────────────────
    // A V6 four-stroke fires three times per crank revolution, so at
    // 12,000 rpm the firing frequency is 600 Hz. The sound is a dense
    // harmonic stack, not a clean tone: several detuned saws feed an
    // asymmetric waveshaper, then resonant exhaust and body filters.
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, now);
    this.engineGain.gain.exponentialRampToValueAtTime(0.06, now + 0.55);
    this.engineGain.connect(this.raceBus);

    this.engineHighpass = ctx.createBiquadFilter();
    this.engineHighpass.type = 'highpass';
    this.engineHighpass.frequency.value = 55;
    this.engineHighpass.Q.value = 0.7;

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 4200;
    this.engineFilter.Q.value = 0.9;

    this.bodyFilter = ctx.createBiquadFilter();
    this.bodyFilter.type = 'peaking';
    this.bodyFilter.frequency.value = 240;
    this.bodyFilter.Q.value = 0.8;
    this.bodyFilter.gain.value = 4;

    this.exhaustFilter = ctx.createBiquadFilter();
    this.exhaustFilter.type = 'peaking';
    this.exhaustFilter.frequency.value = 950;
    this.exhaustFilter.Q.value = 1.05;
    this.exhaustFilter.gain.value = 4;

    this.screamFilter = ctx.createBiquadFilter();
    this.screamFilter.type = 'peaking';
    this.screamFilter.frequency.value = 2600;
    this.screamFilter.Q.value = 0.7;
    this.screamFilter.gain.value = 3;

    this.raspShaper = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      // Asymmetry adds even harmonics; tanh adds the odd ones.
      curve[i] = Math.tanh(2.4 * x + 0.55 * x * x) * 0.92;
    }
    this.raspShaper.curve = curve;
    this.raspShaper.oversample = '2x';

    // The asymmetric shaper creates a DC offset; block it before the
    // resonant filters so it cannot eat headroom.
    this.dcBlock = ctx.createBiquadFilter();
    this.dcBlock.type = 'highpass';
    this.dcBlock.frequency.value = 35;
    this.dcBlock.Q.value = 0.7;

    this.preGain = ctx.createGain();
    this.preGain.gain.value = 0.8;

    this.oscMix = ctx.createGain();
    this.oscMix.gain.value = 0.5;
    this.oscMix.connect(this.preGain);
    this.preGain.connect(this.engineHighpass);
    this.engineHighpass.connect(this.raspShaper);
    this.raspShaper.connect(this.dcBlock);
    this.dcBlock.connect(this.engineFilter);
    this.engineFilter.connect(this.bodyFilter);
    this.bodyFilter.connect(this.exhaustFilter);
    this.exhaustFilter.connect(this.screamFilter);
    this.screamFilter.connect(this.engineGain);

    const addOsc = (type, freq, gain) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(this.oscMix);
      o.start(now);
      return o;
    };
    this.oscA = addOsc('sawtooth', 300, 0.34);    // firing frequency
    this.oscB = addOsc('sawtooth', 301.4, 0.26);  // detuned twin, gives beat
    this.oscC = addOsc('square', 150, 0.1);       // half-order body
    this.oscD = addOsc('sawtooth', 450, 0.14);    // upper harmonic
    this.oscE = addOsc('sawtooth', 600, 0.08);    // metallic edge
    this.oscSub = addOsc('sine', 75, 0.12);       // sub thump

    // Exhaust rasp: noise pushed through a band-pass that tracks the
    // firing frequency. This is the gritty part that makes it sound like
    // burnt fuel rather than a synth.
    this.raspGain = ctx.createGain();
    this.raspGain.gain.value = 0.0001;
    this.raspGain.connect(this.oscMix);
    const raspSrc = ctx.createBufferSource();
    raspSrc.buffer = this._noiseBuffer(2);
    raspSrc.loop = true;
    this.raspFilter = ctx.createBiquadFilter();
    this.raspFilter.type = 'bandpass';
    this.raspFilter.frequency.value = 1200;
    this.raspFilter.Q.value = 0.9;
    raspSrc.connect(this.raspFilter);
    this.raspFilter.connect(this.raspGain);
    raspSrc.start(now);
    this.raspSrc = raspSrc;

    // Turbo: filtered air, not a sine whistle. Just enough to hear the
    // compressor breathing under load.
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0.0001;
    this.turboGain.connect(this.engineGain);
    const turboSrc = ctx.createBufferSource();
    turboSrc.buffer = this._noiseBuffer(2);
    turboSrc.loop = true;
    this.turboFilter = ctx.createBiquadFilter();
    this.turboFilter.type = 'bandpass';
    this.turboFilter.frequency.value = 4200;
    this.turboFilter.Q.value = 0.6;
    turboSrc.connect(this.turboFilter);
    this.turboFilter.connect(this.turboGain);
    turboSrc.start(now);
    this.turboSrc = turboSrc;

    // ── intake roar ────────────────────────────────────────────────
    this.intakeGain = ctx.createGain();
    this.intakeGain.gain.value = 0.0001;
    this.intakeGain.connect(this.engineGain);
    const intakeSrc = ctx.createBufferSource();
    intakeSrc.buffer = this._noiseBuffer(2);
    intakeSrc.loop = true;
    this.intakeFilter = ctx.createBiquadFilter();
    this.intakeFilter.type = 'bandpass';
    this.intakeFilter.frequency.value = 1100;
    this.intakeFilter.Q.value = 0.55;
    intakeSrc.connect(this.intakeFilter);
    this.intakeFilter.connect(this.intakeGain);
    intakeSrc.start(now);
    this.intakeSrc = intakeSrc;

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

    // A slow pitch wobble keeps the stack from sounding like a static
    // synth patch. Real engines never hold a perfectly steady note.
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 5.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 3; // cents
    this.lfo.connect(lfoGain);
    [this.oscA, this.oscB, this.oscC, this.oscD, this.oscE, this.oscSub]
      .forEach((o) => lfoGain.connect(o.detune));
    this.lfo.start(now);

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
    const oscs = [this.oscA, this.oscB, this.oscC, this.oscD, this.oscE, this.oscSub, this.lfo];
    oscs.forEach((o) => { try { o?.stop(t + 0.5); } catch {} });
    [this.tyreSrc, this.windSrc, this.intakeSrc, this.raspSrc, this.turboSrc]
      .forEach((s) => { try { s?.stop(t + 0.5); } catch {} });
    this.running = false;
    this.oscA = this.oscB = this.oscC = this.oscD = this.oscE = this.oscSub = null;
    this.lfo = null;
    this.tyreSrc = this.windSrc = this.intakeSrc = this.raspSrc = this.turboSrc = null;
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

    // Eight-speed gearbox. `gearTops` are the shift points in km/h. Real
    // F1 ratios are close together, so a shift only drops the note a
    // little: rpm is read against the current gear's top speed rather than
    // falling back to idle every time.
    const gearTops = [80, 120, 160, 200, 240, 278, 312, 344];
    let gear = 0;
    while (gear < gearTops.length - 1 && kmh > gearTops[gear]) gear++;
    let rpm = 0.3 + 0.7 * Math.min(1, kmh / gearTops[gear]);
    // Revs flare off the line before the car has any speed, then settle
    // into the first gear's normal range.
    if (kmh < 40) rpm = Math.max(rpm, 0.3 + throttle * 0.6 * (1 - kmh / 40));
    rpm = Math.min(1.02, rpm + throttle * 0.015);

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

    // Firing frequency. A four-stroke V6 fires three times per crank
    // revolution, so 12,500 rpm is a 625 Hz fundamental. Saw waves then
    // supply every harmonic above it, which is where the scream lives.
    const f = 185 + rpm * 440;
    this.oscA.frequency.setTargetAtTime(f, t, 0.03);
    this.oscB.frequency.setTargetAtTime(f * 1.0065 + 1.4, t, 0.03);
    this.oscC.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.oscD.frequency.setTargetAtTime(f * 2.004, t, 0.03);
    this.oscE.frequency.setTargetAtTime(f * 3.001, t, 0.03);
    this.oscSub.frequency.setTargetAtTime(f * 0.25 + 16, t, 0.03);

    // Brightness and body track revs and throttle. The lowpass is what
    // turns the raw saw stack into exhaust note rather than a buzzer.
    this.engineFilter.frequency.setTargetAtTime(900 + rpm * 4000 + throttle * 900, t, 0.06);
    this.bodyFilter.frequency.setTargetAtTime(165 + rpm * 55, t, 0.1);
    this.bodyFilter.gain.setTargetAtTime(3 + throttle * 2.5, t, 0.1);
    this.exhaustFilter.frequency.setTargetAtTime(620 + rpm * 980, t, 0.08);
    this.exhaustFilter.gain.setTargetAtTime(3 + throttle * 4.5, t, 0.1);
    this.screamFilter.frequency.setTargetAtTime(2100 + rpm * 1700, t, 0.1);
    this.screamFilter.gain.setTargetAtTime(2 + throttle * 3.2, t, 0.1);

    const shifting = this.shiftUntil > t;
    const level = 0.06 + throttle * 0.085 + rpm * 0.045;
    this.engineGain.gain.setTargetAtTime(shifting ? level * 0.72 : level, t, 0.035);

    // Exhaust rasp: broadband noise band-passed around the exhaust
    // resonance. This is the burnt-fuel grit on top of the harmonics.
    this.raspFilter.frequency.setTargetAtTime(520 + rpm * 2300 + throttle * 700, t, 0.08);
    this.raspGain.gain.setTargetAtTime(0.05 + throttle * 0.22 + rpm * 0.05, t, 0.06);

    // Turbo: filtered air, not a sine whistle, just audible under load.
    this.turboFilter.frequency.setTargetAtTime(1800 + rpm * 3000 + throttle * 700, t, 0.1);
    this.turboGain.gain.setTargetAtTime(0.0015 + throttle * 0.01 * rpm + Math.max(0, rpm - 0.3) * 0.003, t, 0.1);

    // Intake roar builds with throttle.
    this.intakeFilter.frequency.setTargetAtTime(800 + rpm * 1500, t, 0.1);
    this.intakeGain.gain.setTargetAtTime(0.002 + throttle * 0.015 + rpm * 0.004, t, 0.08);

    const tyreLevel = Math.min(0.06, slip * 0.012 + (brake > 0.5 ? slip * 0.009 : 0));
    this.tyreGain.gain.setTargetAtTime(offroad ? 0.02 + speed * 0.0003 : tyreLevel, t, 0.06);
    this.windGain.gain.setTargetAtTime(Math.min(0.03, speed * 0.00028), t, 0.15);
  }
}

export const audio = new AudioEngine();
