/**
 * Message Sender Hook
 * Handles sending messages, routing, and handoff detection
 * Extracted from conversation-flow.tsx
 */

import { useCallback, useRef, useEffect } from 'react';
import { analyzeHandoff } from '@/lib/ai/handoff-manager';
import { useMethodProgressStore } from '@/lib/stores/method-progress-store';
import { inactivityMonitor } from '@/lib/conversation/inactivity-monitor';
import { buildSignalsFromText, sendAdaptiveSignals } from '@/lib/education/adaptive-difficulty-client';
import { csrfFetch } from '@/lib/auth/csrf-client';
import { getOrCreateUserId } from '../utils/conversation-helpers';
import type { ExtendedStudentProfile, Subject } from '@/types';
import type { ActiveCharacter, FlowMessage } from '@/lib/stores/conversation-flow-store';

// Subject mapping from English to Italian for method progress tracking
const SUBJECT_MAP: Record<string, import('@/lib/method-progress/types').Subject> = {
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

function mapToMethodSubject(subject?: Subject): import('@/lib/method-progress/types').Subject | undefined {
  if (!subject) return undefined;
  return SUBJECT_MAP[subject] ?? 'other';
}

interface HandoffSuggestion {
  toCharacter: ActiveCharacter;
  reason: string;
  confidence: number;
}

interface UseMessageSenderProps {
  activeCharacter: ActiveCharacter | null;
  messages: FlowMessage[];
  extendedProfile: ExtendedStudentProfile;
  conversationsByCharacter: Record<string, { conversationId?: string; messages: unknown[] }>;
  pendingHandoff: HandoffSuggestion | null;
  routeMessage: (message: string, profile: ExtendedStudentProfile) => {
    characterType: 'maestro' | 'coach' | 'buddy';
    character: unknown;
    reason: string;
    intent: { type: string; confidence: number; subject?: Subject };
  };
  addMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
  suggestHandoff: (suggestion: HandoffSuggestion) => void;
}

interface UseMessageSenderReturn {
  sendMessage: (userMessage: string) => Promise<void>;
  sessionStartTimeRef: React.RefObject<number>;
}

/**
 * Hook for handling message sending with routing and handoff detection
 */
export function useMessageSender({
  activeCharacter,
  messages,
  extendedProfile,
  conversationsByCharacter,
  pendingHandoff,
  routeMessage,
  addMessage,
  suggestHandoff,
}: UseMessageSenderProps): UseMessageSenderReturn {
  const sessionStartTimeRef = useRef<number>(0);

  // Initialize session start time on mount (not during render to satisfy purity rules)
  useEffect(() => {
    sessionStartTimeRef.current = Date.now();
  }, []);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!activeCharacter) return;

    const subject = (activeCharacter.character as { subject?: string }).subject;
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
    const responseTimeMs = lastAssistantMessage
      ? Date.now() - lastAssistantMessage.timestamp.getTime()
      : undefined;
    const signals = buildSignalsFromText(userMessage, 'chat', subject);
    if (responseTimeMs !== undefined) {
      signals.push({
        type: 'response_time_ms',
        source: 'chat',
        subject,
        responseTimeMs,
      });
    }
    if (signals.length > 0) {
      sendAdaptiveSignals(signals);
    }

    // Reset inactivity timer
    const userId = getOrCreateUserId();
    const conversationId = conversationsByCharacter[activeCharacter.id]?.conversationId;
    if (userId && conversationId) {
      inactivityMonitor.trackActivity(conversationId, userId, activeCharacter.id);
    }

    // Route the message to determine if we need to switch characters
    const routingResult = routeMessage(userMessage, extendedProfile);

    // Track method progress based on intent (autonomy tracking - Issue #28)
    const methodProgressStore = useMethodProgressStore.getState();

    if (routingResult.intent.type === 'method_help' ||
        routingResult.intent.type === 'emotional_support') {
      const timeElapsed = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
      methodProgressStore.recordHelpRequest(
        routingResult.reason,
        timeElapsed,
        mapToMethodSubject(routingResult.intent.subject)
      );
    } else if (routingResult.intent.type === 'academic_help' &&
               activeCharacter?.type === 'maestro') {
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
      await handleHandoffSuggestion(
        routingResult,
        activeCharacter,
        extendedProfile,
        suggestHandoff
      );
    }

    // Send to AI for response with memory context (ADR 0021)
    const response = await csrfFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: activeCharacter.systemPrompt },
          ...messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
        maestroId: activeCharacter.id,
        enableMemory: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    const assistantContent = data.content || data.message || '';
    addMessage({ role: 'assistant', content: assistantContent });

    // Check AI response for handoff signals (reactive detection)
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
  }, [activeCharacter, messages, extendedProfile, conversationsByCharacter, pendingHandoff, routeMessage, addMessage, suggestHandoff]);

  return { sendMessage, sessionStartTimeRef };
}

/**
 * Handle handoff suggestion based on routing result
 */
async function handleHandoffSuggestion(
  routingResult: {
    characterType: 'maestro' | 'coach' | 'buddy';
    character: unknown;
    reason: string;
    intent: { confidence: number };
  },
  activeCharacter: ActiveCharacter,
  extendedProfile: ExtendedStudentProfile,
  suggestHandoff: (suggestion: HandoffSuggestion) => void
): Promise<void> {
  const { getSupportTeacherById } = await import('@/data/support-teachers');
  const { getBuddyById } = await import('@/data/buddy-profiles');

  let targetCharacter: ActiveCharacter['character'] | undefined;
  switch (routingResult.characterType) {
    case 'maestro':
      targetCharacter = routingResult.character as ActiveCharacter['character'];
      break;
    case 'coach':
      targetCharacter =
        getSupportTeacherById(extendedProfile.preferredCoach || 'melissa') ||
        (routingResult.character as ActiveCharacter['character']);
      break;
    case 'buddy':
      targetCharacter =
        getBuddyById(extendedProfile.preferredBuddy || 'mario') ||
        (routingResult.character as ActiveCharacter['character']);
      break;
  }

  if (targetCharacter && (targetCharacter as { id: string }).id !== activeCharacter.id) {
    const tc = targetCharacter as {
      id: string;
      name: string;
      color: string;
      greeting?: string;
      systemPrompt?: string;
      voice?: string;
      voiceInstructions?: string;
      getGreeting?: (p: ExtendedStudentProfile) => string;
      getSystemPrompt?: (p: ExtendedStudentProfile) => string;
    };

    const handoffCharacter: ActiveCharacter = {
      type: routingResult.characterType,
      id: tc.id,
      name: tc.name,
      character: targetCharacter,
      greeting:
        routingResult.characterType === 'buddy' && tc.getGreeting
          ? tc.getGreeting(extendedProfile)
          : tc.greeting || '',
      systemPrompt:
        routingResult.characterType === 'buddy' && tc.getSystemPrompt
          ? tc.getSystemPrompt(extendedProfile)
          : tc.systemPrompt || '',
      color: tc.color,
      voice: tc.voice || 'alloy',
      voiceInstructions: tc.voiceInstructions || '',
    };

    suggestHandoff({
      toCharacter: handoffCharacter,
      reason: routingResult.reason,
      confidence: routingResult.intent.confidence,
    });
  }
}
