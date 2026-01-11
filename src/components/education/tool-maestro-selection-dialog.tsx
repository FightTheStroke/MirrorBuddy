'use client';

/**
 * ToolMaestroSelectionDialog - Modal for selecting subject/professore before entering tool focus mode
 * Shows subject selection, then professore selection for that subject
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubjectSelectionStep } from './components/subject-selection-step';
import { MaestroSelectionStep } from './components/maestro-selection-step';
import { getMaestriBySubject, getAllSubjects, maestri as allMaestri } from '@/data';
import type { Subject, Maestro } from '@/types';
import type { ToolType } from '@/types/tools';

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
  'study-kit': 'Study Kit',
};

interface ToolMaestroSelectionDialogProps {
  isOpen: boolean;
  toolType: ToolType;
  onConfirm: (maestro: Maestro, mode: 'voice' | 'chat') => void;
  onClose: () => void;
}

type Step = 'subject' | 'maestro';

export function ToolMaestroSelectionDialog({
  isOpen,
  toolType,
  onConfirm,
  onClose,
}: ToolMaestroSelectionDialogProps) {
  const [step, setStep] = useState<Step>('subject');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [_selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);
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
      // Auto-select if only one maestro and confirm immediately with chat mode
      setSelectedMaestro(maestri[0]);
      onConfirm(maestri[0], 'chat');
      // Reset state
      setStep('subject');
      setSelectedSubject(null);
      setSelectedMaestro(null);
    } else if (maestri.length > 1) {
      setStep('maestro');
    } else {
      // No maestro for this subject, show all maestri
      setStep('maestro');
    }
  }, [onConfirm]);

  const handleMaestroSelect = useCallback((maestro: Maestro) => {
    setSelectedMaestro(maestro);
    // Confirm immediately with chat mode
    onConfirm(maestro, 'chat');
    // Reset state
    setStep('subject');
    setSelectedSubject(null);
    setSelectedMaestro(null);
  }, [onConfirm]);

  const handleBack = useCallback(() => {
    if (step === 'maestro') {
      setStep('subject');
      setSelectedSubject(null);
    }
  }, [step]);

  const handleClose = useCallback(() => {
    setStep('subject');
    setSelectedSubject(null);
    setSelectedMaestro(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
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
              <h2 id="dialog-title" className="text-lg font-semibold">
                {step === 'subject' && `Crea ${toolLabel} - Scegli Materia`}
                {step === 'maestro' && `Crea ${toolLabel} - Scegli Professore`}
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
              {step === 'subject' && (
                <SubjectSelectionStep
                  toolType={toolType}
                  subjects={allSubjects}
                  onSubjectSelect={handleSubjectSelect}
                />
              )}

              {step === 'maestro' && (
                <MaestroSelectionStep
                  selectedSubject={selectedSubject}
                  availableMaestri={availableMaestri}
                  allMaestri={allMaestri}
                  onMaestroSelect={handleMaestroSelect}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Footer with back button */}
          {step === 'maestro' && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={handleBack} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Indietro
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
