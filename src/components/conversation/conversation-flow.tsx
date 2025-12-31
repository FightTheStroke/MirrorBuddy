/**
 * ConvergioEdu Conversation Flow Component
 *
 * The central conversation-first interface that:
 * 1. Shows character selection with photos and introductions
 * 2. Routes student messages to appropriate characters
 * 3. Supports seamless handoffs between characters
 * 4. Offers both text and voice modes for Coach and Buddy
 *
 * Part of I-01: Conversation-First Main Flow
 * Related: #24 MirrorBuddy Issue, #33 Conversation UX, ManifestoEdu.md
 */

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import {
  Send,
  Mic,
  MicOff,
  ArrowLeft,
  Sparkles,
  Loader2,
  Volume2,
  VolumeX,
  Users,
  MessageCircle,
  Phone,
  PhoneOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/app-store';
import { logger } from '@/lib/logger';
import {
  useConversationFlowStore,
  type FlowMessage,
  type ActiveCharacter,
} from '@/lib/stores/conversation-flow-store';
// Note: routeMessage from store is used instead of direct routeToCharacter
import { analyzeHandoff } from '@/lib/ai/handoff-manager';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { useMethodProgressStore } from '@/lib/stores/method-progress-store';
import type { ExtendedStudentProfile, CharacterType, Subject, Maestro, MaestroVoice } from '@/types';
// Tool integration - T-15
import { ToolButtons } from './tool-buttons';
import { ToolPanel } from '@/components/tools/tool-panel';
import type { ToolType, ToolState } from '@/types/tools';

// Character avatar mappings
const CHARACTER_AVATARS: Record<string, string> = {
  mario: '/avatars/mario.jpg',
  melissa: '/avatars/melissa.jpg',
  // Add more as needed
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Character avatar with photo or fallback.
 */
function CharacterAvatar({
  character,
  size = 'md',
  showStatus = false,
  isActive = false,
}: {
  character: ActiveCharacter;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  isActive?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const sizePx = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const avatarPath = CHARACTER_AVATARS[character.id];
  const hasPhoto = !!avatarPath;

  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
          sizeClasses[size]
        )}
        style={{ borderColor: character.color }}
      >
        {hasPhoto ? (
          <Image
            src={avatarPath}
            alt={`Avatar di ${character.name}`}
            width={sizePx[size]}
            height={sizePx[size]}
            className="w-full h-full object-cover"
            priority={size === 'xl' || size === 'lg'}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: character.color }}
          >
            {character.name.charAt(0)}
          </div>
        )}
      </div>
      {showStatus && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900',
            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          )}
        />
      )}
    </div>
  );
}

/**
 * Character role badge.
 */
