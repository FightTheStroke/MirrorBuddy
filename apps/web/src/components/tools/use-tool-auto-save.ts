'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { getClientIdentity } from '@/lib/auth/client-auth';
import { clientLogger as logger } from '@/lib/logger/client';
import toast from '@/components/ui/toast';
import {
  autoSaveMaterial,
  forceSaveMaterial,
  flushPendingMaterialSaves,
} from '@/lib/hooks/use-saved-materials/utils/auto-save';
import { useMaterialOwner } from '@/lib/hooks/use-saved-materials/utils/use-material-owner';

type SaveInput = Parameters<typeof autoSaveMaterial>;
type FeedbackOptions = {
  immediate?: boolean;
  onSaved?: () => void;
  isCurrent?: () => boolean;
};

export function useMaterialSaveFeedback() {
  const t = useTranslations('errors');
  const errorToast = useRef<string | undefined>(undefined);

  return useCallback(
    (input: SaveInput, options: FeedbackOptions = {}): Promise<boolean> => {
      const owner = getClientIdentity();
      if (owner.status !== 'authenticated') {
        logger.warn('Material save requires a ready identity');
        toast.error(t('saveFailed'));
        return Promise.resolve(false);
      }
      if (errorToast.current) toast.dismiss(errorToast.current);
      const isCurrent = () => {
        const identity = getClientIdentity();
        return (
          identity.status === 'authenticated' &&
          identity.userId === owner.userId &&
          (options.isCurrent?.() ?? true)
        );
      };
      const attempt = async (immediate: boolean): Promise<boolean> => {
        if (!isCurrent()) return false;
        let success = false;
        try {
          success = await (immediate ? forceSaveMaterial : autoSaveMaterial)(...input);
        } catch (error) {
          logger.error('Material save failed', { toolType: input[0] }, error);
        }
        if (!isCurrent()) return false;
        if (success) {
          if (errorToast.current) toast.dismiss(errorToast.current);
          options.onSaved?.();
        } else {
          errorToast.current = toast.error(t('saveFailed'), undefined, {
            duration: 0,
            action: {
              label: t('retry'),
              onClick: () => {
                void attempt(true);
              },
            },
          });
        }
        return success;
      };
      return attempt(options.immediate ?? false);
    },
    [t],
  );
}

export function useToolAutoSave(...input: SaveInput): void {
  const [toolType, title, content, options] = input;
  const { userId } = useMaterialOwner();
  const save = useMaterialSaveFeedback();
  const owner = useRef<string | null>(null);
  const attempted = useRef<string | null>(null);
  const mounted = useRef(false);
  const subject = options?.subject;
  const toolId = options?.toolId;

  useEffect(() => {
    if (!userId || (owner.current !== null && owner.current !== userId)) return;
    owner.current = userId;
    const fingerprint = JSON.stringify([toolType, title, content, subject, toolId]);
    if (attempted.current === fingerprint) return;
    attempted.current = fingerprint;
    void save([toolType, title, content, { subject, toolId }], {
      isCurrent: () => attempted.current === fingerprint,
    });
  }, [userId, toolType, title, content, subject, toolId, save]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // StrictMode replays effects; flush only if the component remains unmounted.
      queueMicrotask(() => {
        if (!mounted.current) flushPendingMaterialSaves();
      });
    };
  }, []);
}
