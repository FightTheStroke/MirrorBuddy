'use client';

/**
 * MaestroSession - Embedded conversation layout matching Coach/Buddy pattern
 *
 * Layout identical to ConversationFlow:
 * - Header with avatar, name, specialty, voice call button
 * - Messages area with inline tools
 * - Input area at bottom
 * - VoiceCallOverlay when voice active (covers the component)
 * - Evaluation inline in chat when session ends
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Send,
  X,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Loader2,
  Volume2,
  VolumeX,
  Camera,
  Brain,
  BookOpen,
  Search,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTTS } from '@/components/accessibility';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { useProgressStore } from '@/lib/stores/app-store';
import { ToolResultDisplay } from '@/components/tools';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import { EvaluationCard } from '@/components/chat/evaluation-card';
import { logger } from '@/lib/logger';
import type { Maestro, ChatMessage, ToolCall, SessionEvaluation } from '@/types';

interface MaestroSessionProps {
  maestro: Maestro;
  onClose: () => void;
  initialMode?: 'voice' | 'chat';
}

/**
 * Generates evaluation based on session metrics.
 */
function generateAutoEvaluation(
  questionsAsked: number,
  sessionDuration: number,
  xpEarned: number
): SessionEvaluation {
  const baseScore = Math.min(10, Math.max(1,
    5 +
    Math.min(2, questionsAsked * 0.5) +
    Math.min(2, sessionDuration * 0.1) +
    (Math.random() * 0.5)
  ));
  const score = Math.round(baseScore);

  let feedback: string;
  if (score >= 9) {
    feedback = 'Sessione eccezionale! Hai dimostrato grande impegno e curiosità. Continua così!';
  } else if (score >= 7) {
    feedback = 'Ottima sessione di studio. Hai fatto buoni progressi e posto domande interessanti.';
  } else if (score >= 5) {
    feedback = 'Buona sessione. C\'è ancora margine di miglioramento, ma stai andando nella direzione giusta.';
  } else {
    feedback = 'La sessione è stata breve. Prova a dedicare più tempo allo studio per risultati migliori.';
  }

  const strengths: string[] = [];
  if (questionsAsked >= 5) strengths.push('Curiosità e voglia di approfondire');
  if (sessionDuration >= 10) strengths.push('Buona concentrazione durante la sessione');
  if (questionsAsked >= 3 && sessionDuration >= 5) strengths.push('Interazione attiva con il maestro');
  if (strengths.length === 0) strengths.push('Hai iniziato il percorso di apprendimento');

  const areasToImprove: string[] = [];
  if (questionsAsked < 3) areasToImprove.push('Fai più domande per chiarire i dubbi');
  if (sessionDuration < 10) areasToImprove.push('Prova sessioni più lunghe per approfondire meglio');
  if (areasToImprove.length === 0) areasToImprove.push('Continua a esercitarti regolarmente');

  return {
    score,
    feedback,
    strengths,
    areasToImprove,
    sessionDuration,
    questionsAsked,
    xpEarned,
    savedToDiary: false,
  };
}

/**
 * Voice call overlay - appears over the component when voice is active.
 * Matches VoiceCallOverlay from conversation-flow.tsx
 */
