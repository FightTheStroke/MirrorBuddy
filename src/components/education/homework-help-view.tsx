'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Trash2,
  X,
  MessageCircle,
  Send,
  Loader2,
  CheckCircle,
  GraduationCap,
} from 'lucide-react';
import { HomeworkHelp } from './homework-help';
import { SubjectConfirmationDialog } from './subject-confirmation-dialog';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useVoiceSessionStore } from '@/lib/stores/app-store';
import type { Homework, Subject, Maestro } from '@/types';

interface MaieuticMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StoredHomework extends Omit<Homework, 'createdAt' | 'completedAt'> {
  createdAt: string;
  completedAt?: string;
}

const STORAGE_KEY = 'convergio_homework_sessions';

// Maieutic system prompt for homework help
const MAIEUTIC_SYSTEM_PROMPT = `Sei un tutor educativo che usa il metodo maieutico (socratico).
Il tuo obiettivo NON è dare le risposte, ma guidare lo studente a trovare la soluzione da solo.

Quando analizzi un problema:
1. Identifica i concetti chiave necessari
2. Crea passaggi logici che guidano verso la soluzione
3. Per ogni passaggio, prepara suggerimenti progressivi (dal più generico al più specifico)

Quando lo studente fa domande:
- Rispondi sempre con domande che lo guidano a ragionare
- Mai rivelare la risposta direttamente
- Usa esempi simili per chiarire concetti
- Celebra i progressi e incoraggia

Rispondi SEMPRE in italiano.`;

