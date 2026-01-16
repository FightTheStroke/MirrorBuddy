import { logger } from '@/lib/logger';
import type { AdaptiveSignalInput, AdaptiveSignalSource } from '@/types';

const QUESTION_PATTERN = /\?|perche|come|quando|dove|spiega|puoi\s+mostrare/i;
const REPEAT_PATTERNS = [
  /non\s+ho\s+capito/i,
  /ripeti/i,
  /di\s+nuovo/i,
  /puoi\s+spiegare\s+ancora/i,
  /non\s+mi\s+e\s+chiaro/i,
];
const FRUSTRATION_PATTERNS = [
  /non\s+ce\s+la\s+faccio/i,
  /sono\s+frustrat/i,
  /mi\s+stresso/i,
  /odio/i,
  /non\s+ci\s+riesco/i,
];

export function buildSignalsFromText(
  text: string,
  source: AdaptiveSignalSource,
  subject?: string,
  topic?: string
): AdaptiveSignalInput[] {
  const signals: AdaptiveSignalInput[] = [];
  if (!text) return signals;

  if (QUESTION_PATTERN.test(text)) {
    signals.push({ type: 'question', source, subject, topic });
  }

  if (REPEAT_PATTERNS.some((pattern) => pattern.test(text))) {
    signals.push({ type: 'repeat_request', source, subject, topic });
  }

  if (FRUSTRATION_PATTERNS.some((pattern) => pattern.test(text))) {
    signals.push({ type: 'frustration', source, subject, topic, value: 0.8 });
  }

  return signals;
}

export async function sendAdaptiveSignals(signals: AdaptiveSignalInput[]): Promise<void> {
  if (signals.length === 0) return;

  try {
    const response = await fetch('/api/adaptive/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals }),
    });
    if (!response.ok) {
      logger.debug('[AdaptiveDifficulty] Signal post failed', { status: response.status });
    }
  } catch (error) {
    logger.error('[AdaptiveDifficulty] Failed to send signals', { error: String(error) });
  }
}
