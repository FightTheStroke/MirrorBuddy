'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Wrench, CheckCircle, XCircle, Loader2, RefreshCw, Server, MessageSquare, Radio, Mic, Volume2, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

type DiagnosticStatus = 'idle' | 'running' | 'success' | 'error';

interface DiagnosticResult {
  status: DiagnosticStatus;
  message?: string;
  details?: string;
}

export function DiagnosticsTab() {
  const [configCheck, setConfigCheck] = useState<DiagnosticResult>({ status: 'idle' });
  const [chatTest, setChatTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [voiceTest, setVoiceTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [micTest, setMicTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [speakerTest, setSpeakerTest] = useState<DiagnosticResult>({ status: 'idle' });

  // Waveform state
  const [waveformActive, setWaveformActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContextRef = useRef<AudioContext | null>(null);
  const waveformStreamRef = useRef<MediaStream | null>(null);
  const waveformAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformAnimationRef = useRef<number | null>(null);

  // Webcam test state
  const [webcamActive, setWebcamActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string>('');
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);


  // Fetch available microphones
  const refreshMicrophones = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      setAvailableMics(mics);
      if (mics.length > 0 && !selectedMicId) {
        setSelectedMicId(mics[0].deviceId);
      }
    } catch (error) {
      logger.error('Error fetching microphones', { error });
    }
  }, [selectedMicId]);

  useEffect(() => {
    refreshMicrophones();
  }, [refreshMicrophones]);

  // Fetch available cameras
  const refreshCameras = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop()));
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(cams);
      if (cams.length > 0 && !selectedCamId) {
        setSelectedCamId(cams[0].deviceId);
      }
    } catch (error) {
      logger.error('Error fetching cameras', { error });
    }
  }, [selectedCamId]);

  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  // Check provider configuration
  const runConfigCheck = async () => {
    setConfigCheck({ status: 'running' });
    try {
      const res = await fetch('/api/provider/status');
      const data = await res.json();

      if (data.activeProvider) {
        setConfigCheck({
          status: 'success',
          message: `Provider attivo: ${data.activeProvider}`,
          details: data.activeProvider === 'azure'
            ? `Chat: ${data.azure.model || 'N/A'}, Voice: ${data.azure.realtimeModel || 'Non configurato'}`
            : `Model: ${data.ollama.model}`,
        });
      } else {
        setConfigCheck({
          status: 'error',
          message: 'Nessun provider configurato',
          details: 'Configura Azure OpenAI o avvia Ollama',
        });
      }
    } catch (error) {
      setConfigCheck({
        status: 'error',
        message: 'Errore connessione API',
        details: String(error),
      });
    }
  };

  // Test chat API
  const runChatTest = async () => {
    setChatTest({ status: 'running' });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Rispondi solo con "OK"' }],
          systemPrompt: 'Sei un assistente. Rispondi brevemente in italiano.',
          maxTokens: 50,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const responseContent = data.choices?.[0]?.message?.content || data.content || 'No response';
      const provider = data.provider || 'unknown';
      const model = data.model || 'unknown';

      setChatTest({
        status: 'success',
        message: `Chat API funzionante (${provider}/${model})`,
        details: `Risposta: "${responseContent.substring(0, 80)}"`,
      });
    } catch (error) {
      setChatTest({
        status: 'error',
        message: 'Chat API non funzionante',
        details: String(error),
      });
    }
  };

  // Test voice WebSocket with full audio test
  const runVoiceTest = async () => {
    setVoiceTest({ status: 'running', message: 'Connessione in corso...' });

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
      // 1. Check realtime config
      const statusRes = await fetch('/api/provider/status');
      const status = await statusRes.json();

      if (!status.azure?.realtimeConfigured) {
        setVoiceTest({
          status: 'error',
          message: 'Voice non configurato',
          details: 'Manca AZURE_OPENAI_REALTIME_ENDPOINT/KEY/DEPLOYMENT',
        });
        return;
      }

      // 2. Get proxy info
      const tokenRes = await fetch('/api/realtime/token');
      const tokenData = await tokenRes.json();

      if (!tokenData.configured || !tokenData.proxyPort) {
        setVoiceTest({
          status: 'error',
          message: 'Voice proxy non configurato',
          details: 'Verifica che il proxy WebSocket sia in esecuzione',
        });
        return;
      }

      // 3. Connect to WebSocket and do full voice test
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      const wsUrl = `${wsProtocol}//${wsHost}:${tokenData.proxyPort}?maestroId=diagnostics`;

      setVoiceTest({ status: 'running', message: 'Connessione WebSocket...' });

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        let _sessionUpdated = false;
        let responseDone = false;
        let _transcript = '';

        const timeout = setTimeout(() => {
          ws.close();
          if (audioReceived) {
            resolve(); // Got audio, test passed even with timeout
          } else {
            reject(new Error('Timeout 20s - nessun audio ricevuto'));
          }
        }, 20000);

        ws.onopen = () => {
          setVoiceTest({ status: 'running', message: 'WebSocket connesso, attendo proxy...' });
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
              setVoiceTest({ status: 'running', message: 'Azure connesso, configurazione sessione...' });
              // Send session.update (Preview API format)
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
              _sessionUpdated = true;
              setVoiceTest({ status: 'running', message: 'Sessione configurata, invio messaggio...' });
              // Send a test message
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
                  setVoiceTest({ status: 'running', message: 'Attendo risposta audio...' });
                }
              }, 100);
            }

            // Handle audio - both Preview and GA API formats
            if ((data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') && data.delta) {
              queueAudio(data.delta);
              setVoiceTest({ status: 'running', message: 'Ricevendo audio... 🔊' });
            }

            // Handle transcript - both formats
            if ((data.type === 'response.audio_transcript.delta' || data.type === 'response.output_audio_transcript.delta') && data.delta) {
              _transcript += data.delta;
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
      setVoiceTest({
        status: 'success',
        message: 'Voice funzionante! Hai sentito la risposta?',
        details: `Proxy: ${wsUrl}, Audio ricevuto e riprodotto`,
      });

    } catch (error) {
      setVoiceTest({
        status: 'error',
        message: 'Voice test fallito',
        details: String(error),
      });
    } finally {
      // Cleanup - playbackContext is set in closure so TypeScript doesn't track it
      try {
        (playbackContext as AudioContext | null)?.close();
      } catch {
        // Ignore close errors
      }
    }
  };

  // Test microphone access
  const runMicTest = async () => {
    setMicTest({ status: 'running' });
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

      setMicTest({
        status: 'success',
        message: 'Microfono funzionante',
        details: `Device: ${track.label || settings.deviceId || 'Default'}`,
      });
    } catch (error) {
      setMicTest({
        status: 'error',
        message: 'Microfono non accessibile',
        details: error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Permesso negato - abilita il microfono nelle impostazioni del browser'
          : String(error),
      });
    }
  };

  // Test speaker with a beep
  const runSpeakerTest = async () => {
    setSpeakerTest({ status: 'running' });
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

      setSpeakerTest({
        status: 'success',
        message: 'Audio riprodotto (hai sentito il beep?)',
        details: `Sample rate: ${audioContext.sampleRate}Hz`,
      });
    } catch (error) {
      setSpeakerTest({
        status: 'error',
        message: 'Riproduzione audio fallita',
        details: String(error),
      });
    }
  };

  // Start waveform visualization
  const startWaveform = async () => {
    try {
      // Use 'ideal' for graceful fallback if device becomes unavailable
      const audioConstraints: boolean | MediaTrackConstraints = selectedMicId
        ? { deviceId: { ideal: selectedMicId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      waveformStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      waveformContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      waveformAnalyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setWaveformActive(true);

      // Draw waveform
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const timeDataArray = new Uint8Array(analyser.fftSize);

      const draw = () => {
        if (!waveformAnalyserRef.current) return;

        waveformAnimationRef.current = requestAnimationFrame(draw);

        // Get time domain data for waveform
        waveformAnalyserRef.current.getByteTimeDomainData(timeDataArray);

        // Calculate audio level (RMS)
        let sum = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const value = (timeDataArray[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / timeDataArray.length);
        const level = Math.min(100, rms * 400);
        setAudioLevel(level);

        // Draw waveform
        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = 'rgb(15, 23, 42)'; // slate-900
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = level > 5 ? 'rgb(34, 197, 94)' : 'rgb(100, 116, 139)'; // green-500 or slate-500
        ctx.beginPath();

        const sliceWidth = width / timeDataArray.length;
        let x = 0;

        for (let i = 0; i < timeDataArray.length; i++) {
          const v = timeDataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw level bar at the bottom
        ctx.fillStyle = 'rgb(34, 197, 94)'; // green-500
        ctx.fillRect(0, height - 8, (width * level) / 100, 8);
      };

      draw();
    } catch (error) {
      logger.error('Waveform error', { error });
      setWaveformActive(false);
    }
  };

  // Stop waveform visualization
  const stopWaveform = () => {
    if (waveformAnimationRef.current) {
      cancelAnimationFrame(waveformAnimationRef.current);
      waveformAnimationRef.current = null;
    }
    if (waveformStreamRef.current) {
      waveformStreamRef.current.getTracks().forEach(t => t.stop());
      waveformStreamRef.current = null;
    }
    if (waveformContextRef.current) {
      waveformContextRef.current.close();
      waveformContextRef.current = null;
    }
    waveformAnalyserRef.current = null;
    setWaveformActive(false);
    setAudioLevel(0);

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgb(15, 23, 42)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Start webcam preview
  const startWebcam = async () => {
    try {
      // Use 'ideal' for graceful fallback if device becomes unavailable
      const videoConstraints: boolean | MediaTrackConstraints = selectedCamId
        ? { deviceId: { ideal: selectedCamId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      webcamStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      setWebcamActive(true);
    } catch (error) {
      logger.error('Webcam error', { error });
      setWebcamActive(false);
    }
  };

  // Stop webcam preview
  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  // Run all tests
  const runAllTests = async () => {
    await runConfigCheck();
    await runChatTest();
    await runVoiceTest();
    await runMicTest();
    await runSpeakerTest();
  };

  const StatusIcon = ({ status }: { status: DiagnosticStatus }) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Radio className="w-5 h-5 text-slate-400" />;
    }
  };

  const DiagnosticCard = ({
    title,
    icon,
    result,
    onRun,
  }: {
    title: string;
    icon: React.ReactNode;
    result: DiagnosticResult;
    onRun: () => void;
  }) => (
    <div className={cn(
      'p-4 rounded-xl border-2 transition-all',
      result.status === 'success' && 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700',
      result.status === 'error' && 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700',
      result.status === 'running' && 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700',
      result.status === 'idle' && 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <StatusIcon status={result.status} />
      </div>
      {result.message && (
        <p className={cn(
          'text-sm',
          result.status === 'success' && 'text-green-700 dark:text-green-400',
          result.status === 'error' && 'text-red-700 dark:text-red-400',
          result.status === 'running' && 'text-blue-700 dark:text-blue-400',
        )}>
          {result.message}
        </p>
      )}
      {result.details && (
        <p className="text-xs text-slate-500 mt-1 font-mono">{result.details}</p>
      )}
      <Button
        onClick={onRun}
        disabled={result.status === 'running'}
        variant="default"
        size="sm"
        className="mt-3 w-full"
      >
        {result.status === 'running' ? 'Testing...' : result.status === 'idle' ? 'Esegui Test' : 'Ripeti Test'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            Diagnostica Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Verifica che tutti i componenti funzionino correttamente: configurazione, chat API (con AI response), voice (con audio playback), microfono e speaker.
          </p>

          <Button onClick={runAllTests} className="w-full" size="lg">
            <Wrench className="w-4 h-4 mr-2" />
            Esegui Tutti i Test
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DiagnosticCard
          title="Configurazione"
          icon={<Server className="w-5 h-5 text-blue-500" />}
          result={configCheck}
          onRun={runConfigCheck}
        />

        <DiagnosticCard
          title="Chat API"
          icon={<MessageSquare className="w-5 h-5 text-green-500" />}
          result={chatTest}
          onRun={runChatTest}
        />

        <DiagnosticCard
          title="Voice (Test Completo)"
          icon={<Radio className="w-5 h-5 text-purple-500" />}
          result={voiceTest}
          onRun={runVoiceTest}
        />

        <DiagnosticCard
          title="Microfono"
          icon={<Mic className="w-5 h-5 text-red-500" />}
          result={micTest}
          onRun={runMicTest}
        />

        <DiagnosticCard
          title="Speaker / Audio"
          icon={<Volume2 className="w-5 h-5 text-amber-500" />}
          result={speakerTest}
          onRun={runSpeakerTest}
        />
      </div>

      {/* Live Waveform Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-red-500" />
            Test Microfono Live (Waveform)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Avvia il test per vedere la waveform del microfono in tempo reale. Parla per vedere la forma d&apos;onda.
          </p>

          {/* Microphone selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Microfono:
            </label>
            <select
              value={selectedMicId}
              onChange={(e) => setSelectedMicId(e.target.value)}
              disabled={waveformActive}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableMics.length === 0 ? (
                <option value="">Nessun microfono trovato</option>
              ) : (
                availableMics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microfono ${mic.deviceId.slice(0, 8)}...`}
                  </option>
                ))
              )}
            </select>
            <Button
              onClick={refreshMicrophones}
              variant="outline"
              size="sm"
              disabled={waveformActive}
              title="Aggiorna lista microfoni"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full h-[150px] rounded-lg bg-slate-900 border border-slate-700"
            />
            {waveformActive && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  LIVE
                </span>
              </div>
            )}
          </div>

          {waveformActive && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Livello:</span>
              <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className="text-sm font-mono text-slate-600 dark:text-slate-400 w-12">
                {Math.round(audioLevel)}%
              </span>
            </div>
          )}

          <div className="flex gap-3">
            {!waveformActive ? (
              <Button onClick={startWaveform} className="flex-1" variant="default">
                <Mic className="w-4 h-4 mr-2" />
                Avvia Waveform
              </Button>
            ) : (
              <Button onClick={stopWaveform} className="flex-1" variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Stop Waveform
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Webcam Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            Test Webcam Live
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Avvia il test per vedere l&apos;anteprima della webcam selezionata. Utile per verificare che macOS non stia usando la webcam sbagliata con Continuity Camera.
          </p>

          {/* Camera selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Webcam:
            </label>
            <select
              value={selectedCamId}
              onChange={(e) => setSelectedCamId(e.target.value)}
              disabled={webcamActive}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableCameras.length === 0 ? (
                <option value="">Nessuna webcam trovata</option>
              ) : (
                availableCameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Webcam ${cam.deviceId.slice(0, 8)}...`}
                  </option>
                ))
              )}
            </select>
            <Button
              onClick={refreshCameras}
              variant="outline"
              size="sm"
              disabled={webcamActive}
              title="Aggiorna lista webcam"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Video preview */}
          <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video">
            <video
              ref={videoPreviewRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-600" />
              </div>
            )}
            {webcamActive && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  LIVE
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!webcamActive ? (
              <Button onClick={startWebcam} className="flex-1" variant="default">
                <Video className="w-4 h-4 mr-2" />
                Avvia Webcam
              </Button>
            ) : (
              <Button onClick={stopWebcam} className="flex-1" variant="destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Stop Webcam
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platform Help Info (Issue #16) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            Aiuto sulla Piattaforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            Hai bisogno di aiuto con la configurazione o hai problemi tecnici?
            Puoi chiedere al tuo Coach: conosce tutte le funzionalita di MirrorBuddy!
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Azure OpenAI</span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Voce e Audio</span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Flashcard e Quiz</span>
            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Accessibilita</span>
          </div>

          <p className="text-xs text-slate-500 italic">
            Vai nella sezione Chat e parla con il tuo Coach preferito.
          </p>
        </CardContent>
      </Card>

      {/* Troubleshooting hints */}
      <Card>
        <CardHeader>
          <CardTitle>Risoluzione Problemi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="font-medium text-blue-700 dark:text-blue-300">Chat non funziona?</p>
            <p className="text-blue-600 dark:text-blue-400 mt-1">
              Verifica che Azure OpenAI o Ollama siano configurati. Controlla le variabili .env e i log del server.
            </p>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="font-medium text-purple-700 dark:text-purple-300">Voice non funziona?</p>
            <p className="text-purple-600 dark:text-purple-400 mt-1">
              La voce richiede Azure OpenAI Realtime API (AZURE_OPENAI_REALTIME_*). Ollama non supporta voice.
            </p>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="font-medium text-red-700 dark:text-red-300">Microfono bloccato?</p>
            <p className="text-red-600 dark:text-red-400 mt-1">
              Clicca sull&apos;icona del lucchetto nella barra URL del browser e abilita il permesso microfono.
            </p>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="font-medium text-amber-700 dark:text-amber-300">Audio non si sente?</p>
            <p className="text-amber-600 dark:text-amber-400 mt-1">
              Verifica il volume del sistema. Se usi Chrome, potrebbe bloccare l&apos;audio autoplay - clicca prima sulla pagina.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
