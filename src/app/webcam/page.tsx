'use client';

import { useState, useCallback } from 'react';
import { Suspense } from 'react';
import { WebcamCapture } from '@/components/tools/webcam-capture';

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
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <WebcamCapture
          purpose={purpose}
          onCapture={handleCapture}
          onClose={handleClose}
        />
      </Suspense>
    </main>
  );
}
