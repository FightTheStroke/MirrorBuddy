'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { cn } from '@/lib/utils';
import { VisualizerBar } from './voice-panel-proposal2/visualizer-bar';
import { useTranslations } from 'next-intl';

const VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

function isHexColor(color: string): boolean {
  return color.startsWith('#');
}

export interface VoicePanelProposal2Character {
  name: string;
  avatar?: string;
  specialty?: string;
  color: string;
}

export interface VoicePanelProposal2Props {
  character: VoicePanelProposal2Character;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel?: number;
  connectionState: string;
  configError: string | null;
  ttsEnabled: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
  onStopTTS: () => void;
  onClearChat: () => void;
  onClose: () => void;
}

export function VoicePanelProposal2({
  character,
  isConnected,
  isListening,
  isSpeaking,
  isMuted,
  inputLevel,
  outputLevel = 0,
  connectionState,
  configError,
  ttsEnabled,
  onToggleMute,
  onEndCall,
  onStopTTS,
  onClearChat,
  onClose,
}: VoicePanelProposal2Props) {
  const t = useTranslations('voice');
  const backgroundStyle = isHexColor(character.color)
    ? { background: `linear-gradient(to bottom, ${character.color}, ${character.color}dd)` }
    : undefined;

  const backgroundClass = !isHexColor(character.color) ? `bg-gradient-to-b ${character.color}` : '';

  const getStatusText = () => {
    if (configError) return configError;
    if (connectionState === 'connecting') return t('voicePanel.connecting');
    if (isConnected && isSpeaking) return t('voicePanel.speaking', { name: character.name });
    if (isConnected && isListening) return t('voicePanel.listening');
    if (isConnected) return t('voicePanel.connected');
    return t('voicePanel.startingCall');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'w-64 flex flex-col items-center justify-between gap-4 p-4 rounded-2xl',
        backgroundClass,
      )}
      style={backgroundStyle}
    >
      {/* Top section: Avatar and info */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative"
        >
          {character.avatar ? (
            <Image
              src={character.avatar}
              alt={character.name}
              width={80}
              height={80}
              className={cn(
                'rounded-full border-4 object-cover transition-colors duration-300',
                isConnected ? 'border-white' : 'border-white/50',
                isSpeaking && 'border-white shadow-lg shadow-white/30',
              )}
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
              {character.name.charAt(0)}
            </div>
          )}
          {isConnected && (
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white/50 rounded-full animate-pulse" />
          )}
        </motion.div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">{character.name}</h3>
          {character.specialty && <p className="text-xs text-white/70">{character.specialty}</p>}
          <p className={cn('text-xs mt-1', configError ? 'text-red-200' : 'text-white/60')}>
            {getStatusText()}
          </p>
        </div>

        {/* Audio visualizer */}
        {isConnected && (
          <div className="flex items-center gap-1.5 h-10 px-2">
            {VISUALIZER_BAR_OFFSETS.map((offset, i) => (
              <VisualizerBar
                key={i}
                offset={offset}
                isSpeaking={isSpeaking}
                isListening={isListening}
                isMuted={isMuted}
                inputLevel={inputLevel}
                outputLevel={outputLevel}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Middle section: Controls */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Audio device selector */}
        <AudioDeviceSelector compact />

        {/* Main controls row */}
        <div className="flex items-center gap-2 w-full justify-center">
          {isConnected && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMute}
              aria-label={
                isMuted ? t('voicePanel.microphoneEnabled') : t('voicePanel.microphoneDisabled')
              }
              className={cn(
                'rounded-full w-12 h-12 transition-colors',
                isMuted
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white/30 text-white hover:bg-white/40',
              )}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onEndCall}
            className="rounded-full w-12 h-12 bg-red-500 text-white hover:bg-red-600"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>

        {/* Secondary controls row */}
        <div className="flex items-center gap-2 w-full justify-center pt-2 border-t border-white/20">
          <Button
            variant="ghost"
            size="icon"
            onClick={ttsEnabled ? onStopTTS : undefined}
            disabled={!ttsEnabled}
            className="rounded-full w-10 h-10 text-white hover:bg-white/20"
            aria-label={ttsEnabled ? t('voicePanel.ttsEnabled') : t('voicePanel.ttsDisabled')}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="rounded-full w-10 h-10 text-white hover:bg-white/20"
            aria-label={t('voicePanel.newConversation')}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full w-10 h-10 text-white hover:bg-white/20"
            aria-label={t('voicePanel.close')}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottom: Status text */}
      {isConnected && (
        <p className="text-xs text-white/60 text-center" aria-live="polite" role="status">
          {isMuted ? t('voicePanel.microphoneMutedStatus') : t('voicePanel.speakNowStatus')}
        </p>
      )}
    </motion.div>
  );
}
