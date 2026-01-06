import { useState, useCallback } from 'react';
import { logger as _logger } from '@/lib/logger';
import { useVoiceSessionStore } from '@/lib/stores';
import { useHomeworkSessions, type SavedHomework as _SavedHomework } from '@/lib/hooks/use-saved-materials';
import type { Homework, Subject, Maestro } from '@/types';
import { fileToBase64, toHomework } from '../utils';
import { MAIEUTIC_SYSTEM_PROMPT } from '../constants';

export function useHomeworkHelp() {
  const [currentHomework, setCurrentHomework] = useState<Homework | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [detectedSubject, setDetectedSubject] = useState<Subject>('mathematics');
  const [pendingHomework, setPendingHomework] = useState<Homework | null>(null);
  const [connectedMaestro, setConnectedMaestro] = useState<Maestro | null>(null);

  const { setCurrentMaestro } = useVoiceSessionStore();

  const {
    sessions: homeworkHistory,
    loading: historyLoading,
    saveSession,
    updateSession,
    deleteSession,
  } = useHomeworkSessions();

  const displayHistory = homeworkHistory.map(toHomework);

  const handleSubjectConfirm = useCallback(async (subject: Subject, maestro: Maestro | null) => {
    if (!pendingHomework) return;

    const confirmedHomework: Homework = {
      ...pendingHomework,
      subject,
    };

    setCurrentHomework(confirmedHomework);

    await saveSession({
      title: confirmedHomework.title,
      subject: confirmedHomework.subject,
      problemType: confirmedHomework.problemType,
      photoUrl: confirmedHomework.photoUrl,
      steps: confirmedHomework.steps,
      completedAt: confirmedHomework.completedAt,
    });

    setShowSubjectDialog(false);
    setPendingHomework(null);

    if (maestro) {
      setConnectedMaestro(maestro);
      setCurrentMaestro(maestro);
    }
  }, [pendingHomework, saveSession, setCurrentMaestro]);

  const handleSubmitPhoto = useCallback(async (photo: File): Promise<Homework> => {
    const base64 = await fileToBase64(photo);

    const response = await fetch('/api/homework/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        systemPrompt: MAIEUTIC_SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      const mockHomework: Homework = {
        id: crypto.randomUUID(),
        title: 'Problema da analizzare',
        subject: 'mathematics' as Subject,
        problemType: 'Esercizio',
        photoUrl: base64,
        steps: [
          {
            id: '1',
            description: 'Leggi attentamente il problema e identifica i dati',
            hints: [
              'Cosa ti viene chiesto di trovare?',
              'Quali numeri o valori sono forniti?',
              'Ci sono relazioni tra questi dati?',
            ],
            studentNotes: '',
            completed: false,
          },
          {
            id: '2',
            description: 'Individua la formula o il metodo da applicare',
            hints: [
              'Che tipo di problema è?',
              'Quali formule conosci per questo tipo di problema?',
              'Come si collegano i dati alla formula?',
            ],
            studentNotes: '',
            completed: false,
          },
          {
            id: '3',
            description: 'Applica il metodo passo dopo passo',
            hints: [
              'Qual è il primo calcolo da fare?',
              'Stai usando le unità di misura corrette?',
              'Il risultato intermedio ha senso?',
            ],
            studentNotes: '',
            completed: false,
          },
          {
            id: '4',
            description: 'Verifica il risultato',
            hints: [
              'Il risultato risponde alla domanda?',
              'Ha senso nel contesto del problema?',
              'Hai incluso le unità di misura?',
            ],
            studentNotes: '',
            completed: false,
          },
        ],
        createdAt: new Date(),
      };

      setPendingHomework(mockHomework);
      setDetectedSubject(mockHomework.subject);
      setShowSubjectDialog(true);
      return mockHomework;
    }

    const data = await response.json();
    const homework: Homework = {
      id: crypto.randomUUID(),
      title: data.title || 'Problema da risolvere',
      subject: data.subject || 'mathematics',
      problemType: data.problemType || 'Esercizio',
      photoUrl: base64,
      steps: data.steps || [],
      createdAt: new Date(),
    };

    setPendingHomework(homework);
    setDetectedSubject(homework.subject);
    setShowSubjectDialog(true);
    return homework;
  }, []);

  const handleCompleteStep = useCallback(async (stepId: string) => {
    if (!currentHomework) return;

    const updatedHomework: Homework = {
      ...currentHomework,
      steps: currentHomework.steps.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      ),
    };

    const allCompleted = updatedHomework.steps.every(s => s.completed);
    if (allCompleted) {
      updatedHomework.completedAt = new Date();
    }

    setCurrentHomework(updatedHomework);

    await updateSession({
      id: updatedHomework.id,
      title: updatedHomework.title,
      subject: updatedHomework.subject,
      problemType: updatedHomework.problemType,
      photoUrl: updatedHomework.photoUrl,
      steps: updatedHomework.steps,
      createdAt: updatedHomework.createdAt,
      completedAt: updatedHomework.completedAt,
    });
  }, [currentHomework, updateSession]);

  const loadHomework = useCallback((homework: Homework) => {
    setCurrentHomework(homework);
    setShowHistory(false);
  }, []);

  const deleteHomework = useCallback(async (id: string) => {
    await deleteSession(id);
    if (currentHomework?.id === id) {
      setCurrentHomework(null);
    }
  }, [currentHomework, deleteSession]);

  const startNew = useCallback(() => {
    setCurrentHomework(null);
  }, []);

  return {
    currentHomework,
    showHistory,
    setShowHistory,
    showSubjectDialog,
    setShowSubjectDialog,
    detectedSubject,
    pendingHomework,
    setPendingHomework,
    connectedMaestro,
    displayHistory,
    historyLoading,
    handleSubjectConfirm,
    handleSubmitPhoto,
    handleCompleteStep,
    loadHomework,
    deleteHomework,
    startNew,
  };
}

