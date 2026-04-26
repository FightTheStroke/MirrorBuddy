'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Mic, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clientLogger as logger } from '@/lib/logger/client';
import { requestMicrophoneStream } from '@/lib/native/media-bridge';

interface WaveformVisualizationProps {
  availableMics: MediaDeviceInfo[];
  selectedMicId: string;
  onMicChange: (micId: string) => void;
  onRefresh: () => void;
}

export function WaveformVisualization({
  availableMics,
  selectedMicId,
  onMicChange,
  onRefresh,
}: WaveformVisualizationProps) {
  const t = useTranslations('settings.diagnostics');
  const [waveformActive, setWaveformActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContextRef = useRef<AudioContext | null>(null);
  const waveformStreamRef = useRef<MediaStream | null>(null);
  const waveformAnalyserRef = useRef<AnalyserNode | null>(null);
  const waveformAnimationRef = useRef<number | null>(null);

  const startWaveform = async () => {
    try {
      const stream = await requestMicrophoneStream(
        selectedMicId ? { deviceId: { ideal: selectedMicId } } : undefined,
      );
      waveformStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      waveformContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      waveformAnalyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setWaveformActive(true);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const timeDataArray = new Uint8Array(analyser.fftSize);

      const draw = () => {
        if (!waveformAnalyserRef.current) return;

        waveformAnimationRef.current = requestAnimationFrame(draw);

        waveformAnalyserRef.current.getByteTimeDomainData(timeDataArray);

        let sum = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const value = (timeDataArray[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / timeDataArray.length);
        const level = Math.min(100, rms * 400);
        setAudioLevel(level);

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

        ctx.fillStyle = 'rgb(34, 197, 94)';
        ctx.fillRect(0, height - 8, (width * level) / 100, 8);
      };

      draw();
    } catch (error) {
      logger.error('Waveform error', undefined, error);
      setWaveformActive(false);
    }
  };

  const stopWaveform = () => {
    if (waveformAnimationRef.current) {
      cancelAnimationFrame(waveformAnimationRef.current);
      waveformAnimationRef.current = null;
    }
    if (waveformStreamRef.current) {
      waveformStreamRef.current.getTracks().forEach((t) => t.stop());
      waveformStreamRef.current = null;
    }
    if (waveformContextRef.current) {
      waveformContextRef.current.close();
      waveformContextRef.current = null;
    }
    waveformAnalyserRef.current = null;
    setWaveformActive(false);
    setAudioLevel(0);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgb(15, 23, 42)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-red-500" />
          {t('testMicrofonoLiveWaveform')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          {t('avviaIlTestPerVedereLaWaveformDelMicrofonoInTempoR')}
          {t('parlaPerVedereLaFormaDAposOnda')}
        </p>

        <div className="flex items-center gap-3">
          <label
            htmlFor="waveform-microphone"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
          >
            {t('microfono')}
          </label>
          <select
            id="waveform-microphone"
            value={selectedMicId}
            onChange={(e) => onMicChange(e.target.value)}
            disabled={waveformActive}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {availableMics.length === 0 ? (
              <option value="">{t('noMicrophoneFound')}</option>
            ) : (
              availableMics.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microfono ${mic.deviceId.slice(0, 8)}...`}
                </option>
              ))
            )}
          </select>
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={waveformActive}
            title={t('aggiornaListaMicrofoni')}
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
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">LIVE</span>
            </div>
          )}
        </div>

        {waveformActive && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{t('livello')}</span>
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
              {t('avviaWaveform')}
            </Button>
          ) : (
            <Button onClick={stopWaveform} className="flex-1" variant="destructive">
              <XCircle className="w-4 h-4 mr-2" />
              {t('stopWaveform')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
