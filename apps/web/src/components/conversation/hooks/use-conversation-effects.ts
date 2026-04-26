import { useEffect } from 'react';
import type { ExtendedStudentProfile } from '@/types';
import type { FlowMode, FlowMessage } from '@/lib/stores/conversation-flow-store';

interface UseConversationEffectsProps {
  isActive: boolean;
  mode: FlowMode;
  messages: FlowMessage[];
  startConversation: (profile: ExtendedStudentProfile) => void;
  extendedProfile: ExtendedStudentProfile;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function useConversationEffects({
  isActive,
  mode,
  messages,
  startConversation,
  extendedProfile,
  inputRef,
  messagesEndRef,
}: UseConversationEffectsProps) {
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  useEffect(() => {
    if (isActive && mode === 'text') {
      inputRef.current?.focus();
    }
  }, [isActive, mode, inputRef]);

  useEffect(() => {
    if (!isActive) {
      startConversation(extendedProfile);
    }
  }, [isActive, startConversation, extendedProfile]);
}

