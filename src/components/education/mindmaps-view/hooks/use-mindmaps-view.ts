/**
 * @file use-mindmaps-view.ts
 * @brief Custom hook for mindmaps view state management
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useMindmaps, type SavedMindmap } from '@/lib/hooks/use-saved-materials';
import { createMindmapFromTopics } from '@/components/tools/markmap';
import { exportMindmap, downloadExport, type ExportFormat } from '@/lib/tools/mindmap-export';
import { importMindmapFromFile } from '@/lib/tools/mindmap-import';
import type { Subject } from '@/types';
import type { MindmapNode } from '../types';

interface Topic {
  name: string;
  subtopics: string[];
}

export function useMindmapsView() {
  const { mindmaps, loading, saveMindmap, deleteMindmap } = useMindmaps();

  const [selectedMindmap, setSelectedMindmap] = useState<SavedMindmap | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedExample, setSelectedExample] = useState<{
    title: string;
    nodes: MindmapNode[];
    subject: string;
  } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [newMapSubject, setNewMapSubject] = useState<Subject>('mathematics');
  const [newMapTopics, setNewMapTopics] = useState<Topic[]>([
    { name: '', subtopics: [''] },
  ]);

  // Grouped by subject - computed in MindmapsGrid component
  // const mindmapsBySubject = useMemo(() => {
  //   const grouped: Record<string, SavedMindmap[]> = {};
  //   mindmaps.forEach((m) => {
  //     if (!grouped[m.subject]) grouped[m.subject] = [];
  //     grouped[m.subject].push(m);
  //   });
  //   return grouped;
  // }, [mindmaps]);

  const closeModals = useCallback(() => {
    setSelectedMindmap(null);
    setShowExamples(false);
    setSelectedExample(null);
    setShowCreateModal(false);
  }, []);

  const handleDeleteMindmap = async (id: string) => {
    await deleteMindmap(id);
    if (selectedMindmap?.id === id) {
      setSelectedMindmap(null);
    }
  };

  const saveExampleAsMindmap = async (
    example: { title: string; nodes: MindmapNode[] },
    subject: string
  ) => {
    await saveMindmap({
      title: example.title,
      nodes: example.nodes,
      subject: subject as Subject,
    });
    setSelectedExample(null);
    setShowExamples(false);
  };

  const handleCreateMindmap = async () => {
    if (!newMapTitle.trim()) return;

    const validTopics = newMapTopics.filter((t) => t.name.trim());
    if (validTopics.length === 0) return;

    const { nodes } = createMindmapFromTopics(
      newMapTitle,
      validTopics.map((t) => ({
        name: t.name,
        subtopics: t.subtopics.filter((s) => s.trim()),
      }))
    );

    await saveMindmap({
      title: newMapTitle,
      nodes,
      subject: newMapSubject,
    });

    setShowCreateModal(false);
    setNewMapTitle('');
    setNewMapSubject('mathematics');
    setNewMapTopics([{ name: '', subtopics: [''] }]);
  };

  const handleExport = useCallback(
    async (mindmap: SavedMindmap, format: ExportFormat) => {
      try {
        const mindmapData = {
          title: mindmap.title,
          topic: mindmap.subject,
          root: {
            id: 'root',
            text: mindmap.title,
            children: mindmap.nodes.map((node) => ({
              id: node.id,
              text: node.label,
              color: node.color,
              children: node.children?.map((child) => ({
                id: child.id,
                text: child.label,
                color: child.color,
              })),
            })),
          },
          createdAt: mindmap.createdAt.toString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await exportMindmap(mindmapData, { format });
        downloadExport(result);
        logger.info('Mindmap exported', { format, title: mindmap.title });
      } catch (error) {
        logger.error('Export failed', { error });
        alert(
          `Errore durante l'esportazione: ${
            error instanceof Error ? error.message : 'Errore sconosciuto'
          }`
        );
      }
    },
    []
  );

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const result = await importMindmapFromFile(file);

        if (!result.success || !result.mindmap) {
          throw new Error(result.error || 'Import failed');
        }

        const convertNode = (node: {
          id: string;
          text: string;
          color?: string;
          children?: unknown[];
        }): MindmapNode => ({
          id: node.id,
          label: node.text,
          color: node.color,
          children: node.children?.map((child) =>
            convertNode(
              child as {
                id: string;
                text: string;
                color?: string;
                children?: unknown[];
              }
            )
          ),
        });

        const nodes =
          result.mindmap.root.children?.map((child) =>
            convertNode(
              child as {
                id: string;
                text: string;
                color?: string;
                children?: unknown[];
              }
            )
          ) || [];
        const subject = (result.mindmap.topic as Subject) || 'mathematics';

        await saveMindmap({
          title: result.mindmap.title,
          nodes,
          subject,
        });

        if (result.warnings?.length) {
          alert(
            `Importazione completata con avvisi:\n${result.warnings.join('\n')}`
          );
        }

        logger.info('Mindmap imported', {
          title: result.mindmap.title,
          file: file.name,
        });
      } catch (error) {
        logger.error('Import failed', { error, file: file.name });
        alert(
          `Errore durante l'importazione: ${
            error instanceof Error ? error.message : 'Errore sconosciuto'
          }`
        );
      }

      event.target.value = '';
    },
    [saveMindmap]
  );

  useEffect(() => {
    const hasOpenModal =
      selectedMindmap || showExamples || selectedExample || showCreateModal;
    if (!hasOpenModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModals();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedMindmap, showExamples, selectedExample, showCreateModal, closeModals]);

  return {
    mindmaps,
    loading,
    selectedMindmap,
    setSelectedMindmap,
    showExamples,
    setShowExamples,
    selectedExample,
    setSelectedExample,
    showCreateModal,
    setShowCreateModal,
    newMapTitle,
    setNewMapTitle,
    newMapSubject,
    setNewMapSubject,
    newMapTopics,
    setNewMapTopics,
    handleDeleteMindmap,
    saveExampleAsMindmap,
    handleCreateMindmap,
    handleExport,
    handleImport,
  };
}

