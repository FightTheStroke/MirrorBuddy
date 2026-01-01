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
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/app-store';
import { logger } from '@/lib/logger';
import { useConversationFlowStore } from '@/lib/stores/conversation-flow-store';
// Note: routeMessage from store is used instead of direct routeToCharacter
import { analyzeHandoff } from '@/lib/ai/handoff-manager';
import { useMethodProgressStore } from '@/lib/stores/method-progress-store';
import type { ExtendedStudentProfile, Subject } from '@/types';
// Tool integration - T-15
import { ToolButtons } from './tool-buttons';
import { ToolPanel } from '@/components/tools/tool-panel';
import type { ToolType, ToolState } from '@/types/tools';
// Sub-components
import {
  CharacterAvatar,
  MessageBubble,
  HandoffBanner,
  ConversationHeader,
  VoiceCallOverlay,
  CHARACTER_AVATARS,
} from './components';

// Re-export CharacterCard for external use
export { CharacterCard } from './components';

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
    sessionId,
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
      homework: 'Aiutami con i compiti',
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

  // SSE listener for real-time tool events (Phase 4: Fullscreen Layout)
  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/tools/sse?sessionId=${sessionId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'connected':
            logger.debug('SSE connected', { sessionId, clientId: data.clientId });
            break;

          case 'tool:created':
            // Tool creation started - show in panel
            setActiveTool({
              id: data.toolId,
              type: data.toolType,
              status: 'initializing',
              progress: 0,
              content: data.data,
              createdAt: new Date(),
            });
            break;

          case 'tool:update':
            // Incremental update during building
            setActiveTool((prev) => {
              if (!prev || prev.id !== data.toolId) return prev;
              return {
                ...prev,
                status: 'building',
                progress: data.progress ?? prev.progress,
                content: data.data ?? prev.content,
              };
            });
            break;

          case 'tool:complete':
            // Tool finished building
            setActiveTool((prev) => {
              if (!prev || prev.id !== data.toolId) return prev;
              return {
                ...prev,
                status: 'completed',
                progress: 1,
                content: data.data ?? prev.content,
              };
            });
            break;

          case 'tool:error':
            // Tool build failed
            setActiveTool((prev) => {
              if (!prev || prev.id !== data.toolId) return prev;
              return {
                ...prev,
                status: 'error',
                error: data.error || 'Errore durante la creazione',
              };
            });
            break;

          case 'heartbeat':
            // Keep-alive, no action needed
            break;

          default:
            logger.debug('Unknown SSE event type', { type: data.type });
        }
      } catch (error) {
        logger.error('SSE message parse error', { error: String(error) });
      }
    };

    eventSource.onerror = (error) => {
      logger.error('SSE connection error', { error: String(error) });
      // EventSource will automatically try to reconnect
    };

    return () => {
      eventSource.close();
      logger.debug('SSE connection closed', { sessionId });
    };
  }, [sessionId]);

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
