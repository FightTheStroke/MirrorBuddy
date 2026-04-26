// ============================================================================
// AUDIO WORKLET PROCESSOR
// Captures audio at 24kHz PCM16 for OpenAI Realtime API
// ============================================================================

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(0);
    this.sampleRate = 24000;
    this.chunkSize = 2400; // 100ms of audio at 24kHz
  }

   
  process(inputs, _outputs, _parameters) {
    const input = inputs[0];
    if (input.length === 0) return true;

    const inputChannel = input[0];
    if (!inputChannel) return true;

    // Accumulate samples
    const newBuffer = new Float32Array(this.buffer.length + inputChannel.length);
    newBuffer.set(this.buffer);
    newBuffer.set(inputChannel, this.buffer.length);
    this.buffer = newBuffer;

    // Process when we have enough samples
    while (this.buffer.length >= this.chunkSize) {
      const chunk = this.buffer.slice(0, this.chunkSize);
      this.buffer = this.buffer.slice(this.chunkSize);

      // Convert Float32 to Int16
      const int16Array = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }

      // Send to main thread
      this.port.postMessage(int16Array);
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
