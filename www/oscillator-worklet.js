class EnhancedOscillatorGenerator extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Core parameters
    this.carrier = 400;
    this.beat = 10;
    this.phaseShift = 0;
    this.amplitude = 1;
    this.waveform = 'sine';
    this.mode = 'binaural';
    this.filterCutoff = null;
    this.focusLevel = '';
    
    // Phase tracking for continuity
    this.phase1 = 0;
    this.phase2 = 0;
    
    // Filter states
    this.filterStateL = 0;
    this.filterStateR = 0;
    
    // Focus level animation states
    this.swirlPhase = 0;
    this.deltaPhase = 0;
    this.lastTime = 0;
    
    // Parameter updates from main thread
    this.port.onmessage = (e) => {
      const p = e.data || {};
      if (p.carrier !== undefined) this.carrier = p.carrier;
      if (p.beat !== undefined) this.beat = p.beat;
      if (p.phase_shift !== undefined) this.phaseShift = p.phase_shift;
      if (p.amplitude !== undefined) this.amplitude = p.amplitude;
      if (p.waveform !== undefined) this.waveform = p.waveform;
      if (p.mode !== undefined) this.mode = p.mode;
      if (p.filter_cutoff !== undefined) this.filterCutoff = p.filter_cutoff;
      if (p.focus_level !== undefined) this.focusLevel = p.focus_level;
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
      default: // sine
        return Math.sin(phase);
    }
  }

  applyLowpassFilter(sample, filterState, cutoff) {
    if (!cutoff) return { output: sample, newState: filterState };
    
    const dt = 1 / sampleRate;
    const rc = 1 / (2 * Math.PI * cutoff);
    const alpha = dt / (rc + dt);
    
    const newState = filterState + alpha * (sample - filterState);
    return { output: newState, newState };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const frames = output[0].length;
    
    // Calculate dynamic parameters based on focus level
    let dynamicBeat = this.beat;
    let dynamicPhase = this.phaseShift;
    let dynamicAmplitude = this.amplitude;
    
    const deltaTime = frames / sampleRate;
    
    switch (this.focusLevel) {
      case '10':
        dynamicBeat = 7.0;
        break;
        
      case '12':
        this.swirlPhase += 2 * Math.PI * 0.05 * deltaTime;
        dynamicBeat = 8.5;
        dynamicPhase = this.phaseShift + 45.0 * Math.sin(this.swirlPhase);
        break;
        
      case '15':
        this.deltaPhase += 2 * Math.PI * 0.75 * deltaTime;
        dynamicBeat = 7.0;
        dynamicAmplitude = this.amplitude * (1.0 + 0.3 * Math.sin(this.deltaPhase));
        break;
        
      case '21':
        // Add some controlled randomness
        dynamicBeat = this.beat + (Math.random() - 0.5) * 1.0; // ±0.5 Hz
        dynamicPhase = this.phaseShift + (Math.random() - 0.5) * 2.0; // ±1 degree
        break;
    }
    
    // Calculate frequencies
    let freqL, freqR;
    if (this.mode === 'binaural') {
      freqL = this.carrier - dynamicBeat / 2;
      freqR = this.carrier + dynamicBeat / 2;
    } else { // monaural
      freqL = freqR = this.carrier;
    }
    
    const incL = 2 * Math.PI * freqL / sampleRate;
    const incR = 2 * Math.PI * freqR / sampleRate;
    const phaseShiftRad = dynamicPhase * Math.PI / 180;
    
    // Generate audio samples
    for (let i = 0; i < frames; i++) {
      // Generate base waveforms
      const leftBase = this.waveform(this.phase1);
      const rightBase = this.waveform(this.phase2 + phaseShiftRad);
      
      let l, r;
      
      if (this.mode === 'monaural') {
        // For monaural beats, add a beat frequency modulation
        const beatPhase = 2 * Math.PI * dynamicBeat * (this.lastTime + i / sampleRate);
        const beatEnvelope = (1 + Math.sin(beatPhase)) * 0.5; // 0 to 1
        const mono = leftBase * beatEnvelope * dynamicAmplitude;
        l = r = mono;
      } else {
        // Binaural: different frequencies in each ear
        l = leftBase * dynamicAmplitude;
        r = rightBase * dynamicAmplitude;
      }
      
      // Apply low-pass filter if enabled
      if (this.filterCutoff) {
        const filteredL = this.applyLowpassFilter(l, this.filterStateL, this.filterCutoff);
        const filteredR = this.applyLowpassFilter(r, this.filterStateR, this.filterCutoff);
        
        l = filteredL.output;
        r = filteredR.output;
        this.filterStateL = filteredL.newState;
        this.filterStateR = filteredR.newState;
      }
      
      // Output samples
      output[0][i] = l;
      output[1][i] = r;
      
      // Update phases
      this.phase1 += incL;
      this.phase2 += incR;
      
      // Wrap phases to prevent overflow
      if (this.phase1 > 2 * Math.PI) this.phase1 -= 2 * Math.PI;
      if (this.phase2 > 2 * Math.PI) this.phase2 -= 2 * Math.PI;
    }
    
    // Update time tracking
    this.lastTime += deltaTime;
    
    return true;
  }
}

registerProcessor('enhanced-oscillator-generator', EnhancedOscillatorGenerator);
