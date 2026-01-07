'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToolLayout } from '@/components/tools/tool-layout';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { useUIStore } from '@/lib/stores';
import type { Maestro } from '@/types';

function DiagramPageContent() {
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
    enterFocusMode({ toolType: 'diagram', maestroId: maestro.id, interactionMode });
  }, [enterFocusMode]);

  return (
    <ToolLayout
      title="Diagramma"
      subtitle="Crea diagrammi di flusso e schemi visivi"
      backRoute="/astuccio"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10">
                <GitBranch className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                  Come creare un Diagramma?
                </h3>
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  Parla con un Professore e chiedi di creare un diagramma.
                  Ad esempio: &quot;Crea un diagramma del ciclo dell&apos;acqua&quot; o
                  &quot;Fammi vedere il flusso della fotosintesi&quot;.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setShowMaestroDialog(true)}>
            <MessageSquare className="w-5 h-5 mr-2" />
            Crea Diagramma con un Professore
          </Button>
        </div>
      </div>

      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="diagram"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </ToolLayout>
  );
}

export default function DiagramPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <DiagramPageContent />
    </Suspense>
  );
}
