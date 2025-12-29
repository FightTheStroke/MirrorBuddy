'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  Lightbulb,
  CheckCircle,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import type { Homework, HomeworkStep } from '@/types';

interface HomeworkHelpProps {
  homework?: Homework;
  onSubmitPhoto: (photo: File) => Promise<Homework>;
  onCompleteStep: (stepId: string) => void;
  onAskQuestion: (question: string) => void;
}

export function HomeworkHelp({
  homework,
  onSubmitPhoto,
  onCompleteStep,
  onAskQuestion,
}: HomeworkHelpProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<Record<string, number>>({});
  const [question, setQuestion] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload and analyze
    setIsUploading(true);
    try {
      await onSubmitPhoto(file);
    } finally {
      setIsUploading(false);
    }
  }, [onSubmitPhoto]);

  // Handle webcam capture - convert base64 to File
  const handleWebcamCapture = useCallback(async (imageData: string) => {
    setShowWebcam(false);
    setPhotoPreview(imageData);

    // Convert base64 to File
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], 'homework-photo.jpg', { type: 'image/jpeg' });

    // Upload and analyze
    setIsUploading(true);
    try {
      await onSubmitPhoto(file);
    } finally {
      setIsUploading(false);
    }
  }, [onSubmitPhoto]);

  const handleShowNextHint = useCallback((stepId: string, totalHints: number) => {
    setShowHints(prev => ({
      ...prev,
      [stepId]: Math.min((prev[stepId] || 0) + 1, totalHints),
    }));
  }, []);

  const handleAskQuestion = useCallback(() => {
    if (question.trim()) {
      onAskQuestion(question);
      setQuestion('');
    }
  }, [question, onAskQuestion]);

  // Upload view (no homework yet)
  if (!homework) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aiuto Compiti</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Scatta una foto del tuo esercizio o problema e riceverai una guida passo-passo per risolverlo.
            </p>
          </div>

          {/* Photo preview */}
          {photoPreview && (
            <div className="relative mb-6 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded data URL */}
              <img src={photoPreview} alt="Preview" className="w-full" />
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Analizzo il problema...</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Upload buttons */}
          <div className="grid grid-cols-2 gap-4">
            {/* File picker input for gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <Button
              variant="outline"
              className="h-auto py-6 flex-col"
              onClick={() => setShowWebcam(true)}
              disabled={isUploading}
            >
              <Camera className="w-6 h-6 mb-2" />
              <span>Scatta foto</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col"
              onClick={() => {
                const input = document.getElementById('file-input') as HTMLInputElement;
                if (input) {
                  input.value = ''; // Reset to allow re-selection
                  input.click();
                }
              }}
              disabled={isUploading}
            >
              <Upload className="w-6 h-6 mb-2" />
              <span>Carica immagine</span>
            </Button>
          </div>

          {/* Webcam capture modal */}
          <AnimatePresence>
            {showWebcam && (
              <WebcamCapture
                purpose="Fotografa il compito"
                instructions="Posiziona l'esercizio nell'inquadratura. Usa il timer per avere tempo di sistemare il libro."
                onCapture={handleWebcamCapture}
                onClose={() => setShowWebcam(false)}
                showTimer={true}
              />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    );
  }

  // Steps view (homework loaded)
  const completedSteps = homework.steps.filter(s => s.completed).length;
  const progress = (completedSteps / homework.steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="mb-1">{homework.title}</CardTitle>
              <p className="text-sm text-slate-500">{homework.problemType}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-600">
                {completedSteps}/{homework.steps.length}
              </span>
              <p className="text-xs text-slate-500">passaggi completati</p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Original problem photo */}
      {homework.photoUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
              <ImageIcon className="w-4 h-4" />
              <span>Problema originale</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded data URL */}
            <img
              src={homework.photoUrl}
              alt="Problema"
              className="w-full rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {homework.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isExpanded={expandedStep === step.id}
            hintsShown={showHints[step.id] || 0}
            onToggle={() => setExpandedStep(
              expandedStep === step.id ? null : step.id
            )}
            onShowHint={() => handleShowNextHint(step.id, step.hints.length)}
            onComplete={() => onCompleteStep(step.id)}
          />
        ))}
      </div>

      {/* Ask question */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
            <MessageCircle className="w-4 h-4" />
            <span>Hai bisogno di aiuto?</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
              placeholder="Fai una domanda..."
              className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleAskQuestion} disabled={!question.trim()}>
              Chiedi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual step card
interface StepCardProps {
  step: HomeworkStep;
  index: number;
  isExpanded: boolean;
  hintsShown: number;
  onToggle: () => void;
  onShowHint: () => void;
  onComplete: () => void;
}

function StepCard({
  step,
  index,
  isExpanded,
  hintsShown,
  onToggle,
  onShowHint,
  onComplete,
}: StepCardProps) {
  return (
    <Card className={cn(
      'transition-all',
      step.completed && 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            step.completed
              ? 'bg-green-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          )}>
            {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
          </div>
          <span className={cn(
            'flex-1 font-medium',
            step.completed && 'text-green-700 dark:text-green-400'
          )}>
            {step.description}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && !step.completed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                {/* Hints */}
                {hintsShown > 0 && (
                  <div className="space-y-2 mb-4">
                    {step.hints.slice(0, hintsShown).map((hint, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">{hint}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  {hintsShown < step.hints.length ? (
                    <Button variant="ghost" size="sm" onClick={onShowHint}>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Suggerimento ({hintsShown + 1}/{step.hints.length})
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Tutti i suggerimenti mostrati
                    </span>
                  )}
                  <Button size="sm" onClick={onComplete}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Fatto
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
