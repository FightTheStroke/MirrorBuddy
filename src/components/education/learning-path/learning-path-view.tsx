'use client';

/**
 * Learning Path View
 * Main view for displaying a learning path with topics
 * Plan 8 MVP - Wave 4: UI Integration [F-22]
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  ChevronRight,
  Lock,
  CheckCircle2,
  PlayCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { VisualOverview } from './visual-overview';
import type { LearningPath, LearningPathTopic } from '@/types';

interface LearningPathViewProps {
  pathId: string;
  onBack?: () => void;
  onTopicSelect?: (topicId: string) => void;
  className?: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  basic: 'Base',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  basic: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function LearningPathView({
  pathId,
  onBack,
  onTopicSelect,
  className,
}: LearningPathViewProps) {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPath = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/learning-path/${pathId}`);
        if (!response.ok) {
          throw new Error('Failed to load learning path');
        }
        const data = await response.json();
        setPath(data.path);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchPath();
  }, [pathId]);

  const handleTopicClick = (topic: LearningPathTopic) => {
    if (topic.status === 'locked') return;
    onTopicSelect?.(topic.id);
  };

  const handleStartTopic = async (topicId: string) => {
    try {
      await fetch(`/api/learning-path/${pathId}/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      // Refresh path data
      const response = await fetch(`/api/learning-path/${pathId}`);
      const data = await response.json();
      setPath(data.path);
      onTopicSelect?.(topicId);
    } catch (err) {
      console.error('Failed to start topic', err);
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Caricamento percorso...</span>
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-red-600 dark:text-red-400">{error || 'Percorso non trovato'}</p>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4">
            Torna indietro
          </Button>
        )}
      </div>
    );
  }

  const currentTopic = path.topics.find(
    (t) => t.status === 'in_progress' || t.status === 'unlocked'
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-primary" />
              {path.title}
            </h1>
            {path.subject && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{path.subject}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span>{path.topics.length} argomenti</span>
              {path.estimatedTotalMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{path.estimatedTotalMinutes} min
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress summary */}
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{path.progressPercent}%</div>
          <p className="text-xs text-slate-500 mt-1">
            {path.completedTopics}/{path.totalTopics} completati
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={path.progressPercent} className="h-3" />

      {/* Visual Overview */}
      <VisualOverview
        topics={path.topics}
        title={path.title}
        onTopicClick={(topicId) => {
          const topic = path.topics.find((t) => t.id === topicId);
          if (topic) handleTopicClick(topic);
        }}
      />

      {/* Continue button */}
      {currentTopic && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {currentTopic.status === 'in_progress' ? 'Continua con' : 'Prossimo argomento'}
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                {currentTopic.title}
              </p>
            </div>
            <Button
              onClick={() => handleStartTopic(currentTopic.id)}
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              {currentTopic.status === 'in_progress' ? 'Continua' : 'Inizia'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Topics list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Argomenti</h2>

        {path.topics
          .sort((a, b) => a.order - b.order)
          .map((topic, index) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={index + 1}
              onClick={() => handleTopicClick(topic)}
              onStart={() => handleStartTopic(topic.id)}
            />
          ))}
      </div>
    </div>
  );
}

interface TopicCardProps {
  topic: LearningPathTopic;
  index: number;
  onClick: () => void;
  onStart: () => void;
}

function TopicCard({ topic, index, onClick, onStart }: TopicCardProps) {
  const isLocked = topic.status === 'locked';
  const isCompleted = topic.status === 'completed';
  const isActive = topic.status === 'in_progress' || topic.status === 'unlocked';

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.01 } : undefined}
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isLocked
          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
          : isCompleted
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary'
      )}
      onClick={!isLocked ? onClick : undefined}
    >
      <div className="flex items-start gap-4">
        {/* Order number / status icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
            isLocked
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              : isCompleted
                ? 'bg-green-500 text-white'
                : topic.status === 'in_progress'
                  ? 'bg-orange-500 text-white'
                  : 'bg-primary text-white'
          )}
        >
          {isLocked ? (
            <Lock className="w-4 h-4" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            index
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3
                className={cn(
                  'font-semibold',
                  isLocked
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-900 dark:text-white'
                )}
              >
                {topic.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {topic.description}
              </p>
            </div>

            {/* Right side actions */}
            {isActive && (
              <Button
                size="sm"
                variant={topic.status === 'in_progress' ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                className="flex-shrink-0"
              >
                {topic.status === 'in_progress' ? 'Continua' : 'Inizia'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {isCompleted && topic.quizScore !== undefined && (
              <div className="flex-shrink-0 text-right">
                <div className="text-lg font-bold text-green-600">{topic.quizScore}%</div>
                <div className="text-xs text-slate-500">Quiz</div>
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full',
                DIFFICULTY_COLORS[topic.difficulty] ||
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              )}
            >
              {DIFFICULTY_LABELS[topic.difficulty] || topic.difficulty}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              {topic.estimatedMinutes} min
            </span>
            {topic.keyConcepts.length > 0 && (
              <span className="text-slate-400 truncate">
                {topic.keyConcepts.slice(0, 3).join(' • ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { TopicCard };
