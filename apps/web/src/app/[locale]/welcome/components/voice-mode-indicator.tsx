import { Wifi, Volume2, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoiceConnectionInfo } from '../types';

interface VoiceModeResult {
  label: string;
  icon: typeof Wifi;
  color: string;
  bg: string;
  tooltip?: string;
}

export function useVoiceModeInfo(
  hasCheckedAzure: boolean,
  useWebSpeechFallback: boolean,
  connectionInfo: VoiceConnectionInfo | null,
  t: (key: string) => string,
): VoiceModeResult {
  if (!hasCheckedAzure) {
    return {
      label: t('checking'),
      icon: Wifi,
      color: 'text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
    };
  }
  if (useWebSpeechFallback || !connectionInfo) {
    return {
      label: 'Web Speech',
      icon: Volume2,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      tooltip: t('fallbackTooltip'),
    };
  }
  return {
    label: 'Azure Realtime',
    icon: Cloud,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/30',
    tooltip: t('azureTooltip'),
  };
}

export function VoiceModeIndicator({ voiceMode }: { voiceMode: VoiceModeResult }) {
  const Icon = voiceMode.icon;
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium cursor-help',
        voiceMode.bg,
        voiceMode.color,
      )}
      title={voiceMode.tooltip}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{voiceMode.label}</span>
    </div>
  );
}
