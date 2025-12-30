'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  TrendingUp,
  BookOpen,
  Clock,
  Users,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Eye,
  Ear,
  Hand,
  FileText,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  StudentInsights,
  MaestroObservation,
  LearningStrategy,
  LearningStyleProfile,
  ObservationCategory,
} from '@/types';

// Italian labels for observation categories
const CATEGORY_LABELS: Record<ObservationCategory, string> = {
  logical_reasoning: 'Ragionamento Logico',
  mathematical_intuition: 'Intuizione Matematica',
  critical_thinking: 'Pensiero Critico',
  study_method: 'Metodo di Studio',
  verbal_expression: 'Espressione Verbale',
  linguistic_ability: 'Abilita Linguistiche',
  creativity: 'Creativita',
  artistic_sensitivity: 'Sensibilita Artistica',
  scientific_curiosity: 'Curiosita Scientifica',
  experimental_approach: 'Approccio Sperimentale',
  spatial_memory: 'Memoria Spaziale',
  historical_understanding: 'Comprensione Storica',
  philosophical_depth: 'Profondita Filosofica',
  physical_awareness: 'Consapevolezza Corporea',
  environmental_awareness: 'Consapevolezza Ambientale',
  narrative_skill: 'Abilita Narrative',
  collaborative_spirit: 'Spirito Collaborativo',
};

// Learning channel icons and labels
const CHANNEL_CONFIG = {
  visual: { icon: Eye, label: 'Visivo', color: 'text-blue-500' },
  auditory: { icon: Ear, label: 'Uditivo', color: 'text-purple-500' },
  kinesthetic: { icon: Hand, label: 'Cinestetico', color: 'text-green-500' },
  reading_writing: { icon: FileText, label: 'Lettura/Scrittura', color: 'text-orange-500' },
};

// Time of day icons
const TIME_CONFIG = {
  morning: { icon: Sun, label: 'Mattina' },
  afternoon: { icon: Sunset, label: 'Pomeriggio' },
  evening: { icon: Moon, label: 'Sera' },
};

interface ParentDashboardProps {
  insights: StudentInsights;
}

export function ParentDashboard({ insights }: ParentDashboardProps) {
  const [expandedStrengths, setExpandedStrengths] = useState(false);
  const [expandedGrowth, setExpandedGrowth] = useState(false);

  const channel = CHANNEL_CONFIG[insights.learningStyle.preferredChannel];
  const timeOfDay = TIME_CONFIG[insights.learningStyle.preferredTimeOfDay];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Profilo di {insights.studentName}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Ultimo aggiornamento: {insights.lastUpdated.toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <Clock className="h-5 w-5 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-600">{insights.totalMinutes}</p>
            <p className="text-xs text-blue-600/80">Minuti di studio</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <BookOpen className="h-5 w-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{insights.totalSessions}</p>
            <p className="text-xs text-green-600/80">Sessioni completate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <Users className="h-5 w-5 text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-purple-600">{insights.maestriInteracted.length}</p>
            <p className="text-xs text-purple-600/80">Maestri incontrati</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <Star className="h-5 w-5 text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-amber-600">{insights.strengths.length}</p>
            <p className="text-xs text-amber-600/80">Punti di forza</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-amber-500" />
              Punti di Forza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.strengths.slice(0, expandedStrengths ? undefined : 3).map((obs) => (
                <ObservationCard key={obs.id} observation={obs} isStrength />
              ))}
              {insights.strengths.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedStrengths(!expandedStrengths)}
                  className="w-full"
                >
                  {expandedStrengths ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Mostra meno
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Mostra tutti ({insights.strengths.length})
                    </>
                  )}
                </Button>
              )}
              {insights.strengths.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  I Maestri stanno ancora osservando. Torna presto!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Growth Areas Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Aree di Crescita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.growthAreas.slice(0, expandedGrowth ? undefined : 3).map((obs) => (
                <ObservationCard key={obs.id} observation={obs} isStrength={false} />
              ))}
              {insights.growthAreas.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedGrowth(!expandedGrowth)}
                  className="w-full"
                >
                  {expandedGrowth ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Mostra meno
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Mostra tutte ({insights.growthAreas.length})
                    </>
                  )}
                </Button>
              )}
              {insights.growthAreas.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nessuna area di crescita identificata ancora.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Style Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Stile di Apprendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Preferred Channel */}
            <div className="flex items-center gap-4">
              <div className={cn('p-3 rounded-xl bg-slate-100 dark:bg-slate-800', channel.color)}>
                <channel.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Canale Preferito</p>
                <p className="font-semibold">{channel.label}</p>
              </div>
            </div>

            {/* Optimal Duration */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-green-500">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Durata Ottimale</p>
                <p className="font-semibold">{insights.learningStyle.optimalSessionDuration} minuti</p>
              </div>
            </div>

            {/* Preferred Time */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-amber-500">
                <timeOfDay.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Momento Migliore</p>
                <p className="font-semibold">{timeOfDay.label}</p>
              </div>
            </div>
          </div>

          {/* Motivators */}
          {insights.learningStyle.motivators.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-slate-500 mb-2">Cosa lo motiva</p>
              <div className="flex flex-wrap gap-2">
                {insights.learningStyle.motivators.map((motivator, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  >
                    {motivator}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategies Section */}
      {insights.strategies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-blue-500" />
              Strategie Suggerite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.strategies.map((strategy) => (
                <StrategyCard key={strategy.id} strategy={strategy} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Observation card component
function ObservationCard({
  observation,
  isStrength,
}: {
  observation: MaestroObservation;
  isStrength: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-lg border',
        isStrength
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
          : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isStrength
              ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
              : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
          )}>
            {CATEGORY_LABELS[observation.category]}
          </span>
          <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">
            {observation.observation}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Osservato da {observation.maestroName}
      </p>
    </motion.div>
  );
}

// Strategy card component
function StrategyCard({ strategy }: { strategy: LearningStrategy }) {
  const priorityColors = {
    high: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10',
    medium: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10',
    low: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10',
  };

  const priorityLabels = {
    high: 'Priorita Alta',
    medium: 'Priorita Media',
    low: 'Priorita Bassa',
  };

  return (
    <div className={cn('p-4 rounded-lg border', priorityColors[strategy.priority])}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-900 dark:text-white">{strategy.title}</h4>
        <span className="text-xs text-slate-500">{priorityLabels[strategy.priority]}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{strategy.description}</p>
      {strategy.forAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {strategy.forAreas.map((area) => (
            <span
              key={area}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              {CATEGORY_LABELS[area]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Export index
export { ParentDashboard as default };
