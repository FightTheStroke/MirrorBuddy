import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';

interface UseMessageSendingProps {
  activeCharacter: ActiveCharacter | null;
  addMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
  sendMessage: (message: string) => Promise<void>;
}

export function useMessageSending({
  activeCharacter,
  addMessage,
  sendMessage,
}: UseMessageSendingProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return {
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    handleSend,
    handleKeyPress,
  };
}

