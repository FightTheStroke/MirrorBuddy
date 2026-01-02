'use client';

/**
 * Study Kit Generator Page
 * Upload PDF and generate study materials
 * Wave 2: Study Kit Generator
 */

import { useState } from 'react';
import { FileText, Upload as UploadIcon } from 'lucide-react';
import { StudyKitUpload, StudyKitList, StudyKitViewer } from '@/components/study-kit';
import { Button } from '@/components/ui/button';
import type { StudyKit } from '@/types/study-kit';

export default function StudyKitPage() {
  const [view, setView] = useState<'list' | 'upload' | 'viewer'>('list');
  const [selectedKit, setSelectedKit] = useState<StudyKit | null>(null);

  const handleUploadComplete = (_studyKitId: string) => {
    // Switch to list view after upload
    setView('list');
  };

  const handleSelectKit = (kit: StudyKit) => {
    setSelectedKit(kit);
    setView('viewer');
  };

  const handleDelete = () => {
    setView('list');
    setSelectedKit(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              Study Kit Generator
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Carica un PDF e genera automaticamente riassunti, mappe mentali, demo interattive e quiz
            </p>
          </div>

          {view !== 'upload' && (
            <Button
              onClick={() => setView('upload')}
              size="lg"
              className="gap-2"
            >
              <UploadIcon className="w-5 h-5" />
              Nuovo Study Kit
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          {view === 'upload' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Carica PDF
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setView('list')}
                >
                  Torna alla lista
                </Button>
              </div>
              <StudyKitUpload onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {view === 'list' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                I tuoi Study Kit
              </h2>
              <StudyKitList onSelect={handleSelectKit} />
            </div>
          )}

          {view === 'viewer' && selectedKit && (
            <div>
              <Button
                variant="ghost"
                onClick={() => setView('list')}
                className="mb-6"
              >
                ← Torna alla lista
              </Button>
              <StudyKitViewer
                studyKit={selectedKit}
                onDelete={handleDelete}
              />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Riassunto
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Sintesi chiara e strutturata dei concetti chiave
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Mappa Mentale
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Visualizzazione interattiva dei collegamenti tra i concetti
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Demo Interattiva
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Simulazioni per materie STEM (matematica, fisica, ecc.)
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
              Quiz
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Domande a risposta multipla per verificare la comprensione
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
