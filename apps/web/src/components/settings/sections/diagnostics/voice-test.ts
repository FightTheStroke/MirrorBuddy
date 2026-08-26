import type { DiagnosticResult } from './types';
import {
  isWebRTCSupported,
  getWebRTCSupportReport,
} from '@/lib/hooks/voice-session/webrtc-detection';

/**
 * What this diagnostic checks, and what it deliberately does not.
 *
 * It used to open a WebSocket to a local proxy, speak, and wait for audio back.
 * That proxy has been deleted: voice runs over WebRTC straight to Azure. The
 * old test would now always fail, and it would fail with the wrong sentence —
 * "check that the WebSocket proxy is running" sends an operator looking for a
 * process that no longer exists, which is worse than saying nothing.
 *
 * So this checks the three things that must be true BEFORE a voice session can
 * start, and says plainly that the audio round-trip is not among them. A
 * diagnostic that overstates its coverage is how a real fault gets dismissed.
 */
export async function runVoiceTest(): Promise<DiagnosticResult> {
  try {
    const webrtcSupported = isWebRTCSupported();
    const support = getWebRTCSupportReport();

    if (!webrtcSupported) {
      return {
        status: 'error',
        message: 'Questo browser non supporta WebRTC',
        details:
          "Voice richiede WebRTC e non esiste piu' un fallback WebSocket. " +
          `RTCPeerConnection: ${support.rtcPeerConnection}, getUserMedia: ${support.getUserMedia}, mediaDevices: ${support.mediaDevices}`,
      };
    }

    // 1. Is the realtime resource configured at all?
    const statusRes = await fetch('/api/provider/status');
    const status = await statusRes.json();

    if (!status.azure?.realtimeConfigured) {
      return {
        status: 'error',
        message: 'Voice non configurato',
        details: 'Manca AZURE_OPENAI_REALTIME_ENDPOINT/KEY/DEPLOYMENT',
      };
    }

    // 2. Does the token route answer, and does it describe the only transport?
    const tokenRes = await fetch('/api/realtime/token');
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.configured) {
      return {
        status: 'error',
        message: 'Voice non configurato',
        details: `/api/realtime/token ha risposto ${tokenRes.status}: ${tokenData.error ?? 'nessun dettaglio'}`,
      };
    }

    if (tokenData.transport !== 'webrtc') {
      return {
        status: 'error',
        message: 'Transport inatteso',
        details: `Atteso "webrtc", ricevuto "${String(tokenData.transport)}". WebRTC e' l'unico transport rimasto.`,
      };
    }

    // 3. Does Azure actually issue an ephemeral secret right now? This is the
    //    step that fails when a key is expired or a deployment is wrong, and it
    //    is the last one we can check without taking the microphone.
    const ephemeralRes = await fetch('/api/realtime/ephemeral-token', { method: 'POST' });
    const ephemeral = await ephemeralRes.json().catch(() => ({}));

    if (!ephemeralRes.ok) {
      return {
        status: 'error',
        message: 'Azure non rilascia il token effimero',
        details: `HTTP ${ephemeralRes.status}${ephemeral?.details ? ` — ${ephemeral.details}` : ''}`,
      };
    }

    return {
      status: 'success',
      message: 'Voice pronto: configurazione e token verificati',
      details:
        'WebRTC supportato, /api/realtime/token risponde webrtc, Azure rilascia il token effimero. ' +
        "Il giro completo dell'audio NON e' coperto da questo test: va provato parlando.",
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Voice test fallito',
      details: String(error),
    };
  }
}
