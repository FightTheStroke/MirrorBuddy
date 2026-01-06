'use client';

import { useState, useCallback } from 'react';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function WebcamPage() {
  const [purpose] = useState<'homework' | 'notes'>('homework');
  const [captured, setCaptured] = useState<string | null>(null);

  const handleCapture = useCallback((dataUrl: string) => {
    setCaptured(dataUrl);
  }, []);

  const handleClose = useCallback(() => {
    setCaptured(null);
  }, []);

  return (
    <ToolLayout
      title="Scatta Foto"
      subtitle="Fotografa la lavagna o i tuoi appunti per generare materiali"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <WebcamCapture
        purpose={purpose}
        onCapture={handleCapture}
        onClose={handleClose}
      />
    </ToolLayout>
  );
}
