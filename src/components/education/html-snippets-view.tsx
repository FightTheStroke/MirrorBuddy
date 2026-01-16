'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDemos, type SavedDemo } from '@/lib/hooks/use-saved-materials';
import { HTMLPreview } from './html-preview';
import { SnippetCard } from './html-snippets-view/snippet-card';
import { getMaestroName, handleOpenInNewTab } from './html-snippets-view/snippets-utils';

export function HTMLSnippetsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [previewSnippet, setPreviewSnippet] = useState<SavedDemo | null>(null);

  const { demos, loading, deleteDemo } = useDemos();

  // Get unique subjects from demos
  const subjects = useMemo(() => {
    const subjectSet = new Set(demos.map(s => s.subject).filter(Boolean));
    return Array.from(subjectSet);
  }, [demos]);

  // Filter demos
  const filteredDemos = useMemo(() => {
    return demos.filter(demo => {
      const matchesSearch = !searchQuery ||
        demo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        demo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        demo.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubject = !selectedSubject || demo.subject === selectedSubject;

      return matchesSearch && matchesSubject;
    });
  }, [demos, searchQuery, selectedSubject]);

  // Handle Escape key to close modal
  const closePreview = useCallback(() => {
    setPreviewSnippet(null);
  }, []);

  useEffect(() => {
    if (!previewSnippet) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreview();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewSnippet, closePreview]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Code className="w-8 h-8 text-purple-500" />
            Demo Interattive
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Esempi HTML creati dai Professori
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca demo..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Subject filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedSubject === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSubject(null)}
          >
            Tutti
          </Button>
          {subjects.map(subject => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSubject(subject === selectedSubject ? null : subject ?? null)}
            >
              {subject}
            </Button>
          ))}
        </div>
      </div>

      {/* Demos Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Code className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
              Caricamento demo...
            </h3>
          </CardContent>
        </Card>
      ) : filteredDemos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Code className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
              {demos.length === 0 ? 'Nessuna demo salvata' : 'Nessun risultato'}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {demos.length === 0
                ? 'Chiedi a un Professore di creare una demo interattiva!'
                : 'Prova a modificare i filtri di ricerca'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredDemos.map((demo) => (
              <SnippetCard
                key={demo.id}
                demo={demo}
                maestroName={getMaestroName(demo.maestroId) ?? undefined}
                onPreview={setPreviewSnippet}
                onOpenInNewTab={() => handleOpenInNewTab(demo.code, demo.title)}
                onDelete={deleteDemo}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewSnippet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewSnippet(null)}
          >
            <div onClick={e => e.stopPropagation()}>
              <HTMLPreview
                code={previewSnippet.code}
                title={previewSnippet.title}
                description={previewSnippet.description}
                subject={previewSnippet.subject}
                maestroId={previewSnippet.maestroId}
                onClose={() => setPreviewSnippet(null)}
                allowSave={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
