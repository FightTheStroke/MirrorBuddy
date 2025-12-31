'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Network,
  X,
  Sparkles,
  PlusCircle,
  Save,
  Download,
  Upload,
  FileJson,
  FileText,
  Image as ImageIcon,
  FileType,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MindmapRenderer, createMindmapFromTopics } from '@/components/tools/markmap-renderer';
import { cn } from '@/lib/utils';
import { subjectNames, subjectIcons, subjectColors } from '@/data';
import type { Subject } from '@/types';
import { exportMindmap, downloadExport, type ExportFormat } from '@/lib/tools/mindmap-export';
import { importMindmapFromFile } from '@/lib/tools/mindmap-import';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { logger } from '@/lib/logger';
import { useMindmaps, type SavedMindmap } from '@/lib/hooks/use-saved-materials';

interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
  icon?: string;
  color?: string;
}

interface MindmapsViewProps {
  className?: string;
}

// Example mindmaps for each subject
const exampleMindmapsBySubject: Record<string, { title: string; nodes: MindmapNode[] }> = {
  mathematics: createMindmapFromTopics('Algebra', [
    { name: 'Equazioni', subtopics: ['1° grado', '2° grado', 'Sistemi'] },
    { name: 'Funzioni', subtopics: ['Lineari', 'Quadratiche', 'Esponenziali'] },
    { name: 'Geometria Analitica', subtopics: ['Rette', 'Parabole', 'Circonferenze'] },
  ]),
  history: createMindmapFromTopics('Seconda Guerra Mondiale', [
    { name: 'Cause', subtopics: ['Trattato di Versailles', 'Nazismo', 'Espansionismo'] },
    { name: 'Eventi', subtopics: ['Blitzkrieg', 'Pearl Harbor', 'D-Day'] },
    { name: 'Conseguenze', subtopics: ['ONU', 'Guerra Fredda', 'Decolonizzazione'] },
  ]),
  italian: createMindmapFromTopics('Divina Commedia', [
    { name: 'Inferno', subtopics: ['Struttura', 'Personaggi', 'Contrappasso'] },
    { name: 'Purgatorio', subtopics: ['7 Cornici', 'Beatrice', 'Preghiere'] },
    { name: 'Paradiso', subtopics: ['9 Cieli', 'Beatitudine', 'Visione di Dio'] },
  ]),
  physics: createMindmapFromTopics('Meccanica', [
    { name: 'Cinematica', subtopics: ['MRU', 'MRUA', 'Moto Circolare'] },
    { name: 'Dinamica', subtopics: ['Leggi di Newton', 'Forza', 'Lavoro'] },
    { name: 'Energia', subtopics: ['Cinetica', 'Potenziale', 'Conservazione'] },
  ]),
  biology: createMindmapFromTopics('Cellula', [
    { name: 'Struttura', subtopics: ['Membrana', 'Citoplasma', 'Nucleo'] },
    { name: 'Organelli', subtopics: ['Mitocondri', 'Ribosomi', 'RE'] },
    { name: 'Processi', subtopics: ['Mitosi', 'Meiosi', 'Sintesi Proteica'] },
  ]),
  english: createMindmapFromTopics('English Tenses', [
    { name: 'Present', subtopics: ['Simple', 'Continuous', 'Perfect'] },
    { name: 'Past', subtopics: ['Simple', 'Continuous', 'Perfect'] },
    { name: 'Future', subtopics: ['Will', 'Going to', 'Present Continuous'] },
  ]),
};

