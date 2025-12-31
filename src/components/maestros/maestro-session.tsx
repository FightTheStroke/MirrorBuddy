'use client';

/**
 * MaestroSession - Unified side-by-side layout for Maestri
 *
 * Consistent with Coach/Buddy pattern from character-chat-view.tsx:
 * - Chat on left with messages + tools inline
 * - Voice panel on right (always visible when voice active)
 * - Evaluation appears inline in chat when session ends
 * - Learning extraction triggered on session end for parent diary
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Send,
  X,
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  User,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  Network,
  Brain,
  BookOpen,
  Search,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { useTTS } from '@/components/accessibility';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { useProgressStore } from '@/lib/stores/app-store';
import { CircularWaveform, CanvasWaveform } from '@/components/voice/waveform';
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

// Pre-computed bar offsets for audio visualizer (used in styling)
const _VISUALIZER_BAR_OFFSETS = [8, 12, 6, 14, 10];

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
    (Math.random() * 0.5) // Reduced randomness
  ));
  const score = Math.round(baseScore);

  let feedback: string;
  if (score >= 9) {
    feedback = 'Sessione eccezionale! Hai dimostrato grande impegno e curiosita. Continua cosi!';
  } else if (score >= 7) {
    feedback = 'Ottima sessione di studio. Hai fatto buoni progressi e posto domande interessanti.';
  } else if (score >= 5) {
    feedback = 'Buona sessione. C\'e ancora margine di miglioramento, ma stai andando nella direzione giusta.';
  } else {
    feedback = 'La sessione e stata breve. Prova a dedicare piu tempo allo studio per risultati migliori.';
  }

  const strengths: string[] = [];
  if (questionsAsked >= 5) strengths.push('Curiosita e voglia di approfondire');
  if (sessionDuration >= 10) strengths.push('Buona concentrazione durante la sessione');
  if (questionsAsked >= 3 && sessionDuration >= 5) strengths.push('Interazione attiva con il maestro');
  if (strengths.length === 0) strengths.push('Hai iniziato il percorso di apprendimento');

  const areasToImprove: string[] = [];
  if (questionsAsked < 3) areasToImprove.push('Fai piu domande per chiarire i dubbi');
  if (sessionDuration < 10) areasToImprove.push('Prova sessioni piu lunghe per approfondire meglio');
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

export function MaestroSession({ maestro, onClose, initialMode = 'voice' }: MaestroSessionProps) {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voice state
  const [voiceActive, setVoiceActive] = useState(initialMode === 'voice');
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamRequest, setWebcamRequest] = useState<{ purpose: string; instructions?: string; callId: string } | null>(null);
  const [isToolFullscreen, setIsToolFullscreen] = useState(false);

  // Session tracking
  const sessionStartTime = useRef<Date>(new Date());
  const questionCount = useRef<number>(0);
  const [sessionEnded, setSessionEnded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { settings } = useAccessibilityStore();
  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();
  const { currentSession, startSession, endSession } = useProgressStore();

  // Voice session hook
  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    inputAnalyser,
    connect,
    disconnect,
    toggleMute,
    sendText: sendVoiceText,
    cancelResponse,
    sendWebcamResult,
    toolCalls: voiceToolCalls,
    clearToolCalls: clearVoiceToolCalls,
  } = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Voice error', { message });
    },
    onTranscript: (role, text) => {
      // Add voice transcript to chat messages
      const voiceMessage: ChatMessage = {
        id: `voice-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: role as 'user' | 'assistant',
        content: text,
        timestamp: new Date(),
        isVoice: true,
      };
      setMessages(prev => [...prev, voiceMessage]);

      // Count user questions
      if (role === 'user' && text.includes('?')) {
        questionCount.current++;
      }
    },
    onWebcamRequest: (request) => {
      logger.debug('Webcam requested', { purpose: request.purpose });
      setWebcamRequest(request);
      setShowWebcam(true);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  }, [messages, settings.reducedMotion]);

  // Add greeting message on mount
  useEffect(() => {
    const greetingMessage: ChatMessage = {
      id: 'greeting',
      role: 'assistant',
      content: maestro.greeting,
      timestamp: new Date(),
    };
    setMessages([greetingMessage]);

    if (settings.ttsAutoRead && !voiceActive) {
      speak(maestro.greeting);
    }
  }, [maestro.greeting, settings.ttsAutoRead, speak, voiceActive]);

  // Start voice session when voice is active
  useEffect(() => {
    if (voiceActive && connectionState === 'idle') {
      const startVoice = async () => {
        try {
          await connect(maestro, { provider: 'azure', proxyPort: 3001, configured: true });
          if (!currentSession) {
            sessionStartTime.current = new Date();
            startSession(maestro.id, maestro.specialty);
          }
        } catch (error) {
          logger.error('Failed to start voice', { error: String(error) });
          setVoiceActive(false);
        }
      };
      startVoice();
    }
  }, [voiceActive, connectionState, connect, maestro, currentSession, startSession]);

  // Merge voice tool calls into main tool calls
  useEffect(() => {
    if (voiceToolCalls.length > 0) {
      setToolCalls(prev => [...prev, ...voiceToolCalls]);
      clearVoiceToolCalls();
    }
  }, [voiceToolCalls, clearVoiceToolCalls]);

  // Handle webcam capture
  const handleWebcamCapture = useCallback((imageData: string) => {
    if (webcamRequest) {
      sendWebcamResult(webcamRequest.callId, imageData);
      setShowWebcam(false);
      setWebcamRequest(null);
    }
  }, [webcamRequest, sendWebcamResult]);

  const handleWebcamClose = useCallback(() => {
    if (webcamRequest) {
      sendWebcamResult(webcamRequest.callId, null);
    }
    setShowWebcam(false);
    setWebcamRequest(null);
  }, [webcamRequest, sendWebcamResult]);

  // End session and generate evaluation
  const handleEndSession = useCallback(async () => {
    if (sessionEnded) return;

    disconnect();
    setVoiceActive(false);
    setSessionEnded(true);

    // Calculate metrics
    const durationMinutes = Math.round(
      (Date.now() - sessionStartTime.current.getTime()) / 60000
    );
    const xpEarned = currentSession?.xpEarned || Math.max(5, messages.length * 2);

    // Generate evaluation
    const evaluation = generateAutoEvaluation(
      questionCount.current,
      durationMinutes,
      xpEarned
    );

    // Try to save to diary (learning extraction)
    try {
      // Get conversation ID from last message or create one
      const response = await fetch('/api/learnings/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: `session-${sessionStartTime.current.getTime()}`,
          subject: maestro.specialty,
          // Include evaluation data for extraction
          evaluationData: {
            score: evaluation.score,
            feedback: evaluation.feedback,
            strengths: evaluation.strengths,
            areasToImprove: evaluation.areasToImprove,
          },
        }),
      });

      if (response.ok) {
        evaluation.savedToDiary = true;
        logger.info('Learning saved to diary', { maestroId: maestro.id });
      }
    } catch (error) {
      logger.error('Failed to save to diary', { error: String(error) });
    }

    // Add evaluation as chat message
    const evaluationMessage: ChatMessage = {
      id: `evaluation-${Date.now()}`,
      role: 'assistant',
      content: '', // Not used for display
      timestamp: new Date(),
      type: 'evaluation',
      evaluation,
    };
    setMessages(prev => [...prev, evaluationMessage]);

    // End session in store
    endSession();
  }, [sessionEnded, disconnect, currentSession, messages.length, maestro, endSession]);

  // Handle close
  const handleClose = useCallback(() => {
    if (voiceActive && !sessionEnded) {
      handleEndSession();
      // Delay close to show evaluation
      setTimeout(onClose, 500);
    } else {
      onClose();
    }
  }, [voiceActive, sessionEnded, handleEndSession, onClose]);

  // Handle Escape key (must be after handleClose is defined)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isToolFullscreen) {
          setIsToolFullscreen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isToolFullscreen, handleClose]);

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

    // Count questions
    if (input.includes('?')) {
      questionCount.current++;
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: maestro.systemPrompt,
          maestroId: maestro.id,
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        tokens: data.usage?.total_tokens,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.toolCalls) {
        setToolCalls(prev => [...prev, ...data.toolCalls]);
      }

      if (settings.ttsAutoRead && !voiceActive) {
        speak(data.content);
      }
    } catch (error) {
      logger.error('Chat error', { error: String(error) });
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Mi scuso, si è verificato un errore. Riprova.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
  };

  // Manual tool trigger
  const triggerManualTool = useCallback((toolName: string) => {
    if (toolName === 'capture_homework') {
      setWebcamRequest({ purpose: 'homework', instructions: 'Mostra il tuo compito o libro', callId: `manual-${Date.now()}` });
      setShowWebcam(true);
    } else if (voiceActive && isConnected) {
      const toolPrompts: Record<string, string> = {
        mindmap: 'Usa lo strumento create_mindmap per creare ORA una mappa mentale visiva sull\'argomento che stiamo discutendo.',
        quiz: 'Usa lo strumento create_quiz per creare ORA un quiz interattivo con domande a scelta multipla.',
        flashcard: 'Usa lo strumento create_flashcards per creare ORA delle flashcard interattive.',
        search: 'Usa lo strumento web_search per cercare ORA informazioni aggiornate.',
      };
      if (toolPrompts[toolName]) {
        sendVoiceText(toolPrompts[toolName]);
      }
    }
  }, [voiceActive, isConnected, sendVoiceText]);

  // Voice state text
  const stateText = connectionState === 'connecting'
    ? 'Connessione in corso...'
    : isListening
    ? 'Ti sto ascoltando...'
    : isSpeaking
    ? `${maestro.name} sta parlando...`
    : isConnected
    ? 'Pronto - parla ora'
    : 'Disconnesso';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex bg-black/50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={cn(
          'flex-1 flex m-4 rounded-2xl shadow-2xl overflow-hidden',
          settings.highContrast
            ? 'bg-black border-2 border-yellow-400'
            : 'bg-white dark:bg-slate-900'
        )}
      >
        {/* Left: Chat Area */}
        <div className={cn(
          'flex flex-col',
          voiceActive ? 'flex-1' : 'w-full',
          isToolFullscreen && 'hidden'
        )}>
          {/* Header */}
          <header
            className={cn(
              'flex items-center justify-between px-4 py-3 border-b',
              settings.highContrast
                ? 'border-yellow-400 bg-black'
                : 'border-slate-200 dark:border-slate-700'
            )}
            style={{ backgroundColor: `${maestro.color}10` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full overflow-hidden"
                style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
              >
                <Image
                  src={maestro.avatar}
                  alt={maestro.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className={cn(
                  'font-semibold',
                  settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white'
                )}>
                  {maestro.name}
                </h2>
                <p className={cn(
                  'text-xs',
                  settings.highContrast ? 'text-gray-400' : 'text-slate-500'
                )}>
                  {maestro.specialty}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TTS toggle */}
              <button
                onClick={() => (ttsEnabled ? stopTTS() : null)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  settings.highContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
                title={ttsEnabled ? 'TTS attivo' : 'TTS disattivo'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Voice toggle */}
              <button
                onClick={() => {
                  if (voiceActive) {
                    disconnect();
                    setVoiceActive(false);
                  } else {
                    setVoiceActive(true);
                  }
                }}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  voiceActive
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : settings.highContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                )}
                title={voiceActive ? 'Voce attiva' : 'Attiva voce'}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Fullscreen toggle */}
              {toolCalls.length > 0 && (
                <button
                  onClick={() => setIsToolFullscreen(!isToolFullscreen)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    settings.highContrast
                      ? 'text-yellow-400 hover:bg-yellow-400/20'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                  title={isToolFullscreen ? 'Esci fullscreen' : 'Fullscreen'}
                >
                  {isToolFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              {/* Clear chat */}
              <button
                onClick={clearChat}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  settings.highContrast
                    ? 'text-yellow-400 hover:bg-yellow-400/20'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                title="Nuova conversazione"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                onClick={handleClose}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  settings.highContrast
                    ? 'text-yellow-400 hover:bg-yellow-400/20'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
                title="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Messages */}
          <main className={cn(
            'flex-1 overflow-y-auto p-4 space-y-4',
            settings.highContrast ? 'bg-black' : ''
          )}>
            <AnimatePresence mode="popLayout">
              {messages.map((message) => {
                // Render evaluation card
                if (message.type === 'evaluation' && message.evaluation) {
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-md mx-auto"
                    >
                      <EvaluationCard
                        evaluation={message.evaluation}
                        maestroName={maestro.name}
                        maestroColor={maestro.color}
                      />
                    </motion.div>
                  );
                }

                // Regular message
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'flex gap-3',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div
                        className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                        style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
                      >
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
                        'max-w-[80%] rounded-2xl px-4 py-3 relative group',
                        message.role === 'user'
                          ? settings.highContrast
                            ? 'bg-yellow-400 text-black'
                            : 'bg-blue-500 text-white'
                          : settings.highContrast
                            ? 'bg-gray-900 text-white border border-gray-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      )}
                    >
                      {/* Voice indicator */}
                      {message.isVoice && (
                        <span className="text-xs opacity-60 mr-2">&#128266;</span>
                      )}
                      <p className="whitespace-pre-wrap inline">{message.content}</p>

                      <button
                        onClick={() => copyMessage(message.content, message.id)}
                        className={cn(
                          'absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-opacity',
                          settings.highContrast
                            ? 'bg-yellow-400 text-black'
                            : 'bg-white dark:bg-slate-700 shadow-md'
                        )}
                        title="Copia messaggio"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {message.role === 'user' && (
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        settings.highContrast
                          ? 'bg-yellow-400 text-black'
                          : 'bg-blue-500 text-white'
                      )}>
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Tool calls inline */}
            {toolCalls.length > 0 && (
              <div className="space-y-3">
                {toolCalls.map((toolCall) => (
                  <ToolResultDisplay key={toolCall.id} toolCall={toolCall} />
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                  style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
                >
                  <Image
                    src={maestro.avatar}
                    alt={maestro.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={cn(
                  'rounded-2xl px-4 py-3 flex items-center gap-2',
                  settings.highContrast
                    ? 'bg-gray-900 border border-gray-700'
                    : 'bg-slate-100 dark:bg-slate-800'
                )}>
                  <Loader2 className={cn(
                    'w-4 h-4 animate-spin',
                    settings.highContrast ? 'text-yellow-400' : 'text-blue-500'
                  )} />
                  <span className={cn(
                    'text-sm',
                    settings.highContrast ? 'text-gray-400' : 'text-slate-500'
                  )}>
                    {maestro.name} sta pensando...
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </main>

          {/* Input */}
          <footer className={cn(
            'border-t p-4',
            settings.highContrast
              ? 'border-yellow-400 bg-black'
              : 'border-slate-200 dark:border-slate-700'
          )}>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voiceActive ? "Puoi anche scrivere..." : "Scrivi un messaggio..."}
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-xl px-4 py-3 focus:outline-none focus:ring-2',
                  settings.highContrast
                    ? 'bg-gray-900 text-white border-2 border-yellow-400 focus:ring-yellow-400'
                    : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                )}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  'px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  settings.highContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                )}
                style={{ backgroundColor: input.trim() ? maestro.color : undefined }}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </footer>
        </div>

        {/* Right: Voice Panel */}
        {voiceActive && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className={cn(
              'w-80 flex flex-col border-l',
              settings.highContrast
                ? 'border-yellow-400 bg-black'
                : 'border-slate-200 dark:border-slate-700'
            )}
            style={{ background: `linear-gradient(to bottom, ${maestro.color}22, ${maestro.color}11)` }}
          >
            {/* Voice Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white/90">Sessione Voce</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEndSession}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Avatar + Waveform */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
              <CircularWaveform
                level={isSpeaking ? outputLevel : inputLevel}
                isActive={isListening || isSpeaking}
                color={maestro.color}
                size={120}
                image={maestro.avatar}
              />

              <motion.p
                key={stateText}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-white/80 text-center"
              >
                {stateText}
              </motion.p>

              {/* Mini waveform */}
              <div className="w-full">
                <CanvasWaveform
                  analyser={inputAnalyser}
                  isActive={isListening || isSpeaking}
                  color={isListening ? '#22C55E' : maestro.color}
                  height={48}
                />
              </div>
            </div>

            {/* Tool buttons */}
            <div className="p-4 border-t border-white/10">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerManualTool('capture_homework')}
                  className="flex-col h-auto py-2 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Camera className="h-4 w-4 mb-1" />
                  <span className="text-xs">Webcam</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerManualTool('mindmap')}
                  className="flex-col h-auto py-2 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Network className="h-4 w-4 mb-1" />
                  <span className="text-xs">Mappa</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerManualTool('quiz')}
                  className="flex-col h-auto py-2 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Brain className="h-4 w-4 mb-1" />
                  <span className="text-xs">Quiz</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerManualTool('flashcard')}
                  className="flex-col h-auto py-2 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <BookOpen className="h-4 w-4 mb-1" />
                  <span className="text-xs">Flashcard</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => triggerManualTool('search')}
                  className="flex-col h-auto py-2 text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Search className="h-4 w-4 mb-1" />
                  <span className="text-xs">Cerca</span>
                </Button>
              </div>
            </div>

            {/* Voice controls */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className={cn(
                    'rounded-full',
                    isMuted
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  )}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                {isSpeaking && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelResponse}
                    className="rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  >
                    <VolumeX className="h-5 w-5" />
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleEndSession}
                  className="rounded-full"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Webcam overlay */}
      <AnimatePresence>
        {showWebcam && webcamRequest && (
          <WebcamCapture
            purpose={webcamRequest.purpose}
            instructions={webcamRequest.instructions}
            onCapture={handleWebcamCapture}
            onClose={handleWebcamClose}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
