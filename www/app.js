let audioCtx;
let workletNode;
let paramInterval;
let presets = [];
let analyserL;
let analyserR;
let freqDataL;
let freqDataR;
let timeDataL;
let timeDataR;
let animId;

async function start() {
  try {
    audioCtx = new AudioContext();
    
    // Load the enhanced worklet
    // Load the worklet module. This file registers the
    // 'enhanced-oscillator-generator' processor.
    // The original path pointed to a non-existent file which
    // caused a DOMException when starting audio.
    await audioCtx.audioWorklet.addModule('oscillator-worklet.js');
    
    // Resume context if suspended
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
    // Create the enhanced worklet node
    workletNode = new AudioWorkletNode(audioCtx, 'enhanced-oscillator-generator', {
      outputChannelCount: [2]
    });
    
    // Set up analyzers for visualization
    const splitter = audioCtx.createChannelSplitter(2);
    analyserL = audioCtx.createAnalyser();
    analyserR = audioCtx.createAnalyser();
    analyserL.fftSize = 1024;
    analyserR.fftSize = 1024;
    
    freqDataL = new Uint8Array(analyserL.frequencyBinCount);
    freqDataR = new Uint8Array(analyserR.frequencyBinCount);
    timeDataL = new Uint8Array(analyserL.fftSize);
    timeDataR = new Uint8Array(analyserR.fftSize);
    
    // Connect audio graph
    workletNode.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);
    workletNode.connect(audioCtx.destination);
    
    // Send initial parameters
    sendParams();
    
    // Start parameter update loop and visualization
    paramInterval = setInterval(sendParams, 100);
    animId = requestAnimationFrame(drawScope);
    
    updateStatus('Playing');
    const btn = document.getElementById('connect');
    if (btn) btn.textContent = 'Playing';
    
  } catch (error) {
    console.error('Failed to start audio:', error);
    updateStatus('Failed to start');
  }
}

function stop() {
  try {
    if (paramInterval) {
      clearInterval(paramInterval);
      paramInterval = null;
    }
    
    if (workletNode) {
      workletNode.disconnect();
      workletNode = null;
    }
    
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    
    // Clear analyzer references
    analyserL = null;
    analyserR = null;
    freqDataL = null;
    freqDataR = null;
    timeDataL = null;
    timeDataR = null;
    
    updateStatus('Stopped');
    const btn = document.getElementById('connect');
    if (btn) btn.textContent = 'Play';
    
  } catch (error) {
    console.error('Error stopping audio:', error);
  }
}

function sendParams() {
  if (!workletNode) return;
  
  try {
    const params = {
      carrier: parseFloat(document.getElementById('carrier').value),
      beat: parseFloat(document.getElementById('beat').value),
      phase_shift: parseFloat(document.getElementById('phase').value),
      amplitude: parseFloat(document.getElementById('amplitude').value),
      mode: document.getElementById('mode').value,
      waveform: document.getElementById('waveform').value,
      focus_level: document.getElementById('focus_level').value
    };
    
    // Handle filter cutoff (can be empty)
    const cutoffInput = document.getElementById('filter_cutoff').value;
    params.filter_cutoff = cutoffInput === '' ? null : parseFloat(cutoffInput);
    
    // Validate parameters
    if (isNaN(params.carrier) || params.carrier < 20 || params.carrier > 20000) {
      console.warn('Invalid carrier frequency, using 400Hz');
      params.carrier = 400;
    }
    
    if (isNaN(params.beat) || params.beat < 0.1 || params.beat > 40) {
      console.warn('Invalid beat frequency, using 10Hz');
      params.beat = 10;
    }
    
    // Send to worklet
    workletNode.port.postMessage(params);
    
  } catch (error) {
    console.error('Error sending parameters:', error);
  }
}

function updateStatus(text) {
  const status = document.getElementById('status');
  if (status) status.textContent = text;
}

