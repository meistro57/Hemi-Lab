class OscillatorGenerator extends AudioWorkletProcessor {
  constructor() {
    super();
    this.carrier = 400;
    this.beat = 10;
    this.phaseShift = 0;
    this.amplitude = 1;
    this.waveform = 'sine';
    this.mode = 'binaural';
    this.filterCutoff = null;
    this.phase1 = 0;
    this.phase2 = 0;
    this.filterStateL = 0;
    this.filterStateR = 0;
    this.port.onmessage = (e) => {
      const p = e.data || {};
      if (p.carrier !== undefined) this.carrier = p.carrier;
      if (p.beat !== undefined) this.beat = p.beat;
      if (p.phase_shift !== undefined) this.phaseShift = p.phase_shift;
      if (p.amplitude !== undefined) this.amplitude = p.amplitude;
      if (p.waveform !== undefined) this.waveform = p.waveform;
      if (p.mode !== undefined) this.mode = p.mode;
      if (p.filter_cutoff !== undefined) this.filterCutoff = p.filter_cutoff;
    };
  }

  waveform(phase) {
    switch (this.waveform) {
      case 'square':
        return Math.sign(Math.sin(phase));
      case 'triangle':
        return (2 * Math.asin(Math.sin(phase))) / Math.PI;
      case 'sawtooth':
        return ((phase / Math.PI) % 2) - 1;
      default:
        return Math.sin(phase);
    }
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const frames = output[0].length;
    const dt = 1 / sampleRate;
    const freqL = this.carrier - this.beat / 2;
    const freqR = this.carrier + this.beat / 2;
    const incL = 2 * Math.PI * freqL / sampleRate;
    const incR = 2 * Math.PI * freqR / sampleRate;
    const phaseShiftRad = this.phaseShift * Math.PI / 180;
    let alpha = 0;
    if (this.filterCutoff) {
      const rc = 1 / (2 * Math.PI * this.filterCutoff);
      alpha = dt / (rc + dt);
    }
    for (let i = 0; i < frames; i++) {
      const leftBase = this.waveform(this.phase1);
      const rightBase = this.waveform(this.phase2 + phaseShiftRad);
      let l, r;
      if (this.mode === 'monaural') {
        const mix = (leftBase + rightBase) * 0.5;
        l = r = mix * this.amplitude;
      } else {
        l = leftBase * this.amplitude;
        r = rightBase * this.amplitude;
      }
      if (this.filterCutoff) {
        this.filterStateL += alpha * (l - this.filterStateL);
        this.filterStateR += alpha * (r - this.filterStateR);
        l = this.filterStateL;
        r = this.filterStateR;
      }
      output[0][i] = l;
      output[1][i] = r;
      this.phase1 += incL;
      this.phase2 += incR;
      if (this.phase1 > 2 * Math.PI) this.phase1 -= 2 * Math.PI;
      if (this.phase2 > 2 * Math.PI) this.phase2 -= 2 * Math.PI;
    }
    return true;
  }
}

registerProcessor('oscillator-generator', OscillatorGenerator);
