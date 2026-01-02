'use client';

/**
 * FocusToolLayout - Fullscreen layout for working with tools
 *
 * Layout:
 * - Left (1/3): Chat with maestro/coach
 * - Right (2/3): Tool panel (mindmap, quiz, etc.)
 * - Header: Minimal with exit button
 * - ESC to exit
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Send, Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolPanel } from './tool-panel';
import { useUIStore, useSettingsStore } from '@/lib/stores/app-store';
import { getMaestroById } from '@/data/maestri';
import { getSupportTeacherById } from '@/data/support-teachers';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import type { MaestroFull } from '@/data/maestri';
import type { SupportTeacher, Subject } from '@/types';
import { cn } from '@/lib/utils';

// Map tool types to suggested maestros (for future use)
const _TOOL_TO_MAESTRO: Record<ToolType, string> = {
  mindmap: 'melissa', // Coach for general organization
  quiz: 'melissa',
  flashcard: 'melissa',
  summary: 'melissa',
  demo: 'ada', // Ada for demos/coding
  diagram: 'euclid', // Euclid for diagrams
  timeline: 'herodotus', // Herodotus for timelines
  formula: 'euclid',
  chart: 'euclid',
  search: 'melissa',
  webcam: 'melissa',
  pdf: 'melissa',
  homework: 'melissa',
};

// Map subjects to maestros (for future use)
const _SUBJECT_TO_MAESTRO: Record<string, string> = {
  mathematics: 'euclid',
  math: 'euclid',
  matematica: 'euclid',
  history: 'herodotus',
  storia: 'herodotus',
  italian: 'manzoni',
  italiano: 'manzoni',
  english: 'shakespeare',
  inglese: 'shakespeare',
  physics: 'feynman',
  fisica: 'feynman',
  chemistry: 'curie',
  chimica: 'curie',
  biology: 'darwin',
  biologia: 'darwin',
  scienze: 'darwin',
  geography: 'humboldt',
  geografia: 'humboldt',
  art: 'davinci',
  arte: 'davinci',
  music: 'mozart',
  musica: 'mozart',
  philosophy: 'socrates',
  filosofia: 'socrates',
  economics: 'smith',
  economia: 'smith',
  civics: 'cicero',
  educazione_civica: 'cicero',
  pe: 'hippocrates',
  educazione_fisica: 'hippocrates',
  coding: 'ada',
  informatica: 'ada',
  storytelling: 'chris',
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Map function names to tool types
const FUNCTION_NAME_TO_TOOL_TYPE: Record<string, ToolType> = {
  create_mindmap: 'mindmap',
  create_quiz: 'quiz',
  create_demo: 'demo',
  web_search: 'search',
  create_flashcards: 'flashcard',
  create_diagram: 'diagram',
  create_timeline: 'timeline',
  create_summary: 'summary',
  open_student_summary: 'summary',
};

export function FocusToolLayout() {
  const { focusMode, focusToolType, focusMaestroId, focusInteractionMode, focusTool, setFocusTool, exitFocusMode } = useUIStore();
  const { studentProfile } = useSettingsStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{ provider: 'azure'; proxyPort: number; configured: boolean } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTranscriptIdRef = useRef<string | null>(null);

  // Determine which maestro/coach to use
  const getMaestroOrCoach = useCallback((): MaestroFull | SupportTeacher | null => {
    // If specific maestro requested
    if (focusMaestroId) {
      const maestro = getMaestroById(focusMaestroId);
      if (maestro) return maestro;

      // Check if it's a coach
      const coach = getSupportTeacherById(focusMaestroId as 'melissa' | 'roberto' | 'chiara' | 'andrea' | 'favij');
      if (coach) return coach;

      // Character ID provided but not found - log error
      logger.error('Focus mode character not found', { focusMaestroId });
    }

    // If no focusMaestroId provided, warn about missing maestro selection
    if (!focusMaestroId) {
      logger.warn('Focus mode entered without maestro selection, using default coach');
    }

    // Fallback to coach based on preference
    const preferredCoach = studentProfile?.preferredCoach || 'melissa';
    const coach = getSupportTeacherById(preferredCoach);
    if (coach) return coach;

    return null;
  }, [focusMaestroId, studentProfile?.preferredCoach]);

  const character = getMaestroOrCoach();

  // Helper to get display properties from either MaestroFull or SupportTeacher
  const getCharacterProps = (char: MaestroFull | SupportTeacher | null) => {
    if (!char) return null;
    // MaestroFull has displayName, SupportTeacher has name
    const isMaestro = 'displayName' in char;
    return {
      name: isMaestro ? (char as MaestroFull).displayName : char.name,
      avatar: char.avatar || '/avatars/default.jpg',
      color: char.color,
      systemPrompt: char.systemPrompt,
      greeting: char.greeting,
    };
  };

  const characterProps = getCharacterProps(character);

  // Voice session hook - must be after character is defined
  const {
    isConnected: voiceConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    connectionState,
    connect: voiceConnect,
    disconnect: voiceDisconnect,
    toggleMute,
    sessionId: voiceSessionId,
  } = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Voice session error in focus mode', { message });
      setConfigError(message || 'Errore di connessione vocale');
    },
    onTranscript: (role, text) => {
      // Add voice transcripts to messages
      const transcriptId = `voice-${role}-${Date.now()}`;

      // Avoid duplicate transcripts
      if (lastTranscriptIdRef.current === text.substring(0, 50)) {
        return;
      }
      lastTranscriptIdRef.current = text.substring(0, 50);

      setMessages(prev => [...prev, {
        id: transcriptId,
        role,
        content: text,
        timestamp: new Date(),
      }]);
    },
  });

  // Fetch voice connection info on mount
  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const response = await fetch('/api/realtime/token');
        const data = await response.json();
        if (data.error) {
          logger.error('Voice API error', { error: data.error });
          setConfigError(data.message || 'Servizio vocale non configurato');
          return;
        }
        setConnectionInfo(data);
      } catch (error) {
        logger.error('Failed to get voice connection info', { error: String(error) });
        setConfigError('Impossibile connettersi al servizio vocale');
      }
    }
    if (focusMode) {
      fetchConnectionInfo();
    }
  }, [focusMode]);

  // Auto-start voice if interaction mode is 'voice'
  useEffect(() => {
    if (focusMode && focusInteractionMode === 'voice' && connectionInfo && !isVoiceActive) {
      setIsVoiceActive(true);
    }
  }, [focusMode, focusInteractionMode, connectionInfo, isVoiceActive]);

  // Connect to voice when activated
  useEffect(() => {
    if (!isVoiceActive || !connectionInfo || connectionState !== 'idle' || !character) return;

    const startVoice = async () => {
      setConfigError(null);
      try {
        // Check if character is a SupportTeacher (has voice property directly)
        const isSupportTeacher = 'voice' in character && 'voiceInstructions' in character;
        // Create a maestro-compatible object for the voice session
        const maestroForVoice = {
          id: character.id,
          name: characterProps?.name || 'Coach',
          subject: ('subject' in character ? character.subject : 'general') as Subject,
          specialty: '',
          voice: isSupportTeacher ? (character as SupportTeacher).voice : 'alloy' as const,
          voiceInstructions: isSupportTeacher ? (character as SupportTeacher).voiceInstructions : 'Parla in modo chiaro e amichevole.',
          teachingStyle: 'Interattivo e coinvolgente',
          avatar: characterProps?.avatar || '/avatars/default.jpg',
          color: characterProps?.color || '#3b82f6',
          systemPrompt: characterProps?.systemPrompt || '',
          greeting: characterProps?.greeting || '',
        };
        await voiceConnect(maestroForVoice, connectionInfo);
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setConfigError('Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.');
        } else {
          setConfigError('Errore di connessione vocale');
        }
        setIsVoiceActive(false);
      }
    };

    startVoice();
  }, [isVoiceActive, connectionInfo, connectionState, character, characterProps, voiceConnect]);

  // Handle voice toggle
  const handleVoiceToggle = useCallback(() => {
    if (isVoiceActive) {
      voiceDisconnect();
      setIsVoiceActive(false);
    } else {
      setIsVoiceActive(true);
    }
  }, [isVoiceActive, voiceDisconnect]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        exitFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, exitFocusMode]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when mode activates
  useEffect(() => {
    if (focusMode) {
      inputRef.current?.focus();
    }
  }, [focusMode]);

  // Initial greeting message
  useEffect(() => {
    if (focusMode && characterProps && messages.length === 0) {
      const toolNames: Record<ToolType, string> = {
        mindmap: 'mappa mentale',
        quiz: 'quiz',
        flashcard: 'flashcard',
        summary: 'riassunto',
        demo: 'demo interattiva',
        diagram: 'diagramma',
        timeline: 'linea del tempo',
        formula: 'formula',
        chart: 'grafico',
        search: 'ricerca',
        webcam: 'foto',
        pdf: 'PDF',
        homework: 'compiti',
      };

      const toolName = focusToolType ? toolNames[focusToolType] : 'strumento';

      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: `Ciao! Sono ${characterProps.name}. Creiamo insieme una ${toolName}! Di che argomento vuoi parlare?`,
        timestamp: new Date(),
      }]);
    }
  }, [focusMode, characterProps, focusToolType, messages.length]);

  // Handle sending message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !character || !characterProps) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          systemPrompt: characterProps.systemPrompt,
          maestroId: character.id,
          enableTools: true,
          requestedTool: focusToolType,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || '',
        timestamp: new Date(),
      };

      if (data.content) {
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Handle tool calls if any
      if (data.toolCalls && data.toolCalls.length > 0) {
        const toolCall = data.toolCalls[0];
        const toolType = FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || focusToolType || 'mindmap';
        const toolContent = toolCall.result?.data || toolCall.result || toolCall.arguments;

        setFocusTool({
          id: toolCall.id || `tool-${Date.now()}`,
          type: toolType,
          status: 'completed',
          progress: 1,
          content: toolContent,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      logger.error('Chat error in focus mode', { error });
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Mi dispiace, c\'è stato un errore. Riprova!',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, character, characterProps, messages, focusToolType, setFocusTool]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!focusMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white dark:bg-slate-950"
      >
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {characterProps && (
              <>
                <div
                  className="w-8 h-8 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${characterProps.avatar})` }}
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {characterProps.name}
                </span>
                <span className="text-sm text-slate-500">
                  • {focusToolType ? focusToolType.charAt(0).toUpperCase() + focusToolType.slice(1) : 'Tool'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Voice status indicator */}
            {focusInteractionMode === 'voice' && (
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                voiceConnected && !isMuted && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                voiceConnected && isMuted && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                !voiceConnected && isVoiceActive && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                configError && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}>
                {configError ? (
                  <>
                    <MicOff className="h-3 w-3" />
                    <span>Voce non disponibile</span>
                  </>
                ) : voiceConnected ? (
                  <>
                    {isMuted ? <MicOff className="h-3 w-3" /> : isSpeaking ? <Volume2 className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    <span>{isMuted ? 'Muted' : isSpeaking ? 'Parlando' : 'Voce attiva'}</span>
                  </>
                ) : isVoiceActive ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Connessione...</span>
                  </>
                ) : null}
              </div>
            )}
            <span className="text-xs text-slate-400">ESC per uscire</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={exitFocusMode}
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main content */}
        <div className="flex h-[calc(100vh-56px)]">
          {/* Left: Chat panel (1/3) */}
          <div className="w-1/3 flex flex-col border-r border-slate-200 dark:border-slate-800">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2',
                      message.role === 'user'
                        ? 'bg-accent-themed text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-slate-800 rounded-bl-md'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Scrivi a ${characterProps?.name || 'Coach'}...`}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-accent-themed outline-none text-sm"
                  disabled={isLoading}
                />
                {/* Voice button with status */}
                <div className="relative">
                  {/* Input level indicator */}
                  {voiceConnected && !isMuted && (
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-green-500 transition-all duration-75"
                        style={{ width: `${Math.min(inputLevel * 100, 100)}%` }}
                      />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceToggle}
                    disabled={!!configError && !isVoiceActive}
                    aria-label={isVoiceActive ? 'Disattiva voce' : 'Attiva voce'}
                    className={cn(
                      'relative',
                      voiceConnected && isSpeaking && 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                      voiceConnected && isListening && !isSpeaking && 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                      voiceConnected && isMuted && 'bg-slate-200 text-slate-500 dark:bg-slate-700',
                      !voiceConnected && isVoiceActive && 'bg-blue-100 text-blue-600 animate-pulse',
                      configError && 'bg-red-100 text-red-600'
                    )}
                    title={configError || (voiceConnected ? (isMuted ? 'Muted' : isSpeaking ? 'Parlando...' : isListening ? 'Ascoltando...' : 'Connesso') : 'Attiva voce')}
                  >
                    {voiceConnected ? (
                      isMuted ? <MicOff className="h-4 w-4" /> : isSpeaking ? <Volume2 className="h-4 w-4" /> : <Phone className="h-4 w-4" />
                    ) : isVoiceActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {/* Mute button when voice is connected */}
                {voiceConnected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Attiva microfono' : 'Silenzia microfono'}
                    className={cn(
                      isMuted && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    )}
                  >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                {/* End call button when connected */}
                {voiceConnected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleVoiceToggle}
                    aria-label="Termina chiamata"
                    className="bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                  >
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-accent-themed hover:bg-accent-themed/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Tool panel (2/3) */}
          <div className="w-2/3 h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
            {focusTool ? (
              <ToolPanel
                tool={focusTool}
                maestro={characterProps ? {
                  name: characterProps.name,
                  avatar: characterProps.avatar,
                  color: characterProps.color,
                } : null}
                onClose={() => setFocusTool(null)}
                embedded={true}
                sessionId={voiceSessionId}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <p className="text-lg font-medium">In attesa dello strumento...</p>
                  <p className="text-sm mt-1">Parla con {characterProps?.name || 'il coach'} per creare il contenuto</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
