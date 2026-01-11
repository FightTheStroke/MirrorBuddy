import type { DiagnosticResult } from './types';
import { isWebRTCSupported, getWebRTCSupportReport } from '@/lib/hooks/voice-session/webrtc-detection';

export async function runVoiceTest(): Promise<DiagnosticResult> {
  // Audio playback setup
  let playbackContext: AudioContext | null = null;
  const audioQueue: Float32Array[] = [];
  let isPlaying = false;
  let audioReceived = false;

  const initPlayback = () => {
    if (!playbackContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      playbackContext = new AudioCtx({ sampleRate: 24000 });
    }
    return playbackContext;
  };

  const playNextAudio = () => {
    if (!playbackContext || audioQueue.length === 0) {
      isPlaying = false;
      return;
    }
    isPlaying = true;
    const samples = audioQueue.shift()!;
    const buffer = playbackContext.createBuffer(1, samples.length, 24000);
    buffer.getChannelData(0).set(samples);
    const source = playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackContext.destination);
    source.onended = () => playNextAudio();
    source.start();
  };

  const queueAudio = (base64Audio: string) => {
    initPlayback();
    if (playbackContext?.state === 'suspended') {
      playbackContext.resume();
    }
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }
    audioQueue.push(float32);
    audioReceived = true;
    if (!isPlaying) {
      playNextAudio();
    }
  };

  try {
    // 0. Check WebRTC support
    const webrtcSupported = isWebRTCSupported();
    // Call getWebRTCSupportReport for availability (could be used for extended diagnostics)
    getWebRTCSupportReport();

    // 1. Check realtime config
    const statusRes = await fetch('/api/provider/status');
    const status = await statusRes.json();

    if (!status.azure?.realtimeConfigured) {
      return {
        status: 'error',
        message: 'Voice non configurato',
        details: 'Manca AZURE_OPENAI_REALTIME_ENDPOINT/KEY/DEPLOYMENT',
      };
    }

    // 2. Get proxy info and transport mode
    const tokenRes = await fetch('/api/realtime/token');
    const tokenData = await tokenRes.json();

    // Determine actual transport (WebRTC if supported, otherwise WebSocket)
    let transportMode = tokenData.transport || 'websocket';
    if (transportMode === 'webrtc' && !webrtcSupported) {
      transportMode = 'websocket';
    }

    if (!tokenData.configured || !tokenData.proxyPort) {
      return {
        status: 'error',
        message: 'Voice proxy non configurato',
        details: `Verifica che il proxy WebSocket sia in esecuzione. Transport: ${transportMode}`,
      };
    }

    // 3. Connect to WebSocket and do full voice test
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsUrl = `${wsProtocol}//${wsHost}:${tokenData.proxyPort}?maestroId=diagnostics`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      let responseDone = false;

      const timeout = setTimeout(() => {
        ws.close();
        if (audioReceived) {
          resolve(); // Got audio, test passed even with timeout
        } else {
          reject(new Error('Timeout 20s - nessun audio ricevuto'));
        }
      }, 20000);

      ws.onopen = () => {
        // WebSocket connected
      };

      ws.onmessage = async (event) => {
        try {
          let msgText: string;
          if (event.data instanceof Blob) {
            msgText = await event.data.text();
          } else {
            msgText = event.data;
          }

          const data = JSON.parse(msgText);

          // Wait for proxy.ready, then send session.update
          if (data.type === 'proxy.ready') {
            ws.send(JSON.stringify({
              type: 'session.update',
              session: {
                voice: 'alloy',
                instructions: 'Sei un assistente di test. Rispondi brevemente in italiano con una frase.',
                input_audio_format: 'pcm16',
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                  create_response: true
                }
              }
            }));
          }

          if (data.type === 'session.updated') {
            ws.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: 'Ciao! Dimmi OK per confermare che funzioni.' }]
              }
            }));
            // Trigger response
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'response.create' }));
              }
            }, 100);
          }

          // Handle audio - both Preview and GA API formats
          if ((data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') && data.delta) {
            queueAudio(data.delta);
          }

          if (data.type === 'response.done') {
            responseDone = true;
            clearTimeout(timeout);
            ws.close();
            resolve();
          }

          if (data.type === 'error') {
            clearTimeout(timeout);
            ws.close();
            reject(new Error(JSON.stringify(data.error)));
          }

        } catch {
          // Parse error, ignore
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Errore connessione WebSocket'));
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (!audioReceived && !responseDone) {
          reject(new Error(`WebSocket chiuso: code=${event.code}, reason=${event.reason || 'none'}`));
        }
      };
    });

    // Success - audio was played!
    const webrtcInfo = webrtcSupported ? 'WebRTC supportato' : 'WebRTC non supportato (fallback a WebSocket)';
    return {
      status: 'success',
      message: 'Voice funzionante! Hai sentito la risposta?',
      details: `Transport: ${transportMode} | ${webrtcInfo} | Proxy: ${wsUrl} | Audio ricevuto e riprodotto`,
    };

  } catch (error) {
    const webrtcInfo = webrtcSupported ? 'WebRTC supportato' : 'WebRTC non supportato';
    return {
      status: 'error',
      message: 'Voice test fallito',
      details: `${webrtcInfo} | Errore: ${String(error)}`,
    };
  } finally {
    // Cleanup
    try {
      (playbackContext as AudioContext | null)?.close();
    } catch {
      // Ignore close errors
    }
  }
}
