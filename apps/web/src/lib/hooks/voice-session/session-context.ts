import { clientLogger as logger } from '@/lib/logger/client';
import type { Maestro } from '@/types';
import { fetchConversationMemory, buildMemoryContext } from './memory-utils';

export async function fetchVoiceContext(maestro: Pick<Maestro, 'id' | 'subject'>) {
  let memoryContext = '';
  let adaptiveInstruction = '';
  const subjectParam = maestro.subject ? `subject=${encodeURIComponent(maestro.subject)}` : '';
  const results = await Promise.allSettled([
    fetchConversationMemory(maestro.id),
    fetch(`/api/adaptive/context?${subjectParam}&source=voice`),
  ]);
  if (results[0].status === 'fulfilled') {
    try {
      memoryContext = buildMemoryContext(results[0].value);
    } catch (error) {
      logger.warn('[VoiceSession] Memory context processing failed', {
        maestroId: maestro.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    logger.warn('[VoiceSession] Memory context unavailable', {
      maestroId: maestro.id,
      error: String(results[0].reason),
    });
  }
  if (results[1].status === 'fulfilled') {
    const response = results[1].value;
    try {
      if (response.ok) {
        const data = await response.json();
        adaptiveInstruction = data.instruction ? `\n${data.instruction}\n` : '';
      }
    } catch (error) {
      logger.warn('[VoiceSession] Adaptive context processing failed', {
        error: String(error),
      });
    }
  } else {
    logger.warn('[VoiceSession] Adaptive context unavailable', {
      error: String(results[1].reason),
    });
  }
  return { memoryContext, adaptiveInstruction };
}
