'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  BookOpen,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getMaestriBySubject, getAllSubjects } from '@/data';
import type { Subject, Maestro } from '@/types';

// Italian labels for subjects - includes all possible subject values from maestri
const SUBJECT_LABELS: Record<string, string> = {
  // Standard subjects
  mathematics: 'Matematica',
  physics: 'Fisica',
  chemistry: 'Chimica',
  biology: 'Biologia',
  history: 'Storia',
  geography: 'Geografia',
  italian: 'Italiano',
  english: 'Inglese',
  art: 'Arte',
  music: 'Musica',
  civics: 'Educazione Civica',
  economics: 'Economia',
  computerScience: 'Informatica',
  health: 'Salute',
  philosophy: 'Filosofia',
  internationalLaw: 'Diritto Internazionale',
  // Additional subjects from maestri
  astronomy: 'Astronomia',
  'computer-science': 'Informatica',
  'civic-education': 'Educazione Civica',
  science: 'Scienze',
  storytelling: 'Storytelling',
  'physical-education': 'Educazione Fisica',
};

// Helper to get label with fallback
const getSubjectLabel = (subject: string): string => {
  if (!subject || subject === 'other' || subject === 'unknown') {
    return 'Non riconosciuta';
  }
  return SUBJECT_LABELS[subject] || subject.charAt(0).toUpperCase() + subject.slice(1).replace(/-/g, ' ');
};

// AI might return 'other' or 'unknown' for unrecognized subjects
type DetectedSubject = Subject | 'other' | 'unknown';

interface SubjectConfirmationDialogProps {
  detectedSubject: DetectedSubject;
  isOpen: boolean;
  photoPreview?: string;
  onConfirm: (subject: Subject, maestro: Maestro | null) => void;
  onClose: () => void;
}

// Check if a detected subject is a valid Subject type
const isValidSubject = (subject: DetectedSubject): subject is Subject => {
  return subject !== 'other' && subject !== 'unknown';
};

/**
 * Inline subject confirmation component.
 * Parent should use key={detectedSubject} to reset state when subject changes.
 */
export function SubjectConfirmationDialog({
  detectedSubject,
  isOpen,
  photoPreview,
  onConfirm,
  onClose,
}: SubjectConfirmationDialogProps) {
  // Default to 'mathematics' if detected is 'other' or 'unknown'
  const initialSubject = isValidSubject(detectedSubject) ? detectedSubject : 'mathematics';
  const [selectedSubject, setSelectedSubject] = useState<Subject>(initialSubject);
  const [showMaestroSelection, setShowMaestroSelection] = useState(false);

  const allSubjects = getAllSubjects();
  const availableMaestri = getMaestriBySubject(selectedSubject);

  const handleSubjectConfirm = () => {
    if (availableMaestri.length > 0) {
      setShowMaestroSelection(true);
    } else {
      onConfirm(selectedSubject, null);
    }
  };

  const handleMaestroSelect = (maestro: Maestro | null) => {
    onConfirm(selectedSubject, maestro);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Photo preview */}
      {photoPreview && (
        <Card>
          <CardContent className="p-4">
            <div className="relative rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Foto del compito"
                className="w-full max-h-64 object-contain bg-slate-100 dark:bg-slate-800"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject selection card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {showMaestroSelection ? (
              <>
                <GraduationCap className="h-5 w-5 text-blue-500" />
                Scegli un Professore
              </>
            ) : (
              <>
                <BookOpen className="h-5 w-5 text-blue-500" />
                Seleziona la Materia
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showMaestroSelection ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {isValidSubject(detectedSubject) ? (
                  <>
                    Materia rilevata: <span className="font-semibold text-blue-600">{getSubjectLabel(detectedSubject)}</span>.
                    Conferma o seleziona un&apos;altra materia.
                  </>
                ) : (
                  <>
                    Non sono riuscito a riconoscere la materia automaticamente.
                    Seleziona la materia corretta:
                  </>
                )}
              </p>

              {/* Subject selection grid */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {allSubjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={cn(
                      'p-3 text-sm rounded-lg border-2 transition-all font-medium',
                      selectedSubject === subject
                        ? 'bg-accent-themed text-white border-accent-themed shadow-md'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:bg-accent-themed/10'
                    )}
                  >
                    {getSubjectLabel(subject)}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Annulla
                </Button>
                <Button onClick={handleSubjectConfirm} className="flex-1" size="lg">
                  Conferma {getSubjectLabel(selectedSubject)}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Vuoi studiare <span className="font-semibold text-blue-600">{getSubjectLabel(selectedSubject)}</span> con un Professore?
                Ti guiderà passo dopo passo.
              </p>

              {/* Maestro selection */}
              <div className="space-y-2 mb-6">
                {availableMaestri.map((maestro) => (
                  <button
                    key={maestro.id}
                    onClick={() => handleMaestroSelect(maestro)}
                    className="w-full p-4 flex items-center gap-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden shadow-md flex-shrink-0">
                      <Image
                        src={maestro.avatar}
                        alt={maestro.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{maestro.name}</p>
                      <p className="text-sm text-slate-500">{maestro.specialty}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                  </button>
                ))}

                {/* Option to continue without Maestro */}
                <button
                  onClick={() => handleMaestroSelect(null)}
                  className="w-full p-4 flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      Continua senza Maestro
                    </p>
                    <p className="text-sm text-slate-500">
                      Usa i suggerimenti maieutici per risolvere da solo
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowMaestroSelection(false)}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna alla selezione materia
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
