// audio.js — synthesized WebAudio sound effects, no audio files.
// Everything is oscillators + noise through one master gain, so the game
// ships zero audio assets and stays silent until the first user gesture.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._noiseBuf = null;
  }

  // Must be called from a user gesture at least once; safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(m ? 0 : 0.32, this.ctx.currentTime);
    }
  }

  _tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol, filterFreq, delay = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    if (!this._noiseBuf) {
      const len = this.ctx.sampleRate * 0.5;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() { this._tone(720, 0.07, 'square', 0.05, 320); }
  hit() { this._noise(0.08, 0.16, 2400); this._tone(190, 0.06, 'triangle', 0.1, 90); }
  enemyDie() { this._noise(0.18, 0.2, 1400); this._tone(320, 0.16, 'sawtooth', 0.09, 70); }
  pickup() { this._tone(880, 0.09, 'sine', 0.12, 1320); }
  levelUp() {
    this._tone(523, 0.12, 'sine', 0.16);
    this._tone(659, 0.12, 'sine', 0.16, null, 0.09);
    this._tone(784, 0.22, 'sine', 0.18, null, 0.18);
  }
  dash() { this._noise(0.14, 0.14, 3200); }
  hurt() { this._tone(140, 0.2, 'sawtooth', 0.16, 60); this._noise(0.12, 0.12, 900); }
  bossRoar() {
    this._tone(70, 0.7, 'sawtooth', 0.22, 45);
    this._noise(0.6, 0.18, 500);
    this._tone(110, 0.5, 'square', 0.1, 55, 0.15);
  }
  waveClear() { this._tone(660, 0.1, 'sine', 0.12); this._tone(990, 0.18, 'sine', 0.12, null, 0.1); }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.25, 'sine', 0.16, null, i * 0.13));
  }
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => this._tone(f, 0.3, 'triangle', 0.15, null, i * 0.16));
  }
}
