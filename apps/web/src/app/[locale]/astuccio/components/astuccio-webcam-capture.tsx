'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { nanoid } from 'nanoid';
import { toast } from '@/components/ui/toast';
import { clientLogger as logger } from '@/lib/logger/client';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import { forceSaveMaterial } from '@/lib/hooks/use-saved-materials';

export function AstuccioWebcamCapture({ onClose }: { onClose: () => void }) {
  const t = useTranslations('tools');
  const handleCapture = useCallback(
    async (imageBase64: string) => {
      try {
        const toolId = nanoid();
        const timestamp = new Date().toISOString();
        const title = t('webcamStandalone.savedTitle', {
          date: new Date().toLocaleDateString(),
        });
        const content = {
          imageBase64,
          extractedText: '',
          imageDescription: '',
          analysisTimestamp: timestamp,
        };
        const success = await forceSaveMaterial('webcam', title, content, { toolId });
        if (success) {
          toast.success(t('webcamStandalone.saveSuccess'));
          onClose();
        } else {
          toast.error(t('webcamStandalone.saveError'));
        }
        return success;
      } catch (error) {
        logger.error('Error saving webcam capture', undefined, error);
        toast.error(t('webcamStandalone.saveError'));
        return false;
      }
    },
    [t, onClose],
  );

  return (
    <WebcamCapture
      purpose={t('webcamStandalone.purpose')}
      instructions={t('webcamStandalone.instructions')}
      onCapture={handleCapture}
      onClose={onClose}
      showTimer={true}
    />
  );
}
