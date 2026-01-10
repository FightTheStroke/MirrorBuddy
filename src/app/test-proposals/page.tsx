'use client';

/**
 * Test page per provare le varianti di layout header
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeaderVariantA, HeaderVariantB, HeaderVariantC, HeaderVariantD } from '@/components/maestros/header-variants';
import { HeaderVariantE } from '@/components/maestros/header-variants/variant-e-centered-info-left';
import { HeaderVariantF } from '@/components/maestros/header-variants/variant-f-vertical-panel';
import { MaestroSessionMessages } from '@/components/maestros/maestro-session-messages';
import { MaestroSessionInput } from '@/components/maestros/maestro-session-input';
import { maestri } from '@/data';
import { useMaestroSessionLogic } from '@/components/maestros/use-maestro-session-logic';
import { useTTS } from '@/components/accessibility';
import type { Maestro } from '@/types';
import { useRef } from 'react';

type Variant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const VARIANT_NAMES: Record<Variant, string> = {
  A: 'Bilanciato',
  B: 'Avatar Centrato',
  C: 'Compact Pro',
  D: 'Glassmorphism',
  E: 'Avatar Centro + Info Sinistra',
  F: 'Pannello Verticale Destro',
};

function TestSession({ maestro, variant }: { maestro: Maestro; variant: Variant }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();

  const {
    messages, input, setInput, isLoading, toolCalls,
    isVoiceActive, configError, sessionEnded,
    isConnected, isListening, isSpeaking, isMuted,
    inputLevel, outputLevel, voiceSessionId,
    toggleMute, handleVoiceCall, handleEndSession, handleSubmit,
    clearChat, requestTool, handleRequestPhoto,
  } = useMaestroSessionLogic({ maestro, initialMode: 'voice' });

  const headerProps = {
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
    onVoiceCall: handleVoiceCall,
    onToggleMute: toggleMute,
    onStopTTS: stopTTS,
    onClearChat: clearChat,
    onClose: () => router.push('/'),
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Variant F is a vertical panel, needs different layout
  if (variant === 'F') {
    return (
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-t-2xl border-b">
            <h3 className="text-lg font-semibold">Chat Area</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Il pannello vocale è sulla destra</p>
          </div>
          <MaestroSessionMessages
            messages={messages}
            toolCalls={toolCalls}
            maestro={maestro}
            isLoading={isLoading}
            ttsEnabled={ttsEnabled}
            speak={speak}
            voiceSessionId={voiceSessionId}
            messagesEndRef={messagesEndRef}
            fullscreenToolId={null}
            onToggleToolFullscreen={() => {}}
          />
          <MaestroSessionInput
            maestro={maestro}
            input={input}
            isLoading={isLoading}
            sessionEnded={sessionEnded}
            isVoiceActive={isVoiceActive}
            showEndSession={!sessionEnded && messages.length > 1}
            inputRef={inputRef}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onSubmit={() => handleSubmit()}
            onRequestTool={requestTool}
            onRequestPhoto={handleRequestPhoto}
            onEndSession={handleEndSession}
          />
        </div>
        <HeaderVariantF {...headerProps} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {variant === 'A' && <HeaderVariantA {...headerProps} />}
      {variant === 'B' && <HeaderVariantB {...headerProps} />}
      {variant === 'C' && <HeaderVariantC {...headerProps} />}
      {variant === 'D' && <HeaderVariantD {...headerProps} />}
      {variant === 'E' && <HeaderVariantE {...headerProps} />}

      <MaestroSessionMessages
        messages={messages}
        toolCalls={toolCalls}
        maestro={maestro}
        isLoading={isLoading}
        ttsEnabled={ttsEnabled}
        speak={speak}
        voiceSessionId={voiceSessionId}
        messagesEndRef={messagesEndRef}
        fullscreenToolId={null}
        onToggleToolFullscreen={() => {}}
      />

      <MaestroSessionInput
        maestro={maestro}
        input={input}
        isLoading={isLoading}
        sessionEnded={sessionEnded}
        isVoiceActive={isVoiceActive}
        showEndSession={!sessionEnded && messages.length > 1}
        inputRef={inputRef}
        onInputChange={setInput}
        onKeyDown={handleKeyDown}
        onSubmit={() => handleSubmit()}
        onRequestTool={requestTool}
        onRequestPhoto={handleRequestPhoto}
        onEndSession={handleEndSession}
      />
    </div>
  );
}

export default function TestProposalsPage() {
  const router = useRouter();
  const [selectedVariant, setSelectedVariant] = useState<Variant>('A');
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro>(maestri[0]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Variant selector */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Variante:
            </span>
            {(['A', 'B', 'C', 'D', 'E', 'F'] as Variant[]).map((v) => (
              <Button
                key={v}
                variant={selectedVariant === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedVariant(v)}
                className="text-xs"
              >
                {v}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Maestro:
            </span>
            <select
              value={selectedMaestro.id}
              onChange={(e) => {
                const m = maestri.find(m => m.id === e.target.value);
                if (m) setSelectedMaestro(m);
              }}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              {maestri.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Variante {selectedVariant}:</strong> {VARIANT_NAMES[selectedVariant]}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="pt-28 px-4 sm:px-8 pb-8 max-w-5xl mx-auto">
        <TestSession 
          key={`${selectedMaestro.id}-${selectedVariant}`}
          maestro={selectedMaestro} 
          variant={selectedVariant} 
        />
      </div>
    </div>
  );
}
