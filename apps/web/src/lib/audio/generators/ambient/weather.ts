// ============================================================================
// WEATHER AMBIENT SOUNDS
// Rain and thunderstorm procedural generation
// ============================================================================

/**
 * Generate rain sound (filtered noise with random drop impulses)
 */
export function createRainNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const rain = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  // State for rain simulation
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  let dropTimer = 0;
  let dropIntensity = 0;

  rain.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Base rain: heavily filtered noise
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.01;
      b1 = 0.98 * b1 + b0 * 0.02;
      b2 = 0.97 * b2 + b1 * 0.03;

      // Random rain drops
      dropTimer++;
      if (dropTimer > sampleRate * (0.01 + Math.random() * 0.05)) {
        dropTimer = 0;
        dropIntensity = 0.3 + Math.random() * 0.4;
      }
      dropIntensity *= 0.9995;

      output[i] = (b2 * 0.5 + dropIntensity * (Math.random() * 2 - 1)) * 0.4;
    }
  });

  return rain;
}

/**
 * Generate thunderstorm (rain + occasional thunder rumbles)
 */
export function createThunderstormNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const storm = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  let b0 = 0,
    b1 = 0,
    b2 = 0;
  let dropTimer = 0;
  let dropIntensity = 0;
  let thunderTimer = 0;
  let thunderIntensity = 0;
  let thunderDecay = 0;

  storm.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Rain base
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.01;
      b1 = 0.98 * b1 + b0 * 0.02;
      b2 = 0.97 * b2 + b1 * 0.03;

      // Rain drops
      dropTimer++;
      if (dropTimer > sampleRate * (0.005 + Math.random() * 0.03)) {
        dropTimer = 0;
        dropIntensity = 0.4 + Math.random() * 0.5;
      }
      dropIntensity *= 0.9993;

      // Thunder (random low rumble)
      thunderTimer++;
      if (thunderTimer > sampleRate * (5 + Math.random() * 15)) {
        thunderTimer = 0;
        thunderIntensity = 0.6 + Math.random() * 0.4;
        thunderDecay = 0.99985 + Math.random() * 0.0001;
      }
      thunderIntensity *= thunderDecay;
      const thunder = thunderIntensity * (Math.random() * 2 - 1) * 0.3;

      output[i] = (b2 * 0.4 + dropIntensity * (Math.random() * 2 - 1) * 0.3 + thunder) * 0.5;
    }
  });

  return storm;
}
