'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  X,
  BookOpen,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getMaestriBySubject, getAllSubjects } from '@/data';
import type { Subject, Maestro } from '@/types';

// Italian labels for subjects
const SUBJECT_LABELS: Record<Subject, string> = {
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
};

interface SubjectConfirmationDialogProps {
  detectedSubject: Subject;
  isOpen: boolean;
  onConfirm: (subject: Subject, maestro: Maestro | null) => void;
  onClose: () => void;
}

export function SubjectConfirmationDialog({
  detectedSubject,
  isOpen,
  onConfirm,
  onClose,
}: SubjectConfirmationDialogProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject>(detectedSubject);
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-xl">
            <CardHeader className="relative">
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-4 top-4"
                onClick={onClose}
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                {showMaestroSelection ? (
                  <>
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                    Scegli un Maestro
                  </>
                ) : (
                  <>
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    Conferma la Materia
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showMaestroSelection ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Ho analizzato il materiale. Sembra essere di{' '}
                    <span className="font-semibold text-blue-600">
                      {SUBJECT_LABELS[detectedSubject]}
                    </span>
                    . È corretto?
                  </p>

                  {/* Subject selection grid */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {allSubjects.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => setSelectedSubject(subject)}
                        className={cn(
                          'p-2 text-xs rounded-lg border transition-all',
                          selectedSubject === subject
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                        )}
                      >
                        {SUBJECT_LABELS[subject]}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                      Annulla
                    </Button>
                    <Button onClick={handleSubjectConfirm} className="flex-1">
                      Conferma
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Vuoi studiare {SUBJECT_LABELS[selectedSubject]} con un Maestro?
                    Può guidarti passo dopo passo.
                  </p>

                  {/* Maestro selection */}
                  <div className="space-y-2 mb-6">
                    {availableMaestri.map((maestro) => (
                      <button
                        key={maestro.id}
                        onClick={() => handleMaestroSelect(maestro)}
                        className="w-full p-3 flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                          style={{ backgroundColor: maestro.color }}
                        >
                          {maestro.avatar}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{maestro.name}</p>
                          <p className="text-xs text-slate-500">{maestro.specialty}</p>
                        </div>
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}

                    {/* Option to continue without Maestro */}
                    <button
                      onClick={() => handleMaestroSelect(null)}
                      className="w-full p-3 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <CheckCircle className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                          Continua senza Maestro
                        </p>
                        <p className="text-xs text-slate-500">
                          Risolvi con i suggerimenti maieutici
                        </p>
                      </div>
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowMaestroSelection(false)}
                    className="w-full"
                  >
                    Indietro
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
