// ============================================================================
// INDOOR AMBIENT SOUNDS
// Fireplace, cafe, and library ambience procedural generation
// ============================================================================

/**
 * Generate fireplace crackling sounds
 */
export function createFireplaceNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const fire = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  let lowRumble = 0;
  let crackleTimer = 0;
  let crackleIntensity = 0;
  let popTimer = 0;
  let popIntensity = 0;

  fire.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Low rumble base (fire ambience)
      const white = Math.random() * 2 - 1;
      lowRumble = 0.995 * lowRumble + white * 0.005;

      // Crackles
      crackleTimer++;
      if (crackleTimer > sampleRate * (0.02 + Math.random() * 0.1)) {
        crackleTimer = 0;
        crackleIntensity = 0.3 + Math.random() * 0.5;
      }
      crackleIntensity *= 0.997;

      // Occasional pops
      popTimer++;
      if (popTimer > sampleRate * (0.5 + Math.random() * 2)) {
        popTimer = 0;
        popIntensity = 0.5 + Math.random() * 0.5;
      }
      popIntensity *= 0.99;

      const crackle = crackleIntensity * (Math.random() > 0.5 ? 1 : -1) * Math.random();
      const pop = popIntensity * (Math.random() * 2 - 1);

      output[i] = (lowRumble * 0.3 + crackle * 0.4 + pop * 0.2) * 0.5;
    }
  });

  return fire;
}

/**
 * Generate cafe ambience (murmur + subtle clinking)
 */
export function createCafeNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const cafe = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  // Pink noise state for murmur
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  let clinkTimer = 0;
  let clinkPhase = 0;
  let clinkIntensity = 0;

  cafe.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Murmur (filtered pink noise)
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const murmur = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;

      // Occasional clinks (sine wave bursts)
      clinkTimer++;
      if (clinkTimer > sampleRate * (1 + Math.random() * 4)) {
        clinkTimer = 0;
        clinkIntensity = 0.2 + Math.random() * 0.3;
        clinkPhase = 0;
      }
      clinkPhase += ((800 + Math.random() * 400) / sampleRate) * Math.PI * 2;
      clinkIntensity *= 0.995;
      const clink = Math.sin(clinkPhase) * clinkIntensity * 0.1;

      output[i] = (murmur + clink) * 0.6;
    }
  });

  return cafe;
}

/**
 * Generate library ambience (very quiet, occasional page turns)
 */
export function createLibraryNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const library = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  let ambience = 0;
  let pageTimer = 0;
  let pageIntensity = 0;

  library.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Very quiet ambient hum
      const white = Math.random() * 2 - 1;
      ambience = 0.999 * ambience + white * 0.001;

      // Occasional page turn sounds (filtered noise bursts)
      pageTimer++;
      if (pageTimer > sampleRate * (3 + Math.random() * 8)) {
        pageTimer = 0;
        pageIntensity = 0.2 + Math.random() * 0.2;
      }
      pageIntensity *= 0.998;
      const page = pageIntensity * (Math.random() * 2 - 1);

      output[i] = (ambience * 0.2 + page * 0.15) * 0.4;
    }
  });

  return library;
}
