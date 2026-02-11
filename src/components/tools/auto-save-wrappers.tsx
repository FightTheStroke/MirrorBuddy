'use client';

import { useEffect, useRef } from 'react';
import { autoSaveMaterial } from '@/lib/hooks/use-saved-materials';
import type {
  MindmapRequest,
  QuizRequest,
  FlashcardDeckRequest,
  SummaryData,
  DemoData,
} from '@/types';
import { QuizTool } from './quiz-tool';
import { FlashcardTool } from './flashcard-tool';
import { SummaryTool } from './summary-tool';
import { DemoSandbox } from './demo-sandbox';
import { LiveMindmap } from './live-mindmap';
import { useCallback } from 'react';
import toast from '@/components/ui/toast';
import { logger } from '@/lib/logger';
import { escapeHtml } from '@/lib/tools/accessible-print/helpers';
import type { MindmapNode } from '@/types/tools';

// Auto-save utilities
function autoSaveMindmap(request: MindmapRequest, toolId?: string): void {
  autoSaveMaterial(
    'mindmap',
    request.title,
    { nodes: request.nodes },
    { subject: 'general', toolId },
  );
}

function autoSaveQuiz(request: QuizRequest, toolId?: string): void {
  autoSaveMaterial(
    'quiz',
    request.title,
    { questions: request.questions },
    { subject: request.subject, toolId },
  );
}

function autoSaveFlashcards(request: FlashcardDeckRequest, toolId?: string): void {
  autoSaveMaterial(
    'flashcard',
    request.name,
    { cards: request.cards },
    { subject: request.subject, toolId },
  );
}

function autoSaveSummary(request: SummaryData, toolId?: string): void {
  autoSaveMaterial(
    'summary',
    request.topic,
    { sections: request.sections, length: request.length },
    { subject: 'general', toolId },
  );
}

function autoSaveDemo(request: DemoData, toolId?: string): void {
  autoSaveMaterial(
    'demo',
    request.title,
    { html: request.html, css: request.css, js: request.js, description: request.description },
    { subject: 'general', toolId },
  );
}

// Auto-save wrapper components
export function AutoSaveQuiz({ request, toolId }: { request: QuizRequest; toolId?: string }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveQuiz(request, toolId);
    }
  }, [request, toolId]);
  return <QuizTool request={request} />;
}

export function AutoSaveFlashcard({
  request,
  toolId,
}: {
  request: FlashcardDeckRequest;
  toolId?: string;
}) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveFlashcards(request, toolId);
    }
  }, [request, toolId]);
  return <FlashcardTool request={request} />;
}

export function AutoSaveMindmap({
  request,
  sessionId,
  toolId,
}: {
  request: MindmapRequest;
  sessionId?: string | null;
  toolId?: string;
}) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveMindmap(request, toolId);
    }
  }, [request, toolId]);
  return (
    <LiveMindmap sessionId={sessionId ?? null} title={request.title} initialNodes={request.nodes} />
  );
}

export function AutoSaveSummary({ request, toolId }: { request: SummaryData; toolId?: string }) {
  const savedRef = useRef(false);

  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveSummary(request, toolId);
    }
  }, [request, toolId]);

  // PDF export
  const handleExportPdf = useCallback((data: SummaryData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      logger.warn('[SummaryTool] Could not open print window');
      toast.error('Impossibile aprire la finestra di stampa');
      return;
    }

    const sectionsHtml = data.sections
      .map(
        (section) => `
      <div class="section">
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.content)}</p>
        ${
          section.keyPoints && section.keyPoints.length > 0
            ? `
          <div class="key-points">
            <h3>Punti chiave:</h3>
            ${section.keyPoints.map((kp) => `<p class="key-point">★ ${escapeHtml(kp)}</p>`).join('')}
          </div>
        `
            : ''
        }
      </div>
    `,
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(data.topic)} - Riassunto</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
            h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #1e3a5f; margin-top: 20px; }
            h3 { color: #475569; font-size: 14px; margin-top: 15px; }
            .section { margin-bottom: 30px; }
            .key-points { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 10px; }
            .key-point { color: #0369a1; font-weight: 500; }
            p { line-height: 1.6; white-space: pre-wrap; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(data.topic)}</h1>
          ${sectionsHtml}
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    logger.info('[SummaryTool] Exported to PDF', { topic: data.topic });
  }, []);

  // Convert to mindmap
  const handleConvertToMindmap = useCallback((data: SummaryData) => {
    const nodes: MindmapNode[] = [];

    nodes.push({ id: 'root', label: data.topic });

    data.sections.forEach((section, i) => {
      const sectionId = `section-${i}`;
      nodes.push({ id: sectionId, label: section.title, parentId: 'root' });

      const contentParts = section.content.split(/[.!?]\s+/).filter((s) => s.trim().length > 5);
      contentParts.slice(0, 3).forEach((part, j) => {
        const label = part.length > 50 ? part.substring(0, 47) + '...' : part;
        nodes.push({ id: `${sectionId}-content-${j}`, label, parentId: sectionId });
      });

      if (section.keyPoints) {
        section.keyPoints.slice(0, 3).forEach((kp, j) => {
          const label = kp.length > 40 ? `★ ${kp.substring(0, 37)}...` : `★ ${kp}`;
          nodes.push({ id: `${sectionId}-kp-${j}`, label, parentId: sectionId });
        });
      }
    });

    const mindmapTitle = `Mappa: ${data.topic}`;
    autoSaveMaterial('mindmap', mindmapTitle, { nodes }, { subject: 'general' });

    toast.success('Mappa mentale salvata nello zaino!');
    logger.info('[SummaryTool] Converted to mindmap', {
      topic: data.topic,
      nodeCount: nodes.length,
    });
  }, []);

  // Generate flashcards
  const handleGenerateFlashcards = useCallback((data: SummaryData) => {
    const cards: Array<{ front: string; back: string }> = [];

    data.sections.forEach((section) => {
      if (section.keyPoints) {
        section.keyPoints.forEach((kp) => {
          cards.push({
            front: `${section.title}: Cosa significa "${kp.length > 30 ? kp.substring(0, 30) + '...' : kp}"?`,
            back: kp,
          });
        });
      }

      if (section.content && section.content.length > 20) {
        cards.push({
          front: `${section.title}: Spiega questo concetto`,
          back:
            section.content.length > 200
              ? section.content.substring(0, 200) + '...'
              : section.content,
        });
      }
    });

    const limitedCards = cards.slice(0, 10);

    if (limitedCards.length === 0) {
      toast.error('Non ci sono abbastanza contenuti per creare flashcard');
      return;
    }

    const flashcardName = `Flashcard: ${data.topic}`;
    autoSaveMaterial('flashcard', flashcardName, { cards: limitedCards }, { subject: 'general' });

    toast.success(`${limitedCards.length} flashcard salvate nello zaino!`);
    logger.info('[SummaryTool] Generated flashcards', {
      topic: data.topic,
      cardCount: limitedCards.length,
    });
  }, []);

  return (
    <SummaryTool
      data={request}
      onExportPdf={handleExportPdf}
      onConvertToMindmap={handleConvertToMindmap}
      onGenerateFlashcards={handleGenerateFlashcards}
    />
  );
}

export function AutoSaveDemo({ request, toolId }: { request: DemoData; toolId?: string }) {
  const savedRef = useRef(false);
  useEffect(() => {
    if (!savedRef.current) {
      savedRef.current = true;
      autoSaveDemo(request, toolId);
    }
  }, [request, toolId]);
  return <DemoSandbox data={request} />;
}
