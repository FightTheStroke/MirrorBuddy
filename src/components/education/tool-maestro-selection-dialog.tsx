'use client';

/**
 * ToolMaestroSelectionDialog - Modal for selecting subject/maestro before entering tool focus mode
 * Shows subject selection, then maestro selection for that subject
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  X,
  Mic,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getMaestriBySubject, getAllSubjects, maestri as allMaestri } from '@/data';
import type { Subject, Maestro } from '@/types';
import type { ToolType } from '@/types/tools';

// Italian labels for subjects
const SUBJECT_LABELS: Record<string, string> = {
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
  astronomy: 'Astronomia',
  'computer-science': 'Informatica',
  'civic-education': 'Educazione Civica',
  science: 'Scienze',
  storytelling: 'Storytelling',
  'physical-education': 'Educazione Fisica',
};

// Tool type labels in Italian
const TOOL_LABELS: Record<ToolType, string> = {
  mindmap: 'Mappa Mentale',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  summary: 'Riassunto',
  demo: 'Demo Interattiva',
  diagram: 'Diagramma',
  timeline: 'Linea del Tempo',
  formula: 'Formula',
  chart: 'Grafico',
  search: 'Ricerca',
  webcam: 'Foto',
  pdf: 'PDF',
  homework: 'Compiti',
};

const getSubjectLabel = (subject: string): string => {
  return SUBJECT_LABELS[subject] || subject.charAt(0).toUpperCase() + subject.slice(1).replace(/-/g, ' ');
};

interface ToolMaestroSelectionDialogProps {
  isOpen: boolean;
  toolType: ToolType;
  onConfirm: (maestro: Maestro, mode: 'voice' | 'chat') => void;
  onClose: () => void;
}

type Step = 'subject' | 'maestro' | 'mode';

export function ToolMaestroSelectionDialog({
  isOpen,
  toolType,
  onConfirm,
  onClose,
}: ToolMaestroSelectionDialogProps) {
  const [step, setStep] = useState<Step>('subject');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const allSubjects = getAllSubjects();

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the dialog
    dialogRef.current?.focus();

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Focus trap - keep focus within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus when dialog closes
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);
  const availableMaestri = selectedSubject ? getMaestriBySubject(selectedSubject) : [];

  const toolLabel = TOOL_LABELS[toolType] || toolType;

  const handleSubjectSelect = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    const maestri = getMaestriBySubject(subject);
    if (maestri.length === 1) {
      // Auto-select if only one maestro
      setSelectedMaestro(maestri[0]);
      setStep('mode');
    } else if (maestri.length > 1) {
      setStep('maestro');
    } else {
      // No maestro for this subject, show all maestri
      setStep('maestro');
    }
  }, []);

  const handleMaestroSelect = useCallback((maestro: Maestro) => {
    setSelectedMaestro(maestro);
    setStep('mode');
  }, []);

  const handleModeSelect = useCallback((mode: 'voice' | 'chat') => {
    if (selectedMaestro) {
      onConfirm(selectedMaestro, mode);
      // Reset state
      setStep('subject');
      setSelectedSubject(null);
      setSelectedMaestro(null);
    }
  }, [selectedMaestro, onConfirm]);

  const handleBack = useCallback(() => {
    if (step === 'mode') {
      // If we auto-selected maestro, go back to subject
      if (availableMaestri.length === 1) {
        setStep('subject');
        setSelectedMaestro(null);
        setSelectedSubject(null);
      } else {
        setStep('maestro');
        setSelectedMaestro(null);
      }
    } else if (step === 'maestro') {
      setStep('subject');
      setSelectedSubject(null);
    }
  }, [step, availableMaestri.length]);

  const handleClose = useCallback(() => {
    setStep('subject');
    setSelectedSubject(null);
    setSelectedMaestro(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-xl focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {step === 'subject' && <BookOpen className="h-5 w-5 text-accent-themed" />}
              {step === 'maestro' && <GraduationCap className="h-5 w-5 text-accent-themed" />}
              {step === 'mode' && <Mic className="h-5 w-5 text-accent-themed" />}
              <h2 id="dialog-title" className="text-lg font-semibold">
                {step === 'subject' && `Crea ${toolLabel} - Scegli Materia`}
                {step === 'maestro' && `Crea ${toolLabel} - Scegli Professore`}
                {step === 'mode' && `Crea ${toolLabel} - Scegli Modalità`}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {/* Step 1: Subject Selection */}
              {step === 'subject' && (
                <motion.div
                  key="subject"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Di quale materia vuoi fare {toolLabel.toLowerCase()}?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {allSubjects.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => handleSubjectSelect(subject)}
                        className={cn(
                          'p-3 text-sm rounded-lg border-2 transition-all font-medium',
                          'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                          'hover:border-accent-themed hover:bg-accent-themed/10'
                        )}
                      >
                        {getSubjectLabel(subject)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Maestro Selection */}
              {step === 'maestro' && (
                <motion.div
                  key="maestro"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {selectedSubject && availableMaestri.length > 0 ? (
                      <>Scegli il Professore per <span className="font-semibold text-accent-themed">{getSubjectLabel(selectedSubject)}</span>:</>
                    ) : (
                      <>Nessun professore specifico per questa materia. Scegli tra tutti i Professori:</>
                    )}
                  </p>
                  <div className="space-y-2">
                    {(availableMaestri.length > 0 ? availableMaestri : allMaestri).map((maestro) => (
                      <button
                        key={maestro.id}
                        onClick={() => handleMaestroSelect(maestro)}
                        className="w-full p-4 flex items-center gap-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:bg-accent-themed/5 transition-all text-left"
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
                        <ArrowRight className="h-5 w-5 text-accent-themed" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Mode Selection */}
              {step === 'mode' && selectedMaestro && (
                <motion.div
                  key="mode"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <Image
                        src={selectedMaestro.avatar}
                        alt={selectedMaestro.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedMaestro.name}</p>
                      <p className="text-sm text-slate-500">{selectedMaestro.specialty}</p>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Come preferisci interagire con {selectedMaestro.name}?
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleModeSelect('voice')}
                      className="p-6 flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:bg-accent-themed/5 transition-all"
                    >
                      <div className="w-16 h-16 rounded-full bg-accent-themed/10 flex items-center justify-center">
                        <Mic className="h-8 w-8 text-accent-themed" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">Voce</p>
                        <p className="text-sm text-slate-500">Parla con {selectedMaestro.name}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleModeSelect('chat')}
                      className="p-6 flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:bg-accent-themed/5 transition-all"
                    >
                      <div className="w-16 h-16 rounded-full bg-accent-themed/10 flex items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-accent-themed" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-lg">Chat</p>
                        <p className="text-sm text-slate-500">Scrivi a {selectedMaestro.name}</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer with back button */}
          {step !== 'subject' && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={handleBack} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Indietro
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