function CharacterRoleBadge({ type }: { type: CharacterType }) {
  const roleLabels: Record<CharacterType, { label: string; color: string }> = {
    coach: { label: 'Coach', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
    buddy: { label: 'Amico', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    maestro: { label: 'Maestro', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  };

  const { label, color } = roleLabels[type];

  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', color)}>
      {label}
    </span>
  );
}

/**
 * Character introduction card.
 * Exported for potential future use in character selection screens.
 */
export function CharacterCard({
  character,
  isSelected,
  onClick,
  description,
}: {
  character: ActiveCharacter;
  isSelected: boolean;
  onClick: () => void;
  description: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center p-4 rounded-2xl border-2 transition-all',
        'hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2',
        isSelected
          ? 'border-accent-themed bg-accent-themed/5 shadow-md'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      )}
      style={{
        borderColor: isSelected ? character.color : undefined,
        boxShadow: isSelected ? `0 4px 14px ${character.color}20` : undefined,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <CharacterAvatar character={character} size="xl" showStatus isActive={isSelected} />
      <h3 className="mt-3 font-semibold text-lg">{character.name}</h3>
      <CharacterRoleBadge type={character.type} />
      <p className="mt-2 text-sm text-center text-slate-600 dark:text-slate-400 line-clamp-2">
        {description}
      </p>
    </motion.button>
  );
}

/**
 * Message bubble component.
 */
function MessageBubble({
  message,
  activeCharacter,
}: {
  message: FlowMessage;
  activeCharacter: ActiveCharacter | null;
}) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full text-sm text-slate-600 dark:text-slate-400">
          <Sparkles className="w-4 h-4" />
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && activeCharacter && (
        <CharacterAvatar character={activeCharacter} size="sm" />
      )}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3 rounded-2xl',
          isUser
            ? 'bg-accent-themed text-white rounded-br-md'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs opacity-60 mt-1">
          {new Date(message.timestamp).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Handoff suggestion banner.
 */
function HandoffBanner({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: {
    toCharacter: ActiveCharacter;
    reason: string;
    confidence: number;
  };
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-4 mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-700"
    >
      <div className="flex items-start gap-4">
        <CharacterAvatar character={suggestion.toCharacter} size="md" />
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            {suggestion.reason}
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            Vuoi parlare con {suggestion.toCharacter.name}?
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          No grazie
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          style={{ backgroundColor: suggestion.toCharacter.color }}
        >
          Parla con {suggestion.toCharacter.name}
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Character descriptions for the intro cards.
 */
const CHARACTER_DESCRIPTIONS: Record<string, string> = {
  melissa: 'Ti aiuto a trovare il TUO metodo di studio. Insieme troviamo il modo migliore per te.',
  roberto: 'Ti guido con calma a organizzare lo studio. Niente fretta, lavoriamo insieme.',
  mario: 'Sono qui per ascoltarti. Ci sono passato anch\'io, ti capisco!',
  faty: 'Sono qui per te. Se hai bisogno di parlare, ti ascolto!',
};

/**
 * Voice connection info from /api/realtime/token
 */
interface VoiceConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

/**
 * Convert ActiveCharacter to Maestro-compatible interface for voice session.
 * Coach and Buddy have all the required voice fields.
 */
function activeCharacterToMaestro(character: ActiveCharacter): Maestro {
  return {
    id: character.id,
    name: character.name,
    subject: 'methodology' as Subject, // Coaches/buddies aren't subject-specific
    specialty: character.type === 'coach' ? 'Metodo di studio' : 'Supporto emotivo',
    voice: (character.voice || 'alloy') as MaestroVoice,
    voiceInstructions: character.voiceInstructions || '',
    teachingStyle: character.type === 'coach' ? 'scaffolding' : 'peer-support',
    avatar: CHARACTER_AVATARS[character.id] || '/avatars/default.jpg',
    color: character.color,
    systemPrompt: character.systemPrompt,
    greeting: character.greeting,
  };
}

/**
 * Enhanced character header with clear identity.
 */
function ConversationHeader({
  currentCharacter,
  onSwitchToCoach,
  onSwitchToBuddy,
  onGoBack,
  canGoBack,
  isVoiceActive,
  onVoiceCall,
}: {
  currentCharacter: ActiveCharacter | null;
  onSwitchToCoach: () => void;
  onSwitchToBuddy: () => void;
  onGoBack: () => void;
  canGoBack: boolean;
  isVoiceActive: boolean;
  onVoiceCall: () => void;
}) {
  if (!currentCharacter) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700"
      style={{ backgroundColor: `${currentCharacter.color}10` }}
    >
      {canGoBack && (
        <Button variant="ghost" size="icon-sm" onClick={onGoBack} aria-label="Torna indietro">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      )}

      <CharacterAvatar character={currentCharacter} size="md" showStatus isActive />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base truncate">{currentCharacter.name}</h2>
          <CharacterRoleBadge type={currentCharacter.type} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {CHARACTER_DESCRIPTIONS[currentCharacter.id] || 'Sono qui per aiutarti'}
        </p>
      </div>

      {/* Voice call button - only for coach and buddy */}
      {(currentCharacter.type === 'coach' || currentCharacter.type === 'buddy') && (
        <Button
          variant={isVoiceActive ? 'destructive' : 'outline'}
          size="icon"
          onClick={onVoiceCall}
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
      )}

      {/* Quick switch buttons */}
      <div className="flex gap-1 ml-2 border-l border-slate-200 dark:border-slate-700 pl-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSwitchToCoach}
          aria-label="Parla con il Coach"
          disabled={currentCharacter.type === 'coach'}
          className={cn(
            currentCharacter.type === 'coach' && 'opacity-50'
          )}
        >
          <Users className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSwitchToBuddy}
          aria-label="Parla con un amico"
          disabled={currentCharacter.type === 'buddy'}
          className={cn(
            currentCharacter.type === 'buddy' && 'opacity-50'
          )}
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Voice call overlay with actual Azure Realtime voice session.
 * Issue #34: Now integrates with useVoiceSession hook.
 */
function VoiceCallOverlay({
  character,
  onEnd,
}: {
  character: ActiveCharacter;
  onEnd: () => void;
}) {
  const [connectionInfo, setConnectionInfo] = useState<VoiceConnectionInfo | null>(null);
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
      logger.error('Voice call error', { error: String(error) });
      setConfigError('Errore di connessione vocale');
    },
    onTranscript: (role, text) => {
      logger.debug('Voice transcript', { role, text: text.substring(0, 100) });
    },
  });

  // Fetch connection info on mount
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
        setConnectionInfo(data as VoiceConnectionInfo);
      } catch (error) {
        logger.error('Failed to get voice connection info', { error: String(error) });
        setConfigError('Impossibile connettersi al servizio vocale');
      }
    }
    fetchConnectionInfo();
  }, []);

  // Connect when connection info is available
  useEffect(() => {
    const startConnection = async () => {
      if (hasAttemptedConnection.current) return;
      if (!connectionInfo || isConnected || connectionState !== 'idle') return;

      hasAttemptedConnection.current = true;

      try {
        // Convert character to Maestro-compatible interface
        const maestroLike = activeCharacterToMaestro(character);
        await connect(maestroLike, connectionInfo);
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
  }, [connectionInfo, isConnected, connectionState, character, connect]);

  // Handle end call
  const handleEndCall = useCallback(() => {
    disconnect();
    onEnd();
  }, [disconnect, onEnd]);

  // Status text
  const getStatusText = () => {
    if (configError) return configError;
    if (connectionState === 'connecting') return 'Connessione in corso...';
    if (isConnected && isSpeaking) return `${character.name} sta parlando...`;
    if (isConnected && isListening) return 'In ascolto...';
    if (isConnected) return 'Connesso';
    return 'Avvio chiamata...';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-sm"
    >
      <motion.div
        animate={{ scale: isSpeaking ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <CharacterAvatar character={character} size="xl" showStatus isActive={isConnected} />
      </motion.div>

      <h3 className="mt-4 text-xl font-semibold text-white">{character.name}</h3>
      <CharacterRoleBadge type={character.type} />

      <p className={cn(
        "mt-2 text-sm",
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConversationFlow() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolState | null>(null);
  const [isToolMinimized, setIsToolMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const _prefersReducedMotion = useReducedMotion(); // For future accessibility features

  // Stores
  const { studentProfile } = useSettingsStore();
  const {
    isActive,
    mode,
    activeCharacter,
    messages,
    pendingHandoff,
    characterHistory,
    startConversation,
    endConversation: _endConversation, // Available for future explicit end
    addMessage,
    setMode,
    switchToCoach,
    switchToBuddy,
    goBack,
    acceptHandoff,
    dismissHandoff,
    suggestHandoff,
    routeMessage,
    switchToCharacter: _switchToCharacter, // Used internally via specific switch functions
  } = useConversationFlowStore();

  // Extended profile for routing - memoized to avoid unnecessary re-renders
  const extendedProfile: ExtendedStudentProfile = useMemo(() => ({
    ...studentProfile,
    learningDifferences: studentProfile.learningDifferences || [],
    preferredCoach: studentProfile.preferredCoach,
    preferredBuddy: studentProfile.preferredBuddy,
  }), [studentProfile]);

  // Handle tool request from ToolButtons
  const handleToolRequest = useCallback(async (toolType: ToolType) => {
    if (!activeCharacter || isLoading) return;

    // Create tool prompts based on type
    const toolPrompts: Record<ToolType, string> = {
      mindmap: 'Crea una mappa mentale su questo argomento',
      quiz: 'Crea un quiz per verificare la mia comprensione',
      flashcard: 'Crea delle flashcard per memorizzare',
      demo: 'Crea una demo interattiva per visualizzare',
      search: 'Cerca risorse educative su questo argomento',
      webcam: 'Voglio scattare una foto',
      diagram: 'Crea un diagramma',
      timeline: 'Crea una linea del tempo',
      summary: 'Crea un riassunto',
      formula: 'Mostra la formula',
      chart: 'Crea un grafico',
      pdf: 'Analizza il PDF',
    };

    const toolPrompt = toolPrompts[toolType] || `Crea ${toolType}`;
    setInputValue('');
    setIsLoading(true);

    addMessage({ role: 'user', content: toolPrompt });

    // Create initial tool state
    const newTool: ToolState = {
      id: `tool-${Date.now()}`,
      type: toolType,
      status: 'initializing',
      progress: 0,
      content: null,
      createdAt: new Date(),
    };
    setActiveTool(newTool);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: activeCharacter.systemPrompt },
            ...messages
              .filter((m) => m.role !== 'system')
              .map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: toolPrompt },
          ],
          maestroId: activeCharacter.id,
          requestedTool: toolType,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      const assistantContent = data.content || data.message || '';
      addMessage({ role: 'assistant', content: assistantContent });

      // Update tool state based on response
      if (data.toolCalls?.length > 0) {
        const toolCall = data.toolCalls[0];
        setActiveTool({
          ...newTool,
          status: 'completed',
          progress: 1,
          content: toolCall.result || toolCall.arguments,
        });
      } else {
        // No tool was created, clear the state
        setActiveTool(null);
      }
    } catch (error) {
      logger.error('Tool request error', { error });
      addMessage({
        role: 'assistant',
        content: 'Mi dispiace, non sono riuscito a creare lo strumento. Riprova?',
      });
      setActiveTool({
        ...newTool,
        status: 'error',
        error: 'Errore nella creazione dello strumento',
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeCharacter, isLoading, messages, addMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation starts
  useEffect(() => {
    if (isActive && mode === 'text') {
      inputRef.current?.focus();
    }
  }, [isActive, mode]);

  // Start conversation on mount if not active
  useEffect(() => {
    if (!isActive) {
      startConversation(extendedProfile);
    }
  }, [isActive, startConversation, extendedProfile]);

  /**
   * Handle sending a message.
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !activeCharacter) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    addMessage({ role: 'user', content: userMessage });

    try {
      // Route the message to determine if we need to switch characters
      const routingResult = routeMessage(userMessage, extendedProfile);

      // Track method progress based on intent (autonomy tracking - Issue #28)
      const methodProgressStore = useMethodProgressStore.getState();

      // Map main Subject type (English) to method-progress Subject type (Italian)
      const mapToMethodSubject = (subject?: Subject): import('@/lib/method-progress/types').Subject | undefined => {
        if (!subject) return undefined;
        const subjectMap: Record<string, import('@/lib/method-progress/types').Subject> = {
          mathematics: 'matematica',
          physics: 'scienze',
          chemistry: 'scienze',
          biology: 'scienze',
          history: 'storia',
          geography: 'geografia',
          italian: 'italiano',
          english: 'inglese',
          art: 'arte',
          music: 'musica',
        };
        return subjectMap[subject] ?? 'other';
      };

      if (routingResult.intent.type === 'method_help' ||
          routingResult.intent.type === 'emotional_support') {
        // Student is seeking help - track as help request
        const timeElapsed = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
        methodProgressStore.recordHelpRequest(
          routingResult.reason,
          timeElapsed,
          mapToMethodSubject(routingResult.intent.subject)
        );
      } else if (routingResult.intent.type === 'academic_help' &&
                 activeCharacter?.type === 'maestro') {
        // Student is working independently with a maestro
        // Only track as "solved alone" if they've been working for a while
        if (messages.length > 4) {
          methodProgressStore.recordProblemSolvedAlone(
            userMessage.slice(0, 100),
            mapToMethodSubject(routingResult.intent.subject)
          );
        }
      }

      // Check if we should suggest a handoff
      if (
        routingResult.characterType !== activeCharacter.type &&
        routingResult.intent.confidence >= 0.7
      ) {
        // High confidence different character needed - suggest handoff
        const { getMaestroById: _getMaestroById } = await import('@/data/maestri');
        const { getSupportTeacherById } = await import('@/data/support-teachers');
        const { getBuddyById } = await import('@/data/buddy-profiles');

        let targetCharacter;
        switch (routingResult.characterType) {
          case 'maestro':
            targetCharacter = routingResult.character;
            break;
          case 'coach':
            targetCharacter =
              getSupportTeacherById(extendedProfile.preferredCoach || 'melissa') ||
              routingResult.character;
            break;
          case 'buddy':
            targetCharacter =
              getBuddyById(extendedProfile.preferredBuddy || 'mario') ||
              routingResult.character;
            break;
        }

        if (targetCharacter && targetCharacter.id !== activeCharacter.id) {
          // Create active character for handoff
          const handoffCharacter = {
            type: routingResult.characterType,
            id: targetCharacter.id,
            name: targetCharacter.name,
            character: targetCharacter,
            greeting:
              routingResult.characterType === 'buddy' && 'getGreeting' in targetCharacter
                ? (targetCharacter as { getGreeting: (p: ExtendedStudentProfile) => string }).getGreeting(extendedProfile)
                : 'greeting' in targetCharacter ? String(targetCharacter.greeting) : '',
            systemPrompt:
              routingResult.characterType === 'buddy' && 'getSystemPrompt' in targetCharacter
                ? (targetCharacter as { getSystemPrompt: (p: ExtendedStudentProfile) => string }).getSystemPrompt(extendedProfile)
                : 'systemPrompt' in targetCharacter ? String(targetCharacter.systemPrompt) : '',
            color: targetCharacter.color,
            voice: 'voice' in targetCharacter ? targetCharacter.voice : 'alloy',
            voiceInstructions: 'voiceInstructions' in targetCharacter ? targetCharacter.voiceInstructions : '',
          };

          // Suggest handoff instead of auto-switching
          suggestHandoff({
            toCharacter: handoffCharacter,
            reason: routingResult.reason,
            confidence: routingResult.intent.confidence,
          });
        }
      }

      // Send to AI for response (simulated for now - will integrate with chat API)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: activeCharacter.systemPrompt },
            ...messages
              .filter((m) => m.role !== 'system')
              .map((m) => ({
                role: m.role,
                content: m.content,
              })),
            { role: 'user', content: userMessage },
          ],
          maestroId: activeCharacter.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantContent = data.content || data.message || '';
      addMessage({ role: 'assistant', content: assistantContent });

      // Also check AI response for handoff signals (reactive detection)
      if (!pendingHandoff) {
        const handoffAnalysis = analyzeHandoff({
          message: userMessage,
          aiResponse: assistantContent,
          activeCharacter,
          studentProfile: extendedProfile,
          recentMessages: messages.slice(-5).map((m) => ({
            role: m.role === 'system' ? 'assistant' : (m.role as 'user' | 'assistant'),
            content: m.content,
          })),
        });

        if (handoffAnalysis.shouldHandoff && handoffAnalysis.suggestion && handoffAnalysis.confidence > 0.7) {
          suggestHandoff(handoffAnalysis.suggestion);
        }
      }
    } catch (error) {
      logger.error('Chat error', { error });
      addMessage({
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema. Puoi riprovare?',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    inputValue,
    isLoading,
    activeCharacter,
    addMessage,
    messages,
    extendedProfile,
    routeMessage,
    suggestHandoff,
    pendingHandoff,
  ]);

  /**
   * Handle key press in input.
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle voice mode toggle (for input area).
   */
  const handleVoiceToggle = () => {
    if (mode === 'voice') {
      setMode('text');
    } else {
      setMode('voice');
    }
  };

  /**
   * Handle voice call (full voice conversation).
   */
  const handleVoiceCall = useCallback(() => {
    if (isVoiceActive) {
      // End voice call
      setIsVoiceActive(false);
      setMode('text');
    } else {
      // Start voice call
      setIsVoiceActive(true);
      setMode('voice');
      // Voice session will be started by VoiceCallOverlay
      // This is a placeholder - Issue #34 tracks voice WebSocket issues
    }
  }, [isVoiceActive, setMode]);

  /**
   * Handle accepting handoff.
   */
  const handleAcceptHandoff = () => {
    acceptHandoff(extendedProfile);
  };

  /**
   * Handle manual character switches.
   */
  const handleSwitchToCoach = () => switchToCoach(extendedProfile);
  const handleSwitchToBuddy = () => switchToBuddy(extendedProfile);
  const handleGoBack = () => goBack(extendedProfile);

  // Render idle state (shouldn't happen with auto-start)
  if (!isActive || !activeCharacter) {
    return (
      <div className="flex items-center justify-center h-full">
        <Button onClick={() => startConversation(extendedProfile)}>
          Inizia una conversazione
        </Button>
      </div>
    );
  }

  // Video conference layout when tool is active (Issue #36)
  const hasActiveTool = activeTool && activeTool.status !== 'error';

  return (
    <div className="relative flex flex-col h-[calc(100vh-200px)] max-h-[700px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
      {/* Voice call overlay */}
      <AnimatePresence>
        {isVoiceActive && activeCharacter && (
          <VoiceCallOverlay
            character={activeCharacter}
            onEnd={handleVoiceCall}
          />
        )}
      </AnimatePresence>

      {/* Header with character info and voice call button - 10% */}
      <ConversationHeader
        currentCharacter={activeCharacter}
        onSwitchToCoach={handleSwitchToCoach}
        onSwitchToBuddy={handleSwitchToBuddy}
        onGoBack={handleGoBack}
        canGoBack={characterHistory.length > 1}
        isVoiceActive={isVoiceActive}
        onVoiceCall={handleVoiceCall}
      />

      {/* Handoff suggestion */}
      <AnimatePresence>
        {pendingHandoff && (
          <HandoffBanner
            suggestion={pendingHandoff}
            onAccept={handleAcceptHandoff}
            onDismiss={dismissHandoff}
          />
        )}
      </AnimatePresence>

      {/* Main content area - switches between chat-first and tool-first layouts */}
      {hasActiveTool ? (
        /* VIDEO CONFERENCE LAYOUT: Tool takes center stage (Issue #36) */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tool panel - 70% of remaining space */}
          <div className="flex-[7] overflow-auto border-b border-slate-200 dark:border-slate-700">
            <ToolPanel
              tool={activeTool}
              maestro={activeCharacter ? {
                name: activeCharacter.name,
                avatar: CHARACTER_AVATARS[activeCharacter.id] || '/avatars/default.jpg',
                color: activeCharacter.color,
              } : null}
              onClose={() => setActiveTool(null)}
              isMinimized={isToolMinimized}
              onToggleMinimize={() => setIsToolMinimized(!isToolMinimized)}
              embedded={true}
            />
          </div>

          {/* Mini chat - 15% of remaining space */}
          <div
            className="flex-[1.5] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50"
            role="log"
            aria-live="polite"
            aria-label="Messaggi recenti"
          >
            {/* Show only last 3 messages in mini view */}
            {messages.slice(-3).map((message) => (
              <div
                key={message.id}
                className={cn(
                  'text-xs py-1 px-2 rounded mb-1',
                  message.role === 'user'
                    ? 'bg-accent-themed/10 text-right'
                    : 'bg-slate-200 dark:bg-slate-700'
                )}
              >
                <span className="font-medium">
                  {message.role === 'user' ? 'Tu' : activeCharacter?.name}:
                </span>{' '}
                {message.content.substring(0, 80)}
                {message.content.length > 80 && '...'}
              </div>
            ))}
            {isLoading && (
              <div className="text-xs py-1 px-2 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{activeCharacter?.name} sta pensando...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* NORMAL LAYOUT: Chat takes full space */
        <div
          className="flex-1 overflow-y-auto p-4"
          role="log"
          aria-live="polite"
          aria-label="Messaggi della conversazione"
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              activeCharacter={
                message.role === 'assistant' ? activeCharacter : null
              }
            />
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 mb-4"
            >
              <CharacterAvatar character={activeCharacter} size="sm" />
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input area - 5% */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {/* Tool buttons - quick access to educational tools */}
          <ToolButtons
            onToolRequest={handleToolRequest}
            disabled={isLoading}
            activeToolId={activeTool?.id}
          />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Scrivi a ${activeCharacter.name}...`}
            aria-label={`Scrivi un messaggio a ${activeCharacter.name}`}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-accent-themed outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? 'Attiva audio' : 'Disattiva audio'}
            aria-pressed={isMuted}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVoiceToggle}
            aria-label={mode === 'voice' ? 'Passa al testo' : 'Passa alla voce'}
            aria-pressed={mode === 'voice'}
            className={cn(mode === 'voice' && 'bg-red-100 text-red-600')}
          >
            {mode === 'voice' ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Invia messaggio"
            className="bg-accent-themed hover:bg-accent-themed/90"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
