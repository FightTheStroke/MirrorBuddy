import type { DiagnosticResult } from './types';

export async function runMicTest(): Promise<DiagnosticResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tracks = stream.getAudioTracks();

    if (tracks.length === 0) {
      throw new Error('Nessun microfono trovato');
    }

    const track = tracks[0];
    const settings = track.getSettings();

    // Stop the stream
    stream.getTracks().forEach(t => t.stop());

    return {
      status: 'success',
      message: 'Microfono funzionante',
      details: `Device: ${track.label || settings.deviceId || 'Default'}`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Microfono non accessibile',
      details: error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Permesso negato - abilita il microfono nelle impostazioni del browser'
        : String(error),
    };
  }
}

export async function runSpeakerTest(): Promise<DiagnosticResult> {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Resume if suspended (autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Create a simple beep
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440; // A4 note
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    await new Promise(resolve => setTimeout(resolve, 600));

    audioContext.close();

    return {
      status: 'success',
      message: 'Audio riprodotto (hai sentito il beep?)',
      details: `Sample rate: ${audioContext.sampleRate}Hz`,
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Riproduzione audio fallita',
      details: String(error),
    };
  }
}
