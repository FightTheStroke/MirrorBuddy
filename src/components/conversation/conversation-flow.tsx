/**
 * ConvergioEdu Conversation Flow Component
 *
 * The central conversation-first interface that:
 * 1. Starts with Coach (Melissa/Davide) greeting
 * 2. Routes student messages to appropriate characters
 * 3. Supports seamless handoffs between characters
 * 4. Offers both text and voice modes
 *
 * Part of I-01: Conversation-First Main Flow
 * Related: #24 MirrorBuddy Issue, ManifestoEdu.md
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/app-store';
import {
  useConversationFlowStore,
  type FlowMessage,
  type ActiveCharacter,
} from '@/lib/stores/conversation-flow-store';
import { routeToCharacter, type RoutingResult } from '@/lib/ai/character-router';
import type { ExtendedStudentProfile, CharacterType } from '@/types';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Character avatar with status indicator.
 */
function CharacterAvatar({
  character,
  size = 'md',
  showStatus = false,
  isActive = false,
}: {
  character: ActiveCharacter;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  isActive?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-full overflow-hidden ring-2 ring-offset-2',
          sizeClasses[size]
        )}
        style={{
          borderColor: character.color,
          backgroundColor: character.color + '20',
        }}
      >
        {/* Placeholder avatar with initial */}
        <div
          className="w-full h-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: character.color }}
        >
          {character.name.charAt(0)}
        </div>
      </div>
      {showStatus && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
            isActive ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
    </div>
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
 * Character switcher for manual navigation.
 */
function CharacterSwitcher({
  currentCharacter,
  onSwitchToCoach,
  onSwitchToBuddy,
  onGoBack,
  canGoBack,
}: {
  currentCharacter: ActiveCharacter | null;
  onSwitchToCoach: () => void;
  onSwitchToBuddy: () => void;
  onGoBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
      {canGoBack && (
        <Button variant="ghost" size="icon-sm" onClick={onGoBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      )}
      <div className="flex-1 flex items-center gap-2">
        {currentCharacter && (
          <>
            <CharacterAvatar character={currentCharacter} size="sm" showStatus isActive />
            <div>
              <p className="font-medium text-sm">{currentCharacter.name}</p>
              <p className="text-xs text-slate-500">
                {currentCharacter.type === 'coach'
                  ? 'Coach'
                  : currentCharacter.type === 'buddy'
                  ? 'Buddy'
                  : 'Maestro'}
              </p>
            </div>
          </>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSwitchToCoach}
          title="Torna al Coach"
          disabled={currentCharacter?.type === 'coach'}
        >
          <Users className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSwitchToBuddy}
          title="Parla con un amico"
          disabled={currentCharacter?.type === 'buddy'}
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConversationFlow() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    endConversation,
    addMessage,
    setMode,
    switchToCoach,
    switchToBuddy,
    goBack,
    acceptHandoff,
    dismissHandoff,
    suggestHandoff,
    routeMessage,
    switchToCharacter,
  } = useConversationFlowStore();

  // Extended profile for routing
  const extendedProfile: ExtendedStudentProfile = {
    ...studentProfile,
    learningDifferences: studentProfile.learningDifferences || [],
    preferredCoach: studentProfile.preferredCoach,
    preferredBuddy: studentProfile.preferredBuddy,
  };

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

      // Check if we should suggest a handoff
      if (
        routingResult.characterType !== activeCharacter.type &&
        routingResult.intent.confidence >= 0.7
      ) {
        // High confidence different character needed - suggest handoff
        const { getMaestroById } = await import('@/data/maestri-full');
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
              routingResult.characterType === 'buddy'
                ? (targetCharacter as any).getGreeting(extendedProfile)
                : (targetCharacter as any).greeting,
            systemPrompt:
              routingResult.characterType === 'buddy'
                ? (targetCharacter as any).getSystemPrompt(extendedProfile)
                : (targetCharacter as any).systemPrompt,
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
      addMessage({ role: 'assistant', content: data.content });
    } catch (error) {
      console.error('Chat error:', error);
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
   * Handle voice mode toggle.
   */
  const handleVoiceToggle = () => {
    if (mode === 'voice') {
      setMode('text');
    } else {
      setMode('voice');
      // TODO: Start voice session with useVoiceSession hook
    }
  };

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

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
      {/* Header with character switcher */}
      <CharacterSwitcher
        currentCharacter={activeCharacter}
        onSwitchToCoach={handleSwitchToCoach}
        onSwitchToBuddy={handleSwitchToBuddy}
        onGoBack={handleGoBack}
        canGoBack={characterHistory.length > 1}
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

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
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

      {/* Input area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Scrivi a ${activeCharacter.name}...`}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl border-0 focus:ring-2 focus:ring-accent-themed outline-none text-slate-900 dark:text-white placeholder:text-slate-500"
            disabled={isLoading}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Attiva audio' : 'Disattiva audio'}
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
            title={mode === 'voice' ? 'Passa al testo' : 'Passa alla voce'}
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
            className="bg-accent-themed hover:bg-accent-themed/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
