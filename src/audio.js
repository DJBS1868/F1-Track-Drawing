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

  _noiseBuffer(seconds = 2) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  startRace() {
    const ctx = this.ensure();
    if (!ctx || this.running) return;
    this.running = true;
    const now = ctx.currentTime;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0001, now);
    this.engineGain.gain.exponentialRampToValueAtTime(0.07, now + 0.5);

    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 700;
    this.engineFilter.Q.value = 1.5;

    this.oscA = ctx.createOscillator();
    this.oscA.type = 'sawtooth';
    this.oscA.frequency.value = 62;
    this.oscB = ctx.createOscillator();
    this.oscB.type = 'square';
    this.oscB.frequency.value = 31;
    this.oscC = ctx.createOscillator();
    this.oscC.type = 'sawtooth';
    this.oscC.frequency.value = 124;
    const gC = ctx.createGain();
    gC.gain.value = 0.18;

    this.oscA.connect(this.engineFilter);
    this.oscB.connect(this.engineFilter);
    this.oscC.connect(gC);
    gC.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.oscA.start(now);
    this.oscB.start(now);
    this.oscC.start(now);

    // tyre noise
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
    this.tyreGain.connect(this.master);
    tyreSrc.start(now);

    // wind noise
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
    this.windGain.connect(this.master);
    windSrc.start(now);

    this.tyreSrc = tyreSrc;
    this.windSrc = windSrc;
  }

  stopRace() {
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    this.engineGain?.gain.cancelScheduledValues(t);
    this.engineGain?.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    this.tyreGain?.gain.linearRampToValueAtTime(0.0001, t + 0.3);
    this.windGain?.gain.linearRampToValueAtTime(0.0001, t + 0.3);
    const oscs = [this.oscA, this.oscB, this.oscC];
    oscs.forEach((o) => { try { o.stop(t + 0.5); } catch {} });
    [this.tyreSrc, this.windSrc].forEach((s) => { try { s.stop(t + 0.5); } catch {} });
    this.running = false;
    this.oscA = this.oscB = this.oscC = null;
    this.tyreSrc = this.windSrc = null;
  }

  setPaused(paused) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const level = paused ? 0.0001 : 0.07;
    this.engineGain.gain.setTargetAtTime(level, t, 0.08);
  }

  update({ speed = 0, throttle = 0, brake = 0, slip = 0, offroad = false, running = true }) {
    if (!this.ctx || !this.engineGain || !this.running) return;
    const t = this.ctx.currentTime;
    const kmh = speed * 3.6;
    const gearPos = Math.min(7, Math.floor(kmh / 42));
    const gearFrac = (kmh % 42) / 42;
    const target = 46 + gearFrac * 72 + (throttle * 18) + speed * 0.32;
    const smooth = this.lastSpeed + (target - this.lastSpeed) * 0.08;
    this.lastSpeed = smooth;
    this.oscA.frequency.setTargetAtTime(smooth, t, 0.045);
    this.oscB.frequency.setTargetAtTime(smooth * 0.5, t, 0.05);
    this.oscC.frequency.setTargetAtTime(smooth * 2.02, t, 0.04);
    this.engineFilter.frequency.setTargetAtTime(380 + speed * 26 + throttle * 800, t, 0.08);
    const load = 0.045 + throttle * 0.035 + speed * 0.0003;
    this.engineGain.gain.setTargetAtTime(running ? load : 0.0001, t, 0.09);
    this.tyreGain.gain.setTargetAtTime(Math.min(0.055, slip * 0.014 + (brake > 0.5 ? slip * 0.01 : 0)), t, 0.06);
    this.windGain.gain.setTargetAtTime(Math.min(0.03, speed * 0.00028), t, 0.15);
    if (offroad) {
      this.tyreGain.gain.setTargetAtTime(0.02 + speed * 0.0003, t, 0.05);
    }
    void gearPos;
  }
}

export const audio = new AudioEngine();
