import { clientLogger } from '@/lib/logger/client';

export async function cancelMindmapReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  intentionalAbort: boolean,
  message: 'Mindmap reader cancellation failed' | 'Mindmap reader cleanup failed',
): Promise<void> {
  try {
    await reader.cancel();
  } catch (error) {
    if (
      intentionalAbort &&
      error !== null &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'AbortError'
    )
      return;
    clientLogger.warn(message, { error: String(error) });
  }
}
