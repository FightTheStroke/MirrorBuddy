export type View =
  | 'intent'
  | 'maestri'
  | 'maestro-session'
  | 'supporti'
  | 'calendar'
  | 'progress'
  | 'genitori'
  | 'settings';
export type MaestroSessionMode = 'voice' | 'chat';

/**
 * Intention-based home: the three things a student can ask Buddy to do.
 * - homework  → "Aiutami a fare i compiti" (chat + pdf/webcam/formula/search)
 * - study     → "Aiutami a studiare" (mindmap → summary → flashcard)
 * - quizMe    → "Interrogami" (quiz FSRS / flashcard interattive)
 */
export type Intent = 'homework' | 'study' | 'quizMe';
