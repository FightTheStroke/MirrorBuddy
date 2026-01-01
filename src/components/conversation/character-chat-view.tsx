'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { getSupportTeacherById } from '@/data/support-teachers';
import { getBuddyById } from '@/data/buddy-profiles';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { VoicePanel } from '@/components/voice';
import type { ExtendedStudentProfile, Subject, Maestro, MaestroVoice } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean; // Flag to show voice icon
}

interface CharacterChatViewProps {
  characterId: 'melissa' | 'roberto' | 'chiara' | 'andrea' | 'favij' | 'mario' | 'noemi' | 'enea' | 'bruno' | 'sofia';
  characterType: 'coach' | 'buddy';
}

const CHARACTER_AVATARS: Record<string, string> = {
  mario: '/avatars/mario.jpg',
  noemi: '/avatars/noemi.png',
  enea: '/avatars/enea.png',
  bruno: '/avatars/bruno.png',
  sofia: '/avatars/sofia.png',
  melissa: '/avatars/melissa.jpg',
  roberto: '/avatars/roberto.png',
  chiara: '/avatars/chiara.png',
  andrea: '/avatars/andrea.png',
  favij: '/avatars/favij.jpg',
};

// Default student profile for buddy personalization
const DEFAULT_STUDENT_PROFILE: ExtendedStudentProfile = {
  name: 'Studente',
  age: 14,
  schoolYear: 2,
  schoolLevel: 'media',
  fontSize: 'medium',
  highContrast: false,
  dyslexiaFont: false,
  voiceEnabled: true,
  simplifiedLanguage: false,
  adhdMode: false,
  learningDifferences: [],
};

function getCharacterInfo(characterId: string, characterType: 'coach' | 'buddy') {
  if (characterType === 'coach') {
    const teacher = getSupportTeacherById(characterId as 'melissa' | 'roberto');
    return {
      name: teacher?.name || characterId,
      role: 'Coach di Apprendimento',
      description: teacher?.personality || '',
      greeting: teacher?.greeting || `Ciao! Sono il tuo coach.`,
      avatar: CHARACTER_AVATARS[characterId],
      color: 'from-purple-500 to-indigo-600',
      systemPrompt: teacher?.systemPrompt || '',
      voice: teacher?.voice || 'shimmer',
      voiceInstructions: teacher?.voiceInstructions || '',
      themeColor: teacher?.color || '#EC4899',
    };
  } else {
    const buddy = getBuddyById(characterId as 'mario' | 'noemi');
    const greeting = buddy?.getGreeting?.(DEFAULT_STUDENT_PROFILE) || `Ehi! Piacere di conoscerti!`;
    const systemPrompt = buddy?.getSystemPrompt?.(DEFAULT_STUDENT_PROFILE) || '';
    return {
      name: buddy?.name || characterId,
      role: 'Amico di Studio',
      description: buddy?.personality || '',
      greeting,
      avatar: CHARACTER_AVATARS[characterId],
      color: 'from-pink-500 to-rose-600',
      systemPrompt,
      voice: buddy?.voice || 'ash',
      voiceInstructions: buddy?.voiceInstructions || '',
      themeColor: buddy?.color || '#10B981',
    };
  }
}

interface VoiceConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

function characterToMaestro(character: ReturnType<typeof getCharacterInfo>, characterId: string): Maestro {
  return {
    id: characterId,
    name: character.name,
    subject: 'methodology' as Subject,
    specialty: character.role,
    voice: character.voice as MaestroVoice,
    voiceInstructions: character.voiceInstructions,
    teachingStyle: 'scaffolding',
    avatar: character.avatar || '/avatars/default.jpg',
    color: character.themeColor,
    systemPrompt: character.systemPrompt,
    greeting: character.greeting,
  };
}


