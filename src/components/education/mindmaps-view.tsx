'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Network,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MindmapRenderer, createMindmapFromTopics } from '@/components/tools/markmap-renderer';
import { cn } from '@/lib/utils';
import { subjectNames, subjectIcons, subjectColors } from '@/data';
import type { Subject } from '@/types';

interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
  icon?: string;
  color?: string;
}

interface SavedMindmap {
  id: string;
  title: string;
  nodes: MindmapNode[];
  subject: Subject;
  createdAt: Date;
  maestroId?: string;
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
  // Load saved mindmaps from localStorage
  const [mindmaps, setMindmaps] = useState<SavedMindmap[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('convergio-mindmaps');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedMindmap, setSelectedMindmap] = useState<SavedMindmap | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [selectedExample, setSelectedExample] = useState<{ title: string; nodes: MindmapNode[]; subject: string } | null>(null);

  // Save mindmaps to localStorage
  const saveMindmaps = (newMindmaps: SavedMindmap[]) => {
    setMindmaps(newMindmaps);
    localStorage.setItem('convergio-mindmaps', JSON.stringify(newMindmaps));
  };

  // Delete mindmap
  const deleteMindmap = (id: string) => {
    saveMindmaps(mindmaps.filter(m => m.id !== id));
    if (selectedMindmap?.id === id) {
      setSelectedMindmap(null);
    }
  };

  // Save example as personal mindmap
  const saveExampleAsMindmap = (example: { title: string; nodes: MindmapNode[] }, subject: string) => {
    const newMindmap: SavedMindmap = {
      id: crypto.randomUUID(),
      title: example.title,
      nodes: example.nodes,
      subject: subject as Subject,
      createdAt: new Date(),
    };
    saveMindmaps([...mindmaps, newMindmap]);
    setSelectedExample(null);
    setShowExamples(false);
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
  }, []);

  // Handle Escape key to close modals
  useEffect(() => {
    const hasOpenModal = selectedMindmap || showExamples || selectedExample;
    if (!hasOpenModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModals();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedMindmap, showExamples, selectedExample, closeModals]);

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
        <Button variant="outline" onClick={() => setShowExamples(true)}>
          <Sparkles className="w-4 h-4 mr-2" />
          Esempi
        </Button>
      </div>

      {/* Info card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Network className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Come funzionano le Mappe Mentali?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Durante le lezioni con i maestri, chiedi di creare una mappa mentale su qualsiasi argomento.
                Le mappe appariranno qui automaticamente e potrai stamparle o scaricarle per studiare offline.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mindmaps grid */}
      {mindmaps.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Network className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Nessuna mappa salvata
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Le mappe mentali create durante le sessioni vocali con i maestri appariranno qui.
              Prova a chiedere a un maestro di creare una mappa su un argomento!
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
                            deleteMindmap(mindmap.id);
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
                <button
                  onClick={() => setSelectedMindmap(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
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
    </div>
  );
}
