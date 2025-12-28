'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code,
  Search,
  Trash2,
  Eye,
  ExternalLink,
  Calendar,
  Tag,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHTMLSnippetsStore, type HTMLSnippet } from '@/lib/stores/app-store';
import { HTMLPreview } from './html-preview';
import { MAESTRI } from '@/data/maestri-full';

export function HTMLSnippetsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [previewSnippet, setPreviewSnippet] = useState<HTMLSnippet | null>(null);

  const { snippets, deleteSnippet } = useHTMLSnippetsStore();

  // Get unique subjects from snippets
  const subjects = useMemo(() => {
    const subjectSet = new Set(snippets.map(s => s.subject).filter(Boolean));
    return Array.from(subjectSet);
  }, [snippets]);

  // Filter snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter(snippet => {
      const matchesSearch = !searchQuery ||
        snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        snippet.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubject = !selectedSubject || snippet.subject === selectedSubject;

      return matchesSearch && matchesSubject;
    });
  }, [snippets, searchQuery, selectedSubject]);

  const getMaestroName = (maestroId?: string) => {
    if (!maestroId) return null;
    const maestro = MAESTRI.find(m => m.id === maestroId);
    return maestro?.displayName;
  };

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

  const handleOpenInNewTab = (snippet: HTMLSnippet) => {
    const blob = new Blob([snippet.code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
            Esempi HTML creati dai Maestri
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

      {/* Snippets Grid */}
      {filteredSnippets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Code className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
              {snippets.length === 0 ? 'Nessuna demo salvata' : 'Nessun risultato'}
            </h3>
            <p className="text-sm text-slate-500 mt-2">
              {snippets.length === 0
                ? 'Chiedi a un Maestro di creare una demo interattiva!'
                : 'Prova a modificare i filtri di ricerca'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredSnippets.map((snippet) => {
              const maestroName = getMaestroName(snippet.maestroId);

              return (
                <motion.div
                  key={snippet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  layout
                >
                  <Card className="h-full hover:shadow-lg transition-shadow group">
                    {/* Preview thumbnail */}
                    <div className="h-32 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Code className="w-12 h-12 text-purple-300 dark:text-purple-600" />
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPreviewSnippet(snippet)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Anteprima
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenInNewTab(snippet)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {snippet.title}
                        </h3>
                        <button
                          onClick={() => deleteSnippet(snippet.id)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {snippet.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                          {snippet.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {snippet.subject && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {snippet.subject}
                          </span>
                        )}
                        {maestroName && (
                          <span>di {maestroName}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(snippet.createdAt).toLocaleDateString('it-IT')}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
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
