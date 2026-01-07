'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToolLayout } from '@/components/tools/tool-layout';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { useUIStore } from '@/lib/stores';
import type { Maestro } from '@/types';

function ChartPageContent() {
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
    enterFocusMode({ toolType: 'chart', maestroId: maestro.id, interactionMode });
  }, [enterFocusMode]);

  return (
    <ToolLayout
      title="Grafico"
      subtitle="Crea grafici e visualizzazioni per dati e statistiche"
      backRoute="/astuccio"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                  Come creare un Grafico?
                </h3>
                <p className="text-sm text-emerald-800 dark:text-emerald-200">
                  Parla con un Professore e chiedi di visualizzare dei dati.
                  Ad esempio: &quot;Crea un grafico delle temperature mensili&quot; o
                  &quot;Mostrami la distribuzione delle popolazioni&quot;.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setShowMaestroDialog(true)}>
            <MessageSquare className="w-5 h-5 mr-2" />
            Crea Grafico con un Professore
          </Button>
        </div>
      </div>

      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="chart"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </ToolLayout>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <ChartPageContent />
    </Suspense>
  );
}
