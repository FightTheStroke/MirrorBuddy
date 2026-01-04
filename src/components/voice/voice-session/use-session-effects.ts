import { useEffect, useRef } from 'react';
import { useProgressStore, useUIStore } from '@/lib/stores';
import { useAmbientAudioStore } from '@/lib/stores/ambient-audio-store';
import { logger } from '@/lib/logger';
import type { Maestro, ToolCall } from '@/types';

interface UseSessionEffectsProps {
  maestro: Maestro;
  isConnected: boolean;
  transcript: Array<{ role: string; content: string }>;
  toolCalls: ToolCall[];
  onSetElapsedSeconds: (updater: (prev: number) => number) => void;
}

export function useSessionEffects({
  maestro,
  isConnected,
  transcript,
  toolCalls,
  onSetElapsedSeconds,
}: UseSessionEffectsProps) {
  const sessionStartTime = useRef<Date>(new Date());
  const questionCount = useRef<number>(0);
  const conversationIdRef = useRef<string | null>(null);
  const savedMessagesRef = useRef<Set<string>>(new Set());
  const processedToolsRef = useRef<Set<string>>(new Set());

  const { currentSession, startSession } = useProgressStore();
  const { enterFocusMode, setFocusTool } = useUIStore();

  // Start session when connected
  useEffect(() => {
    if (isConnected && !currentSession) {
      sessionStartTime.current = new Date();
      startSession(maestro.id, maestro.specialty);
    }
  }, [isConnected, currentSession, maestro.id, maestro.specialty, startSession]);

  // Auto-switch to focus mode when a tool is created
  useEffect(() => {
    const completedTools = toolCalls.filter(
      (tc) => tc.status === 'completed' && !processedToolsRef.current.has(tc.id)
    );

    if (completedTools.length === 0) return;

    const toolCall = completedTools[0];
    processedToolsRef.current.add(toolCall.id);

    const toolTypeMap: Record<string, string> = {
      create_mindmap: 'mindmap',
      create_quiz: 'quiz',
      create_flashcards: 'flashcard',
      create_summary: 'summary',
      create_demo: 'demo',
      create_diagram: 'diagram',
      create_timeline: 'timeline',
      web_search: 'search',
    };
    const mappedToolType = (toolTypeMap[toolCall.type] || 'mindmap') as import('@/types/tools').ToolType;

    const toolContent = toolCall.result?.data || toolCall.result || toolCall.arguments;

    enterFocusMode(mappedToolType, maestro.id, 'voice');
    setFocusTool({
      id: toolCall.id,
      type: mappedToolType,
      status: 'completed',
      progress: 1,
      content: toolContent,
      createdAt: new Date(),
    });

    logger.debug('[VoiceSession] Entered focus mode for tool', {
      toolId: toolCall.id,
      toolType: mappedToolType,
    });
  }, [toolCalls, enterFocusMode, setFocusTool, maestro.id]);

  // Create conversation in DB when voice session connects
  useEffect(() => {
    if (!isConnected || conversationIdRef.current) return;

    const createConversation = async () => {
      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maestroId: maestro.id,
            title: `Sessione vocale con ${maestro.name}`,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          conversationIdRef.current = data.id;
          logger.debug('[VoiceSession] Conversation created', { conversationId: data.id });
        }
      } catch (error) {
        logger.error('[VoiceSession] Failed to create conversation', { error: String(error) });
      }
    };

    createConversation();
  }, [isConnected, maestro.id, maestro.name]);

  // Save transcript messages to DB for memory persistence
  useEffect(() => {
    if (!conversationIdRef.current || transcript.length === 0) return;

    const saveNewMessages = async () => {
      for (const entry of transcript) {
        const messageKey = `${entry.role}-${entry.content.slice(0, 50)}`;
        if (savedMessagesRef.current.has(messageKey)) continue;

        try {
          await fetch(`/api/conversations/${conversationIdRef.current}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: entry.role,
              content: entry.content,
            }),
          });
          savedMessagesRef.current.add(messageKey);
        } catch (error) {
          logger.error('[VoiceSession] Failed to save message', { error: String(error) });
        }
      }
    };

    saveNewMessages();
  }, [transcript]);

  // Auto-pause ambient audio during voice session
  const ambientPlaybackState = useAmbientAudioStore((s) => s.playbackState);
  const pauseAmbient = useAmbientAudioStore((s) => s.pause);
  const playAmbient = useAmbientAudioStore((s) => s.play);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (isConnected) {
      if (ambientPlaybackState === 'playing') {
        wasPlayingRef.current = true;
        pauseAmbient();
        logger.debug('[VoiceSession] Paused ambient audio');
      }
    } else {
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        playAmbient();
        logger.debug('[VoiceSession] Resumed ambient audio');
      }
    }
  }, [isConnected, ambientPlaybackState, pauseAmbient, playAmbient]);

  // Timer that increments every second when connected
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      onSetElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
      onSetElapsedSeconds(() => 0);
    };
  }, [isConnected, onSetElapsedSeconds]);

  return {
    sessionStartTime,
    questionCount,
    conversationIdRef,
  };
}
