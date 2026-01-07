'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToolLayout } from '@/components/tools/tool-layout';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { useUIStore } from '@/lib/stores';
import type { Maestro } from '@/types';

function FormulaPageContent() {
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
    enterFocusMode({ toolType: 'formula', maestroId: maestro.id, interactionMode });
  }, [enterFocusMode]);

  return (
    <ToolLayout
      title="Formula"
      subtitle="Visualizza e comprendi formule matematiche e scientifiche"
      backRoute="/astuccio"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-rose-200 dark:border-rose-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-500/10">
                <Calculator className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-semibold text-rose-900 dark:text-rose-100 mb-1">
                  Come visualizzare una Formula?
                </h3>
                <p className="text-sm text-rose-800 dark:text-rose-200">
                  Parla con un Professore e chiedi di spiegarti una formula.
                  Ad esempio: &quot;Spiegami la formula dell&apos;area del cerchio&quot; o
                  &quot;Mostrami il teorema di Pitagora con esempi&quot;.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setShowMaestroDialog(true)}>
            <MessageSquare className="w-5 h-5 mr-2" />
            Esplora Formule con un Professore
          </Button>
        </div>
      </div>

      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="formula"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </ToolLayout>
  );
}

export default function FormulaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <FormulaPageContent />
    </Suspense>
  );
}
