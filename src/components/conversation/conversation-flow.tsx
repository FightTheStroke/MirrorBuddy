'use client';

/**
 * ConversationFlow Component
 *
 * The main conversation-first interface for ConvergioEdu.
 * Entry point: Coach (Melissa) greets the student.
 * Routes to Maestri, Coach, or Buddy based on intent.
 *
 * Part of I-01: Conversation-First Main Flow
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  ArrowLeft,
  Users,
  GraduationCap,
  Heart,
  Loader2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/app-store';
import {
  useConversationFlowStore,
  type FlowMessage,
  type ActiveCharacter,
} from '@/lib/stores/conversation-flow-store';
import type { ExtendedStudentProfile } from '@/types';
import type { MaestroFull } from '@/data/maestri-full';
import { routeToCharacter } from '@/lib/ai/character-router';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Character avatar with colored ring.
 */
function CharacterAvatar({
  character,
  size = 'md',
}: {
  character: ActiveCharacter;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden border-2',
        sizeClasses[size]
      )}
      style={{ borderColor: character.color }}
    >
      <Image
        src={character.character.avatar}
        alt={character.name}
        width={64}
        height={64}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

/**
 * Message bubble with character attribution.
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
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 mb-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isUser && activeCharacter && (
        <CharacterAvatar character={activeCharacter} size="sm" />
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
  const { toCharacter, reason } = suggestion;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800"
    >
      <div className="flex items-start gap-3">
        <CharacterAvatar character={toCharacter} size="sm" />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {toCharacter.name} puo aiutarti!
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {reason}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-slate-500"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            style={{ backgroundColor: toCharacter.color }}
            className="text-white"
          >
            Passa a {toCharacter.name}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Character switcher strip.
 */
