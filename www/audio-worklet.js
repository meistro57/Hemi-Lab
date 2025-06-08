class BufferPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.readIndex = 0;
    this.port.onmessage = e => {
      const arr = new Float32Array(e.data);
      this.queue.push(arr);
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    for (let ch = 0; ch < output.length; ch++) {
      output[ch].fill(0);
    }

    if (this.queue.length === 0) {
      return true;
    }

    const chunk = this.queue[0];
    const framesPerBlock = 128;
    for (let ch = 0; ch < output.length; ch++) {
      for (let i = 0; i < framesPerBlock; i++) {
        const idx = this.readIndex + i + ch * chunk.length / 2;
        if (idx < chunk.length / 2) {
          output[ch][i] = chunk[idx];
        }
      }
    }

    this.readIndex += framesPerBlock;
    if (this.readIndex >= chunk.length / 2) {
      this.queue.shift();
      this.readIndex = 0;
    }
    return true;
  }
}

registerProcessor('buffer-player', BufferPlayer);
