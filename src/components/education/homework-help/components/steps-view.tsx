/**
 * @file steps-view.tsx
 * @brief Steps view component
 */

import { ImageIcon, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Homework } from '@/types';
import { HomeworkHeader } from './homework-header';
import { StepCard } from './step-card';

interface StepsViewProps {
  homework: Homework;
  expandedStep: string | null;
  showHints: Record<string, number>;
  question: string;
  onToggleStep: (stepId: string) => void;
  onShowHint: (stepId: string, totalHints: number) => void;
  onCompleteStep: (stepId: string) => void;
  onQuestionChange: (question: string) => void;
  onAskQuestion: () => void;
}

export function StepsView({
  homework,
  expandedStep,
  showHints,
  question,
  onToggleStep,
  onShowHint,
  onCompleteStep,
  onQuestionChange,
  onAskQuestion,
}: StepsViewProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <HomeworkHeader homework={homework} />

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

      <div className="space-y-3">
        {homework.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isExpanded={expandedStep === step.id}
            hintsShown={showHints[step.id] || 0}
            onToggle={() =>
              onToggleStep(expandedStep === step.id ? '' : step.id)
            }
            onShowHint={() => onShowHint(step.id, step.hints.length)}
            onComplete={() => onCompleteStep(step.id)}
          />
        ))}
      </div>

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
              onChange={(e) => onQuestionChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAskQuestion()}
              placeholder="Fai una domanda..."
              className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={onAskQuestion} disabled={!question.trim()}>
              Chiedi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

