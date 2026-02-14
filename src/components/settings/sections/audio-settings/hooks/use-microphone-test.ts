/**
 * Hook for microphone testing with waveform visualization
 */

import { useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { requestMicrophoneStream } from '@/lib/native/media-bridge';

export function useMicrophoneTest(preferredMicrophoneId: string | null) {
  const [micTestActive, setMicTestActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnimationRef = useRef<number | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  const startMicTest = useCallback(async () => {
    try {
      const stream = await requestMicrophoneStream(
        preferredMicrophoneId ? { deviceId: { ideal: preferredMicrophoneId } } : undefined,
      );
      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

        ctx.fillStyle = 'rgb(15, 23, 42)';
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = level > 5 ? 'rgb(34, 197, 94)' : 'rgb(100, 116, 139)';
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
        gradient.addColorStop(0, 'rgb(34, 197, 94)');
        gradient.addColorStop(0.7, 'rgb(234, 179, 8)');
        gradient.addColorStop(1, 'rgb(239, 68, 68)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - 4, (width * level) / 100, 4);
      };

      setMicTestActive(true);
      drawWaveform();
    } catch (error) {
      logger.error('Mic test error', undefined, error);
    }
  }, [preferredMicrophoneId]);

  const stopMicTest = useCallback(() => {
    if (micAnimationRef.current) {
      cancelAnimationFrame(micAnimationRef.current);
      micAnimationRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
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
        ctx.fillStyle = 'rgb(30, 41, 59)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  return {
    micTestActive,
    audioLevel,
    waveformCanvasRef,
    startMicTest,
    stopMicTest,
  };
}
