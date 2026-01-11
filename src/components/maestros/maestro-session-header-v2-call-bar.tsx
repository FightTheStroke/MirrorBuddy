'use client';

/**
 * PROPOSTA 2: Tutto nella barra della chiamata
 *
 * Quando la chiamata è attiva, mostra una barra orizzontale completa con tutti i controlli.
 * Header minimale quando non in chiamata, barra espansa quando in chiamata.
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X, Phone, PhoneOff, Volume2, VolumeX, RotateCcw, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioDeviceSelector } from '@/components/conversation/components/audio-device-selector';
import { AudioVisualizer } from './components/audio-visualizer';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

interface MaestroSessionHeaderV2Props {
  maestro: Maestro;
  isVoiceActive: boolean;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  configError: string | null;
  ttsEnabled: boolean;
  onVoiceCall: () => void;
  onToggleMute: () => void;
  onStopTTS: () => void;
  onClearChat: () => void;
  onClose: () => void;
}

export function MaestroSessionHeaderV2({
  maestro,
  isVoiceActive,
  isConnected,
  isListening,
  isSpeaking,
  isMuted,
  inputLevel,
  outputLevel,
  configError,
  ttsEnabled,
  onVoiceCall,
  onToggleMute,
  onStopTTS,
  onClearChat,
  onClose,
}: MaestroSessionHeaderV2Props) {
  const getStatusText = () => {
    if (configError) return configError;
    if (isConnected && isSpeaking) return `${maestro.name} sta parlando...`;
    if (isConnected && isListening) return 'In ascolto...';
    if (isConnected) return 'Connesso';
    return 'Avvio chiamata...';
  };

  return (
    <>
      {/* Minimal header when not in call */}
      {!isVoiceActive && (
        <div
          className="flex items-start gap-2 sm:gap-4 p-2 sm:p-4 rounded-t-2xl text-white"
          style={{ background: `linear-gradient(to right, ${maestro.color}, ${maestro.color}dd)` }}
        >
          <motion.div
            className="relative flex-shrink-0"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <Image
              src={maestro.avatar}
              alt={maestro.name}
              width={56}
              height={56}
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-white/30 object-cover"
            />
            <motion.span
              className="absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full bg-green-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            />
          </motion.div>

          <div className="flex-1 min-w-0 pr-1 sm:pr-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-bold truncate">{maestro.name}</h2>
              <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-white/20 whitespace-nowrap">
                Professore
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 truncate">{maestro.specialty}</p>
            <p className="text-xs text-white/70 mt-1 whitespace-normal break-words line-clamp-2 sm:line-clamp-none">
              {maestro.greeting}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceCall}
              disabled={!!configError}
              aria-label={configError ? `Voce non disponibile: ${configError}` : 'Avvia chiamata vocale'}
              title={configError || undefined}
              className={cn(
                'text-white hover:bg-white/20 transition-all h-8 w-8 sm:h-10 sm:w-10',
                configError && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={ttsEnabled ? onStopTTS : undefined}
              disabled={!ttsEnabled}
              className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              aria-label={ttsEnabled ? 'Disattiva lettura vocale' : 'Lettura vocale disattivata'}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClearChat}
              className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              aria-label="Nuova conversazione"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              aria-label="Chiudi"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded call bar when voice is active */}
      {isVoiceActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col gap-3 p-3 sm:p-4 rounded-t-2xl text-white"
          style={{ background: `linear-gradient(to right, ${maestro.color}, ${maestro.color}dd)` }}
        >
          {/* Top row: Avatar, name, status */}
          <div className="flex items-center gap-3">
            <motion.div
              className="relative flex-shrink-0"
              animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Image
                src={maestro.avatar}
                alt={maestro.name}
                width={64}
                height={64}
                className={cn(
                  'w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 object-cover transition-all',
                  isConnected ? 'border-white shadow-lg' : 'border-white/50',
                  isSpeaking && 'border-white shadow-lg shadow-white/30'
                )}
              />
              {isConnected && (
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white/50 rounded-full animate-pulse" />
              )}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold truncate">{maestro.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/20 whitespace-nowrap">
                  Professore
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/70 truncate">{maestro.specialty}</p>
              <p className={cn(
                "text-xs mt-1",
                configError ? "text-red-200" : "text-white/60"
              )}>
                {getStatusText()}
              </p>
            </div>
          </div>

          {/* Controls row: Visualizer, devices, mute, end call */}
          <div className="flex items-center gap-2 sm:gap-3 pt-2 border-t border-white/20">
            {/* Audio visualizer */}
            {isConnected && (
              <AudioVisualizer
                isSpeaking={isSpeaking}
                isListening={isListening}
                isMuted={isMuted}
                inputLevel={inputLevel}
                outputLevel={outputLevel}
              />
            )}

            {/* Audio device selector */}
            <AudioDeviceSelector compact />

            {/* Mute button */}
            {isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
                className={cn(
                  'rounded-full px-3 py-1.5 text-white transition-colors',
                  isMuted
                    ? 'bg-white/20 hover:bg-white/30'
                    : 'bg-white/30 hover:bg-white/40'
                )}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4 mr-1.5" />
                    <span className="text-xs hidden sm:inline">Muto</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-1.5" />
                    <span className="text-xs hidden sm:inline">Microfono</span>
                  </>
                )}
              </Button>
            )}

            {/* End call button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={onVoiceCall}
              className="rounded-full px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white ml-auto"
            >
              <PhoneOff className="w-4 h-4 mr-1.5" />
              <span className="text-xs hidden sm:inline">Termina</span>
            </Button>

            {/* Other controls */}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/20">
              <Button
                variant="ghost"
                size="icon"
                onClick={ttsEnabled ? onStopTTS : undefined}
                disabled={!ttsEnabled}
                className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8"
                aria-label={ttsEnabled ? 'Disattiva lettura vocale' : 'Lettura vocale disattivata'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClearChat}
                className="hidden sm:flex text-white hover:bg-white/20 h-8 w-8"
                aria-label="Nuova conversazione"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-8 w-8"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status text */}
          {isConnected && (
            <p
              className="text-xs text-white/60 text-center"
              aria-live="polite"
              role="status"
            >
              {isMuted ? 'Microfono disattivato' : 'Parla ora...'}
            </p>
          )}
        </motion.div>
      )}
    </>
  );
}
