/**
 * Microphone selector with waveform visualization
 */

'use client';

import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshCw, XCircle } from 'lucide-react';

interface MicrophoneSelectorProps {
  preferredMicrophoneId: string | null;
  availableMics: MediaDeviceInfo[];
  micTestActive: boolean;
  audioLevel: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onMicChange: (deviceId: string) => void;
  onRefresh: () => void;
  onStartTest: () => void;
  onStopTest: () => void;
}

export function MicrophoneSelector({
  preferredMicrophoneId,
  availableMics,
  micTestActive,
  audioLevel,
  waveformCanvasRef,
  onMicChange,
  onRefresh,
  onStartTest,
  onStopTest,
}: MicrophoneSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Mic className="w-4 h-4 text-red-500" />
            Microfono
          </label>
          <select
            value={preferredMicrophoneId || ''}
            onChange={(e) => onMicChange(e.target.value)}
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
      </div>

      {/* Mic waveform */}
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

      {/* Test buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          title="Aggiorna dispositivi"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        {!micTestActive ? (
          <Button onClick={onStartTest} variant="default" size="sm">
            <Mic className="w-4 h-4 mr-1" />
            Testa Mic
          </Button>
        ) : (
          <Button onClick={onStopTest} variant="destructive" size="sm">
            <XCircle className="w-4 h-4 mr-1" />
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
