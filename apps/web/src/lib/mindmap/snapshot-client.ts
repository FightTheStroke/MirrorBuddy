'use client';

import { z } from 'zod';
import { clientLogger } from '@/lib/logger/client';
import { identitySchema, snapshotSchema, type MindmapSnapshot } from './protocol';
import { createSseParser } from './sse-parser';

export const MINDMAP_RETRY_DELAYS = [1000, 2000, 4000, 8000, 8000] as const;
export const MINDMAP_RECOVERY_MS = 30_000;
export const MINDMAP_REQUEST_TIMEOUT_MS = 5000;
export interface MindmapRecoveryState {
  status: 'connecting' | 'connected' | 'recovering' | 'exhausted' | 'denied' | 'disconnected';
  canMutate: boolean;
  attempts: number;
  error?: string;
  httpStatus?: number;
}
interface Callbacks {
  onSnapshot: (snapshot: MindmapSnapshot) => void;
  onState: (state: MindmapRecoveryState) => void;
}
class StreamFailure extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
const errorSchema = z.object({ status: z.number().int().min(400).max(599), error: z.string() });

export function subscribeMindmap(
  input: { sessionId: string; toolId: string },
  callbacks: Callbacks,
) {
  const identity = identitySchema.parse(input);
  let stopped = false;
  let terminal = false;
  let generation = 0;
  let revision = -1;
  let attempts = 0;
  let recovering = true;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let serial = Promise.resolve();
  const state = (status: MindmapRecoveryState['status'], error?: string, httpStatus?: number) =>
    callbacks.onState({ status, canMutate: status === 'connected', attempts, error, httpStatus });
  const clearTimers = () => {
    clearTimeout(deadline);
    clearTimeout(retryTimer);
    clearTimeout(watchdog);
    deadline = retryTimer = watchdog = undefined;
  };
  const cancelRead = () => {
    controller?.abort();
    if (reader)
      void reader.cancel().catch((error: unknown) => {
        clientLogger.warn('Mindmap reader cancellation failed', { error: String(error) });
      });
  };
  const end = (status: 'exhausted' | 'denied', error: string, httpStatus?: number) => {
    terminal = true;
    generation++;
    clearTimers();
    cancelRead();
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
    state(status, error, httpStatus);
  };
  const startDeadline = () => {
    if (deadline) return;
    deadline = setTimeout(
      () => end('exhausted', 'Mindmap recovery exceeded 30 seconds'),
      MINDMAP_RECOVERY_MS,
    );
  };
  const queueConnection = () => {
    const token = generation;
    serial = serial
      .then(async () => {
        if (!stopped && !terminal && token === generation) await connect(token);
      })
      .catch((error: unknown) => {
        clientLogger.error('Mindmap subscription failed', { error: String(error) });
        if (!stopped && !terminal) end('exhausted', 'Mindmap subscription failed');
      });
  };
  const failed = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Mindmap stream failed';
    const status = error instanceof StreamFailure ? error.status : undefined;
    if (status === 401 || status === 403) return end('denied', message, status);
    if (!recovering) {
      recovering = true;
      attempts = 0;
    }
    startDeadline();
    if (attempts === MINDMAP_RETRY_DELAYS.length) return end('exhausted', message, status);
    const delay = MINDMAP_RETRY_DELAYS[attempts++];
    state('recovering', message, status);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      queueConnection();
    }, delay);
  };
  async function connect(token: number) {
    const current = () => !stopped && !terminal && token === generation;
    const abortController = new AbortController();
    controller = abortController;
    let currentReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let failure: unknown = new StreamFailure('Mindmap stream ended');
    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        failure = new StreamFailure('Mindmap stream timed out');
        cancelRead();
      }, MINDMAP_REQUEST_TIMEOUT_MS);
    };
    try {
      armWatchdog();
      const response = await fetch(`/api/tools/stream?${new URLSearchParams(identity)}`, {
        signal: abortController.signal,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'text/event-stream' },
      });
      if (!current()) {
        await response.body?.cancel();
        return;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new StreamFailure(`Mindmap stream HTTP ${response.status}`, response.status);
      }
      if (
        !response.headers.get('content-type')?.startsWith('text/event-stream') ||
        !response.body
      ) {
        await response.body?.cancel();
        throw new StreamFailure('Invalid mindmap stream response');
      }
      currentReader = response.body.getReader();
      reader = currentReader;
      const parser = createSseParser((frame) => {
        if (!current()) return;
        if (frame.event === 'mindmap:error') {
          const error = errorSchema.parse(JSON.parse(frame.data));
          throw new StreamFailure(error.error, error.status);
        }
        if (frame.event !== 'mindmap:snapshot') return;
        const snapshot = snapshotSchema.parse(JSON.parse(frame.data));
        if (
          snapshot.sessionId !== identity.sessionId ||
          snapshot.toolId !== identity.toolId ||
          snapshot.revision < revision
        )
          return;
        if (snapshot.revision > revision) {
          callbacks.onSnapshot(snapshot);
          revision = snapshot.revision;
        }
        if (!current()) return;
        recovering = false;
        attempts = 0;
        clearTimeout(deadline);
        deadline = undefined;
        state('connected');
      });
      while (current() && !abortController.signal.aborted) {
        const chunk = await currentReader.read();
        if (!current() || abortController.signal.aborted) break;
        if (chunk.done) {
          parser.finish();
          break;
        }
        armWatchdog();
        parser.push(chunk.value);
      }
    } catch (error) {
      if (!abortController.signal.aborted) failure = error;
    } finally {
      clearTimeout(watchdog);
      watchdog = undefined;
      abortController.abort();
      if (currentReader) {
        try {
          await currentReader.cancel();
        } catch (error) {
          clientLogger.warn('Mindmap reader cleanup failed', { error: String(error) });
        } finally {
          currentReader.releaseLock();
        }
      }
      if (controller === abortController) {
        controller = undefined;
        reader = undefined;
      }
    }
    if (current()) failed(failure);
  }
  const online = () => {
    if (stopped || terminal || !retryTimer) return;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    queueConnection();
  };
  const offline = () => {
    if (stopped || terminal || recovering) return;
    recovering = true;
    attempts = 0;
    state('recovering', 'Browser offline');
    startDeadline();
    cancelRead();
  };
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  state('connecting');
  startDeadline();
  queueConnection();
  return {
    retry() {
      if (stopped) return;
      generation++;
      clearTimers();
      cancelRead();
      terminal = false;
      window.addEventListener('online', online);
      window.addEventListener('offline', offline);
      recovering = true;
      attempts = 0;
      state('connecting');
      startDeadline();
      queueConnection();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      generation++;
      clearTimers();
      cancelRead();
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    },
  };
}
