'use client';

import { useState } from 'react';
import { Settings2, Mic, Volume2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioDevices } from '@/lib/hooks/use-audio-devices';
import { useSettingsStore } from '@/lib/stores/app-store';
import { cn } from '@/lib/utils';

interface AudioDeviceSelectorProps {
  /** Compact mode for overlay (default) vs expanded mode */
  compact?: boolean;
  className?: string;
}

/**
 * Compact audio device selector for voice call overlays.
 * Allows quick switching of microphone and speaker during a call.
 */
export function AudioDeviceSelector({
  compact = true,
  className,
}: AudioDeviceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { microphones, speakers, hasPermission, requestPermission } = useAudioDevices();
  const {
    preferredMicrophoneId,
    preferredOutputId,
    setPreferredMicrophone,
    setPreferredOutput,
  } = useSettingsStore();

  // Find current device names
  const currentMic = microphones.find(m => m.deviceId === preferredMicrophoneId)?.label
    || (preferredMicrophoneId ? 'Microfono selezionato' : 'Predefinito');
  const currentSpeaker = speakers.find(s => s.deviceId === preferredOutputId)?.label
    || (preferredOutputId ? 'Altoparlante selezionato' : 'Predefinito');

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!hasPermission) {
              requestPermission();
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className="text-slate-300 hover:text-white hover:bg-slate-700/50"
          aria-label="Impostazioni audio"
        >
          <Settings2 className="w-4 h-4" />
          <ChevronDown className={cn(
            'w-3 h-3 ml-1 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Button>

        {isOpen && (
          <div className="absolute bottom-full mb-2 right-0 w-64 p-3 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50">
            <div className="space-y-3">
              {/* Microphone */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Mic className="w-3 h-3" />
                  Microfono
                </label>
                <select
                  value={preferredMicrophoneId}
                  onChange={(e) => setPreferredMicrophone(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-600 bg-slate-700 text-white"
                >
                  <option value="">Predefinito di sistema</option>
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speaker */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Volume2 className="w-3 h-3" />
                  Altoparlanti
                </label>
                <select
                  value={preferredOutputId}
                  onChange={(e) => setPreferredOutput(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded border border-slate-600 bg-slate-700 text-white"
                >
                  <option value="">Predefinito di sistema</option>
                  {speakers.map((speaker) => (
                    <option key={speaker.deviceId} value={speaker.deviceId}>
                      {speaker.label}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-slate-500 text-center">
                Cambio dispositivo applicato al prossimo avvio
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded mode (not used yet, but available)
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Mic className="w-4 h-4" />
        <span className="truncate">{currentMic}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Volume2 className="w-4 h-4" />
        <span className="truncate">{currentSpeaker}</span>
      </div>
    </div>
  );
}
