let socket;
let audioCtx;
let workletNode;

async function start() {
  socket = new WebSocket('ws://localhost:8765');
  audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule('audio-worklet.js');
  workletNode = new AudioWorkletNode(audioCtx, 'buffer-player');
  workletNode.connect(audioCtx.destination);

  socket.binaryType = 'arraybuffer';
  socket.onmessage = (ev) => {
    if (workletNode) {
      workletNode.port.postMessage(ev.data);
    }
  };

  sendParams();
  setInterval(sendParams, 1000);

  const btn = document.getElementById('connect');
  if (btn) {
    btn.textContent = 'Playing';
  }
}

function sendParams() {
  const carrier = parseFloat(document.getElementById('carrier').value);
  const beat = parseFloat(document.getElementById('beat').value);
  const mode = document.getElementById('mode').value;
  socket.send(JSON.stringify({ carrier, beat, mode }));
}

document.getElementById('connect').onclick = () => start();
