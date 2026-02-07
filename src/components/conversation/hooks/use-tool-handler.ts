import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';
import { getMaestroById } from '@/data/maestri';
import type { MaestroFull } from '@/data/maestri';
import type { ToolType, ToolState } from '@/types/tools';
import { TOOL_PROMPTS } from '../constants/tool-constants';
import { functionNameToToolType } from '@/lib/tools/constants';

interface UseToolHandlerProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  messages: Array<{ role: string; content: string }>;
  addMessage: (message: { role: 'user' | 'assistant'; content: string }) => void;
}

export function useToolHandler({
  isLoading,
  setIsLoading,
  messages,
  addMessage,
}: UseToolHandlerProps) {
  const [activeTool, setActiveTool] = useState<ToolState | null>(null);
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);
  const [pendingToolType, setPendingToolType] = useState<ToolType | null>(null);

  const handleMaestroSelected = useCallback(
    async (maestro: MaestroFull, toolType: ToolType) => {
      if (isLoading) return;

      const toolPrompt = TOOL_PROMPTS[toolType] || `Crea ${toolType}`;
      setIsLoading(true);
      addMessage({ role: 'user', content: toolPrompt });

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
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
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
            enableMemory: true,
          }),
        });

        if (!response.ok) throw new Error('Failed to get response');
        const data = await response.json();

        const assistantContent = data.content || data.message || '';
        addMessage({ role: 'assistant', content: assistantContent });

        if (data.toolCalls?.length > 0) {
          const toolCall = data.toolCalls[0];
          const mappedToolType = functionNameToToolType(toolCall.type) || toolType;
          const toolContent = toolCall.result?.data || toolCall.result || toolCall.arguments;
          const _completedTool: ToolState = {
            ...newTool,
            type: mappedToolType,
            status: 'completed',
            progress: 1,
            content: toolContent,
          };

          // Focus mode has been removed
          setActiveTool(null);
        } else {
          setActiveTool(null);
        }
      } catch (error) {
        logger.error('Tool request error', undefined, error);
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
    },
    [isLoading, setIsLoading, messages, addMessage]
  );

  const handleToolRequest = useCallback(
    (toolType: ToolType) => {
      if (isLoading) return;

      const pendingRequest = sessionStorage.getItem('pendingToolRequest');
      if (pendingRequest) {
        try {
          const parsed = JSON.parse(pendingRequest);
          if (parsed && typeof parsed === 'object' && 'tool' in parsed && 'maestroId' in parsed) {
            const { tool, maestroId } = parsed;
            if (tool === toolType && maestroId) {
              const maestro = getMaestroById(maestroId);
              if (maestro) {
                sessionStorage.removeItem('pendingToolRequest');
                handleMaestroSelected(maestro, toolType);
                return;
              }
            }
          }
        } catch (error) {
          logger.error('Failed to parse pendingToolRequest', undefined, error);
        }
      }

      setPendingToolType(toolType);
      setShowMaestroDialog(true);
    },
    [isLoading, handleMaestroSelected]
  );

  return {
    activeTool,
    setActiveTool,
    showMaestroDialog,
    setShowMaestroDialog,
    pendingToolType,
    setPendingToolType,
    handleMaestroSelected,
    handleToolRequest,
  };
}
