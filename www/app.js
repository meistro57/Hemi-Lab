let socket;
let audioCtx;
let workletNode;
let paramInterval;
let presets = [];
let analyser;
let freqData;
let timeData;
let animId;

async function start() {
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.hostname;
  socket = new WebSocket(`${wsProto}://${wsHost}:8765`);
  audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule('audio-worklet.js');
  workletNode = new AudioWorkletNode(audioCtx, 'buffer-player', {
    outputChannelCount: [2]
  });
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  timeData = new Uint8Array(analyser.fftSize);
  workletNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  socket.binaryType = 'arraybuffer';
  socket.onmessage = (ev) => {
    if (workletNode) {
      workletNode.port.postMessage(ev.data);
    }
  };
  socket.onopen = sendParams;

  paramInterval = setInterval(sendParams, 1000);
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
  if (socket) {
    socket.close();
    socket = null;
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
  analyser = null;

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
  const focusSel = document.getElementById('focus_level');
  const focus_level = focusSel ? focusSel.value : '';
  socket.send(
    JSON.stringify({ carrier, beat, phase_shift: phase, amplitude, filter_cutoff, mode, waveform, focus_level })
  );
}

function drawScope() {
  if (!analyser) return;
  const canvas = document.getElementById('scope');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  analyser.getByteTimeDomainData(timeData);
  ctx.strokeStyle = '#0f0';
  ctx.beginPath();
  for (let i = 0; i < timeData.length; i++) {
    const x = (i / timeData.length) * width;
    const y = (timeData[i] / 255) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  analyser.getByteFrequencyData(freqData);
  ctx.fillStyle = '#ff0';
  const barWidth = width / freqData.length;
  for (let i = 0; i < freqData.length; i++) {
    const val = freqData[i] / 255;
    const barHeight = val * (height / 3);
    ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
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
