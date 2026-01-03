'use client';

/**
 * StudyKitViewer Component
 * Display generated study materials (summary, mindmap, demo, quiz)
 * Wave 2: Study Kit Generator
 */

import { useState, useMemo } from 'react';
import { FileText, MapIcon, FlaskConical, ClipboardList, Download, Trash2 } from 'lucide-react';
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
import { DemoRenderer } from '@/components/education/knowledge-hub/renderers/demo-renderer';
import { QuizRenderer } from '@/components/education/knowledge-hub/renderers/quiz-renderer';

interface StudyKitViewerProps {
  studyKit: StudyKit;
  onDelete?: () => void;
  className?: string;
}

export function StudyKitViewer({ studyKit, onDelete, className }: StudyKitViewerProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [isDeleting, setIsDeleting] = useState(false);

  // Parse markdown summary once
  const parsedSummary = useMemo(
    () => parseMarkdown(studyKit.summary || ''),
    [studyKit.summary]
  );

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
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {studyKit.subject}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            {studyKit.pageCount && <span>{studyKit.pageCount} pagine</span>}
            {studyKit.wordCount && <span>{studyKit.wordCount.toLocaleString()} parole</span>}
            <span>{materialCount} materiali generati</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            aria-label="Scarica Study Kit"
          >
            <Download className="w-4 h-4" />
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              aria-label="Elimina Study Kit"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
          {studyKit.demo ? (
            <DemoRenderer data={studyKit.demo as unknown as Record<string, unknown>} />
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
          {studyKit.quiz ? (
            <QuizRenderer data={studyKit.quiz as unknown as Record<string, unknown>} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-slate-500 text-center py-8">
                Quiz non disponibile
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
