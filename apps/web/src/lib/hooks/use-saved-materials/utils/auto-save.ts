/**
 * @file auto-save.ts
 * @brief Auto-save utility for tool results with debouncing
 */

import { logger } from '@/lib/logger';
import type { ToolType } from '@/types/tools';
import { getUserId } from './user-id';
import { saveMaterialToAPIWithId, generateContentHash } from './api';

const AUTO_SAVE_DEBOUNCE_MS = 1000;

type SaveOptions = { subject?: string; toolId?: string };

interface SaveRequest {
  userId: string;
  toolId: string;
  toolType: ToolType;
  title: string;
  content: Record<string, unknown>;
  options?: SaveOptions;
}

interface PendingSave {
  request: SaveRequest;
  fingerprint: string;
  promise: Promise<boolean>;
  resolve: (success: boolean) => void;
  timer?: ReturnType<typeof setTimeout>;
  ready: boolean;
}

const queuedSaves = new Map<string, PendingSave>();
const runningSaves = new Map<string, PendingSave>();

export function flushPendingMaterialSaves(): void {
  for (const [key, job] of queuedSaves) {
    clearTimeout(job.timer);
    job.ready = true;
    void runPendingSave(key);
  }
}

function protectPendingWork(event: BeforeUnloadEvent): void {
  if (!queuedSaves.size && !runningSaves.size) return;
  event.preventDefault();
  event.returnValue = '';
  flushPendingMaterialSaves();
}

async function runPendingSave(key: string): Promise<void> {
  const job = queuedSaves.get(key);
  if (!job?.ready || runningSaves.has(key)) return;

  queuedSaves.delete(key);
  runningSaves.set(key, job);
  const { userId, toolId, toolType, title, content, options } = job.request;
  let success = false;
  try {
    const result = await saveMaterialToAPIWithId(userId, toolId, toolType, title, content, options);
    success = result !== null;
  } catch (error) {
    logger.error('Auto-save material failed', { toolType }, error);
  } finally {
    runningSaves.delete(key);
    job.resolve(success);
    void runPendingSave(key);
    if (!queuedSaves.size && !runningSaves.size) {
      window.removeEventListener('beforeunload', protectPendingWork);
    }
  }
}

function scheduleSave(
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options: SaveOptions | undefined,
  immediate: boolean,
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  try {
    const userId = getUserId();
    const toolId = options?.toolId || generateContentHash(toolType, title, content);
    const key = JSON.stringify([userId, toolType, toolId]);
    const request: SaveRequest = {
      userId,
      toolId,
      toolType,
      title,
      content,
      options,
    };
    const fingerprint = JSON.stringify({
      title,
      content,
      subject: options?.subject,
    });
    const running = runningSaves.get(key);
    let queued = queuedSaves.get(key);

    if (!queued && running?.fingerprint === fingerprint) return running.promise;
    if (queued?.fingerprint === fingerprint && !immediate) return queued.promise;

    if (queued) {
      clearTimeout(queued.timer);
      queued.request = request;
      queued.fingerprint = fingerprint;
      queued.ready ||= immediate;
    } else {
      let complete: (success: boolean) => void;
      const promise = new Promise<boolean>((resolve) => {
        complete = resolve;
      });
      queued = {
        request,
        fingerprint,
        promise,
        resolve: (success) => complete(success),
        ready: immediate,
      };
      queuedSaves.set(key, queued);
    }

    window.addEventListener('beforeunload', protectPendingWork);
    if (queued.ready) {
      void runPendingSave(key);
    } else {
      const job = queued;
      job.timer = setTimeout(() => {
        job.ready = true;
        job.timer = undefined;
        void runPendingSave(key);
      }, AUTO_SAVE_DEBOUNCE_MS);
    }
    return queued.promise;
  } catch (error) {
    logger.error('Auto-save scheduling failed', { toolType }, error);
    return Promise.resolve(false);
  }
}

/**
 * Coalesce queued changes while settling every caller with the actual save result.
 * An edit arriving during a request is saved only after that request completes.
 */
export function autoSaveMaterial(
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options?: SaveOptions,
): Promise<boolean> {
  return scheduleSave(toolType, title, content, options, false);
}

/** Flush queued changes immediately, but never race an already-running save. */
export function forceSaveMaterial(
  toolType: ToolType,
  title: string,
  content: Record<string, unknown>,
  options?: SaveOptions,
): Promise<boolean> {
  return scheduleSave(toolType, title, content, options, true);
}
