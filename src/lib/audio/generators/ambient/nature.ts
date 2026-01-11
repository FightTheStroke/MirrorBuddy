// ============================================================================
// NATURE AMBIENT SOUNDS
// Forest and ocean procedural generation
// ============================================================================

/**
 * Generate forest sounds (wind + bird chirps)
 */
export function createForestNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const forest = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  let wind = 0;
  let windModulation = 0;
  let birdTimer = 0;
  let birdPhase = 0;
  let birdFreq = 2000;
  let birdIntensity = 0;

  forest.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Wind (modulated filtered noise)
      const white = Math.random() * 2 - 1;
      windModulation += 0.0001;
      const windVol = 0.3 + Math.sin(windModulation) * 0.2;
      wind = 0.995 * wind + white * 0.005;

      // Bird chirps
      birdTimer++;
      if (birdTimer > sampleRate * (2 + Math.random() * 5)) {
        birdTimer = 0;
        birdIntensity = 0.3 + Math.random() * 0.4;
        birdFreq = 2000 + Math.random() * 2000;
        birdPhase = 0;
      }
      birdPhase += (birdFreq / sampleRate) * Math.PI * 2;
      birdIntensity *= 0.997;
      const bird = Math.sin(birdPhase) * birdIntensity * 0.15;

      output[i] = (wind * windVol + bird) * 0.5;
    }
  });

  return forest;
}

/**
 * Generate ocean waves (low-pass filtered noise with amplitude modulation)
 */
export function createOceanNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const ocean = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  let wave = 0;
  let wavePhase = 0;
  const waveSpeed = 0.1 + Math.random() * 0.05;

  ocean.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Wave modulation (slow sine wave for wave rhythm)
      wavePhase += waveSpeed / sampleRate;
      const waveEnvelope = 0.3 + ((Math.sin(wavePhase * Math.PI * 2) + 1) * 0.35);

      // Ocean sound (heavily filtered noise)
      const white = Math.random() * 2 - 1;
      wave = 0.98 * wave + white * 0.02;

      output[i] = wave * waveEnvelope * 0.5;
    }
  });

  return ocean;
}
