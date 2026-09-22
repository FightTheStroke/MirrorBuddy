import { createHash } from 'node:crypto';
import { isVoiceUsageId } from './voice-usage-validation';

export function voiceUsageKey(userId: string, sessionId: string, responseId: string): string {
  if (![userId, sessionId, responseId].every(isVoiceUsageId))
    throw new Error('Invalid usage identity');
  return `vu1_${createHash('sha256')
    .update(JSON.stringify([userId, sessionId, responseId]))
    .digest('hex')}`;
}

export class VoiceUsageConflictError extends Error {
  constructor() {
    super('Response identity already has different usage');
    this.name = 'VoiceUsageConflictError';
  }
}
