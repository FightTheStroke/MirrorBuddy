// ============================================================================
// NOISE GENERATORS
// Procedural white, pink, and brown noise generation
// ============================================================================

/**
 * Generate white noise (equal energy across frequencies)
 */
export function createWhiteNoiseNode(
  audioContext: AudioContext
): AudioWorkletNode | ScriptProcessorNode {
  // Try to use AudioWorklet if available (better performance)
  // Fall back to ScriptProcessor for compatibility
  if (audioContext.audioWorklet) {
    try {
      const workletNode = new AudioWorkletNode(audioContext, 'white-noise-processor');
      return workletNode;
    } catch {
      // Fall through to ScriptProcessor
    }
  }

  // Fallback: ScriptProcessor (deprecated but widely supported)
  const bufferSize = 4096;
  const whiteNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);

  whiteNoise.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // Random value between -1 and 1
    }
  });

  return whiteNoise;
}

/**
 * Generate pink noise (1/f spectrum, more natural than white)
 */
export function createPinkNoiseNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const pinkNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);

  // Pink noise requires filtering - use Paul Kellett algorithm
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;

  pinkNoise.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  });

  return pinkNoise;
}

/**
 * Generate brown noise (1/f² spectrum, deeper and rumbling)
 */
export function createBrownNoiseNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const brownNoise = audioContext.createScriptProcessor(bufferSize, 1, 1);

  let lastOut = 0.0;

  brownNoise.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for volume drop
    }
  });

  return brownNoise;
}