export function CharacterChatView({ characterId, characterType }: CharacterChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<VoiceConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasAttemptedConnection = useRef(false);
  const lastTranscriptIdRef = useRef<string | null>(null);

  const character = getCharacterInfo(characterId, characterType);

  // Voice session with transcript callback that syncs to messages
  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
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
      // Add voice transcripts to the chat messages
      const transcriptId = `voice-${role}-${Date.now()}`;

      // Avoid duplicate transcripts
      if (lastTranscriptIdRef.current === text.substring(0, 50)) {
        return;
      }
      lastTranscriptIdRef.current = text.substring(0, 50);

      setMessages(prev => [...prev, {
        id: transcriptId,
        role: role as 'user' | 'assistant',
        content: text,
        timestamp: new Date(),
        isVoice: true,
      }]);
    },
  });

  // Fetch voice connection info
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

  // Connect when voice is activated
  useEffect(() => {
    const startConnection = async () => {
      if (!isVoiceActive || hasAttemptedConnection.current) return;
      if (!connectionInfo || isConnected || connectionState !== 'idle') return;

      hasAttemptedConnection.current = true;
      setConfigError(null);

      try {
        const maestroLike = characterToMaestro(character, characterId);
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
  }, [isVoiceActive, connectionInfo, isConnected, connectionState, character, characterId, connect]);

  // Reset connection attempt flag when voice is deactivated
  useEffect(() => {
    if (!isVoiceActive) {
      hasAttemptedConnection.current = false;
    }
  }, [isVoiceActive]);

  // Handle voice call toggle
  const handleVoiceCall = useCallback(() => {
    if (isVoiceActive) {
      disconnect();
    }
    setIsVoiceActive(prev => !prev);
  }, [isVoiceActive, disconnect]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add greeting message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: character.greeting,
        timestamp: new Date(),
      }]);
    }
  }, [character.greeting, messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: character.systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content },
          ],
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || data.message || 'Mi dispiace, non ho capito.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      logger.error('Chat error', { error });
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Mi dispiace, c\'è stato un errore. Riprova tra poco!',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, character.systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className={cn(
          'flex items-center gap-4 p-4 rounded-t-2xl bg-gradient-to-r text-white',
          character.color
        )}>
          <div className="relative">
            {character.avatar ? (
              <Image
                src={character.avatar}
                alt={character.name}
                width={56}
                height={56}
                className="rounded-full border-2 border-white/30 object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                {character.name.charAt(0)}
              </div>
            )}
            <span className={cn(
              "absolute bottom-0 right-0 w-4 h-4 border-2 border-white rounded-full",
              isVoiceActive && isConnected ? "bg-green-400 animate-pulse" : "bg-green-400"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{character.name}</h2>
            <p className="text-sm text-white/80 truncate">
              {isVoiceActive && isConnected ? 'In chiamata vocale' : character.role}
            </p>
          </div>

          {/* Voice Call Button */}
          <Button
            variant={isVoiceActive ? 'destructive' : 'ghost'}
            size="icon"
            onClick={handleVoiceCall}
            disabled={!!configError && !isVoiceActive}
            aria-label={
              configError && !isVoiceActive
                ? `Voce non disponibile: ${configError}`
                : isVoiceActive
                  ? 'Termina chiamata'
                  : 'Avvia chiamata vocale'
            }
            title={configError && !isVoiceActive ? configError : undefined}
            className={cn(
              'text-white hover:bg-white/20 transition-all',
              isVoiceActive && 'bg-red-500 hover:bg-red-600 animate-pulse',
              configError && !isVoiceActive && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isVoiceActive ? (
              <PhoneOff className="w-5 h-5" />
            ) : (
              <Phone className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  {character.avatar ? (
                    <Image
                      src={character.avatar}
                      alt={character.name}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {character.name.charAt(0)}
                    </div>
                  )}
                </div>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-accent-themed text-white rounded-br-md'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md shadow-sm'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  {message.isVoice && (
                    <Volume2 className="w-3 h-3 opacity-60" />
                  )}
                  <p className="text-xs opacity-60">
                    {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0">
                {character.avatar ? (
                  <Image
                    src={character.avatar}
                    alt={character.name}
                    width={36}
                    height={36}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {character.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isVoiceActive ? 'Parla o scrivi...' : `Scrivi un messaggio a ${character.name}...`}
              className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-themed"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-accent-themed hover:bg-accent-themed/90"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Voice Panel (Side by Side) */}
      <AnimatePresence>
        {isVoiceActive && (
          <VoicePanel
            character={{
              name: character.name,
              avatar: character.avatar,
              specialty: character.role,
              color: character.color,
            }}
            isConnected={isConnected}
            isListening={isListening}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            inputLevel={inputLevel}
            connectionState={connectionState}
            configError={configError}
            onToggleMute={toggleMute}
            onEndCall={handleVoiceCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