export function MindmapsView({ className }: MindmapsViewProps) {
  const router = useRouter();

  // Load saved mindmaps from database API
  const { mindmaps, loading, saveMindmap, deleteMindmap: apiDeleteMindmap, reload: _reload } = useMindmaps();

  const [selectedMindmap, setSelectedMindmap] = useState<SavedMindmap | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedExample, setSelectedExample] = useState<{ title: string; nodes: MindmapNode[]; subject: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [newMapSubject, setNewMapSubject] = useState<Subject>('mathematics');
  const [newMapTopics, setNewMapTopics] = useState<{ name: string; subtopics: string[] }[]>([
    { name: '', subtopics: [''] },
  ]);

  // Delete mindmap via API
  const handleDeleteMindmap = async (id: string) => {
    await apiDeleteMindmap(id);
    if (selectedMindmap?.id === id) {
      setSelectedMindmap(null);
    }
  };

  // Save example as personal mindmap
  const saveExampleAsMindmap = async (example: { title: string; nodes: MindmapNode[] }, subject: string) => {
    await saveMindmap({
      title: example.title,
      nodes: example.nodes,
      subject: subject as Subject,
    });
    setSelectedExample(null);
    setShowExamples(false);
  };

  // Create new mindmap from form
  const handleCreateMindmap = async () => {
    if (!newMapTitle.trim()) return;

    const validTopics = newMapTopics.filter(t => t.name.trim());
    if (validTopics.length === 0) return;

    const { nodes } = createMindmapFromTopics(
      newMapTitle,
      validTopics.map(t => ({
        name: t.name,
        subtopics: t.subtopics.filter(s => s.trim()),
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

  // Add topic to creation form
  const addTopic = () => {
    setNewMapTopics([...newMapTopics, { name: '', subtopics: [''] }]);
  };

  // Update topic name
  const updateTopicName = (index: number, name: string) => {
    const updated = [...newMapTopics];
    updated[index].name = name;
    setNewMapTopics(updated);
  };

  // Add subtopic
  const addSubtopic = (topicIndex: number) => {
    const updated = [...newMapTopics];
    updated[topicIndex].subtopics.push('');
    setNewMapTopics(updated);
  };

  // Update subtopic
  const updateSubtopic = (topicIndex: number, subtopicIndex: number, value: string) => {
    const updated = [...newMapTopics];
    updated[topicIndex].subtopics[subtopicIndex] = value;
    setNewMapTopics(updated);
  };

  // Remove topic
  const removeTopic = (index: number) => {
    if (newMapTopics.length > 1) {
      setNewMapTopics(newMapTopics.filter((_, i) => i !== index));
    }
  };

  // Remove subtopic
  const removeSubtopic = (topicIndex: number, subtopicIndex: number) => {
    const updated = [...newMapTopics];
    if (updated[topicIndex].subtopics.length > 1) {
      updated[topicIndex].subtopics = updated[topicIndex].subtopics.filter((_, i) => i !== subtopicIndex);
      setNewMapTopics(updated);
    }
  };

  // Group mindmaps by subject
  const mindmapsBySubject = useMemo(() => {
    const grouped: Record<string, SavedMindmap[]> = {};
    mindmaps.forEach(m => {
      if (!grouped[m.subject]) grouped[m.subject] = [];
      grouped[m.subject].push(m);
    });
    return grouped;
  }, [mindmaps]);

  // Close any open modal
  const closeModals = useCallback(() => {
    setSelectedMindmap(null);
    setShowExamples(false);
    setSelectedExample(null);
    setShowCreateModal(false);
  }, []);

  // Handle export mindmap
  const handleExport = useCallback(async (mindmap: SavedMindmap, format: ExportFormat) => {
    try {
      // Convert SavedMindmap to MindmapData format
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
      alert(`Errore durante l'esportazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }, []);

  // Handle import mindmap
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importMindmapFromFile(file);

      if (!result.success || !result.mindmap) {
        throw new Error(result.error || 'Import failed');
      }

      // Convert MindmapData to SavedMindmap format
      const convertNode = (node: { id: string; text: string; color?: string; children?: unknown[] }): MindmapNode => ({
        id: node.id,
        label: node.text,
        color: node.color,
        children: node.children?.map((child) => convertNode(child as { id: string; text: string; color?: string; children?: unknown[] })),
      });

      const nodes = result.mindmap.root.children?.map((child) => convertNode(child as { id: string; text: string; color?: string; children?: unknown[] })) || [];
      const subject = (result.mindmap.topic as Subject) || 'mathematics';

      await saveMindmap({
        title: result.mindmap.title,
        nodes,
        subject,
      });

      if (result.warnings?.length) {
        alert(`Importazione completata con avvisi:\n${result.warnings.join('\n')}`);
      }

      logger.info('Mindmap imported', { title: result.mindmap.title, file: file.name });
    } catch (error) {
      logger.error('Import failed', { error, file: file.name });
      alert(`Errore durante l'importazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }

    // Reset input
    event.target.value = '';
  }, [saveMindmap]);

  // Handle Escape key to close modals
  useEffect(() => {
    const hasOpenModal = selectedMindmap || showExamples || selectedExample || showCreateModal;
    if (!hasOpenModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModals();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedMindmap, showExamples, selectedExample, showCreateModal, closeModals]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mappe Mentali
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Visualizza e stampa le tue mappe create durante le lezioni
          </p>
        </div>
        <div className="flex gap-2">
          {/* PRIMARY: Conversation-first approach (Phase 6) */}
          <Button onClick={() => router.push('/conversation?tool=mindmap')}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Crea con un Professore
          </Button>
          {/* SECONDARY: Manual form fallback */}
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Modalità Manuale
          </Button>
          <Button variant="outline" onClick={() => setShowExamples(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            Esempi
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Importa
              <input
                type="file"
                accept=".json,.md,.markdown,.mm,.xmind,.txt"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-accent-themed/10">
              <Network className="w-6 h-6 text-accent-themed" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Come funzionano le Mappe Mentali?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Durante le lezioni con i professori, chiedi di creare una mappa mentale su qualsiasi argomento.
                Le mappe appariranno qui automaticamente e potrai stamparle o scaricarle per studiare offline.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mindmaps grid */}
      {loading ? (
        <Card className="p-12">
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto text-slate-400 mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Caricamento...
            </h3>
          </div>
        </Card>
      ) : mindmaps.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Network className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Nessuna mappa salvata
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Le mappe mentali create durante le sessioni vocali con i professori appariranno qui.
              Prova a chiedere a un professore di creare una mappa su un argomento!
            </p>
            <Button variant="outline" onClick={() => setShowExamples(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Esplora Esempi
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(mindmapsBySubject).map(([subject, maps]) => (
            <div key={subject}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{subjectIcons[subject as Subject]}</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {subjectNames[subject as Subject]}
                </h3>
                <span className="text-sm text-slate-500">({maps.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {maps.map((mindmap) => (
                  <Card
                    key={mindmap.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow group"
                    onClick={() => setSelectedMindmap(mindmap)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${subjectColors[mindmap.subject]}20` }}
                          >
                            <Network
                              className="w-5 h-5"
                              style={{ color: subjectColors[mindmap.subject] }}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">{mindmap.title}</CardTitle>
                            <p className="text-xs text-slate-500">
                              {new Date(mindmap.createdAt).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMindmap(mindmap.id);
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {mindmap.nodes.slice(0, 4).map((node, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            {node.label}
                          </span>
                        ))}
                        {mindmap.nodes.length > 4 && (
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            +{mindmap.nodes.length - 4}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View mindmap modal */}
      <AnimatePresence>
        {selectedMindmap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedMindmap(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{subjectIcons[selectedMindmap.subject]}</span>
                  <h3 className="text-xl font-bold">{selectedMindmap.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Export dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Esporta
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport(selectedMindmap, 'json')}>
                        <FileJson className="w-4 h-4 mr-2" />
                        JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(selectedMindmap, 'markdown')}>
                        <FileText className="w-4 h-4 mr-2" />
                        Markdown
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExport(selectedMindmap, 'svg')}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        SVG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(selectedMindmap, 'png')}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(selectedMindmap, 'pdf')}>
                        <FileType className="w-4 h-4 mr-2" />
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExport(selectedMindmap, 'freemind')}>
                        <Network className="w-4 h-4 mr-2" />
                        FreeMind (.mm)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(selectedMindmap, 'xmind')}>
                        <Network className="w-4 h-4 mr-2" />
                        XMind
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    onClick={() => setSelectedMindmap(null)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <MindmapRenderer
                  title={selectedMindmap.title}
                  nodes={selectedMindmap.nodes}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Examples modal */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowExamples(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold">Mappe Mentali di Esempio</h3>
                <button
                  onClick={() => setShowExamples(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {selectedExample ? (
                  <div className="space-y-4">
                    <Button variant="outline" onClick={() => setSelectedExample(null)}>
                      Torna agli esempi
                    </Button>
                    <MindmapRenderer
                      title={selectedExample.title}
                      nodes={selectedExample.nodes}
                    />
                    <div className="flex justify-center">
                      <Button onClick={() => saveExampleAsMindmap(selectedExample, selectedExample.subject)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Salva nella mia raccolta
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(exampleMindmapsBySubject).map(([subject, example]) => (
                      <Card
                        key={subject}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedExample({ ...example, subject })}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${subjectColors[subject as Subject]}20` }}
                            >
                              {subjectIcons[subject as Subject]}
                            </div>
                            <div>
                              <CardTitle className="text-base">{example.title}</CardTitle>
                              <p className="text-xs text-slate-500">
                                {subjectNames[subject as Subject]}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5">
                            {example.nodes.slice(0, 3).map((node, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                {node.label}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create mindmap modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold">Crea Nuova Mappa Mentale</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Title input */}
                <div>
                  <label className="block text-sm font-medium mb-1">Titolo della mappa</label>
                  <input
                    type="text"
                    value={newMapTitle}
                    onChange={(e) => setNewMapTitle(e.target.value)}
                    placeholder="Es: Rivoluzione Francese, Teorema di Pitagora..."
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Subject selector */}
                <div>
                  <label className="block text-sm font-medium mb-1">Materia</label>
                  <select
                    value={newMapSubject}
                    onChange={(e) => setNewMapSubject(e.target.value as Subject)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(subjectNames).map(([key, name]) => (
                      <option key={key} value={key}>
                        {subjectIcons[key as Subject]} {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topics */}
                <div>
                  <label className="block text-sm font-medium mb-2">Argomenti principali</label>
                  <div className="space-y-4">
                    {newMapTopics.map((topic, topicIndex) => (
                      <div key={topicIndex} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={topic.name}
                            onChange={(e) => updateTopicName(topicIndex, e.target.value)}
                            placeholder={`Argomento ${topicIndex + 1}`}
                            className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {newMapTopics.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTopic(topicIndex)}
                              className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="ml-4 space-y-2">
                          {topic.subtopics.map((subtopic, subtopicIndex) => (
                            <div key={subtopicIndex} className="flex gap-2">
                              <input
                                type="text"
                                value={subtopic}
                                onChange={(e) => updateSubtopic(topicIndex, subtopicIndex, e.target.value)}
                                placeholder={`Sotto-argomento ${subtopicIndex + 1}`}
                                className="flex-1 px-3 py-1.5 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              {topic.subtopics.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeSubtopic(topicIndex, subtopicIndex)}
                                  className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addSubtopic(topicIndex)}
                            className="text-slate-600 dark:text-slate-400"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Aggiungi sotto-argomento
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTopic}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Aggiungi argomento
                  </Button>
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Annulla
                </Button>
                <Button onClick={handleCreateMindmap} disabled={!newMapTitle.trim() || !newMapTopics.some(t => t.name.trim())}>
                  <Save className="w-4 h-4 mr-2" />
                  Crea Mappa
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
