'use client';

/**
 * Topic Detail View
 * Expandable topic view with internal steps (overview, mindmap, flashcard, quiz)
 * Plan 8 MVP - Wave 4: UI Integration [F-23]
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Loader2,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth/csrf-client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { LearningPathTopic, TopicStep } from '@/types';
import { StepCard } from './topic-detail/step-card';

interface TopicDetailProps {
  pathId: string;
  topicId: string;
  onBack?: () => void;
  onComplete?: () => void;
  className?: string;
}

export function TopicDetail({
  pathId,
  topicId,
  onBack,
  onComplete,
  className,
}: TopicDetailProps) {
  const [topic, setTopic] = useState<LearningPathTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/learning-path/${pathId}/topics/${topicId}`);
        if (!response.ok) {
          throw new Error('Failed to load topic');
        }
        const data = await response.json();
        setTopic(data.topic);

        // Find first incomplete step
        const firstIncomplete = data.topic.steps?.findIndex((s: TopicStep) => !s.isCompleted) ?? 0;
        setActiveStepIndex(Math.max(0, firstIncomplete));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchTopic();
  }, [pathId, topicId]);

  const handleStepComplete = async (stepId: string) => {
    if (!topic) return;

    // Store previous state for rollback
    const previousTopic = topic;
    const previousStepIndex = activeStepIndex;

    // Optimistic update
    setTopic((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.id === stepId ? { ...s, isCompleted: true, completedAt: new Date() } : s
        ),
      };
    });

    // Move to next step
    const currentIndex = topic.steps.findIndex((s) => s.id === stepId);
    if (currentIndex < topic.steps.length - 1) {
      setActiveStepIndex(currentIndex + 1);
    }

    // Check if all steps complete
    const allComplete = topic.steps.every((s) => s.id === stepId || s.isCompleted);
    if (allComplete) {
      try {
        await csrfFetch(`/api/learning-path/${pathId}/topics/${topicId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        });
        onComplete?.();
      } catch (err) {
        logger.error('Failed to complete topic', {
          topicId,
          pathId,
          error: err instanceof Error ? err.message : String(err),
        });
        // Revert optimistic update on error
        setTopic(previousTopic);
        setActiveStepIndex(previousStepIndex);
      }
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Caricamento argomento...</span>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-red-600 dark:text-red-400">{error || 'Argomento non trovato'}</p>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4">
            Torna indietro
          </Button>
        )}
      </div>
    );
  }

  const completedSteps = topic.steps.filter((s) => s.isCompleted).length;
  const progressPercent = topic.steps.length > 0
    ? Math.round((completedSteps / topic.steps.length) * 100)
    : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{topic.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{topic.description}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {topic.estimatedMinutes} min
            </span>
            <span>
              {completedSteps}/{topic.steps.length} passaggi completati
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">Progresso</span>
          <span className="font-medium text-slate-900 dark:text-white">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Key concepts */}
      {(() => {
        const concepts: string[] = typeof topic.keyConcepts === 'string'
          ? JSON.parse(topic.keyConcepts || '[]')
          : (topic.keyConcepts ?? []);
        return concepts.length > 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Concetti chiave
            </h3>
            <div className="flex flex-wrap gap-2">
              {concepts.map((concept, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs bg-white dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Steps */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Passaggi</h2>

        {topic.steps.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            Nessun passaggio disponibile per questo argomento
          </p>
        ) : (
          topic.steps
            .sort((a, b) => a.order - b.order)
            .map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index + 1}
                isActive={index === activeStepIndex}
                isExpanded={expandedSteps.has(step.id)}
                onToggle={() => toggleStepExpanded(step.id)}
                onComplete={() => handleStepComplete(step.id)}
                onSelect={() => setActiveStepIndex(index)}
              />
            ))
        )}
      </div>
    </div>
  );
}

export { StepCard };
export { StepContent } from './topic-detail/step-content';
