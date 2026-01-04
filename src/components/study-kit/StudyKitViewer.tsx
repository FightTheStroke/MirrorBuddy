'use client';

/**
 * StudyKitViewer Component
 * Display generated study materials (summary, mindmap, demo, quiz)
 * Wave 2: Study Kit Generator
 */

import { useState, useMemo } from 'react';
import { FileText, MapIcon, FlaskConical, ClipboardList, Download, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { StudyKit } from '@/types/study-kit';

/**
 * Simple markdown to HTML parser for basic formatting
 */
function parseMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (### → h3, ## → h2, # → h1)
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists (- item)
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    // Numbered lists (1. item)
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

// Import renderers from Knowledge Hub
import { MindmapRenderer } from '@/components/education/knowledge-hub/renderers/mindmap-renderer';

// Import interactive components
import { Quiz } from '@/components/education/quiz';
import { HTMLPreview } from '@/components/education/html-preview';
import type { Quiz as QuizType, Question, Subject, QuizResult } from '@/types/index';
import type { QuizData, DemoData } from '@/types/tools';
import { AnimatePresence, motion } from 'framer-motion';
import { PlayCircle, X } from 'lucide-react';

/**
 * Build HTML code for demo from DemoData with KaTeX support
 */
function buildDemoCode(demoData: DemoData): string | null {
  // If we have a direct code property, use it
  if ('code' in demoData && typeof demoData.code === 'string') {
    // KaTeX support for STEM formulas
    const katexHead = `
  <!-- KaTeX for STEM mathematical formulas -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css" crossorigin="anonymous">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/contrib/auto-render.min.js" crossorigin="anonymous"
    onload="renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]});"></script>
`;

    // Inject KaTeX into existing code
    if (demoData.code.includes('<head>')) {
      return demoData.code.replace('<head>', `<head>${katexHead}`);
    }
    if (demoData.code.includes('<html>')) {
      return demoData.code.replace('<html>', `<html><head>${katexHead}</head>`);
    }
    // Fallback: wrap with style tag at the beginning
    return `${katexHead}${demoData.code}`;
  }

  // If we have html/css/js parts, combine them
  if (demoData.html || demoData.css || demoData.js) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- KaTeX for STEM mathematical formulas -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css" crossorigin="anonymous">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/contrib/auto-render.min.js" crossorigin="anonymous"
    onload="renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]});"></script>
  <style>${demoData.css || ''}</style>
</head>
<body>
  ${demoData.html || ''}
  <script>${demoData.js || ''}</script>
</body>
</html>`;
  }

  return null;
}

/**
 * Transform Study Kit QuizData to interactive Quiz component format
 */
function transformQuizData(quizData: QuizData, studyKit: StudyKit): QuizType {
  // Map subject string to Subject type, default to generic
  const subjectMap: Record<string, Subject> = {
    'matematica': 'mathematics',
    'fisica': 'physics',
    'chimica': 'chemistry',
    'biologia': 'biology',
    'storia': 'history',
    'geografia': 'geography',
    'italiano': 'italian',
    'inglese': 'english',
    'arte': 'art',
    'musica': 'music',
    'educazione civica': 'civics',
    'economia': 'economics',
    'informatica': 'computerScience',
    'salute': 'health',
    'filosofia': 'philosophy',
  };

  const subject: Subject = (studyKit.subject && subjectMap[studyKit.subject.toLowerCase()]) || 'computerScience';

  const questions: Question[] = quizData.questions.map((q, index) => ({
    id: `q-${index}`,
    text: q.question,
    type: 'multiple_choice' as const,
    options: q.options,
    correctAnswer: q.correctIndex,
    hints: [],
    explanation: q.explanation || '',
    difficulty: 3,
    subject,
    topic: quizData.topic,
  }));

  return {
    id: `quiz-${studyKit.id}`,
    title: studyKit.title,
    subject,
    questions,
    masteryThreshold: 70,
    xpReward: questions.length * 10,
  };
}

interface StudyKitViewerProps {
  studyKit: StudyKit;
  onDelete?: () => void;
  className?: string;
}

export function StudyKitViewer({ studyKit, onDelete, className }: StudyKitViewerProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDownload = () => {
    // Create a downloadable markdown file with the summary
    const content = `# ${studyKit.title}\n\n${studyKit.subject ? `**Materia:** ${studyKit.subject}\n\n` : ''}${studyKit.summary || 'Nessun riassunto disponibile'}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${studyKit.title.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    // Open print dialog - users can save as PDF from here
    window.print();
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            aria-label="Scarica Markdown"
            title="Scarica come Markdown"
            className="no-print"
          >
            <Download className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">MD</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            aria-label="Stampa o salva come PDF"
            title="Stampa o salva come PDF"
            className="no-print"
          >
            <Printer className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">PDF</span>
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
