/**
 * Achievement Definitions
 * All unlockable achievements with conditions and rewards
 */

import type { Achievement } from '@/types';

/**
 * All available achievements in the system.
 * Achievements are automatically checked and unlocked when conditions are met.
 */
export const ACHIEVEMENTS: Achievement[] = [
  // === ONBOARDING ACHIEVEMENTS ===
  {
    id: 'first_chat',
    name: 'Prima Conversazione',
    description: 'Inizia la tua prima conversazione con un Maestro',
    icon: '💬',
    category: 'onboarding',
    requirement: 1,
    xpReward: 50,
    mirrorBucksReward: 50,
  },
  {
    id: 'first_quiz',
    name: 'Primo Quiz',
    description: 'Completa il tuo primo quiz',
    icon: '📝',
    category: 'onboarding',
    requirement: 1,
    xpReward: 50,
    mirrorBucksReward: 50,
  },
  {
    id: 'first_mindmap',
    name: 'Prima Mappa Mentale',
    description: 'Crea la tua prima mappa mentale',
    icon: '🗺️',
    category: 'onboarding',
    requirement: 1,
    xpReward: 50,
    mirrorBucksReward: 50,
  },
  {
    id: 'first_flashcards',
    name: 'Prime Flashcard',
    description: 'Crea il tuo primo mazzo di flashcard',
    icon: '🃏',
    category: 'onboarding',
    requirement: 1,
    xpReward: 50,
    mirrorBucksReward: 50,
  },

  // === STREAK ACHIEVEMENTS ===
  {
    id: 'streak_3',
    name: 'Studente Costante',
    description: 'Studia per 3 giorni consecutivi',
    icon: '🔥',
    category: 'streak',
    requirement: 3,
    xpReward: 100,
    mirrorBucksReward: 100,
  },
  {
    id: 'streak_7',
    name: 'Studente Dedicato',
    description: 'Studia per 7 giorni consecutivi',
    icon: '🔥🔥',
    category: 'streak',
    requirement: 7,
    xpReward: 250,
    mirrorBucksReward: 250,
  },
  {
    id: 'streak_30',
    name: 'Studente Inarrestabile',
    description: 'Studia per 30 giorni consecutivi',
    icon: '🔥🔥🔥',
    category: 'streak',
    requirement: 30,
    xpReward: 1000,
    mirrorBucksReward: 1000,
  },
  {
    id: 'streak_100',
    name: 'Leggenda dello Studio',
    description: 'Studia per 100 giorni consecutivi',
    icon: '👑',
    category: 'streak',
    requirement: 100,
    xpReward: 5000,
    mirrorBucksReward: 5000,
  },

  // === LEVEL ACHIEVEMENTS ===
  {
    id: 'level_10',
    name: 'Apprendista',
    description: 'Raggiungi il livello 10',
    icon: '⭐',
    category: 'xp',
    requirement: 10,
    xpReward: 500,
    mirrorBucksReward: 500,
  },
  {
    id: 'level_50',
    name: 'Studioso',
    description: 'Raggiungi il livello 50',
    icon: '⭐⭐',
    category: 'xp',
    requirement: 50,
    xpReward: 2500,
    mirrorBucksReward: 2500,
  },
  {
    id: 'level_100',
    name: 'Maestro Supremo',
    description: 'Raggiungi il livello 100 (massimo stagionale)',
    icon: '⭐⭐⭐',
    category: 'xp',
    requirement: 100,
    xpReward: 10000,
    mirrorBucksReward: 10000,
  },

  // === EXPLORATION ACHIEVEMENTS ===
  {
    id: 'all_subjects',
    name: 'Esploratore del Sapere',
    description: 'Studia tutte le materie disponibili',
    icon: '🌍',
    category: 'exploration',
    requirement: 1,
    xpReward: 200,
    mirrorBucksReward: 200,
  },
  {
    id: 'all_maestri',
    name: 'Amico dei Maestri',
    description: 'Interagisci con tutti i 17 Maestri',
    icon: '👥',
    category: 'exploration',
    requirement: 17,
    xpReward: 500,
    mirrorBucksReward: 500,
  },
  {
    id: 'tool_explorer',
    name: 'Esploratore di Strumenti',
    description: 'Usa tutti gli strumenti disponibili (quiz, mappe, flashcard, ecc.)',
    icon: '🛠️',
    category: 'exploration',
    requirement: 1,
    xpReward: 300,
    mirrorBucksReward: 300,
  },

  // === TIME-BASED ACHIEVEMENTS ===
  {
    id: 'hour_studied',
    name: 'Prima Ora',
    description: 'Studia per almeno 1 ora totale',
    icon: '⏰',
    category: 'time',
    requirement: 60,
    xpReward: 150,
    mirrorBucksReward: 150,
  },
  {
    id: 'ten_hours_studied',
    name: 'Studente Impegnato',
    description: 'Studia per almeno 10 ore totali',
    icon: '⏰⏰',
    category: 'time',
    requirement: 600,
    xpReward: 500,
    mirrorBucksReward: 500,
  },
  {
    id: 'study_night_owl',
    name: 'Gufo Notturno',
    description: 'Studia dopo le 22:00',
    icon: '🦉',
    category: 'time',
    requirement: 1,
    xpReward: 150,
    mirrorBucksReward: 150,
  },
  {
    id: 'study_early_bird',
    name: 'Allodola Mattutina',
    description: 'Studia prima delle 7:00',
    icon: '🐦',
    category: 'time',
    requirement: 1,
    xpReward: 150,
    mirrorBucksReward: 150,
  },

  // === MASTERY ACHIEVEMENTS ===
  {
    id: 'subject_master',
    name: 'Maestria Perfetta',
    description: 'Raggiungi il 100% di maestria in una materia',
    icon: '🏆',
    category: 'mastery',
    requirement: 1,
    xpReward: 1000,
    mirrorBucksReward: 1000,
  },
  {
    id: 'quiz_perfectionist',
    name: 'Perfezionista',
    description: 'Completa un quiz con il 100% di risposte corrette',
    icon: '💯',
    category: 'study',
    requirement: 1,
    xpReward: 200,
    mirrorBucksReward: 200,
  },

  // === SOCIAL ACHIEVEMENTS (prepared for future multi-user) ===
  {
    id: 'shared_content',
    name: 'Condivisore',
    description: 'Condividi i tuoi contenuti di studio',
    icon: '📤',
    category: 'social',
    requirement: 1,
    xpReward: 100,
    mirrorBucksReward: 100,
  },
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
  category: Achievement['category']
): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * State shape for achievement condition checking
 */