export function HomeworkHelpView() {
  const [currentHomework, setCurrentHomework] = useState<Homework | null>(null);
  const [homeworkHistory, setHomeworkHistory] = useState<Homework[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [maieuticChat, setMaieuticChat] = useState<MaieuticMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Subject confirmation dialog state
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [detectedSubject, setDetectedSubject] = useState<Subject>('mathematics');
  const [pendingHomework, setPendingHomework] = useState<Homework | null>(null);
  const [connectedMaestro, setConnectedMaestro] = useState<Maestro | null>(null);

  const { setCurrentMaestro } = useVoiceSessionStore();

  // Load homework history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredHomework[] = JSON.parse(stored);
        const homework = parsed.map(h => ({
          ...h,
          createdAt: new Date(h.createdAt),
          completedAt: h.completedAt ? new Date(h.completedAt) : undefined,
        }));
        setHomeworkHistory(homework);
      } catch (e) {
        logger.error('Failed to parse homework history', { error: String(e) });
      }
    }
  }, []);

  // Save homework history to localStorage
  const saveHistory = useCallback((history: Homework[]) => {
    const toStore: StoredHomework[] = history.map(h => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
      completedAt: h.completedAt?.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    setHomeworkHistory(history);
  }, []);

  // Handle subject confirmation from dialog
  const handleSubjectConfirm = useCallback((subject: Subject, maestro: Maestro | null) => {
    if (!pendingHomework) return;

    // Update homework with confirmed subject
    const confirmedHomework: Homework = {
      ...pendingHomework,
      subject,
    };

    setCurrentHomework(confirmedHomework);
    saveHistory([confirmedHomework, ...homeworkHistory]);
    setShowSubjectDialog(false);
    setPendingHomework(null);

    // If a Maestro was selected, set them as the current Maestro
    if (maestro) {
      setConnectedMaestro(maestro);
      setCurrentMaestro(maestro);
    }
  }, [pendingHomework, homeworkHistory, saveHistory, setCurrentMaestro]);

  // Analyze photo and create homework with maieutic approach
  const handleSubmitPhoto = useCallback(async (photo: File): Promise<Homework> => {
    // Convert to base64
    const base64 = await fileToBase64(photo);

    // Call vision API to analyze problem
    const response = await fetch('/api/homework/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        systemPrompt: MAIEUTIC_SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      // Fallback: create mock homework for demo
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

      // Show subject confirmation dialog
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

    // Show subject confirmation dialog
    setPendingHomework(homework);
    setDetectedSubject(homework.subject);
    setShowSubjectDialog(true);
    return homework;
  }, []);

  // Complete a step
  const handleCompleteStep = useCallback((stepId: string) => {
    if (!currentHomework) return;

    const updatedHomework = {
      ...currentHomework,
      steps: currentHomework.steps.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      ),
    };

    // Check if all steps completed
    const allCompleted = updatedHomework.steps.every(s => s.completed);
    if (allCompleted) {
      updatedHomework.completedAt = new Date();
    }

    setCurrentHomework(updatedHomework);

    // Update in history
    const updatedHistory = homeworkHistory.map(h =>
      h.id === updatedHomework.id ? updatedHomework : h
    );
    saveHistory(updatedHistory);
  }, [currentHomework, homeworkHistory, saveHistory]);

  // Ask maieutic question
  const handleAskQuestion = useCallback((question: string) => {
    setMaieuticChat(prev => [...prev, {
      role: 'user',
      content: question,
      timestamp: new Date(),
    }]);
    setChatInput('');

    // Trigger API call - deferred to avoid declaration order issue
    setTimeout(() => sendMaieuticMessage(question), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sendMaieuticMessage defined after
  }, []);

  // Build system prompt for maieutic chat - use Maestro if connected
  const getMaieuticSystemPrompt = useCallback(() => {
    const basePrompt = connectedMaestro
      ? `Sei ${connectedMaestro.name}, ${connectedMaestro.specialty}. ${connectedMaestro.teachingStyle}

${MAIEUTIC_SYSTEM_PROMPT}`
      : MAIEUTIC_SYSTEM_PROMPT;

    // Add homework context to system prompt
    if (currentHomework) {
      return `${basePrompt}

CONTESTO DEL PROBLEMA:
- Titolo: ${currentHomework.title}
- Tipo: ${currentHomework.problemType}
- Passaggi: ${currentHomework.steps.map((s, i) => `${i + 1}. ${s.description} (${s.completed ? 'completato' : 'da fare'})`).join('\n')}

Guida lo studente attraverso questi passaggi usando domande maieutiche. Non dare risposte dirette.`;
    }

    return basePrompt;
  }, [connectedMaestro, currentHomework]);

  // Send message to maieutic API
  const sendMaieuticMessage = useCallback(async (message: string) => {
    setIsLoadingChat(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...maieuticChat.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message },
          ],
          systemPrompt: getMaieuticSystemPrompt(),
          maestroId: connectedMaestro?.id || 'maieutic',
          enableTools: false, // No tools for maieutic chat
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      setMaieuticChat(prev => [...prev, {
        role: 'assistant',
        content: data.content || 'Mi dispiace, non ho capito. Puoi riformulare la domanda?',
        timestamp: new Date(),
      }]);
    } catch (err) {
      logger.error('Maieutic chat error', { error: String(err) });
      setMaieuticChat(prev => [...prev, {
        role: 'assistant',
        content: 'Scusa, c\'è stato un problema. Prova a riformulare la domanda.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  }, [maieuticChat, getMaieuticSystemPrompt, connectedMaestro]);

  // Handle chat submit
  const handleChatSubmit = useCallback(() => {
    if (!chatInput.trim() || isLoadingChat) return;

    setMaieuticChat(prev => [...prev, {
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    }]);
    sendMaieuticMessage(chatInput);
    setChatInput('');
  }, [chatInput, isLoadingChat, sendMaieuticMessage]);

  // Load homework from history
  const loadHomework = useCallback((homework: Homework) => {
    setCurrentHomework(homework);
    setMaieuticChat([]);
    setShowHistory(false);
  }, []);

  // Delete homework from history
  const deleteHomework = useCallback((id: string) => {
    const updated = homeworkHistory.filter(h => h.id !== id);
    saveHistory(updated);
    if (currentHomework?.id === id) {
      setCurrentHomework(null);
    }
  }, [currentHomework, homeworkHistory, saveHistory]);

  // Start new homework
  const startNew = useCallback(() => {
    setCurrentHomework(null);
    setMaieuticChat([]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Materiali di Studio
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Metodo maieutico: ti guido a trovare la soluzione da solo
          </p>
          {/* Connected Maestro badge */}
          {connectedMaestro && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: connectedMaestro.color }}
              >
                {connectedMaestro.avatar}
              </div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Con {connectedMaestro.name}
              </span>
              <GraduationCap className="w-4 h-4 text-blue-500" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {currentHomework && (
            <Button variant="outline" onClick={startNew}>
              Nuovo problema
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className={cn(showHistory && 'bg-slate-100 dark:bg-slate-800')}
          >
            <History className="w-4 h-4 mr-2" />
            Cronologia ({homeworkHistory.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className={cn('lg:col-span-2', showHistory && 'lg:col-span-2')}>
          {/* Subject Confirmation - shown inline after photo capture */}
          {showSubjectDialog ? (
            <SubjectConfirmationDialog
              key={pendingHomework?.id || detectedSubject}
              detectedSubject={detectedSubject}
              isOpen={showSubjectDialog}
              photoPreview={pendingHomework?.photoUrl}
              onConfirm={handleSubjectConfirm}
              onClose={() => {
                setShowSubjectDialog(false);
                setPendingHomework(null);
              }}
            />
          ) : (
            <HomeworkHelp
              homework={currentHomework || undefined}
              onSubmitPhoto={handleSubmitPhoto}
              onCompleteStep={handleCompleteStep}
              onAskQuestion={handleAskQuestion}
            />
          )}
        </div>

        {/* Sidebar: History or Chat */}
        <div className="space-y-4">
          {/* History panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Cronologia</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowHistory(false)}
                        aria-label="Chiudi cronologia"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                    {homeworkHistory.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Nessun problema salvato
                      </p>
                    ) : (
                      homeworkHistory.map(hw => (
                        <div
                          key={hw.id}
                          className={cn(
                            'p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group',
                            currentHomework?.id === hw.id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          )}
                          onClick={() => loadHomework(hw)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {hw.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {hw.steps.filter(s => s.completed).length}/{hw.steps.length} passaggi
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                {new Date(hw.createdAt).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {hw.completedAt && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteHomework(hw.id);
                                }}
                                aria-label="Elimina problema"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Maieutic chat */}
          {currentHomework && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  Dialogo Maieutico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                  {maieuticChat.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-500">
                        Hai dubbi? Chiedimi aiuto!
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ti guiderò con domande
                      </p>
                    </div>
                  ) : (
                    maieuticChat.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'p-3 rounded-lg text-sm',
                          msg.role === 'user'
                            ? 'bg-accent-themed text-white ml-8'
                            : 'bg-slate-100 dark:bg-slate-800 mr-8'
                        )}
                      >
                        {msg.content}
                      </motion.div>
                    ))
                  )}
                  {isLoadingChat && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sto pensando...
                    </div>
                  )}
                </div>

                {/* Chat input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Fai una domanda..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoadingChat}
                  />
                  <Button
                    size="sm"
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || isLoadingChat}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}

// Utility: Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
