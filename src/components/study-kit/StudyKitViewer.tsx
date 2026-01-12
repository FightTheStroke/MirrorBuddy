'use client';

/**
 * StudyKitViewer Component
 * Display generated study materials (summary, mindmap, demo, quiz)
 * Wave 2: Study Kit Generator
 */

import { useState, useMemo } from 'react';
import { FileText, MapIcon, FlaskConical, ClipboardList, Download, Trash2, Printer, Route, Loader2 } from 'lucide-react';
// ExportPDFModal removed - PDF download is now direct
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import toast from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { StudyKit } from '@/types/study-kit';

import { parseMarkdown, buildDemoCode, transformQuizData } from './StudyKitViewer/utils';

// Import renderers from Knowledge Hub
import { MindmapRenderer } from '@/components/education/knowledge-hub/renderers/mindmap-renderer';

// Import interactive components
import { Quiz } from '@/components/education/quiz';
import { HTMLPreview } from '@/components/education/html-preview';
import type { QuizResult } from '@/types/index';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayCircle, X } from 'lucide-react';


interface StudyKitViewerProps {
  studyKit: StudyKit;
  onDelete?: () => void;
  onGeneratePath?: (pathId: string) => void;
  className?: string;
}

export function StudyKitViewer({ studyKit, onDelete, onGeneratePath, className }: StudyKitViewerProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [generatedPathId, setGeneratedPathId] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  // Parse markdown summary once
  const parsedSummary = useMemo(
    () => parseMarkdown(studyKit.summary || ''),
    [studyKit.summary]
  );

  // Build demo code with KaTeX support
  const demoCode = useMemo(() => {
    if (!studyKit.demo) return null;
    return buildDemoCode(studyKit.demo);
  }, [studyKit.demo]);

  // Transform quiz data to interactive Quiz format
  const transformedQuiz = useMemo(() => {
    if (!studyKit.quiz) return null;
    return transformQuizData(studyKit.quiz, studyKit);
  }, [studyKit]);

  // Handle quiz completion
  const handleQuizComplete = (result: QuizResult) => {
    console.log('Quiz completed:', result);
    // Could save results to backend here if needed
  };

  // Handle quiz close (user closes before completing)
  const handleQuizClose = () => {
    console.log('Quiz closed');
    // Return to summary tab or just stay on quiz tab
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo Study Kit?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/study-kit/${studyKit.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      onDelete?.();
    } catch (error) {
      console.error('Failed to delete study kit', error);
      alert('Errore durante l\'eliminazione');
    } finally {
      setIsDeleting(false);
    }
  };

  // Download PDF directly with default profile
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/pdf-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kitId: studyKit.id,
          profile: 'dyslexia', // Default profile for accessibility
          format: 'A4',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(error.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${studyKit.title.replace(/\s+/g, '-')}_DSA.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF scaricato');
    } catch (error) {
      console.error('PDF download failed:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il download');
    }
  };

  // Print PDF directly
  const handlePrint = async () => {
    try {
      const response = await fetch('/api/pdf-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kitId: studyKit.id,
          profile: 'dyslexia',
          format: 'A4',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Print failed' }));
        throw new Error(error.error || 'Print failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Open PDF in new window and print
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Print failed:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante la stampa');
    }
  };

  const handleGeneratePath = async () => {
    setIsGeneratingPath(true);
    try {
      const response = await fetch('/api/learning-path/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyKitId: studyKit.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate learning path');
      }

      const data = await response.json();
      const pathId = data.path?.id;

      if (pathId) {
        setGeneratedPathId(pathId);
        onGeneratePath?.(pathId);
      }
    } catch (error) {
      console.error('Failed to generate learning path', error);
      toast.error('Errore durante la generazione del percorso');
    } finally {
      setIsGeneratingPath(false);
    }
  };

  // Count available materials
  const materialCount = [
    studyKit.summary,
    studyKit.mindmap,
    studyKit.demo,
    studyKit.quiz,
  ].filter(Boolean).length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {studyKit.title}
          </h2>
          {studyKit.subject && (
            <p className="no-print text-sm text-slate-600 dark:text-slate-400 mt-1">
              {studyKit.subject}
            </p>
          )}
          <div className="no-print flex items-center gap-4 mt-2 text-xs text-slate-500">
            {studyKit.pageCount && <span>{studyKit.pageCount} pagine</span>}
            {studyKit.wordCount && <span>{studyKit.wordCount.toLocaleString()} parole</span>}
            <span>{materialCount} materiali generati</span>
          </div>
        </div>

        <div className="no-print flex items-center gap-2">
          {/* Generate Learning Path button */}
          {generatedPathId ? (
            <Button
              size="sm"
              onClick={() => onGeneratePath?.(generatedPathId)}
              className="gap-2 bg-green-600 hover:bg-green-700"
              title="Vai al percorso di apprendimento"
            >
              <Route className="w-4 h-4" />
              <span className="hidden sm:inline">Vai al Percorso</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleGeneratePath}
              disabled={isGeneratingPath || !studyKit.summary}
              className="gap-2"
              title="Genera un percorso di apprendimento progressivo"
            >
              {isGeneratingPath ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Route className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isGeneratingPath ? 'Generando...' : 'Genera Percorso'}
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            aria-label="Scarica PDF accessibile"
            title="Scarica PDF accessibile per DSA"
            className="no-print gap-1"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            aria-label="Stampa PDF"
            title="Stampa PDF accessibile"
            className="no-print"
          >
            <Printer className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Stampa</span>
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Elimina Study Kit"
              className="no-print"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="no-print grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Riassunto</span>
          </TabsTrigger>
          <TabsTrigger value="mindmap" className="gap-2" disabled={!studyKit.mindmap}>
            <MapIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Mappa</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="gap-2" disabled={!studyKit.demo}>
            <FlaskConical className="w-4 h-4" />
            <span className="hidden sm:inline">Demo</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2" disabled={!studyKit.quiz}>
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Quiz</span>
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4 mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            {studyKit.summary ? (
              <div
                className="prose prose-slate dark:prose-invert max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${parsedSummary}</p>` }}
              />
            ) : (
              <p className="text-slate-500 text-center py-8">
                Riassunto non disponibile
              </p>
            )}
          </div>
        </TabsContent>

        {/* Mindmap Tab */}
        <TabsContent value="mindmap" className="mt-6">
          {studyKit.mindmap ? (
            <MindmapRenderer data={studyKit.mindmap as unknown as Record<string, unknown>} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-slate-500 text-center py-8">
                Mappa mentale non disponibile
              </p>
            </div>
          )}
        </TabsContent>

        {/* Demo Tab */}
        <TabsContent value="demo" className="mt-6">
          {demoCode ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-accent-themed/10 to-purple-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-accent-themed/20">
                    <PlayCircle className="w-8 h-8 text-accent-themed" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Demo Interattiva
                    </h3>
                    <span className="text-sm text-slate-500">
                      {studyKit.demo && 'title' in studyKit.demo && typeof studyKit.demo.title === 'string'
                        ? studyKit.demo.title
                        : 'Simulazione interattiva'}
                    </span>
                  </div>
                </div>
                {studyKit.demo && 'description' in studyKit.demo && studyKit.demo.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {studyKit.demo.description}
                  </p>
                )}
                <Button
                  onClick={() => setShowDemo(true)}
                  className="w-full gap-2"
                  size="lg"
                >
                  <PlayCircle className="w-5 h-5" />
                  Avvia Demo Interattiva
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-slate-500 text-center py-8">
                Demo interattiva non disponibile
              </p>
            </div>
          )}
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz" className="mt-6">
          {transformedQuiz ? (
            <Quiz
              quiz={transformedQuiz}
              onComplete={handleQuizComplete}
              onClose={handleQuizClose}
            />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-slate-500 text-center py-8">
                Quiz non disponibile
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Demo Modal */}
      <AnimatePresence>
        {showDemo && demoCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowDemo(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Chiudi demo"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Demo content */}
              <HTMLPreview
                code={demoCode}
                title={studyKit.demo && 'title' in studyKit.demo && typeof studyKit.demo.title === 'string'
                  ? studyKit.demo.title
                  : 'Demo Interattiva'}
                description={studyKit.demo && 'description' in studyKit.demo && typeof studyKit.demo.description === 'string'
                  ? studyKit.demo.description
                  : undefined}
                onClose={() => setShowDemo(false)}
                allowSave={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
