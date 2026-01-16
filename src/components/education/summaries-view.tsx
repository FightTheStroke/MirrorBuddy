'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ToolMaestroSelectionDialog } from './tool-maestro-selection-dialog';
import { cn } from '@/lib/utils';
import { useSavedTools, autoSaveMaterial } from '@/lib/hooks/use-saved-materials';
import {
  exportSummaryToPdf,
  convertSummaryToMindmap,
  generateFlashcardsFromSummary,
} from '@/lib/tools/summary-export';
import { toast } from '@/components/ui/toast';
import type { SummaryData } from '@/types/tools';
import type { Maestro } from '@/types';
import { SummaryCard } from './summaries-view/summary-card';
import { SummaryModal } from './summaries-view/summary-modal';

interface SummariesViewProps {
  className?: string;
  initialMaestroId?: string | null;
  initialMode?: 'voice' | 'chat' | null;
}

interface SelectedSummary {
  id: string;
  title: string;
  data: SummaryData;
  createdAt: Date;
}

export function SummariesView({ className, initialMaestroId, initialMode }: SummariesViewProps) {
  const { tools, loading, deleteTool } = useSavedTools('summary');
  const initialProcessed = useRef(false);
  const [selectedSummary, setSelectedSummary] = useState<SelectedSummary | null>(null);
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);

  // Auto-open maestro dialog when coming from Astuccio with parameters
  useEffect(() => {
    if (initialMaestroId && initialMode && !initialProcessed.current) {
      initialProcessed.current = true;
      const timer = setTimeout(() => {
        setShowMaestroDialog(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialMaestroId, initialMode]);

  const handleMaestroConfirm = useCallback((_maestro: Maestro, _mode: 'voice' | 'chat') => {
    setShowMaestroDialog(false);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteTool(id);
    if (selectedSummary?.id === id) {
      setSelectedSummary(null);
    }
  }, [deleteTool, selectedSummary]);

  const handleExportPdf = useCallback((data: SummaryData) => {
    exportSummaryToPdf(data);
  }, []);

  const handleConvertToMindmap = useCallback(async (data: SummaryData) => {
    const result = convertSummaryToMindmap(data);
    const saved = await autoSaveMaterial('mindmap', result.topic, { nodes: result.nodes });
    if (saved) {
      toast.success('Mappa mentale salvata!', `Creati ${result.nodes.length} nodi da "${result.topic}".`);
    } else {
      toast.error('Errore', 'Impossibile salvare la mappa mentale.');
    }
  }, []);

  const handleGenerateFlashcards = useCallback(async (data: SummaryData) => {
    const result = generateFlashcardsFromSummary(data);
    const saved = await autoSaveMaterial('flashcard', result.topic, { cards: result.cards });
    if (saved) {
      toast.success('Flashcard salvate!', `Create ${result.cards.length} flashcard da "${result.topic}".`);
    } else {
      toast.error('Errore', 'Impossibile salvare le flashcard.');
    }
  }, []);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Riassunti
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            I tuoi riassunti creati durante le sessioni con Coach e Maestri
          </p>
        </div>
        <Button onClick={() => setShowMaestroDialog(true)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Crea con un Professore
        </Button>
      </div>

      {/* Info card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                Come creare un riassunto?
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                Parla con un Coach o un Maestro e chiedi: &quot;Devo fare un riassunto su...&quot;
                Ti guideranno passo passo nella creazione di un riassunto strutturato.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summaries grid */}
      {loading ? (
        <Card className="p-12">
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto text-slate-400 mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Caricamento...
            </h3>
          </div>
        </Card>
      ) : tools.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Nessun riassunto salvato
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              I riassunti creati durante le sessioni con Coach e Maestri appariranno qui.
              Prova a chiedere: &quot;Devo fare un riassunto sulla fotosintesi&quot;
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => {
            const summaryData = tool.content as unknown as SummaryData;
            return (
              <SummaryCard
                key={tool.toolId}
                tool={tool}
                onClick={() => setSelectedSummary({
                  id: tool.toolId,
                  title: tool.title || summaryData.topic || 'Riassunto',
                  data: summaryData,
                  createdAt: new Date(tool.createdAt),
                })}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Summary modal */}
      <AnimatePresence>
        {selectedSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedSummary(null)}
          >
            <SummaryModal
              title={selectedSummary.title}
              data={selectedSummary.data}
              onClose={() => setSelectedSummary(null)}
              onExportPdf={handleExportPdf}
              onConvertToMindmap={handleConvertToMindmap}
              onGenerateFlashcards={handleGenerateFlashcards}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maestro selection dialog */}
      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="summary"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </div>
  );
}
