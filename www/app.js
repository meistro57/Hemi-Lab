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
  audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule('oscillator-worklet.js');
  // Some browsers start AudioContext in a suspended state until resumed.
  // Calling resume here ensures playback begins after the user click.
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.error('Failed to resume AudioContext', e);
    }
  }
  workletNode = new AudioWorkletNode(audioCtx, 'oscillator-generator', {
    outputChannelCount: [2]
  });
  const splitter = audioCtx.createChannelSplitter(2);
  analyserL = audioCtx.createAnalyser();
  analyserR = audioCtx.createAnalyser();
  analyserL.fftSize = 1024;
  analyserR.fftSize = 1024;
  freqDataL = new Uint8Array(analyserL.frequencyBinCount);
  freqDataR = new Uint8Array(analyserR.frequencyBinCount);
  timeDataL = new Uint8Array(analyserL.fftSize);
  timeDataR = new Uint8Array(analyserR.fftSize);
  workletNode.connect(splitter);
  splitter.connect(analyserL, 0);
  splitter.connect(analyserR, 1);
  workletNode.connect(audioCtx.destination);

  paramInterval = setInterval(sendParams, 100);
  animId = requestAnimationFrame(drawScope);

  const btn = document.getElementById('connect');
  if (btn) {
    btn.textContent = 'Playing';
  }
}

function stop() {
  if (paramInterval) {
    clearInterval(paramInterval);
    paramInterval = null;
  }
  if (workletNode) {
    try {
      workletNode.port.postMessage({ command: 'stop' });
    } catch (_) {}
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
  analyserL = null;
  analyserR = null;
  freqDataL = null;
  freqDataR = null;
  timeDataL = null;
  timeDataR = null;

  const btn = document.getElementById('connect');
  if (btn) {
    btn.textContent = 'Play';
  }
}

function sendParams() {
  const carrier = parseFloat(document.getElementById('carrier').value);
  const beat = parseFloat(document.getElementById('beat').value);
  const phase = parseFloat(document.getElementById('phase').value);
  const amplitude = parseFloat(document.getElementById('amplitude').value);
  const cutoffInput = document.getElementById('filter_cutoff').value;
  const filter_cutoff = cutoffInput === '' ? null : parseFloat(cutoffInput);
  const mode = document.getElementById('mode').value;
  const waveform = document.getElementById('waveform').value;
  if (workletNode) {
    workletNode.port.postMessage({ carrier, beat, phase_shift: phase, amplitude, filter_cutoff, mode, waveform });
  }
}

function drawScope() {
  if (!analyserL || !analyserR) return;
  const leftCanvas = document.getElementById('scope-left');
  const rightCanvas = document.getElementById('scope-right');
  if (!leftCanvas || !rightCanvas) return;
  const ctxL = leftCanvas.getContext('2d');
  const ctxR = rightCanvas.getContext('2d');
  const { width, height } = leftCanvas;
  ctxL.fillStyle = '#000';
  ctxL.fillRect(0, 0, width, height);
  ctxR.fillStyle = '#000';
  ctxR.fillRect(0, 0, width, height);

  analyserL.getByteTimeDomainData(timeDataL);
  analyserR.getByteTimeDomainData(timeDataR);

  ctxL.strokeStyle = '#0f0';
  ctxL.beginPath();
  for (let i = 0; i < timeDataL.length; i++) {
    const x = (i / timeDataL.length) * width;
    const y = (timeDataL[i] / 255) * height;
    if (i === 0) ctxL.moveTo(x, y);
    else ctxL.lineTo(x, y);
  }
  ctxL.stroke();

  ctxR.strokeStyle = '#0f0';
  ctxR.beginPath();
  for (let i = 0; i < timeDataR.length; i++) {
    const x = (i / timeDataR.length) * width;
    const y = (timeDataR[i] / 255) * height;
    if (i === 0) ctxR.moveTo(x, y);
    else ctxR.lineTo(x, y);
  }
  ctxR.stroke();

  analyserL.getByteFrequencyData(freqDataL);
  ctxL.fillStyle = '#ff0';
  const barWidth = width / freqDataL.length;
  for (let i = 0; i < freqDataL.length; i++) {
    const val = freqDataL[i] / 255;
    const barHeight = val * (height / 3);
    ctxL.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
  }

  analyserR.getByteFrequencyData(freqDataR);
  ctxR.fillStyle = '#ff0';
  for (let i = 0; i < freqDataR.length; i++) {
    const val = freqDataR[i] / 255;
    const barHeight = val * (height / 3);
    ctxR.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
  }

  animId = requestAnimationFrame(drawScope);
}

document.getElementById('connect').onclick = () => start();
const stopBtn = document.getElementById('stop');
if (stopBtn) {
  stopBtn.onclick = () => stop();
}

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
      document.getElementById('carrier').value = p.carrier;
      document.getElementById('beat').value = p.beat;
      document.getElementById('mode').value = p.type || 'binaural';
      if (p.waveform) {
        document.getElementById('waveform').value = p.waveform;
      }
      if (p.amplitude !== undefined) {
        document.getElementById('amplitude').value = p.amplitude;
      }
      if (p.filter_cutoff !== undefined) {
        const fcField = document.getElementById('filter_cutoff');
        fcField.value = p.filter_cutoff === null ? '' : p.filter_cutoff;
      }
      const notes = document.getElementById('preset-notes');
      if (notes) notes.textContent = p.notes || '';
      sendParams();
    });
  } catch (e) {
    console.error('Failed to load presets', e);
  }
}

window.addEventListener('DOMContentLoaded', loadPresets);
