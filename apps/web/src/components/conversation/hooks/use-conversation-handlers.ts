import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { getOrCreateUserId, endConversationWithSummary } from '../utils/conversation-helpers';
import type { ExtendedStudentProfile } from '@/types';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';

interface UseConversationHandlersProps {
  activeCharacter: ActiveCharacter | null;
  conversationsByCharacter: Record<string, { conversationId?: string }>;
  isVoiceActive: boolean;
  setIsVoiceActive: (active: boolean) => void;
  setMode: (mode: 'text' | 'voice') => void;
  acceptHandoff: (profile: ExtendedStudentProfile) => Promise<void>;
  switchToCoach: (profile: ExtendedStudentProfile) => Promise<void>;
  switchToBuddy: (profile: ExtendedStudentProfile) => Promise<void>;
  goBack: (profile: ExtendedStudentProfile) => void;
  extendedProfile: ExtendedStudentProfile;
}

export function useConversationHandlers({
  activeCharacter,
  conversationsByCharacter,
  isVoiceActive,
  setIsVoiceActive,
  setMode,
  acceptHandoff,
  switchToCoach,
  switchToBuddy,
  goBack,
  extendedProfile,
}: UseConversationHandlersProps) {
  const handleVoiceCall = useCallback(async () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      setMode('text');

      const userId = getOrCreateUserId();
      const conversationId = activeCharacter
        ? conversationsByCharacter[activeCharacter.id]?.conversationId
        : null;
      if (userId && conversationId) {
        logger.info('Ending voice call, generating summary', { conversationId });
        await endConversationWithSummary(conversationId);
      }
    } else {
      setIsVoiceActive(true);
      setMode('voice');
    }
  }, [isVoiceActive, setIsVoiceActive, setMode, activeCharacter, conversationsByCharacter]);

  const handleAcceptHandoff = useCallback(async () => {
    await acceptHandoff(extendedProfile);
  }, [acceptHandoff, extendedProfile]);

  const handleSwitchToCoach = useCallback(async () => {
    await switchToCoach(extendedProfile);
  }, [switchToCoach, extendedProfile]);

  const handleSwitchToBuddy = useCallback(async () => {
    await switchToBuddy(extendedProfile);
  }, [switchToBuddy, extendedProfile]);

  const handleGoBack = useCallback(() => {
    goBack(extendedProfile);
  }, [goBack, extendedProfile]);

  return {
    handleVoiceCall,
    handleAcceptHandoff,
    handleSwitchToCoach,
    handleSwitchToBuddy,
    handleGoBack,
  };
}

