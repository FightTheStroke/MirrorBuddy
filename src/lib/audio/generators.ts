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

/**
 * Get binaural beat configuration for different brainwave states
 */
export function getBinauralConfig(mode: AudioMode): { baseFreq: number; beatFreq: number } | null {
  switch (mode) {
    case 'binaural_alpha':
      return { baseFreq: 200, beatFreq: 10 }; // 10 Hz alpha wave
    case 'binaural_beta':
      return { baseFreq: 200, beatFreq: 20 }; // 20 Hz beta wave
    case 'binaural_theta':
      return { baseFreq: 200, beatFreq: 6 };  // 6 Hz theta wave
    default:
      return null;
  }
}

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
 * Generate realistic cafe ambience with multiple audio layers:
 * - Multiple conversation murmurs (filtered pink noise at human voice frequency range)
 * - Espresso machine hissing (occasional filtered white noise)
 * - Coffee cup clinks and ceramic sounds (multi-frequency sine bursts)
 * - Cash register/door bell dings (high frequency sine)
 * - Distant background music (very low modulated tone)
 * - Chair/movement sounds (filtered noise bursts)
 */
export function createCafeNode(audioContext: AudioContext): ScriptProcessorNode {
  const bufferSize = 4096;
  const cafe = audioContext.createScriptProcessor(bufferSize, 1, 1);
  const sampleRate = audioContext.sampleRate;

  // ===== CONVERSATION MURMUR (Main layer) =====
  // Primary pink noise for crowd murmur
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  // Secondary murmur (different filter for variety)
  let c0 = 0, c1 = 0, c2 = 0;
  // Vocal range bandpass state (simulates human voice ~300-3000Hz)
  let vocalFilter = 0;
  let vocalFilterPrev = 0;

  // ===== ESPRESSO MACHINE =====
  let espressoTimer = 0;
  let espressoIntensity = 0;
  let espressoFilterState = 0;
  const espressoInterval = sampleRate * (8 + Math.random() * 15); // Every 8-23 seconds

  // ===== COFFEE CUP CLINKS =====
  let clinkTimer = 0;
  let clinkPhase = 0;
  let clinkIntensity = 0;
  let clinkFreq = 1200;
  // Secondary clink for ceramic resonance
  let clink2Phase = 0;
  let clink2Intensity = 0;

  // ===== CASH REGISTER / DOOR BELL =====
  let dingTimer = 0;
  let dingPhase = 0;
  let dingIntensity = 0;
  const dingInterval = sampleRate * (15 + Math.random() * 30); // Every 15-45 seconds

  // ===== BACKGROUND MUSIC (Very distant) =====
  let musicPhase = 0;
  const musicBaseFreq = 150 + Math.random() * 50; // Low bass note
  let musicModulation = 0;

  // ===== CHAIR/MOVEMENT SOUNDS =====
  let chairTimer = 0;
  let chairIntensity = 0;
  let chairFilterState = 0;

  cafe.addEventListener('audioprocess', (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      let sample = 0;

      // ===== PRIMARY MURMUR (Pink noise filtered to voice range) =====
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pinkNoise = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;

      // Bandpass filter to simulate voice range (simple 2-pole)
      const cutoff = 0.15; // Normalized cutoff
      vocalFilter = vocalFilter + cutoff * (pinkNoise - vocalFilter);
      const bandpass = vocalFilter - vocalFilterPrev;
      vocalFilterPrev = vocalFilter * 0.95;
      const primaryMurmur = bandpass * 2.5;

      // ===== SECONDARY MURMUR (Different texture) =====
      const white2 = Math.random() * 2 - 1;
      c0 = 0.98 * c0 + white2 * 0.02;
      c1 = 0.96 * c1 + c0 * 0.04;
      c2 = 0.94 * c2 + c1 * 0.06;
      const secondaryMurmur = c2 * 0.4;

      sample += primaryMurmur * 0.5 + secondaryMurmur * 0.3;

      // ===== ESPRESSO MACHINE (Steam hiss) =====
      espressoTimer++;
      if (espressoTimer > espressoInterval && espressoIntensity < 0.01) {
        espressoTimer = 0;
        espressoIntensity = 0.4 + Math.random() * 0.3;
      }
      if (espressoIntensity > 0.01) {
        const steamNoise = (Math.random() * 2 - 1);
        // High-pass filter for steam sound
        espressoFilterState = 0.8 * espressoFilterState + steamNoise * 0.2;
        const steam = (steamNoise - espressoFilterState) * espressoIntensity;
        sample += steam * 0.15;
        espressoIntensity *= 0.9985; // Slow decay (2-3 seconds of steam)
      }

      // ===== COFFEE CUP CLINKS =====
      clinkTimer++;
      if (clinkTimer > sampleRate * (0.8 + Math.random() * 3)) {
        clinkTimer = 0;
        clinkIntensity = 0.15 + Math.random() * 0.25;
        clink2Intensity = 0.1 + Math.random() * 0.15;
        clinkFreq = 1000 + Math.random() * 800; // Varied pitch
        clinkPhase = 0;
        clink2Phase = 0;
      }
      if (clinkIntensity > 0.001) {
        // Primary clink tone
        clinkPhase += clinkFreq / sampleRate * Math.PI * 2;
        const clink1 = Math.sin(clinkPhase) * clinkIntensity;
        // Harmonic overtone (ceramic resonance)
        clink2Phase += (clinkFreq * 2.3) / sampleRate * Math.PI * 2;
        const clink2 = Math.sin(clink2Phase) * clink2Intensity * 0.5;
        sample += (clink1 + clink2) * 0.12;
        clinkIntensity *= 0.993;
        clink2Intensity *= 0.991;
      }

      // ===== DOOR BELL / CASH REGISTER =====
      dingTimer++;
      if (dingTimer > dingInterval && dingIntensity < 0.01) {
        dingTimer = 0;
        dingIntensity = 0.2 + Math.random() * 0.2;
        dingPhase = 0;
      }
      if (dingIntensity > 0.001) {
        dingPhase += 2400 / sampleRate * Math.PI * 2;
        const ding = Math.sin(dingPhase) * dingIntensity;
        sample += ding * 0.08;
        dingIntensity *= 0.997;
      }

      // ===== BACKGROUND MUSIC (Very distant, barely audible) =====
      musicModulation += 0.00003;
      const musicFreq = musicBaseFreq + Math.sin(musicModulation * 3) * 20;
      musicPhase += musicFreq / sampleRate * Math.PI * 2;
      // Simple chord: root + fifth
      const music = (Math.sin(musicPhase) + Math.sin(musicPhase * 1.5) * 0.5) * 0.02;
      sample += music;

      // ===== CHAIR/MOVEMENT SOUNDS =====
      chairTimer++;
      if (chairTimer > sampleRate * (3 + Math.random() * 8)) {
        chairTimer = 0;
        chairIntensity = 0.15 + Math.random() * 0.2;
      }
      if (chairIntensity > 0.01) {
        const chairNoise = Math.random() * 2 - 1;
        chairFilterState = 0.7 * chairFilterState + chairNoise * 0.3;
        sample += chairFilterState * chairIntensity * 0.1;
        chairIntensity *= 0.995;
      }

      // Final output with soft limiting
      output[i] = Math.tanh(sample * 0.7) * 0.6;
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