function CharacterSwitcher({
  activeCharacter,
  onSwitchToCoach,
  onSwitchToBuddy,
  onSwitchToMaestro,
  canGoBack,
  onGoBack,
}: {
  activeCharacter: ActiveCharacter | null;
  onSwitchToCoach: () => void;
  onSwitchToBuddy: () => void;
  onSwitchToMaestro: () => void;
  canGoBack: boolean;
  onGoBack: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
      {canGoBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onGoBack}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      <div className="flex gap-2 flex-1">
        <Button
          variant={activeCharacter?.type === 'coach' ? 'default' : 'outline'}
          size="sm"
          onClick={onSwitchToCoach}
          className={cn(
            'flex items-center gap-2',
            activeCharacter?.type === 'coach' && 'bg-pink-500 hover:bg-pink-600'
          )}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Coach</span>
        </Button>

        <Button
          variant={activeCharacter?.type === 'maestro' ? 'default' : 'outline'}
          size="sm"
          onClick={onSwitchToMaestro}
          className={cn(
            'flex items-center gap-2',
            activeCharacter?.type === 'maestro' && 'bg-blue-500 hover:bg-blue-600'
          )}
        >
          <GraduationCap className="h-4 w-4" />
          <span className="hidden sm:inline">Maestri</span>
        </Button>

        <Button
          variant={activeCharacter?.type === 'buddy' ? 'default' : 'outline'}
          size="sm"
          onClick={onSwitchToBuddy}
          className={cn(
            'flex items-center gap-2',
            activeCharacter?.type === 'buddy' && 'bg-green-500 hover:bg-green-600'
          )}
        >
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Buddy</span>
        </Button>
      </div>

      {activeCharacter && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: activeCharacter.color }}
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {activeCharacter.name}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Main conversation flow component.
 * Entry point for the conversation-first interface.
 */
export function ConversationFlow() {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMaestriSelector, setShowMaestriSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { studentProfile } = useSettingsStore();

  // Convert to ExtendedStudentProfile (memoized to prevent re-creation)
  const extendedProfile = useMemo<ExtendedStudentProfile>(() => ({
    ...studentProfile,
    learningDifferences: [],
    preferredCoach: undefined,
    preferredBuddy: undefined,
  }), [studentProfile]);

  const {
    isActive,
    activeCharacter,
    messages,
    pendingHandoff,
    characterHistory,
    startConversation,
    addMessage,
    switchToCoach,
    switchToMaestro,
    switchToBuddy,
    goBack,
    acceptHandoff,
    dismissHandoff,
  } = useConversationFlowStore();

  // Auto-start conversation on mount
  useEffect(() => {
    if (!isActive) {
      startConversation(extendedProfile);
    }
  }, [isActive, startConversation, extendedProfile]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !activeCharacter) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    });

    try {
      // Check if we should route to a different character
      const routingResult = routeToCharacter({
        message: userMessage,
        studentProfile: extendedProfile,
        currentCharacter: {
          type: activeCharacter.type,
          id: activeCharacter.id,
        },
        preferContinuity: true,
      });

      // If routing suggests a different character with high confidence, suggest handoff
      if (
        routingResult.characterType !== activeCharacter.type &&
        routingResult.intent.confidence > 0.7
      ) {
        // For now, just continue with current character but log the suggestion
        console.log('Routing suggests:', routingResult.characterType, routingResult.reason);
      }

      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: activeCharacter.systemPrompt },
            ...messages.slice(-10).map((m) => ({
              role: m.role === 'system' ? 'assistant' : m.role,
              content: m.content,
            })),
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();
      const assistantMessage = data.content || data.message || 'Mi dispiace, non ho capito.';

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: assistantMessage,
      });
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema. Riprova per favore.',
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isLoading, activeCharacter, messages, addMessage, extendedProfile]);

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle switching to a maestro (opens selector)
  const handleSwitchToMaestro = () => {
    setShowMaestriSelector(true);
  };

  // Handle selecting a specific maestro
  const handleSelectMaestro = (maestro: MaestroFull) => {
    switchToMaestro(maestro, extendedProfile);
    setShowMaestriSelector(false);
  };

  // Can go back in history?
  const canGoBack = characterHistory.length > 1;

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        {activeCharacter && (
          <>
            <CharacterAvatar character={activeCharacter} size="md" />
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {activeCharacter.name}
              </h2>
              {activeCharacter.subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeCharacter.subtitle}
                </p>
              )}
            </div>
            <div
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: activeCharacter.color }}
            >
              {activeCharacter.type === 'coach' && 'Coach'}
              {activeCharacter.type === 'maestro' && 'Maestro'}
              {activeCharacter.type === 'buddy' && 'Buddy'}
            </div>
          </>
        )}
      </div>

      {/* Character Switcher */}
      <CharacterSwitcher
        activeCharacter={activeCharacter}
        onSwitchToCoach={() => switchToCoach(extendedProfile)}
        onSwitchToBuddy={() => switchToBuddy(extendedProfile)}
        onSwitchToMaestro={handleSwitchToMaestro}
        canGoBack={canGoBack}
        onGoBack={() => goBack(extendedProfile)}
      />

      {/* Handoff Suggestion */}
      <AnimatePresence>
        {pendingHandoff && (
          <HandoffBanner
            suggestion={pendingHandoff}
            onAccept={() => acceptHandoff(extendedProfile)}
            onDismiss={dismissHandoff}
          />
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            activeCharacter={activeCharacter}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {activeCharacter?.name} sta scrivendo...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Scrivi a ${activeCharacter?.name || 'Coach'}...`}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-4"
            style={activeCharacter ? { backgroundColor: activeCharacter.color } : undefined}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Maestri Selector Modal */}
      <MaestriSelectorModal
        isOpen={showMaestriSelector}
        onClose={() => setShowMaestriSelector(false)}
        onSelect={handleSelectMaestro}
      />
    </div>
  );
}

// ============================================================================
// MAESTRI SELECTOR MODAL
// ============================================================================

function MaestriSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (maestro: MaestroFull) => void;
}) {
  const [maestri, setMaestri] = useState<MaestroFull[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load maestri dynamically
      import('@/data/maestri-full').then(({ MAESTRI }) => {
        setMaestri(MAESTRI);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Scegli un Maestro
            </h3>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {maestri.map((maestro) => (
              <button
                key={maestro.id}
                onClick={() => onSelect(maestro)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden border-2"
                    style={{ borderColor: maestro.color }}
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
                    <p className="font-medium text-sm text-slate-900 dark:text-white">
                      {maestro.displayName || maestro.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {maestro.subject}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
