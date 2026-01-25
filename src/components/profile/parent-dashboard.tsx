'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import type { StudentInsights } from '@/types';
import { CATEGORY_LABELS } from './parent-dashboard/constants';
import { ObservationCard } from './parent-dashboard/observation-card';
import { StrategyCard } from './parent-dashboard/strategy-card';

interface ParentDashboardProps {
  insights: StudentInsights;
}

export function ParentDashboard({ insights }: ParentDashboardProps) {
  const t = useTranslations('parent-dashboard');
  const [expandedStrengths, setExpandedStrengths] = useState(false);
  const [expandedGrowth, setExpandedGrowth] = useState(false);

  // Learning channel icons and labels (dynamic with translations)
  const CHANNEL_CONFIG = {
    visual: { icon: Eye, label: t('learningChannelVisual'), color: 'text-blue-500' },
    auditory: { icon: Ear, label: t('learningChannelAuditory'), color: 'text-purple-500' },
    kinesthetic: { icon: Hand, label: t('learningChannelKinesthetic'), color: 'text-green-500' },
    reading_writing: { icon: FileText, label: t('learningChannelReadingWriting'), color: 'text-orange-500' },
  };

  // Time of day icons (dynamic with translations)
  const TIME_CONFIG = {
    morning: { icon: Sun, label: t('timeOfDayMorning') },
    afternoon: { icon: Sunset, label: t('timeOfDayAfternoon') },
    evening: { icon: Moon, label: t('timeOfDayEvening') },
  };

  const channel = CHANNEL_CONFIG[insights.learningStyle.preferredChannel];
  const timeOfDay = TIME_CONFIG[insights.learningStyle.preferredTimeOfDay];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('profileTitle', { name: insights.studentName })}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('lastUpdated', {
              date: insights.lastUpdated.toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
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
            <p className="text-xs text-blue-600/80">{t('studyMinutes')}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <BookOpen className="h-5 w-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{insights.totalSessions}</p>
            <p className="text-xs text-green-600/80">{t('completedSessions')}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <Users className="h-5 w-5 text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-purple-600">{insights.maestriInteracted.length}</p>
            <p className="text-xs text-purple-600/80">{t('maestriMet')}</p>
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
                  I Professori stanno ancora osservando. Torna presto!
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
            {insights.growthAreas.length > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                Aree dove {insights.studentName.split(' ')[0]} puo migliorare con il giusto supporto
              </p>
            )}
          </CardHeader>
          <CardContent>
            {/* Priority Summary */}
            {insights.growthAreas.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Focus consigliato:
                  </span>
                  <span className="text-blue-700 dark:text-blue-300">
                    {insights.growthAreas.length === 1
                      ? CATEGORY_LABELS[insights.growthAreas[0].category]
                      : `${CATEGORY_LABELS[insights.growthAreas[0].category]} e ${CATEGORY_LABELS[insights.growthAreas[1]?.category] || 'altro'}`
                    }
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {insights.growthAreas.slice(0, expandedGrowth ? undefined : 3).map((obs, idx) => (
                <ObservationCard
                  key={obs.id}
                  observation={obs}
                  isStrength={false}
                  showPriority={idx < 2}
                  priorityLevel={idx === 0 ? 'high' : 'medium'}
                />
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

