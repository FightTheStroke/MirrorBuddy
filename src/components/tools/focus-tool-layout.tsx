'use client';

/**
 * FocusToolLayout - Fullscreen layout for working with tools
 *
 * Layout (Issue #102):
 * - Left: Minimized sidebar (icons only, expandable on hover/click)
 * - Center (70%): Tool panel (mindmap, quiz, etc.)
 * - Right (30%): Maestro panel with avatar, voice UI, chat
 * - Mobile: Right panel becomes bottom sheet
 * - ESC to exit
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Send, Mic, MicOff, Phone, PhoneOff, Volume2,
  GraduationCap, BookOpen, Brain, Trophy, Settings, Network,
  Target, FileText, PanelLeftOpen, PanelLeftClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToolPanel } from './tool-panel';
import { useUIStore, useSettingsStore } from '@/lib/stores/app-store';
import { getMaestroById } from '@/data';
import { getSupportTeacherById } from '@/data/support-teachers';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import type { Maestro, SupportTeacher, Subject } from '@/types';
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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTranscriptIdRef = useRef<string | null>(null);

  // Sidebar nav items for minimized sidebar
  const sidebarItems = [
    { id: 'maestri', label: 'Professori', icon: GraduationCap },
    { id: 'quiz', label: 'Quiz', icon: Brain },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
    { id: 'mindmaps', label: 'Mappe Mentali', icon: Network },
    { id: 'summaries', label: 'Riassunti', icon: FileText },
    { id: 'homework', label: 'Materiali', icon: Target },
    { id: 'progress', label: 'Progressi', icon: Trophy },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  // Determine which maestro/coach to use
  const getMaestroOrCoach = useCallback((): Maestro | SupportTeacher | null => {
    // If specific maestro requested
    if (focusMaestroId) {
      const maestro = getMaestroById(focusMaestroId);
      if (maestro) return maestro;

      // Check if it's a coach
      const coach = getSupportTeacherById(focusMaestroId as 'melissa' | 'roberto' | 'chiara' | 'andrea' | 'favij');
      if (coach) return coach;

      // Character ID provided but not found - log actionable error
      logger.error('Focus mode character not found. Verify character ID exists in maestri-full.ts or support-teachers.ts', {
        focusMaestroId,
        action: 'falling back to default coach'
      });
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

  // Helper to get display properties from either Maestro or SupportTeacher
  const getCharacterProps = (char: Maestro | SupportTeacher | null) => {
    if (!char) return null;
    // Both Maestro and SupportTeacher have 'name' property
    return {
      name: char.name,
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

  // Tool type display name
  const toolNames: Record<ToolType, string> = {
    mindmap: 'Mappa Mentale',
    quiz: 'Quiz',
    flashcard: 'Flashcards',
    summary: 'Riassunto',
    demo: 'Demo Interattiva',
    diagram: 'Diagramma',
    timeline: 'Linea del Tempo',
    formula: 'Formula',
    chart: 'Grafico',
    search: 'Ricerca',
    webcam: 'Foto',
    pdf: 'PDF',
    homework: 'Compiti',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex"
      >
        {/* Left: Minimized Sidebar (Issue #102 - 0.6.1) */}
        <aside
          className={cn(
            'h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col',
            sidebarExpanded ? 'w-48' : 'w-14'
          )}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          {/* Logo/Toggle */}
          <div className="h-14 flex items-center gap-2 px-2 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            {/* Brain Logo */}
            <Image
              src="/logo-brain.png"
              alt="MirrorBuddy"
              width={32}
              height={32}
              className="object-contain flex-shrink-0"
            />
            {sidebarExpanded && (
              <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                MirrorBuddy
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="text-slate-500 ml-auto"
              aria-label={sidebarExpanded ? 'Riduci menu' : 'Espandi menu'}
            >
              {sidebarExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 py-2 overflow-y-auto">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={exitFocusMode}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                title={item.label}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarExpanded && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Exit Button */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            <button
              onClick={exitFocusMode}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Esci dalla modalità strumento"
            >
              <X className="h-5 w-5 flex-shrink-0" />
              {sidebarExpanded && <span className="text-sm font-medium">Esci</span>}
            </button>
          </div>
        </aside>

        {/* Center: Tool Panel (Issue #102 - 0.6.3 - 70% width) */}
        <div className={cn(
          'flex-1 h-full overflow-hidden bg-slate-50 dark:bg-slate-900 flex flex-col',
          rightPanelCollapsed ? 'w-full' : 'w-[70%]'
        )}>
          {/* Tool Header */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900 dark:text-white">
                {focusToolType ? toolNames[focusToolType] : 'Strumento'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">ESC per uscire</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                className="text-slate-500"
                aria-label={rightPanelCollapsed ? 'Mostra chat' : 'Nascondi chat'}
              >
                {rightPanelCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>
          </header>

          {/* Tool Content */}
          <div className="flex-1 overflow-auto">
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

        {/* Right: Maestro Panel - Compact layout like conversation cards */}
        {!rightPanelCollapsed && (
          <div className="w-[30%] max-w-md h-full flex flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {/* Maestro Header - Same style as conversation header */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700"
              style={{ backgroundColor: `${characterProps?.color}10` }}
            >
              {/* Avatar */}
              {characterProps && (
                <>
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                      style={{ borderColor: characterProps.color }}
                    >
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${characterProps.avatar})`,
                          backgroundColor: characterProps.color,
                        }}
                      />
                    </div>
                    {voiceConnected && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Name and status */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white truncate">
                      {characterProps.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {voiceConnected ? (isSpeaking ? 'Sta parlando...' : 'In chiamata') : 'Sono qui per aiutarti'}
                    </p>
                  </div>

                  {/* Voice call button - inline like conversation header */}
                  <Button
                    variant={voiceConnected ? 'destructive' : 'outline'}
                    size="icon"
                    onClick={handleVoiceToggle}
                    disabled={!!configError && !isVoiceActive}
                    className={cn('relative', voiceConnected && 'animate-pulse')}
                    style={!voiceConnected ? { borderColor: characterProps.color, color: characterProps.color } : undefined}
                    title={voiceConnected ? 'Termina chiamata' : `Chiama ${characterProps.name}`}
                  >
                    {isVoiceActive && !voiceConnected ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : voiceConnected ? (
                      <PhoneOff className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                  </Button>

                  {/* Mute button when connected */}
                  {voiceConnected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className={cn(isMuted && 'text-red-500')}
                      title={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
                    >
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Audio level indicator - only when voice active */}
            {voiceConnected && !isMuted && (
              <div className="flex-shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3 w-3 text-slate-400" />
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-75"
                      style={{ width: `${Math.min(inputLevel * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                      'max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm',
                      message.role === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                    )}
                    style={
                      message.role === 'user'
                        ? { backgroundColor: characterProps?.color || '#3b82f6' }
                        : undefined
                    }
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="flex-shrink-0 p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Scrivi a ${characterProps?.name || 'Coach'}...`}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 outline-none text-sm transition-all"
                  style={{
                    '--tw-ring-color': characterProps?.color || '#3b82f6'
                  } as React.CSSProperties}
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="flex-shrink-0 shadow-sm"
                  style={{
                    backgroundColor: characterProps?.color || '#3b82f6',
                  }}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
