'use client';

import { useCallback } from 'react';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function WebcamPage() {
  const purpose = 'homework' as const;

  const handleCapture = useCallback((_dataUrl: string) => {
    // Handle captured image
  }, []);

  const handleClose = useCallback(() => {
    // Handle close
  }, []);

  return (
    <ToolLayout
      title="Scatta Foto"
      subtitle="Fotografa la lavagna o i tuoi appunti per generare materiali"
      backRoute="/astuccio"
    >
      <WebcamCapture
        purpose={purpose}
        onCapture={handleCapture}
        onClose={handleClose}
      />
    </ToolLayout>
  );
}
