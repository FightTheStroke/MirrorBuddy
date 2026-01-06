import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { Homework, Maestro } from '@/types';
import { MAIEUTIC_SYSTEM_PROMPT } from '../constants';

interface MaieuticMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useMaieuticChat(currentHomework: Homework | null, connectedMaestro: Maestro | null) {
  const [maieuticChat, setMaieuticChat] = useState<MaieuticMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const getMaieuticSystemPrompt = useCallback(() => {
    let fullPrompt = MAIEUTIC_SYSTEM_PROMPT;

    if (connectedMaestro) {
      fullPrompt = `## IL TUO PERSONAGGIO
Sei **${connectedMaestro.name}**, esperto in ${connectedMaestro.specialty}.
Stile di insegnamento: ${connectedMaestro.teachingStyle}

${fullPrompt}`;
    }

    if (currentHomework) {
      const completedSteps = currentHomework.steps.filter(s => s.completed).length;
      const totalSteps = currentHomework.steps.length;
      const currentStep = currentHomework.steps.find(s => !s.completed);

      fullPrompt += `

## CONTESTO DEL PROBLEMA CORRENTE
- **Titolo**: ${currentHomework.title}
- **Materia**: ${currentHomework.subject}
- **Tipo**: ${currentHomework.problemType}
- **Progresso**: ${completedSteps}/${totalSteps} passaggi completati

### PASSAGGIO ATTUALE DA COMPLETARE
${currentStep ? `**"${currentStep.description}"**

Se lo studente e bloccato, usa questi suggerimenti (dal piu generico al piu specifico):
${currentStep.hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}` : 'Tutti i passaggi completati! Complimentati con lo studente.'}

### TUTTI I PASSAGGI DEL PROBLEMA
${currentHomework.steps.map((s, i) => `${i + 1}. ${s.description} ${s.completed ? '✓' : '○'}`).join('\n')}

**IMPORTANTE**: Concentrati SOLO sul passaggio attuale. Non anticipare i successivi.`;
    }

    return fullPrompt;
  }, [connectedMaestro, currentHomework]);

  const sendMaieuticMessage = useCallback(async (message: string) => {
    setIsLoadingChat(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...maieuticChat.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message },
          ],
          systemPrompt: getMaieuticSystemPrompt(),
          maestroId: connectedMaestro?.id || 'maieutic',
          enableTools: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      setMaieuticChat(prev => [...prev, {
        role: 'assistant',
        content: data.content || 'Mi dispiace, non ho capito. Puoi riformulare la domanda?',
        timestamp: new Date(),
      }]);
    } catch (err) {
      logger.error('Maieutic chat error', { error: String(err) });
      setMaieuticChat(prev => [...prev, {
        role: 'assistant',
        content: 'Scusa, c\'è stato un problema. Prova a riformulare la domanda.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  }, [maieuticChat, getMaieuticSystemPrompt, connectedMaestro]);

  const addMessage = useCallback((message: MaieuticMessage) => {
    setMaieuticChat(prev => [...prev, message]);
  }, []);

  const clearChat = useCallback(() => {
    setMaieuticChat([]);
  }, []);

  return {
    maieuticChat,
    isLoadingChat,
    sendMaieuticMessage,
    addMessage,
    clearChat,
  };
}

