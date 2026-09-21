'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { clientLogger } from '@/lib/logger/client';
import { getCameraAccessError } from '@/lib/native/camera-access-error';
import { addBreadcrumb } from '@/lib/sentry';

export function useCameraErrorMessage(component: string) {
  const t = useTranslations('tools.webcam.errors');
  return useCallback(
    (error: unknown): string => {
      const condition = getCameraAccessError(error);
      if (condition) {
        addBreadcrumb('camera', 'Camera access unavailable', {
          component,
          condition: condition.key,
        });
      } else {
        clientLogger.error('Camera operation failed', { component }, error);
      }
      return t(`${condition?.key ?? 'generic'}.message`);
    },
    [component, t],
  );
}
