'use client';

/**
 * StudyKitViewer Component
 * Display generated study materials (summary, mindmap, demo, quiz)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText, MapIcon, FlaskConical, ClipboardList, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { StudyKit } from '@/types/study-kit';
import type { QuizResult } from '@/types/index';

import { parseMarkdown, buildDemoCode, transformQuizData } from './StudyKitViewer/utils';
import { handleDelete, handleDownloadPDF, handlePrint, handleGeneratePath } from './StudyKitViewer/handlers';
import { DemoModal } from './StudyKitViewer/DemoModal';
import { StudyKitHeader } from './StudyKitViewer/Header';

import { MindmapRenderer } from '@/components/education/knowledge-hub/renderers/mindmap-renderer';
import { Quiz } from '@/components/education/quiz';

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
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<number | null>(null);

  const parsedSummary = useMemo(() => parseMarkdown(studyKit.summary || ''), [studyKit.summary]);
  const demoCode = useMemo(() => studyKit.demo ? buildDemoCode(studyKit.demo) : null, [studyKit.demo]);
  const baseQuiz = useMemo(() => studyKit.quiz ? transformQuizData(studyKit.quiz, studyKit) : null, [studyKit]);
  const transformedQuiz = useMemo(
    () => studyKit.quiz ? transformQuizData(studyKit.quiz, studyKit, adaptiveDifficulty ?? undefined) : null,
    [studyKit, adaptiveDifficulty]
  );

  useEffect(() => {
    if (!baseQuiz?.subject) return;
    let isActive = true;
    const params = new URLSearchParams();
    params.set('subject', baseQuiz.subject);
    params.set('pragmatic', 'true');
    params.set('source', 'study-kit');
    fetch(`/api/adaptive/context?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isActive) return;
        const target = data?.context?.targetDifficulty;
        if (typeof target === 'number') {
          setAdaptiveDifficulty(target);
        }
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [baseQuiz?.subject]);

  const handleQuizComplete = useCallback((result: QuizResult) => {
    if (!transformedQuiz) return;
    const avgDifficulty =
      transformedQuiz.questions.reduce((sum, q) => sum + q.difficulty, 0) / transformedQuiz.questions.length;

    fetch('/api/quizzes/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: result.quizId,
        score: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        subject: transformedQuiz.subject,
        topic: studyKit.title,
        avgDifficulty,
        source: 'study-kit',
      }),
    }).catch(() => undefined);
  }, [transformedQuiz, studyKit.title]);
  const handleQuizClose = useCallback(() => console.log('Quiz closed'), []);

  const onDeleteClick = useCallback(() => handleDelete({ studyKit, setIsDeleting, onDelete }), [studyKit, onDelete]);
  const onDownloadPDF = useCallback(() => handleDownloadPDF({ studyKit }), [studyKit]);
  const onPrint = useCallback(() => handlePrint({ studyKit }), [studyKit]);
  const onGeneratePathClick = useCallback(() => {
    handleGeneratePath({ studyKit, setIsGeneratingPath, setGeneratedPathId, onGeneratePath });
  }, [studyKit, onGeneratePath]);

  const materialCount = [studyKit.summary, studyKit.mindmap, studyKit.demo, studyKit.quiz].filter(Boolean).length;

  return (
    <div className={cn('space-y-6', className)}>
      <StudyKitHeader
        studyKit={studyKit}
        materialCount={materialCount}
        generatedPathId={generatedPathId}
        isGeneratingPath={isGeneratingPath}
        isDeleting={isDeleting}
        onGeneratePath={onGeneratePath}
        onGeneratePathClick={onGeneratePathClick}
        onDownloadPDF={onDownloadPDF}
        onPrint={onPrint}
        onDeleteClick={onDeleteClick}
        showDelete={!!onDelete}
      />

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

        <TabsContent value="summary" className="space-y-4 mt-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            {studyKit.summary ? (
              <div
                className="prose prose-slate dark:prose-invert max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${parsedSummary}</p>` }}
              />
            ) : (
              <p className="text-slate-500 text-center py-8">Riassunto non disponibile</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="mindmap" className="mt-6">
          {studyKit.mindmap ? (
            <MindmapRenderer data={studyKit.mindmap as unknown as Record<string, unknown>} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-slate-500 text-center py-8">Mappa mentale non disponibile</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="demo" className="mt-6">
          {demoCode ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-accent-themed/10 to-purple-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-accent-themed/20">
                    <PlayCircle className="w-8 h-8 text-accent-themed" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Demo Interattiva</h3>
                    <span className="text-sm text-slate-500">
                      {studyKit.demo && 'title' in studyKit.demo && typeof studyKit.demo.title === 'string'
                        ? studyKit.demo.title : 'Simulazione interattiva'}
                    </span>
                  </div>
                </div>
                {studyKit.demo && 'description' in studyKit.demo && studyKit.demo.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{studyKit.demo.description}</p>
                )}
                <Button onClick={() => setShowDemo(true)} className="w-full gap-2" size="lg">
                  <PlayCircle className="w-5 h-5" />
                  Avvia Demo Interattiva
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-slate-500 text-center py-8">Demo interattiva non disponibile</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          {transformedQuiz ? (
            <Quiz quiz={transformedQuiz} onComplete={handleQuizComplete} onClose={handleQuizClose} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-slate-500 text-center py-8">Quiz non disponibile</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {demoCode && (
        <DemoModal
          isOpen={showDemo}
          onClose={() => setShowDemo(false)}
          demoCode={demoCode}
          demo={studyKit.demo as { title?: string; description?: string } | null}
        />
      )}
    </div>
  );
}
