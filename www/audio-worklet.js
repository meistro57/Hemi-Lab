class BufferPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.readIndex = 0;
    this.ready = false;
    this.port.onmessage = (e) => {
      const arr = new Float32Array(e.data);
      this.queue.push(arr);
      if (this.queue.length >= 3) {
        // Wait for a small buffer before starting playback
        this.ready = true;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    for (let ch = 0; ch < output.length; ch++) {
      output[ch].fill(0);
    }

    if (!this.ready || this.queue.length === 0) {
      return true;
    }

    const chunk = this.queue[0];
    const framesPerBlock = output[0].length;
    const half = chunk.length / 2;

    for (let i = 0; i < framesPerBlock; i++) {
      const lIdx = this.readIndex + i;
      const rIdx = this.readIndex + i + half;
      if (lIdx < half) {
        output[0][i] = chunk[lIdx];
        output[1][i] = chunk[rIdx];
      }
    }

    this.readIndex += framesPerBlock;
    if (this.readIndex >= half) {
      this.queue.shift();
      this.readIndex = 0;
      if (this.queue.length < 1) {
        this.ready = false;
      }
    }
    return true;
  }
}

registerProcessor('buffer-player', BufferPlayer);
