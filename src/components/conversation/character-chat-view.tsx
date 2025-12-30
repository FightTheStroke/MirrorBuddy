'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { getSupportTeacherById } from '@/data/support-teachers';
import { getBuddyById } from '@/data/buddy-profiles';
import type { ExtendedStudentProfile } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
    };
  } else {
    const buddy = getBuddyById(characterId as 'mario' | 'noemi');
    // BuddyProfile uses functions for dynamic content
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
    };
  }
}

export function CharacterChatView({ characterId, characterType }: CharacterChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const character = getCharacterInfo(characterId, characterType);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add greeting message on mount if no messages
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
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
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{character.name}</h2>
          <p className="text-sm text-white/80">{character.role}</p>
        </div>
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
              <p className="text-xs opacity-60 mt-1">
                {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
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
            placeholder={`Scrivi un messaggio a ${character.name}...`}
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
  );
}
