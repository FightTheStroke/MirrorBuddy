import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { csrfFetch } from '@/lib/auth';
import { clientLogger as logger } from '@/lib/logger/client';

export interface CameraUsageRefs {
  sessionIdRef: MutableRefObject<string | null>;
  videoUsageIdRef: MutableRefObject<string | null>;
  videoMaxSecondsRef: MutableRefObject<number>;
}

export function useCameraUsage(refs: CameraUsageRefs) {
  const [limitReached, setLimitReached] = useState(false);
  const pendingEnds = useRef(new Map<string, Promise<void>>());
  const finalizationSeconds = useRef(new Map<string, number>());

  const endUsageSession = useCallback(
    (seconds: number): Promise<void> => {
      const usageId = refs.videoUsageIdRef.current;
      if (!usageId) return Promise.resolve();
      const pending = pendingEnds.current.get(usageId);
      if (pending) return pending;
      const secondsUsed = finalizationSeconds.current.get(usageId) ?? seconds;
      finalizationSeconds.current.set(usageId, secondsUsed);
      const ending = Promise.resolve().then(async () => {
        try {
          const response = await csrfFetch('/api/video-vision/usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'end', usageId, secondsUsed }),
          });
          if (!response.ok) throw new Error(`Video usage end failed: HTTP ${response.status}`);
          finalizationSeconds.current.delete(usageId);
          if (refs.videoUsageIdRef.current === usageId) {
            refs.videoUsageIdRef.current = null;
          }
        } catch (error) {
          logger.error('[UnifiedCamera] Failed to end session', { error: String(error) });
        } finally {
          pendingEnds.current.delete(usageId);
        }
      });
      pendingEnds.current.set(usageId, ending);
      return ending;
    },
    [refs],
  );

  const startVideoUsage = useCallback(async (): Promise<boolean> => {
    try {
      const retainedId = refs.videoUsageIdRef.current;
      const retainedSeconds = retainedId ? finalizationSeconds.current.get(retainedId) : undefined;
      if (retainedId && retainedSeconds !== undefined) {
        await endUsageSession(retainedSeconds);
        if (refs.videoUsageIdRef.current === retainedId) return false;
      }
      const response = await csrfFetch('/api/video-vision/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          voiceSessionId: refs.sessionIdRef.current || 'unknown',
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        if (error?.error === 'monthly_limit_reached' || error?.error === 'video_vision_disabled') {
          setLimitReached(true);
          return false;
        }
        throw new Error(`Video usage start failed: HTTP ${response.status}`);
      }
      const data = await response.json();
      if (
        typeof data?.id !== 'string' ||
        !data.id ||
        typeof data.maxSeconds !== 'number' ||
        !Number.isFinite(data.maxSeconds) ||
        data.maxSeconds <= 0
      ) {
        throw new Error('Invalid video usage reservation');
      }
      refs.videoUsageIdRef.current = data.id;
      refs.videoMaxSecondsRef.current = data.maxSeconds;
      return true;
    } catch (error) {
      logger.error('[UnifiedCamera] Failed to start usage', { error: String(error) });
      return false;
    }
  }, [refs, endUsageSession]);

  return { startVideoUsage, endUsageSession, limitReached };
}
