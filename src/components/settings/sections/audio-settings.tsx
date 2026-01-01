'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Volume2, Video, RefreshCw, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/lib/stores/app-store';
import { logger } from '@/lib/logger';

// Audio/Video Settings - Global device preferences
export function AudioSettings() {
  const { preferredMicrophoneId, preferredOutputId, preferredCameraId, setPreferredMicrophone, setPreferredOutput, setPreferredCamera } = useSettingsStore();
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [availableOutputs, setAvailableOutputs] = useState<MediaDeviceInfo[]>([]);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [micTestActive, setMicTestActive] = useState(false);
  const [speakerTestActive, setSpeakerTestActive] = useState(false);
  const [camTestActive, setCamTestActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for audio test
  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnimationRef = useRef<number | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for video test
  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  // Fetch available devices
  const refreshDevices = useCallback(async () => {
    try {
      // Request permissions first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(s => s.getTracks().forEach(t => t.stop()))
        .catch(() => {
          // Try audio only if video fails
          return navigator.mediaDevices.getUserMedia({ audio: true })
            .then(s => s.getTracks().forEach(t => t.stop()));
        });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      const cams = devices.filter(d => d.kind === 'videoinput');

      setAvailableMics(mics);
      setAvailableOutputs(outputs);
      setAvailableCameras(cams);
    } catch (error) {
      logger.error('Error fetching devices', { error });
    }
  }, []);

  useEffect(() => {
    // Use a small delay to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      refreshDevices();
    }, 0);

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => {
      clearTimeout(timer);
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    };
  }, [refreshDevices]);

  // Start microphone test with waveform visualization
  const startMicTest = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: preferredMicrophoneId
          ? { deviceId: { ideal: preferredMicrophoneId } }
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      micContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      micAnalyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = waveformCanvasRef.current;
      if (!canvas) {
        logger.error('Waveform canvas not found');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const timeDataArray = new Uint8Array(analyser.fftSize);

      const drawWaveform = () => {
        if (!micAnalyserRef.current) return;
        micAnimationRef.current = requestAnimationFrame(drawWaveform);

        // Get time domain data for waveform
        micAnalyserRef.current.getByteTimeDomainData(timeDataArray);

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
        const gradient = ctx.createLinearGradient(0, 0, (width * level) / 100, 0);
        gradient.addColorStop(0, 'rgb(34, 197, 94)');    // green
        gradient.addColorStop(0.7, 'rgb(234, 179, 8)');  // yellow
        gradient.addColorStop(1, 'rgb(239, 68, 68)');    // red
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 4, (width * level) / 100, 4);
      };

      setMicTestActive(true);
      drawWaveform();
    } catch (error) {
      logger.error('Mic test error', { error });
    }
  };

  // Stop microphone test
  const stopMicTest = () => {
    if (micAnimationRef.current) {
      cancelAnimationFrame(micAnimationRef.current);
      micAnimationRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (micContextRef.current) {
      micContextRef.current.close();
      micContextRef.current = null;
    }
    micAnalyserRef.current = null;
    setMicTestActive(false);
    setAudioLevel(0);

    // Clear canvas
    const canvas = waveformCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgb(30, 41, 59)'; // slate-800
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Start camera test
  const startCamTest = async () => {
    try {
      // Use 'ideal' instead of 'exact' so it falls back to default if device is disconnected
      const constraints: MediaStreamConstraints = {
        video: preferredCameraId
          ? { deviceId: { ideal: preferredCameraId } }
          : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      camStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCamTestActive(true);
    } catch (error) {
      logger.error('Camera test error', { error });
    }
  };

  // Stop camera test
  const stopCamTest = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamTestActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicTest();
      stopCamTest();
    };
  }, []);

  // Restart tests when device changes
  const handleMicChange = async (deviceId: string) => {
    setPreferredMicrophone(deviceId);
    if (micTestActive) {
      stopMicTest();
      // Small delay to allow cleanup
      setTimeout(() => startMicTest(), 100);
    }
  };

  const handleOutputChange = (deviceId: string) => {
    setPreferredOutput(deviceId);
    // If speaker test is active, it will use the new device on next test
  };

  const handleCamChange = async (deviceId: string) => {
    setPreferredCamera(deviceId);
    if (camTestActive) {
      stopCamTest();
      setTimeout(() => startCamTest(), 100);
    }
  };

  // Test speaker output
  const testSpeaker = async () => {
    setSpeakerTestActive(true);

    // Helper function to play fallback tone
    const playFallbackTone = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioCtx();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);

        setTimeout(() => {
          audioContext.close();
          setSpeakerTestActive(false);
        }, 600);
      } catch (error) {
        logger.error('Fallback tone error', { error });
        setSpeakerTestActive(false);
      }
    };

    try {
      // Use Web Speech API to speak a test phrase
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance('Ciao! Il test audio funziona correttamente.');
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find an Italian voice
        const voices = window.speechSynthesis.getVoices();
        const italianVoice = voices.find(v => v.lang.startsWith('it')) || voices[0];
        if (italianVoice) {
          utterance.voice = italianVoice;
        }

        utterance.onend = () => {
          setSpeakerTestActive(false);
        };

        utterance.onerror = () => {
          logger.error('Speech synthesis error, falling back to tone');
          playFallbackTone();
        };

        window.speechSynthesis.speak(utterance);

        // Fallback timeout in case onend doesn't fire
        setTimeout(() => {
          setSpeakerTestActive(false);
        }, 5000);
      } else {
        // Fallback to tone if speech synthesis not available
        playFallbackTone();
      }
    } catch (error) {
      logger.error('Speaker test error', { error });
      playFallbackTone();
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio Devices - Compact 2-column layout (Fix #11) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-500" />
            Dispositivi Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Microphone */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Mic className="w-4 h-4 text-red-500" />
                Microfono
              </label>
              <select
                value={preferredMicrophoneId}
                onChange={(e) => handleMicChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">Predefinito di sistema</option>
                {availableMics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microfono ${mic.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>

            {/* Output */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Volume2 className="w-4 h-4 text-amber-500" />
                Altoparlanti
              </label>
              <select
                value={preferredOutputId}
                onChange={(e) => handleOutputChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">Predefinito di sistema</option>
                {availableOutputs.map((output) => (
                  <option key={output.deviceId} value={output.deviceId}>
                    {output.label || `Altoparlante ${output.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mic waveform - compact */}
          <div className="space-y-2">
            {micTestActive && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Parla per testare
                </span>
                <span className="text-xs font-mono text-slate-500 ml-auto">
                  {Math.round(audioLevel)}%
                </span>
              </div>
            )}
            <div className="relative">
              <canvas
                ref={waveformCanvasRef}
                width={600}
                height={60}
                className="w-full h-[60px] rounded-lg bg-slate-800 dark:bg-slate-900"
              />
              {!micTestActive && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                  Clicca &quot;Testa&quot; per vedere la waveform
                </div>
              )}
            </div>
          </div>

          {/* Test buttons - row */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={refreshDevices}
              variant="outline"
              size="sm"
              title="Aggiorna dispositivi"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {!micTestActive ? (
              <Button onClick={startMicTest} variant="default" size="sm">
                <Mic className="w-4 h-4 mr-1" />
                Testa Mic
              </Button>
            ) : (
              <Button onClick={stopMicTest} variant="destructive" size="sm">
                <XCircle className="w-4 h-4 mr-1" />
                Stop
              </Button>
            )}
            <Button
              onClick={testSpeaker}
              variant="default"
              size="sm"
              disabled={speakerTestActive}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              {speakerTestActive ? '...' : 'Testa'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webcam - Better layout with larger preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="w-5 h-5 text-blue-500" />
            Webcam
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large video preview */}
          <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden bg-slate-900">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            {!camTestActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Video className="w-12 h-12 text-slate-600" />
                <span className="text-sm text-slate-500">Clicca &quot;Testa&quot; per vedere l&apos;anteprima</span>
              </div>
            )}
            {camTestActive && (
              <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-black/50 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-white">LIVE</span>
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-4">
            <select
              value={preferredCameraId}
              onChange={(e) => handleCamChange(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="">Predefinito di sistema</option>
              {availableCameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Webcam ${cam.deviceId.slice(0, 8)}...`}
                </option>
              ))}
            </select>
            <Button onClick={refreshDevices} variant="outline" size="sm" title="Aggiorna dispositivi">
              <RefreshCw className="w-4 h-4" />
            </Button>
            {!camTestActive ? (
              <Button onClick={startCamTest} variant="default" size="sm">
                <Video className="w-4 h-4 mr-1" />
                Testa
              </Button>
            ) : (
              <Button onClick={stopCamTest} variant="destructive" size="sm">
                <XCircle className="w-4 h-4 mr-1" />
                Stop
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Per future funzionalità video
          </p>
        </CardContent>
      </Card>

      {/* Voice Experience Settings - REMOVED: moved to /test-voice debug page */}
      {/* Optimal settings now hardcoded in use-voice-session.ts */}

      {/* Info about Continuity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nota per utenti Mac</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Se hai attivo <strong>Continuity Camera</strong>, macOS potrebbe selezionare automaticamente
            la webcam dell&apos;iPhone invece di quella integrata. Usa i menu sopra per scegliere il
            dispositivo corretto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// VoiceExperienceSettings REMOVED - Issue #61
// Voice settings are now hardcoded to optimal values in use-voice-session.ts
// Debug controls available at /test-voice page