function drawScope() {
  if (!analyserL || !analyserR) {
    animId = requestAnimationFrame(drawScope);
    return;
  }
  
  const leftCanvas = document.getElementById('scope-left');
  const rightCanvas = document.getElementById('scope-right');
  
  if (!leftCanvas || !rightCanvas) {
    animId = requestAnimationFrame(drawScope);
    return;
  }
  
  const ctxL = leftCanvas.getContext('2d');
  const ctxR = rightCanvas.getContext('2d');
  const { width, height } = leftCanvas;
  
  // Clear canvases
  ctxL.fillStyle = '#000';
  ctxL.fillRect(0, 0, width, height);
  ctxR.fillStyle = '#000';
  ctxR.fillRect(0, 0, width, height);
  
  // Get time domain data
  analyserL.getByteTimeDomainData(timeDataL);
  analyserR.getByteTimeDomainData(timeDataR);
  
  // Draw waveforms
  ctxL.strokeStyle = '#0f0';
  ctxL.lineWidth = 2;
  ctxL.beginPath();
  for (let i = 0; i < timeDataL.length; i++) {
    const x = (i / timeDataL.length) * width;
    const y = (timeDataL[i] / 255) * height;
    if (i === 0) ctxL.moveTo(x, y);
    else ctxL.lineTo(x, y);
  }
  ctxL.stroke();
  
  ctxR.strokeStyle = '#0f0';
  ctxR.lineWidth = 2;
  ctxR.beginPath();
  for (let i = 0; i < timeDataR.length; i++) {
    const x = (i / timeDataR.length) * width;
    const y = (timeDataR[i] / 255) * height;
    if (i === 0) ctxR.moveTo(x, y);
    else ctxR.lineTo(x, y);
  }
  ctxR.stroke();
  
  // Draw frequency spectrum bars
  analyserL.getByteFrequencyData(freqDataL);
  analyserR.getByteFrequencyData(freqDataR);
  
  ctxL.fillStyle = '#ff0';
  ctxR.fillStyle = '#ff0';
  
  const barWidth = width / freqDataL.length;
  
  for (let i = 0; i < Math.min(freqDataL.length, 100); i++) { // Only show first 100 bins
    const valL = freqDataL[i] / 255;
    const valR = freqDataR[i] / 255;
    
    const barHeightL = valL * (height / 3);
    const barHeightR = valR * (height / 3);
    
    ctxL.fillRect(i * barWidth, height - barHeightL, barWidth, barHeightL);
    ctxR.fillRect(i * barWidth, height - barHeightR, barWidth, barHeightR);
  }
  
  animId = requestAnimationFrame(drawScope);
}

// Load presets
async function loadPresets() {
  try {
    const resp = await fetch('presets.json');
    presets = await resp.json();
    const select = document.getElementById('preset');
    
    if (!select) return;
    
    presets.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
    
    select.addEventListener('change', () => {
      const idx = parseInt(select.value);
      if (isNaN(idx)) return;
      
      const p = presets[idx];
      
      // Apply preset values
      document.getElementById('carrier').value = p.carrier || 400;
      document.getElementById('beat').value = p.beat || 10;
      document.getElementById('mode').value = p.type || 'binaural';
      document.getElementById('waveform').value = p.waveform || 'sine';
      document.getElementById('amplitude').value = p.amplitude || 1.0;
      
      if (p.filter_cutoff !== undefined) {
        const fcField = document.getElementById('filter_cutoff');
        fcField.value = p.filter_cutoff === null ? '' : p.filter_cutoff;
      }
      
      // Update display values
      updateSliderDisplays();
      
      const notes = document.getElementById('preset-notes');
      if (notes) notes.textContent = p.notes || '';
      
      // Send updated parameters
      if (workletNode) {
        sendParams();
      }
    });
    
  } catch (e) {
    console.error('Failed to load presets:', e);
  }
}

function updateSliderDisplays() {
  ['carrier', 'beat', 'phase', 'amplitude'].forEach((id) => {
    const slider = document.getElementById(id);
    const out = document.getElementById(id + '_val');
    if (slider && out) {
      out.textContent = slider.value;
    }
  });
}

// DOM event handlers
window.addEventListener('DOMContentLoaded', () => {
  // Load presets
  loadPresets();
  
  // Set up play/stop buttons
  const playBtn = document.getElementById('connect');
  const stopBtn = document.getElementById('stop');
  
  if (playBtn) {
    playBtn.addEventListener('click', start);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener('click', stop);
  }
  
  // Set up slider feedback and live updates
  ['carrier', 'beat', 'phase', 'amplitude'].forEach((id) => {
    const slider = document.getElementById(id);
    const out = document.getElementById(id + '_val');
    
    if (slider && out) {
      out.textContent = slider.value;
      
      slider.addEventListener('input', () => {
        out.textContent = slider.value;
        if (workletNode) {
          sendParams();
        }
      });
    }
  });
  
  // Set up other parameter change handlers
  ['mode', 'waveform', 'focus_level', 'filter_cutoff'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        if (workletNode) {
          sendParams();
        }
      });
    }
  });
  
  updateStatus('Ready');
});