interface AchievementCheckState {
  sessionHistory?: unknown[];
  quizzesCompleted?: number;
  mindmapsCreated?: number;
  flashcardDecksCreated?: number;
  streak?: { current?: number };
  seasonLevel?: number;
  totalStudyMinutes?: number;
}

/**
 * Check if achievement conditions are met
 * This is a helper function that can be extended with more complex logic
 */
export function checkAchievementCondition(
  achievementId: string,
  state: AchievementCheckState
): boolean {
  const achievement = getAchievementById(achievementId);
  if (!achievement) return false;

  // Simple condition checks based on achievement ID
  // In a real implementation, you'd have more sophisticated checks
  switch (achievementId) {
    case 'first_chat':
      return (state.sessionHistory?.length ?? 0) >= 1;
    case 'first_quiz':
      return (state.quizzesCompleted ?? 0) >= 1;
    case 'first_mindmap':
      return (state.mindmapsCreated ?? 0) >= 1;
    case 'first_flashcards':
      return (state.flashcardDecksCreated ?? 0) >= 1;
    case 'streak_3':
      return (state.streak?.current ?? 0) >= 3;
    case 'streak_7':
      return (state.streak?.current ?? 0) >= 7;
    case 'streak_30':
      return (state.streak?.current ?? 0) >= 30;
    case 'streak_100':
      return (state.streak?.current ?? 0) >= 100;
    case 'level_10':
      return (state.seasonLevel ?? 0) >= 10;
    case 'level_50':
      return (state.seasonLevel ?? 0) >= 50;
    case 'level_100':
      return (state.seasonLevel ?? 0) >= 100;
    case 'hour_studied':
      return (state.totalStudyMinutes ?? 0) >= 60;
    case 'ten_hours_studied':
      return (state.totalStudyMinutes ?? 0) >= 600;
    default:
      return false;
  }
}
