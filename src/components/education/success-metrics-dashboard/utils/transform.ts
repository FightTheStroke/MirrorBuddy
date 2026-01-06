import { useMethodProgressStore } from '@/lib/stores/method-progress-store';
import type { SuccessMetricsData } from '../types';

export function transformMethodProgressToMetrics(
  methodProgress: ReturnType<typeof useMethodProgressStore.getState>,
  studentName: string
): SuccessMetricsData {
  const { mindMaps, flashcards, helpBehavior, methodTransfer, autonomyScore } = methodProgress;

  const totalTools = mindMaps.createdAlone + mindMaps.createdWithHints + mindMaps.createdWithFullHelp +
    flashcards.createdAlone + flashcards.createdWithHints;
  const engagementScore = Math.min(100, totalTools * 5 + helpBehavior.solvedAlone * 2);

  const methodScore = Math.min(100,
    methodTransfer.subjectsApplied.length * 15 +
    methodTransfer.successfulMethods.length * 10 +
    methodTransfer.adaptations * 5
  );

  const emotionalScore = Math.min(100,
    helpBehavior.selfCorrections * 10 +
    (helpBehavior.avgTimeBeforeAsking > 30 ? 20 : 10)
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