function VoiceCallOverlay({
  maestro,
  onEnd,
  onTranscriptUpdate,
}: {
  maestro: Maestro;
  onEnd: () => void;
  onTranscriptUpdate: (role: 'user' | 'assistant', text: string) => void;
}) {
  const [configError, setConfigError] = useState<string | null>(null);
  const hasAttemptedConnection = useRef(false);

  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    transcript,
    inputLevel,
    connectionState,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Voice call error', { message });
      setConfigError(message || 'Errore di connessione vocale');
    },
    onTranscript: (role, text) => {
      logger.debug('Voice transcript', { role, text: text.substring(0, 100) });
      onTranscriptUpdate(role, text);
    },
  });

  // Connect on mount
  useEffect(() => {
    const startConnection = async () => {
      if (hasAttemptedConnection.current) return;
      if (isConnected || connectionState !== 'idle') return;

      hasAttemptedConnection.current = true;

      try {
        // Get connection info first
        const response = await fetch('/api/realtime/token');
        const data = await response.json();
        if (data.error) {
          setConfigError(data.message || 'Servizio vocale non configurato');
          return;
        }
        await connect(maestro, data);
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setConfigError('Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.');
        } else {
          setConfigError('Errore di connessione vocale');
        }
      }
    };

    startConnection();
  }, [isConnected, connectionState, maestro, connect]);

  const handleEndCall = useCallback(() => {
    disconnect();
    onEnd();
  }, [disconnect, onEnd]);

  const getStatusText = () => {
    if (configError) return configError;
    if (connectionState === 'connecting') return 'Connessione in corso...';
    if (isConnected && isSpeaking) return `${maestro.name} sta parlando...`;
    if (isConnected && isListening) return 'In ascolto...';
    if (isConnected) return 'Connesso';
    return 'Avvio chiamata...';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-sm rounded-2xl"
    >
      <motion.div
        animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="relative"
      >
        <div
          className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-offset-4 ring-offset-slate-900"
          style={{ borderColor: maestro.color }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={96}
            height={96}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        {isConnected && (
          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-900 animate-pulse" />
        )}
      </motion.div>

      <h3 className="mt-4 text-xl font-semibold text-white">{maestro.name}</h3>
      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium mt-1"
        style={{ backgroundColor: `${maestro.color}30`, color: maestro.color }}
      >
        {maestro.specialty}
      </span>

      <p className={cn(
        "mt-3 text-sm",
        configError ? "text-red-400" : "text-slate-300"
      )}>
        {getStatusText()}
      </p>

      {/* Input level indicator */}
      {isConnected && isListening && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: inputLevel > 0.1 ? '#22c55e' : '#64748b',
              transform: `scale(${1 + inputLevel * 2})`
            }}
          />
          <span className="text-xs text-green-400">
            {isMuted ? 'Microfono disattivato' : 'In ascolto'}
          </span>
        </div>
      )}

      {/* Transcript preview */}
      {transcript.length > 0 && (
        <div className="mt-4 max-w-md px-4 py-2 bg-slate-800/50 rounded-lg max-h-32 overflow-y-auto">
          <p className="text-xs text-slate-400">
            {transcript[transcript.length - 1]?.content.substring(0, 150)}
            {(transcript[transcript.length - 1]?.content.length || 0) > 150 && '...'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center gap-4">
        {isConnected && (
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            size="lg"
            onClick={toggleMute}
            aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
            className="border-slate-600"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        )}

        <Button
          variant="destructive"
          size="lg"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-5 h-5 mr-2" />
          Termina chiamata
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Message bubble component matching ConversationFlow style.
 */
function MessageBubble({
  message,
  maestro,
  ttsEnabled,
  speak,
}: {
  message: ChatMessage;
  maestro: Maestro;
  ttsEnabled: boolean;
  speak: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const isVoice = message.isVoice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3 rounded-2xl',
          isUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
        )}
        style={isUser ? { backgroundColor: maestro.color } : undefined}
      >
        {isVoice && (
          <span className="text-xs opacity-60 mb-1 flex items-center gap-1">
            <Volume2 className="w-3 h-3" /> Trascrizione vocale
          </span>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs opacity-60">
            {new Date(message.timestamp).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && ttsEnabled && (
            <button
              onClick={() => speak(message.content)}
              className="text-xs opacity-60 hover:opacity-100"
              title="Leggi ad alta voce"
            >
              <Volume2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function MaestroSession({ maestro, onClose, initialMode = 'voice' }: MaestroSessionProps) {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(initialMode === 'voice');
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamRequest, setWebcamRequest] = useState<{ purpose: string; instructions?: string; callId: string } | null>(null);

  // Session tracking
  const [sessionEnded, setSessionEnded] = useState(false);
  const sessionStartTime = useRef(Date.now());
  const questionCount = useRef(0);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stores
  const { addXP, endSession } = useProgressStore();
  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();

  // Add greeting message on mount
  useEffect(() => {
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: maestro.greeting,
      timestamp: new Date(),
    }]);
  }, [maestro.greeting]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolCalls]);

  // Focus input when not in voice mode
  useEffect(() => {
    if (!isVoiceActive) {
      inputRef.current?.focus();
    }
  }, [isVoiceActive]);

  // Handle voice transcript updates
  const handleVoiceTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    if (role === 'user') {
      questionCount.current += 1;
    }
    setMessages(prev => [...prev, {
      id: `voice-${Date.now()}`,
      role,
      content: text,
      timestamp: new Date(),
      isVoice: true,
    }]);
  }, []);

  // End voice and generate evaluation
  const handleEndVoice = useCallback(async () => {
    setIsVoiceActive(false);
    setSessionEnded(true);

    const sessionDuration = Math.round((Date.now() - sessionStartTime.current) / 60000);
    const xpEarned = Math.min(100, sessionDuration * 5 + questionCount.current * 10);

    const eval_ = generateAutoEvaluation(questionCount.current, sessionDuration, xpEarned);

    // Try to save to diary
    try {
      const response = await fetch('/api/learnings/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: `maestro-${maestro.id}-${Date.now()}`,
          maestroId: maestro.id,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (response.ok) {
        eval_.savedToDiary = true;
      }
    } catch (error) {
      logger.error('Failed to extract learnings', { error });
    }

    // Add evaluation message to chat
    setMessages(prev => [...prev, {
      id: `eval-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'evaluation',
      evaluation: eval_,
    }]);

    // Update progress
    addXP(xpEarned);
    endSession();
  }, [maestro.id, messages, addXP, endSession]);

  // Handle text submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    questionCount.current += 1;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: maestro.systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input.trim() },
          ],
          maestroId: maestro.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || data.message || '',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Handle tool calls
      if (data.toolCalls?.length > 0) {
        setToolCalls(prev => [...prev, ...data.toolCalls]);
      }
    } catch (error) {
      logger.error('Chat error', { error });
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema. Puoi riprovare?',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: maestro.greeting,
      timestamp: new Date(),
    }]);
    setToolCalls([]);
    questionCount.current = 0;
    setSessionEnded(false);
  };

  // Handle webcam capture
  const handleWebcamCapture = useCallback((_imageData: string) => {
    // TODO: Send image to AI for analysis
    setShowWebcam(false);
    setWebcamRequest(null);
    setMessages(prev => [...prev, {
      id: `webcam-${Date.now()}`,
      role: 'user',
      content: '[Foto catturata]',
      timestamp: new Date(),
    }]);
  }, []);

  return (
    <div className="relative flex flex-col h-[calc(100vh-200px)] max-h-[700px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
      {/* Voice call overlay */}
      <AnimatePresence>
        {isVoiceActive && (
          <VoiceCallOverlay
            maestro={maestro}
            onEnd={handleEndVoice}
            onTranscriptUpdate={handleVoiceTranscript}
          />
        )}
      </AnimatePresence>

      {/* Webcam overlay */}
      <AnimatePresence>
        {showWebcam && webcamRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center"
          >
            <div className="w-full max-w-lg">
              <WebcamCapture
                purpose={webcamRequest.purpose}
                onCapture={handleWebcamCapture}
                onClose={() => { setShowWebcam(false); setWebcamRequest(null); }}
                instructions={webcamRequest.instructions}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - matches ConversationFlow header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700"
        style={{ backgroundColor: `${maestro.color}15` }}
      >
        <div
          className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2"
          style={{ borderColor: maestro.color }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base truncate text-slate-900 dark:text-white">
              {maestro.name}
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${maestro.color}20`, color: maestro.color }}
            >
              Maestro
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {maestro.specialty}
          </p>
        </div>

        {/* Voice call button */}
        <Button
          variant={isVoiceActive ? 'destructive' : 'outline'}
          size="icon"
          onClick={() => setIsVoiceActive(!isVoiceActive)}
          aria-label={isVoiceActive ? 'Termina chiamata' : 'Chiama a voce'}
          className={cn(
            'relative',
            isVoiceActive && 'animate-pulse'
          )}
        >
          {isVoiceActive ? (
            <PhoneOff className="w-4 h-4" />
          ) : (
            <Phone className="w-4 h-4" />
          )}
        </Button>

        {/* TTS toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stopTTS}
          aria-label={ttsEnabled ? 'TTS attivo' : 'TTS disattivo'}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>

        {/* Clear chat */}
        <Button
          variant="ghost"
          size="icon"
          onClick={clearChat}
          aria-label="Nuova conversazione"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Chiudi"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-label="Messaggi della conversazione"
      >
        {messages.map((message) => (
          message.type === 'evaluation' && message.evaluation ? (
            <EvaluationCard
              key={message.id}
              evaluation={message.evaluation}
              maestroName={maestro.name}
              maestroColor={maestro.color}
              className="mb-4"
            />
          ) : (
            <MessageBubble
              key={message.id}
              message={message}
              maestro={maestro}
              ttsEnabled={ttsEnabled}
              speak={speak}
            />
          )
        ))}

        {/* Tool results inline */}
        {toolCalls.map((tool) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4"
          >
            <ToolResultDisplay
              toolCall={tool}
            />
          </motion.div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mb-4"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={maestro.avatar}
                alt={maestro.name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {/* Tool buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setWebcamRequest({ purpose: 'homework', instructions: 'Mostra il tuo compito', callId: `cam-${Date.now()}` });
                setShowWebcam(true);
              }}
              disabled={isLoading}
              title="Scatta foto"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isLoading}
              title="Mappa mentale"
            >
              <Brain className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isLoading}
              title="Quiz"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isLoading}
              title="Cerca"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Scrivi un messaggio a ${maestro.name}...`}
            aria-label={`Scrivi un messaggio a ${maestro.name}`}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
            disabled={isLoading || sessionEnded}
          />

          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || sessionEnded}
            aria-label="Invia messaggio"
            style={{ backgroundColor: maestro.color }}
            className="hover:opacity-90"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
