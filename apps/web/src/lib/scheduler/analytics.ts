/**
 * Analytics and Suggestions
 * Functions for calculating weekly summaries and generating smart suggestions
 */

import type { WeeklySummary, StudySuggestion } from './types';

/**
 * Calculate weekly summary
 */
export function calculateWeeklySummary(data: {
  studySessions: { duration: number; subject: string; xpEarned: number }[];
  flashcardsReviewed: number;
  currentStreak: number;
  scheduledSessions: number;
}): WeeklySummary {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const totalMinutes = data.studySessions.reduce((sum, s) => sum + s.duration, 0);
  const xpEarned = data.studySessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const subjects = [...new Set(data.studySessions.map((s) => s.subject))];

  // Find subject with most time spent
  const subjectTime: Record<string, number> = {};
  for (const session of data.studySessions) {
    subjectTime[session.subject] = (subjectTime[session.subject] ?? 0) + session.duration;
  }
  const topSubject = Object.entries(subjectTime).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    weekStart,
    totalMinutes,
    sessionsCompleted: data.studySessions.length,
    sessionsMissed: Math.max(0, data.scheduledSessions - data.studySessions.length),
    xpEarned,
    flashcardsReviewed: data.flashcardsReviewed,
    streak: data.currentStreak,
    subjects,
    topSubject,
  };
}

/**
 * Generate smart study suggestions
 */
export function generateSuggestions(data: {
  recentSubjects: string[];
  weakAreas: { subject: string; score: number }[];
  upcomingExams: { subject: string; date: Date }[];
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  currentStreak: number;
}): StudySuggestion[] {
  const suggestions: StudySuggestion[] = [];

  // Subject rotation suggestion
  const allSubjects = ['matematica', 'italiano', 'storia', 'scienze', 'inglese'];
  const unstudied = allSubjects.filter((s) => !data.recentSubjects.includes(s));
  if (unstudied.length > 0) {
    suggestions.push({
      type: 'subject_rotation',
      message: `Non studi ${unstudied[0]} da un po'. Vuoi fare un ripasso?`,
      reason: 'Variare le materie aiuta la memorizzazione',
      subject: unstudied[0],
      confidence: 0.7,
    });
  }

  // Weak area suggestion
  const weakestArea = data.weakAreas.sort((a, b) => a.score - b.score)[0];
  if (weakestArea && weakestArea.score < 0.7) {
    suggestions.push({
      type: 'weak_area',
      message: `Potresti migliorare in ${weakestArea.subject}. Un po' di pratica?`,
      reason: 'Basato sui risultati dei quiz recenti',
      subject: weakestArea.subject,
      confidence: 0.8,
    });
  }

  // Upcoming exam suggestion
  const soonestExam = data.upcomingExams.sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )[0];
  if (soonestExam) {
    const daysUntil = Math.ceil(
      (soonestExam.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 7) {
      suggestions.push({
        type: 'upcoming_exam',
        message: `La verifica di ${soonestExam.subject} è tra ${daysUntil} giorni. Ripassiamo?`,
        reason: 'Prepararsi in anticipo riduce lo stress',
        subject: soonestExam.subject,
        confidence: 0.9,
      });
    }
  }

  // Time-based suggestion
  if (data.timeOfDay === 'evening') {
    suggestions.push({
      type: 'time_based',
      message: 'È sera, perfetto per un ripasso leggero delle flashcard!',
      reason: 'La sera è ideale per consolidare la memoria',
      confidence: 0.6,
    });
  }

  // Streak suggestion
  if (data.currentStreak > 0 && data.currentStreak % 7 === 0) {
    suggestions.push({
      type: 'streak',
      message: `Wow, ${data.currentStreak} giorni di streak! Continua così!`,
      reason: 'Celebrare i traguardi aumenta la motivazione',
      confidence: 1.0,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
