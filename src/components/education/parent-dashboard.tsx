'use client';
// ============================================================================
// PARENT DASHBOARD (F-03)
// Shows student insights from Maestri interactions - visible ONLY to parents
// Issue #31: Collaborative Student Profile
// ============================================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Sprout,
  Lightbulb,
  Brain,
  Clock,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Ear,
  Hand,
  BookOpen,
  Sun,
  Moon,
  Sunset,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type {
  StudentInsights,
  MaestroObservation,
  LearningStrategy,
  LearningStyleProfile,
} from '@/types';

// ============================================================================
// EMPTY STATE COMPONENT (BUG 22 FIX: Removed mock data)
// ============================================================================

function EmptyInsightsState() {
  const { settings } = useAccessibilityStore();

  return (
    <div className={cn(
      'p-8 text-center rounded-xl border-2 border-dashed',
      settings.highContrast
        ? 'border-yellow-400 bg-gray-900'
        : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'
    )}>
      <Users className={cn(
        'w-12 h-12 mx-auto mb-4',
        settings.highContrast ? 'text-yellow-400' : 'text-slate-400'
      )} />
      <h3 className={cn(
        'text-lg font-semibold mb-2',
        settings.highContrast ? 'text-yellow-400' : 'text-slate-700 dark:text-slate-200'
      )}>
        Nessun dato disponibile
      </h3>
      <p className={cn(
        'text-sm max-w-md mx-auto',
        settings.highContrast ? 'text-white' : 'text-slate-500 dark:text-slate-400'
      )}>
        Il profilo dello studente verrà generato dopo alcune sessioni di studio con i Professori.
        Torna più tardi per vedere le osservazioni e i suggerimenti personalizzati.
      </p>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ObservationCardProps {
  observation: MaestroObservation;
  isStrength: boolean;
}

function ObservationCard({ observation, isStrength }: ObservationCardProps) {
  const { settings } = useAccessibilityStore();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-lg border',
        settings.highContrast
          ? 'border-yellow-400 bg-gray-900'
          : isStrength
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
            : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'text-sm font-medium',
                settings.highContrast
                  ? 'text-yellow-400'
                  : isStrength
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
              )}
            >
              {observation.maestroName}
            </span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                settings.highContrast
                  ? 'bg-gray-800 text-gray-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              {Math.round(observation.confidence * 100)}% sicuro
            </span>
          </div>
          <p
            className={cn(
              'text-sm',
              settings.highContrast ? 'text-white' : 'text-slate-700 dark:text-slate-300'
            )}
          >
            {observation.observation}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700"
          >
            <p className="text-xs text-slate-500">
              Osservato il {observation.createdAt.toLocaleDateString('it-IT')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface StrategyCardProps {
  strategy: LearningStrategy;
}

function StrategyCard({ strategy }: StrategyCardProps) {
  const { settings } = useAccessibilityStore();

  const priorityColors = {
    high: settings.highContrast
      ? 'border-yellow-400 bg-yellow-400/10'
      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
    medium: settings.highContrast
      ? 'border-gray-400 bg-gray-400/10'
      : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30',
    low: settings.highContrast
      ? 'border-gray-600 bg-gray-600/10'
      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900',
  };

  const priorityLabels = {
    high: 'Priorità alta',
    medium: 'Priorità media',
    low: 'Priorità bassa',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('p-4 rounded-lg border', priorityColors[strategy.priority])}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg shrink-0',
            settings.highContrast ? 'bg-yellow-400/20' : 'bg-blue-100 dark:bg-blue-900/30'
          )}
        >
          <Lightbulb
            className={cn(
              'w-5 h-5',
              settings.highContrast ? 'text-yellow-400' : 'text-blue-600 dark:text-blue-400'
            )}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                'font-medium',
                settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {strategy.title}
            </h4>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                settings.highContrast
                  ? 'bg-gray-800 text-yellow-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              {priorityLabels[strategy.priority]}
            </span>
          </div>
          <p
            className={cn(
              'text-sm',
              settings.highContrast ? 'text-gray-300' : 'text-slate-600 dark:text-slate-400'
            )}
          >
            {strategy.description}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Suggerito da: {strategy.suggestedBy.join(', ')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface LearningStyleCardProps {
  style: LearningStyleProfile;
}

function LearningStyleCard({ style }: LearningStyleCardProps) {
  const { settings } = useAccessibilityStore();

  const channelIcons = {
    visual: Eye,
    auditory: Ear,
    kinesthetic: Hand,
    reading_writing: BookOpen,
  };

  const channelLabels = {
    visual: 'Visivo',
    auditory: 'Uditivo',
    kinesthetic: 'Cinestetico',
    reading_writing: 'Lettura/Scrittura',
  };

  const timeIcons = {
    morning: Sun,
    afternoon: Sunset,
    evening: Moon,
  };

  const timeLabels = {
    morning: 'Mattina',
    afternoon: 'Pomeriggio',
    evening: 'Sera',
  };

  const ChannelIcon = channelIcons[style.preferredChannel];
  const TimeIcon = timeIcons[style.preferredTimeOfDay];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        className={cn(
          'p-4 rounded-lg text-center',
          settings.highContrast ? 'bg-gray-900 border border-yellow-400' : 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        <ChannelIcon
          className={cn(
            'w-8 h-8 mx-auto mb-2',
            settings.highContrast ? 'text-yellow-400' : 'text-blue-600 dark:text-blue-400'
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">Canale preferito</p>
        <p
          className={cn(
            'font-medium',
            settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
          )}
        >
          {channelLabels[style.preferredChannel]}
        </p>
      </div>

      <div
        className={cn(
          'p-4 rounded-lg text-center',
          settings.highContrast ? 'bg-gray-900 border border-yellow-400' : 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        <Clock
          className={cn(
            'w-8 h-8 mx-auto mb-2',
            settings.highContrast ? 'text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">Sessione ottimale</p>
        <p
          className={cn(
            'font-medium',
            settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
          )}
        >
          {style.optimalSessionDuration} min
        </p>
      </div>

      <div
        className={cn(
          'p-4 rounded-lg text-center',
          settings.highContrast ? 'bg-gray-900 border border-yellow-400' : 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        <TimeIcon
          className={cn(
            'w-8 h-8 mx-auto mb-2',
            settings.highContrast ? 'text-yellow-400' : 'text-amber-600 dark:text-amber-400'
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">Momento migliore</p>
        <p
          className={cn(
            'font-medium',
            settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
          )}
        >
          {timeLabels[style.preferredTimeOfDay]}
        </p>
      </div>

      <div
        className={cn(
          'p-4 rounded-lg text-center',
          settings.highContrast ? 'bg-gray-900 border border-yellow-400' : 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        <Brain
          className={cn(
            'w-8 h-8 mx-auto mb-2',
            settings.highContrast ? 'text-yellow-400' : 'text-purple-600 dark:text-purple-400'
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">Approccio</p>
        <p
          className={cn(
            'font-medium',
            settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
          )}
        >
          {style.challengePreference === 'step_by_step'
            ? 'Passo passo'
            : style.challengePreference === 'big_picture'
              ? 'Visione globale'
              : 'Misto'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ParentDashboardProps {
  insights?: StudentInsights;
  className?: string;
}

export function ParentDashboard({
  insights,
  className,
}: ParentDashboardProps) {
  const { settings } = useAccessibilityStore();

  const stats = useMemo(
    () => insights ? ({
      hours: Math.round(insights.totalMinutes / 60),
      sessions: insights.totalSessions,
      maestri: insights.maestriInteracted.length,
    }) : null,
    [insights]
  );

  // BUG 22 FIX: Show empty state when no insights data is available
  if (!insights) {
    return (
      <div className={cn(
        'p-6',
        settings.highContrast ? 'bg-black' : 'bg-slate-50 dark:bg-slate-950',
        className
      )}>
        <EmptyInsightsState />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-6 space-y-6',
        settings.highContrast ? 'bg-black' : 'bg-slate-50 dark:bg-slate-950',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              'text-2xl font-bold',
              settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white'
            )}
          >
            Profilo di {insights.studentName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ultimo aggiornamento: {insights.lastUpdated.toLocaleDateString('it-IT')}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
          <CardContent className="pt-6 text-center">
            <Clock
              className={cn(
                'w-8 h-8 mx-auto mb-2',
                settings.highContrast ? 'text-yellow-400' : 'text-blue-600 dark:text-blue-400'
              )}
            />
            <p
              className={cn(
                'text-3xl font-bold',
                settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {stats.hours}h
            </p>
            <p className="text-sm text-slate-500">Tempo totale</p>
          </CardContent>
        </Card>

        <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
          <CardContent className="pt-6 text-center">
            <TrendingUp
              className={cn(
                'w-8 h-8 mx-auto mb-2',
                settings.highContrast ? 'text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'
              )}
            />
            <p
              className={cn(
                'text-3xl font-bold',
                settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {stats.sessions}
            </p>
            <p className="text-sm text-slate-500">Sessioni</p>
          </CardContent>
        </Card>

        <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
          <CardContent className="pt-6 text-center">
            <Users
              className={cn(
                'w-8 h-8 mx-auto mb-2',
                settings.highContrast ? 'text-yellow-400' : 'text-purple-600 dark:text-purple-400'
              )}
            />
            <p
              className={cn(
                'text-3xl font-bold',
                settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
              )}
            >
              {stats.maestri}
            </p>
            <p className="text-sm text-slate-500">Maestri</p>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Growth Areas */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star
                className={cn(
                  'w-5 h-5',
                  settings.highContrast ? 'text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'
                )}
              />
              <span className={settings.highContrast ? 'text-yellow-400' : ''}>
                Punti di Forza
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.strengths.map((obs) => (
              <ObservationCard key={obs.id} observation={obs} isStrength={true} />
            ))}
          </CardContent>
        </Card>

        <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout
                className={cn(
                  'w-5 h-5',
                  settings.highContrast ? 'text-yellow-400' : 'text-amber-600 dark:text-amber-400'
                )}
              />
              <span className={settings.highContrast ? 'text-yellow-400' : ''}>
                Aree di Crescita
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.growthAreas.map((obs) => (
              <ObservationCard key={obs.id} observation={obs} isStrength={false} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Strategies */}
      <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb
              className={cn(
                'w-5 h-5',
                settings.highContrast ? 'text-yellow-400' : 'text-blue-600 dark:text-blue-400'
              )}
            />
            <span className={settings.highContrast ? 'text-yellow-400' : ''}>
              Strategie Suggerite
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} />
          ))}
        </CardContent>
      </Card>

      {/* Learning Style */}
      <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain
              className={cn(
                'w-5 h-5',
                settings.highContrast ? 'text-yellow-400' : 'text-purple-600 dark:text-purple-400'
              )}
            />
            <span className={settings.highContrast ? 'text-yellow-400' : ''}>
              Stile di Apprendimento
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LearningStyleCard style={insights.learningStyle} />

          {/* Motivators */}
          <div className="mt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Cosa lo motiva:</p>
            <div className="flex flex-wrap gap-2">
              {insights.learningStyle.motivators.map((motivator, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm',
                    settings.highContrast
                      ? 'bg-yellow-400/20 text-yellow-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  )}
                >
                  {motivator}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ParentDashboard;
