// ============================================================================
// AUDIO GENERATORS
// Procedural audio generation using Web Audio API
// Generates white/pink/brown noise and binaural beats
// ============================================================================

import type { AudioMode } from '@/types';

/**
 * Generate white noise (equal energy across frequencies)
 */
export function createWhiteNoiseNode(audioContext: AudioContext): AudioWorkletNode | ScriptProcessorNode {
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
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
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
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for volume drop
    }
  });

  return brownNoise;
}

/**
 * Generate binaural beats (stereo required)
 * Creates the perception of a beat frequency by playing slightly different frequencies in each ear
 * 
 * @param audioContext - Web Audio context
 * @param baseFrequency - Base frequency (e.g., 200 Hz)
 * @param beatFrequency - Desired beat frequency (e.g., 10 Hz for alpha)
 * @returns Stereo panner with two oscillators
 */
export function createBinauralBeatNodes(
  audioContext: AudioContext,
  baseFrequency: number,
  beatFrequency: number
): { merger: ChannelMergerNode; oscillators: OscillatorNode[] } {
  // Left ear frequency
  const leftOsc = audioContext.createOscillator();
  leftOsc.type = 'sine';
  leftOsc.frequency.setValueAtTime(baseFrequency, audioContext.currentTime);

  // Right ear frequency (offset by beat frequency)
  const rightOsc = audioContext.createOscillator();
  rightOsc.type = 'sine';
  rightOsc.frequency.setValueAtTime(baseFrequency + beatFrequency, audioContext.currentTime);

  // Create stereo merger
  const merger = audioContext.createChannelMerger(2);
  
  // Left to left channel, right to right channel
  leftOsc.connect(merger, 0, 0);
  rightOsc.connect(merger, 0, 1);

  return { merger, oscillators: [leftOsc, rightOsc] };
}

import { getBinauralConfig } from './generators/binaural';

export { getBinauralConfig };

// ============================================================================
// AMBIENT SOUND GENERATORS (Procedural)
// ============================================================================

/**
 * Generate rain sound (filtered noise with random drop impulses)
 */
export function createRainNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const rain = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  // State for rain simulation
  let b0 = 0, b1 = 0, b2 = 0;
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

  let b0 = 0, b1 = 0, b2 = 0;
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
        thunderDecay = 0.99985 + Math.random() * 0.00010;
      }
      thunderIntensity *= thunderDecay;
      const thunder = thunderIntensity * (Math.random() * 2 - 1) * 0.3;

      output[i] = (b2 * 0.4 + dropIntensity * (Math.random() * 2 - 1) * 0.3 + thunder) * 0.5;
    }
  });

  return storm;
}

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
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
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
      clinkPhase += (800 + Math.random() * 400) / sampleRate * Math.PI * 2;
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
      birdPhase += birdFreq / sampleRate * Math.PI * 2;
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
      const waveEnvelope = 0.3 + (Math.sin(wavePhase * Math.PI * 2) + 1) * 0.35;

      // Ocean sound (heavily filtered noise)
      const white = Math.random() * 2 - 1;
      wave = 0.98 * wave + white * 0.02;

      output[i] = wave * waveEnvelope * 0.5;
    }
  });

  return ocean;
}

/**
 * Create an audio node for the given mode
 */
export function createAudioNodeForMode(
  audioContext: AudioContext,
  mode: AudioMode
): AudioNode | { merger: ChannelMergerNode; oscillators: OscillatorNode[] } | null {
  switch (mode) {
    // Noise generators
    case 'white_noise':
      return createWhiteNoiseNode(audioContext);
    case 'pink_noise':
      return createPinkNoiseNode(audioContext);
    case 'brown_noise':
      return createBrownNoiseNode(audioContext);

    // Binaural beats
    case 'binaural_alpha':
    case 'binaural_beta':
    case 'binaural_theta': {
      const config = getBinauralConfig(mode);
      if (config) {
        return createBinauralBeatNodes(audioContext, config.baseFreq, config.beatFreq);
      }
      return null;
    }

    // Ambient sounds (procedural)
    case 'rain':
      return createRainNode(audioContext);
    case 'thunderstorm':
      return createThunderstormNode(audioContext);
    case 'fireplace':
      return createFireplaceNode(audioContext);
    case 'cafe':
      return createCafeNode(audioContext);
    case 'library':
      return createLibraryNode(audioContext);
    case 'forest':
      return createForestNode(audioContext);
    case 'ocean':
      return createOceanNode(audioContext);

    default:
      return null;
  }
}
