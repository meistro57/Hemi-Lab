let socket;
let audioCtx;
let workletNode;
let paramInterval;

async function start() {
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.hostname;
  socket = new WebSocket(`${wsProto}://${wsHost}:8765`);
  audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule('audio-worklet.js');
  workletNode = new AudioWorkletNode(audioCtx, 'buffer-player', {
    outputChannelCount: [2]
  });
  workletNode.connect(audioCtx.destination);

  socket.binaryType = 'arraybuffer';
  socket.onmessage = (ev) => {
    if (workletNode) {
      workletNode.port.postMessage(ev.data);
    }
  };
  socket.onopen = sendParams;

  paramInterval = setInterval(sendParams, 1000);

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

  const btn = document.getElementById('connect');
  if (btn) {
    btn.textContent = 'Play';
  }
}

function sendParams() {
  const carrier = parseFloat(document.getElementById('carrier').value);
  const beat = parseFloat(document.getElementById('beat').value);
  const phase = parseFloat(document.getElementById('phase').value);
  const mode = document.getElementById('mode').value;
  socket.send(JSON.stringify({ carrier, beat, phase_shift: phase, mode }));
}

document.getElementById('connect').onclick = () => start();
const stopBtn = document.getElementById('stop');
if (stopBtn) {
  stopBtn.onclick = () => stop();
}
