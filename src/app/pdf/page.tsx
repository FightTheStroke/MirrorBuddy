'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToolLayout } from '@/components/tools/tool-layout';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { useUIStore } from '@/lib/stores';
import type { Maestro } from '@/types';

function PdfPageContent() {
  const searchParams = useSearchParams();
  const maestroId = searchParams.get('maestroId');
  const mode = searchParams.get('mode') as 'voice' | 'chat' | null;
  const { enterFocusMode } = useUIStore();
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);
  const initialProcessed = useRef(false);

  // Auto-open maestro dialog when coming from Astuccio with parameters
  useEffect(() => {
    if (maestroId && mode && !initialProcessed.current) {
      initialProcessed.current = true;
      const timer = setTimeout(() => {
        setShowMaestroDialog(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [maestroId, mode]);

  const handleMaestroConfirm = useCallback((maestro: Maestro, interactionMode: 'voice' | 'chat') => {
    setShowMaestroDialog(false);
    enterFocusMode({ toolType: 'pdf', maestroId: maestro.id, interactionMode });
  }, [enterFocusMode]);

  return (
    <ToolLayout
      title="Carica PDF"
      subtitle="Carica un documento PDF e genera automaticamente materiali di studio"
      backRoute="/astuccio"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-teal-500/10">
                <FileText className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="font-semibold text-teal-900 dark:text-teal-100 mb-1">
                  Come funziona?
                </h3>
                <p className="text-sm text-teal-800 dark:text-teal-200">
                  Carica un PDF dei tuoi appunti o del libro di testo, poi scegli un
                  Professore che ti aiuterà a creare riassunti, mappe mentali, quiz
                  e flashcard dal contenuto del documento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setShowMaestroDialog(true)}>
            <Upload className="w-5 h-5 mr-2" />
            Carica PDF e scegli Professore
          </Button>
        </div>
      </div>

      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="pdf"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </ToolLayout>
  );
}

export default function PdfPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <PdfPageContent />
    </Suspense>
  );
}
