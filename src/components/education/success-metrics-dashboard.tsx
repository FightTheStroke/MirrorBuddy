'use client';
// ============================================================================
// SUCCESS METRICS DASHBOARD (F-06)
// Tracks the 4 success metrics from ManifestoEdu:
// 1. Engagement - Active participation and consistency
// 2. Autonomy - Self-directed learning, less dependency on coach
// 3. Method Acquisition - Develops study techniques, applies across subjects
// 4. Emotional Connection - Positive relationship with learning
// Issue #31: Collaborative Student Profile
// Issue #28: Autonomy Tracking - Wired to real API data
// ============================================================================

import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMethodProgressStore } from '@/lib/stores/method-progress-store';
import {
  Flame,
  Target,
  Brain,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Trophy,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

export interface MetricDataPoint {
  date: Date;
  value: number;
}

export interface SuccessMetric {
  id: 'engagement' | 'autonomy' | 'method' | 'emotional';
  name: string;
  description: string;
  currentScore: number; // 0-100
  previousScore: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  history: MetricDataPoint[];
  subMetrics: SubMetric[];
}

export interface SubMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
}

export interface SuccessMetricsData {
  studentId: string;
  studentName: string;
  lastUpdated: Date;
  overallScore: number;
  metrics: SuccessMetric[];
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt?: Date;
  metricId: 'engagement' | 'autonomy' | 'method' | 'emotional';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_METRICS: SuccessMetricsData = {
  studentId: 'student-1',
  studentName: 'Marco',
  lastUpdated: new Date(),
  overallScore: 72,
  metrics: [
    {
      id: 'engagement',
      name: 'Coinvolgimento',
      description: 'Quanto attivamente partecipa e con che costanza',
      currentScore: 85,
      previousScore: 78,
      trend: 'up',
      history: [],
      subMetrics: [
        { id: 'streak', name: 'Giorni consecutivi', value: 12, target: 30, unit: 'giorni' },
        { id: 'sessions_week', name: 'Sessioni/settimana', value: 4, target: 5, unit: 'sessioni' },
        { id: 'avg_duration', name: 'Durata media', value: 22, target: 20, unit: 'minuti' },
        { id: 'completion_rate', name: 'Attività completate', value: 87, target: 80, unit: '%' },
      ],
    },
    {
      id: 'autonomy',
      name: 'Autonomia',
      description: 'Capacità di studiare in modo indipendente',
      currentScore: 68,
      previousScore: 55,
      trend: 'up',
      history: [],
      subMetrics: [
        { id: 'self_start', name: 'Sessioni avviate da solo', value: 75, target: 80, unit: '%' },
        { id: 'maestro_choice', name: 'Scelta Maestro appropriata', value: 82, target: 85, unit: '%' },
        { id: 'melissa_ratio', name: 'Tempo con Melissa', value: 25, target: 20, unit: '%' },
        { id: 'help_requests', name: 'Richieste di aiuto', value: 3, target: 5, unit: '/sessione' },
      ],
    },
    {
      id: 'method',
      name: 'Metodo di Studio',
      description: 'Sviluppo e applicazione di tecniche di studio',
      currentScore: 62,
      previousScore: 58,
      trend: 'up',
      history: [],
      subMetrics: [
        { id: 'techniques', name: 'Tecniche utilizzate', value: 5, target: 7, unit: 'diverse' },
        { id: 'cross_subject', name: 'Applicazione cross-materia', value: 60, target: 70, unit: '%' },
        { id: 'planning', name: 'Pianificazione sessioni', value: 45, target: 60, unit: '%' },
        { id: 'review_habits', name: 'Ripasso regolare', value: 70, target: 75, unit: '%' },
      ],
    },
    {
      id: 'emotional',
      name: 'Connessione Emotiva',
      description: 'Rapporto positivo con l\'apprendimento',
      currentScore: 78,
      previousScore: 80,
      trend: 'stable',
      history: [],
      subMetrics: [
        { id: 'sentiment', name: 'Sentiment positivo', value: 82, target: 75, unit: '%' },
        { id: 'buddy_interactions', name: 'Interazioni con Mario', value: 8, target: 5, unit: '/settimana' },
        { id: 'frustration_recovery', name: 'Recupero frustrazione', value: 75, target: 70, unit: '%' },
        { id: 'curiosity', name: 'Domande spontanee', value: 12, target: 10, unit: '/sessione' },
      ],
    },
  ],
  milestones: [
    {
      id: 'milestone-1',
      title: 'Prima settimana completata',
      description: '7 giorni consecutivi di studio',
      achievedAt: new Date('2025-12-15'),
      metricId: 'engagement',
    },
    {
      id: 'milestone-2',
      title: 'Autonomia crescente',
      description: 'Avviato 10 sessioni da solo',
      achievedAt: new Date('2025-12-20'),
      metricId: 'autonomy',
    },
    {
      id: 'milestone-3',
      title: 'Multi-tecnico',
      description: 'Usato 5 tecniche di studio diverse',
      achievedAt: new Date('2025-12-25'),
      metricId: 'method',
    },
    {
      id: 'milestone-4',
      title: 'Super curioso',
      description: '50 domande spontanee poste ai Professori',
      metricId: 'emotional',
    },
  ],
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const METRIC_ICONS = {
  engagement: Flame,
  autonomy: Target,
  method: Brain,
  emotional: Heart,
};

const METRIC_COLORS = {
  engagement: {
    primary: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
    progress: 'bg-orange-500',
  },
  autonomy: {
    primary: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    progress: 'bg-blue-500',
  },
  method: {
    primary: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    progress: 'bg-purple-500',
  },
  emotional: {
    primary: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    border: 'border-pink-200 dark:border-pink-800',
    progress: 'bg-pink-500',
  },
};

interface MetricCardProps {
  metric: SuccessMetric;
}

function MetricCard({ metric }: MetricCardProps) {
  const { settings } = useAccessibilityStore();
  const Icon = METRIC_ICONS[metric.id];
  const colors = METRIC_COLORS[metric.id];
  const change = metric.currentScore - metric.previousScore;

  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          'overflow-hidden',
          settings.highContrast ? 'border-yellow-400 bg-gray-900' : colors.border
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg',
                  settings.highContrast ? 'bg-yellow-400/20' : colors.bg
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    settings.highContrast ? 'text-yellow-400' : colors.primary
                  )}
                />
              </div>
              <div>
                <CardTitle
                  className={cn(
                    'text-lg',
                    settings.highContrast ? 'text-yellow-400' : ''
                  )}
                >
                  {metric.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {metric.description}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  'text-3xl font-bold',
                  settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
                )}
              >
                {metric.currentScore}
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  change > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : change < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-500'
                )}
              >
                <TrendIcon className="w-3 h-3" />
                {change > 0 ? '+' : ''}
                {change}%
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="mb-4">
            <div
              className={cn(
                'h-2 rounded-full overflow-hidden',
                settings.highContrast ? 'bg-gray-800' : 'bg-slate-200 dark:bg-slate-700'
              )}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.currentScore}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  settings.highContrast ? 'bg-yellow-400' : colors.progress
                )}
              />
            </div>
          </div>

          {/* Sub-metrics */}
          <div className="grid grid-cols-2 gap-3">
            {metric.subMetrics.map((sub) => {
              const percentage = Math.min((sub.value / sub.target) * 100, 100);
              const isAchieved = sub.value >= sub.target;

              return (
                <div
                  key={sub.id}
                  className={cn(
                    'p-2 rounded-lg',
                    settings.highContrast ? 'bg-gray-800' : 'bg-slate-50 dark:bg-slate-800/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {sub.name}
                    </span>
                    {isAchieved && (
                      <Star className="w-3 h-3 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        'text-lg font-semibold',
                        settings.highContrast ? 'text-white' : 'text-slate-900 dark:text-white'
                      )}
                    >
                      {sub.value}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {sub.target} {sub.unit}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'h-1 mt-1 rounded-full overflow-hidden',
                      settings.highContrast ? 'bg-gray-700' : 'bg-slate-200 dark:bg-slate-700'
                    )}
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isAchieved
                          ? 'bg-emerald-500'
                          : settings.highContrast
                            ? 'bg-yellow-400'
                            : colors.progress
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MilestoneItemProps {
  milestone: Milestone;
}

function MilestoneItem({ milestone }: MilestoneItemProps) {
  const { settings } = useAccessibilityStore();
  const isAchieved = !!milestone.achievedAt;
  const colors = METRIC_COLORS[milestone.metricId];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        isAchieved
          ? settings.highContrast
            ? 'bg-yellow-400/10 border border-yellow-400'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
          : settings.highContrast
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-full shrink-0',
          isAchieved
            ? 'bg-emerald-500 text-white'
            : settings.highContrast
              ? 'bg-gray-700'
              : colors.bg
        )}
      >
        {isAchieved ? (
          <Trophy className="w-4 h-4" />
        ) : (
          <Sparkles className={cn('w-4 h-4', colors.primary)} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium truncate',
            settings.highContrast
              ? isAchieved
                ? 'text-yellow-400'
                : 'text-gray-400'
              : isAchieved
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400'
          )}
        >
          {milestone.title}
        </p>
        <p className="text-xs text-slate-500 truncate">{milestone.description}</p>
      </div>
      {isAchieved && milestone.achievedAt && (
        <span className="text-xs text-slate-500 shrink-0">
          {milestone.achievedAt.toLocaleDateString('it-IT')}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SuccessMetricsDashboardProps {
  studentId?: string;
  studentName?: string;
  data?: SuccessMetricsData;
  className?: string;
}

/**
 * Transform method progress store data into dashboard metrics format.
 */
function transformMethodProgressToMetrics(
  methodProgress: ReturnType<typeof useMethodProgressStore.getState>,
  studentName: string
): SuccessMetricsData {
  const { mindMaps, flashcards, helpBehavior, methodTransfer, autonomyScore } = methodProgress;

  // Calculate engagement score from activity
  const totalTools = mindMaps.createdAlone + mindMaps.createdWithHints + mindMaps.createdWithFullHelp +
    flashcards.createdAlone + flashcards.createdWithHints;
  const engagementScore = Math.min(100, totalTools * 5 + helpBehavior.solvedAlone * 2);

  // Calculate method score from transfer and technique variety
  const methodScore = Math.min(100,
    methodTransfer.subjectsApplied.length * 15 +
    methodTransfer.successfulMethods.length * 10 +
    methodTransfer.adaptations * 5
  );

  // Calculate emotional score from help behavior patterns
  const emotionalScore = Math.min(100,
    helpBehavior.selfCorrections * 10 +
    (helpBehavior.avgTimeBeforeAsking > 30 ? 20 : 10) // Persistence bonus
  );

  return {
    studentId: methodProgress.userId || 'unknown',
    studentName,
    lastUpdated: methodProgress.updatedAt || new Date(),
    overallScore: Math.round(autonomyScore * 100),
    metrics: [
      {
        id: 'engagement',
        name: 'Coinvolgimento',
        description: 'Quanto attivamente partecipa e con che costanza',
        currentScore: engagementScore,
        previousScore: Math.max(0, engagementScore - 5),
        trend: 'up',
        history: [],
        subMetrics: [
          { id: 'tools_created', name: 'Strumenti creati', value: totalTools, target: 20, unit: 'totale' },
          { id: 'problems_solved', name: 'Problemi risolti', value: helpBehavior.solvedAlone, target: 10, unit: 'da solo' },
          { id: 'questions_asked', name: 'Domande poste', value: helpBehavior.questionsAsked, target: 15, unit: 'totale' },
          { id: 'mind_maps', name: 'Mappe mentali', value: mindMaps.createdAlone + mindMaps.createdWithHints, target: 5, unit: 'create' },
        ],
      },
      {
        id: 'autonomy',
        name: 'Autonomia',
        description: 'Capacità di studiare in modo indipendente',
        currentScore: Math.round(autonomyScore * 100),
        previousScore: Math.max(0, Math.round(autonomyScore * 100) - 8),
        trend: autonomyScore > 0.5 ? 'up' : 'stable',
        history: [],
        subMetrics: [
          { id: 'alone_ratio', name: 'Lavoro autonomo', value: Math.round((helpBehavior.solvedAlone / Math.max(1, helpBehavior.solvedAlone + helpBehavior.questionsAsked)) * 100), target: 70, unit: '%' },
          { id: 'self_corrections', name: 'Auto-correzioni', value: helpBehavior.selfCorrections, target: 10, unit: 'totale' },
          { id: 'tools_alone', name: 'Strumenti creati da solo', value: mindMaps.createdAlone + flashcards.createdAlone, target: 10, unit: 'totale' },
          { id: 'avg_time', name: 'Tempo medio prima di chiedere', value: Math.round(helpBehavior.avgTimeBeforeAsking), target: 60, unit: 'secondi' },
        ],
      },
      {
        id: 'method',
        name: 'Metodo di Studio',
        description: 'Sviluppo e applicazione di tecniche di studio',
        currentScore: methodScore,
        previousScore: Math.max(0, methodScore - 4),
        trend: methodTransfer.adaptations > 0 ? 'up' : 'stable',
        history: [],
        subMetrics: [
          { id: 'techniques', name: 'Tecniche utilizzate', value: methodTransfer.successfulMethods.length, target: 5, unit: 'diverse' },
          { id: 'subjects', name: 'Materie con metodo', value: methodTransfer.subjectsApplied.length, target: 4, unit: 'materie' },
          { id: 'adaptations', name: 'Adattamenti metodo', value: methodTransfer.adaptations, target: 8, unit: 'totale' },
          { id: 'flashcards', name: 'Flashcard create', value: flashcards.createdAlone + flashcards.createdWithHints, target: 10, unit: 'totale' },
        ],
      },
      {
        id: 'emotional',
        name: 'Connessione Emotiva',
        description: 'Rapporto positivo con l\'apprendimento',
        currentScore: emotionalScore,
        previousScore: Math.max(0, emotionalScore - 2),
        trend: 'stable',
        history: [],
        subMetrics: [
          { id: 'persistence', name: 'Persistenza', value: helpBehavior.avgTimeBeforeAsking > 30 ? 80 : 50, target: 70, unit: '%' },
          { id: 'recovery', name: 'Recupero errori', value: helpBehavior.selfCorrections * 10, target: 80, unit: '%' },
          { id: 'engagement', name: 'Coinvolgimento attivo', value: Math.min(100, totalTools * 10), target: 75, unit: '%' },
          { id: 'quality', name: 'Qualità lavoro', value: Math.round(mindMaps.avgQualityScore * 100), target: 70, unit: '%' },
        ],
      },
    ],
    milestones: [
      {
        id: 'first-tool',
        title: 'Primo strumento creato',
        description: 'Ha creato il primo strumento di studio',
        achievedAt: totalTools > 0 ? new Date() : undefined,
        metricId: 'engagement',
      },
      {
        id: 'autonomy-start',
        title: 'Autonomia crescente',
        description: 'Ha risolto 5 problemi da solo',
        achievedAt: helpBehavior.solvedAlone >= 5 ? new Date() : undefined,
        metricId: 'autonomy',
      },
      {
        id: 'method-transfer',
        title: 'Trasferimento metodo',
        description: 'Ha applicato il metodo a 2+ materie',
        achievedAt: methodTransfer.subjectsApplied.length >= 2 ? new Date() : undefined,
        metricId: 'method',
      },
      {
        id: 'self-correction',
        title: 'Auto-correzione',
        description: 'Ha corretto 3+ errori autonomamente',
        achievedAt: helpBehavior.selfCorrections >= 3 ? new Date() : undefined,
        metricId: 'emotional',
      },
    ],
  };
}

export function SuccessMetricsDashboard({
  studentId,
  studentName = 'Studente',
  data,
  className,
}: SuccessMetricsDashboardProps) {
  const { settings } = useAccessibilityStore();

  // Get method progress from store
  const methodProgress = useMethodProgressStore();

  // Initialize user ID if provided
  useEffect(() => {
    if (studentId && !methodProgress.userId) {
      methodProgress.setUserId(studentId);
    }
  }, [studentId, methodProgress]);

  // Transform store data to dashboard format, or use provided data, or fall back to mock
  const metricsData = useMemo(() => {
    if (data) return data;

    // If we have real store data (userId set), transform it
    if (methodProgress.userId) {
      return transformMethodProgressToMetrics(methodProgress, studentName);
    }

    // Fall back to mock data
    return MOCK_METRICS;
  }, [data, methodProgress, studentName]);

  const achievedMilestones = useMemo(
    () => metricsData.milestones.filter((m) => m.achievedAt),
    [metricsData.milestones]
  );

  const pendingMilestones = useMemo(
    () => metricsData.milestones.filter((m) => !m.achievedAt),
    [metricsData.milestones]
  );

  return (
    <div
      className={cn(
        'p-6 space-y-6',
        settings.highContrast ? 'bg-black' : 'bg-slate-50 dark:bg-slate-950',
        className
      )}
    >
      {/* Header with Overall Score */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={cn(
              'text-2xl font-bold',
              settings.highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white'
            )}
          >
            Metriche di Successo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Progresso di {metricsData.studentName} verso l&apos;autonomia
          </p>
        </div>
        <div
          className={cn(
            'text-center p-4 rounded-xl',
            settings.highContrast ? 'bg-gray-900 border border-yellow-400' : 'bg-white dark:bg-slate-900 shadow-lg'
          )}
        >
          <div
            className={cn(
              'text-4xl font-bold',
              metricsData.overallScore >= 80
                ? 'text-emerald-600'
                : metricsData.overallScore >= 60
                  ? 'text-amber-600'
                  : 'text-red-600'
            )}
          >
            {metricsData.overallScore}
          </div>
          <div className="text-xs text-slate-500">Punteggio Globale</div>
        </div>
      </div>

      {/* Quote from Manifesto */}
      <Card
        className={cn(
          'border-l-4',
          settings.highContrast
            ? 'border-yellow-400 bg-gray-900'
            : 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
        )}
      >
        <CardContent className="py-4">
          <p
            className={cn(
              'italic',
              settings.highContrast ? 'text-gray-300' : 'text-slate-700 dark:text-slate-300'
            )}
          >
            &ldquo;Il nostro successo si misura quando lo studente non ha più bisogno di noi.&rdquo;
          </p>
          <p className="text-xs text-slate-500 mt-1">— ManifestoEdu</p>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {metricsData.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Milestones */}
      <Card className={settings.highContrast ? 'border-yellow-400 bg-gray-900' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy
              className={cn(
                'w-5 h-5',
                settings.highContrast ? 'text-yellow-400' : 'text-amber-600 dark:text-amber-400'
              )}
            />
            <span className={settings.highContrast ? 'text-yellow-400' : ''}>
              Traguardi
            </span>
          </CardTitle>
          <CardDescription>
            {achievedMilestones.length} raggiunti, {pendingMilestones.length} da sbloccare
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Achieved */}
          {achievedMilestones.map((milestone) => (
            <MilestoneItem key={milestone.id} milestone={milestone} />
          ))}

          {/* Pending */}
          {pendingMilestones.length > 0 && (
            <>
              <div className="text-xs text-slate-500 pt-2">Prossimi traguardi:</div>
              {pendingMilestones.map((milestone) => (
                <MilestoneItem key={milestone.id} milestone={milestone} />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SuccessMetricsDashboard;
