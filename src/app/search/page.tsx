'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToolLayout } from '@/components/tools/tool-layout';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { useUIStore } from '@/lib/stores';
import type { Maestro } from '@/types';

function SearchPageContent() {
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
    enterFocusMode({ toolType: 'search', maestroId: maestro.id, interactionMode });
  }, [enterFocusMode]);

  return (
    <ToolLayout
      title="Ricerca Web"
      subtitle="Cerca informazioni, video e risorse educative sul web"
      backRoute="/astuccio"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border-sky-200 dark:border-sky-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-sky-500/10">
                <Search className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sky-900 dark:text-sky-100 mb-1">
                  Come fare una Ricerca?
                </h3>
                <p className="text-sm text-sky-800 dark:text-sky-200">
                  Parla con un Professore e chiedi di cercare informazioni.
                  Ad esempio: &quot;Cerca informazioni sulla Rivoluzione Francese&quot; o
                  &quot;Trova video su come funziona il DNA&quot;.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setShowMaestroDialog(true)}>
            <MessageSquare className="w-5 h-5 mr-2" />
            Cerca con un Professore
          </Button>
        </div>
      </div>

      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="search"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </ToolLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
