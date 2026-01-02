/**
 * MirrorBuddy Conversation Flow Component
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
import { useSettingsStore, useUIStore } from '@/lib/stores/app-store';
import { logger } from '@/lib/logger';
import { useConversationFlowStore } from '@/lib/stores/conversation-flow-store';
import type { ExtendedStudentProfile } from '@/types';
// Tool integration - T-15
import { ToolButtons } from './tool-buttons';
import { ToolPanel } from '@/components/tools/tool-panel';
import type { ToolType, ToolState } from '@/types/tools';
import { ToolMaestroSelectionDialog } from './tool-maestro-selection-dialog';
import { getMaestroById } from '@/data/maestri';
import type { MaestroFull } from '@/data/maestri';
// Extracted hooks and helpers
import { useToolSSE } from './hooks/use-tool-sse';
import { useConversationInactivity } from './hooks/use-conversation-inactivity';
import { useMessageSender } from './hooks/use-message-sender';
import { getOrCreateUserId, endConversationWithSummary } from './utils/conversation-helpers';

// Map OpenAI function names to ToolType
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
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);
  const [pendingToolType, setPendingToolType] = useState<ToolType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const _prefersReducedMotion = useReducedMotion(); // For future accessibility features

  // Stores
  const { studentProfile } = useSettingsStore();
  const { enterFocusMode, setFocusTool } = useUIStore();
  const {
    isActive,
    mode,
    activeCharacter,
    messages,
    pendingHandoff,
    characterHistory,
    sessionId,
    conversationsByCharacter,
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

  // Handle maestro selection and create tool
  const handleMaestroSelected = useCallback(async (maestro: MaestroFull, toolType: ToolType) => {
    if (isLoading) return;

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
            { role: 'system', content: maestro.systemPrompt },
            ...messages
              .filter((m) => m.role !== 'system')
              .map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: toolPrompt },
          ],
          maestroId: maestro.id,
          requestedTool: toolType,
          enableMemory: true, // ADR 0021: Enable conversational memory injection
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      const assistantContent = data.content || data.message || '';
      addMessage({ role: 'assistant', content: assistantContent });

      // Update tool state based on response
      if (data.toolCalls?.length > 0) {
        const toolCall = data.toolCalls[0];
        // Map function name (create_quiz) to tool type (quiz)
        const mappedToolType = FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || toolType;
        // Extract actual data from result object
        const toolContent = toolCall.result?.data || toolCall.result || toolCall.arguments;
        const completedTool: ToolState = {
          ...newTool,
          type: mappedToolType,
          status: 'completed',
          progress: 1,
          content: toolContent,
        };

        // Option B: Auto-switch to fullscreen focus mode when tool is created
        // This prevents scroll jumps in normal chat view
        enterFocusMode(mappedToolType, maestro.id, 'chat');
        setFocusTool(completedTool);
        setActiveTool(null); // Clear local state since focus mode handles it
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
  }, [isLoading, messages, addMessage, enterFocusMode, setFocusTool]);

  // Handle tool request from ToolButtons - show maestro selection dialog
  const handleToolRequest = useCallback((toolType: ToolType) => {
    if (isLoading) return;

    // Check for pending tool request in sessionStorage (from maestri-grid)
    const pendingRequest = sessionStorage.getItem('pendingToolRequest');
    if (pendingRequest) {
      try {
        const parsed = JSON.parse(pendingRequest);
        // Validate parsed structure before destructuring
        if (parsed && typeof parsed === 'object' && 'tool' in parsed && 'maestroId' in parsed) {
          const { tool, maestroId } = parsed;
          if (tool === toolType && maestroId) {
            // Use maestro from pending request - fetch full object for type safety
            const maestro = getMaestroById(maestroId);
            if (maestro) {
              sessionStorage.removeItem('pendingToolRequest');
              handleMaestroSelected(maestro, toolType);
              return;
            }
          }
        }
      } catch (error) {
        logger.error('Failed to parse pendingToolRequest', { error });
      }
    }

    // Show maestro selection dialog
    setPendingToolType(toolType);
    setShowMaestroDialog(true);
  }, [isLoading, handleMaestroSelected]);

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

  // #98: Inactivity tracking and auto-summary (extracted to hook)
  useConversationInactivity(isActive, activeCharacter, conversationsByCharacter);

  // SSE listener for real-time tool events (extracted to hook)
  useToolSSE(sessionId, setActiveTool);

  // Message sending with routing and handoff detection (extracted to hook)
  const { sendMessage } = useMessageSender({
    activeCharacter,
    messages,
    extendedProfile,
    conversationsByCharacter,
    pendingHandoff,
    routeMessage,
    addMessage,
    suggestHandoff,
  });

  /**
   * Handle sending a message - orchestrates UI state and delegates to sendMessage hook.
   */
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !activeCharacter) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    addMessage({ role: 'user', content: userMessage });

    try {
      await sendMessage(userMessage);
    } catch (error) {
      logger.error('Chat error', { error });
      addMessage({
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema. Puoi riprovare?',
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, activeCharacter, addMessage, sendMessage]);

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
  const handleVoiceCall = useCallback(async () => {
    if (isVoiceActive) {
      // #98: End voice call and generate summary
      setIsVoiceActive(false);
      setMode('text');

      // Generate summary for voice call
      const userId = getOrCreateUserId();
      const conversationId = activeCharacter ? conversationsByCharacter[activeCharacter.id]?.conversationId : null;
      if (userId && conversationId) {
        logger.info('Ending voice call, generating summary', { conversationId });
        await endConversationWithSummary(conversationId);
      }
    } else {
      // Start voice call
      setIsVoiceActive(true);
      setMode('voice');
      // Voice session will be started by VoiceCallOverlay
      // This is a placeholder - Issue #34 tracks voice WebSocket issues
    }
  }, [isVoiceActive, setMode, activeCharacter, conversationsByCharacter]);

  /**
   * Handle accepting handoff (async to properly end previous conversation).
   */
  const handleAcceptHandoff = async () => {
    await acceptHandoff(extendedProfile);
  };

  /**
   * Handle manual character switches (async to properly end previous conversation).
   */
  const handleSwitchToCoach = async () => await switchToCoach(extendedProfile);
  const handleSwitchToBuddy = async () => await switchToBuddy(extendedProfile);
  const handleGoBack = () => goBack(extendedProfile); // Sync: only navigates history

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
            onSessionIdChange={setVoiceSessionId}
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
              sessionId={voiceSessionId}
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

      {/* Maestro Selection Dialog */}
      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType={pendingToolType || 'mindmap'}
        onSelect={(maestro) => {
          if (pendingToolType) {
            handleMaestroSelected(maestro, pendingToolType);
          }
          setShowMaestroDialog(false);
          setPendingToolType(null);
        }}
        onClose={() => {
          setShowMaestroDialog(false);
          setPendingToolType(null);
        }}
      />
    </div>
  );
}
