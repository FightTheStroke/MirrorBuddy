import type { TypingLesson } from '@/types/tools';

export const LESSONS: Record<string, TypingLesson> = {
  'b1-1': {
    id: 'b1-1',
    level: 'beginner',
    title: 'Home Keys - Sinistra',
    description: 'Impara i tasti della mano sinistra sulla home row',
    text: 'asdf asdf asdf asdf fdsa fdsa fdsa fdsa',
    targetWPM: 15,
    unlocked: true,
    completed: false,
    order: 1,
  },
  'b1-2': {
    id: 'b1-2',
    level: 'beginner',
    title: 'Home Keys - Destra',
    description: 'Impara i tasti della mano destra sulla home row',
    text: 'jkl; jkl; jkl; ;lkj ;lkj ;lkj',
    targetWPM: 15,
    unlocked: true,
    completed: false,
    order: 2,
  },
  'b1-3': {
    id: 'b1-3',
    level: 'beginner',
    title: 'Home Keys Complete',
    description: 'Tutti i tasti della home row',
    text: 'asdf jkl; asdf jkl; ;lkj fdsa ;lkj fdsa',
    targetWPM: 20,
    unlocked: true,
    completed: false,
    order: 3,
  },
  'b1-4': {
    id: 'b1-4',
    level: 'beginner',
    title: 'Lettere - Riga Superiore',
    description: 'Riga QWERTY',
    text: 'qwer tyui qwer tyui uytr erty',
    targetWPM: 18,
    unlocked: true,
    completed: false,
    order: 4,
  },
  'b1-5': {
    id: 'b1-5',
    level: 'beginner',
    title: 'Lettere - Riga Inferiore',
    description: 'Riga ZXCVBNM',
    text: 'zxcv bnm, zxcv bnm, ,mnb vcxz',
    targetWPM: 18,
    unlocked: true,
    completed: false,
    order: 5,
  },
  'b1-6': {
    id: 'b1-6',
    level: 'beginner',
    title: 'Parole Semplici',
    description: 'Primi esercizi con parole',
    text: 'salve come va ciao tutto bene',
    targetWPM: 20,
    unlocked: true,
    completed: false,
    order: 6,
  },
  'b1-7': {
    id: 'b1-7',
    level: 'beginner',
    title: 'Frasi Breve',
    description: 'Frasi semplici',
    text: 'il gatto mangia il pesce. la penna scrive bene.',
    targetWPM: 22,
    unlocked: true,
    completed: false,
    order: 7,
  },
  'b1-8': {
    id: 'b1-8',
    level: 'beginner',
    title: 'Maiuscole',
    description: 'Usa Shift per le maiuscole',
    text: 'Salve Mario. Come stai Oggi?',
    targetWPM: 20,
    unlocked: true,
    completed: false,
    order: 8,
  },
  'b1-9': {
    id: 'b1-9',
    level: 'beginner',
    title: 'Punteggiatura',
    description: 'Punti, virgole e altri caratteri',
    text: 'Ciao, come stai? Tutto bene. Grazie!',
    targetWPM: 22,
    unlocked: true,
    completed: false,
    order: 9,
  },
  'b1-10': {
    id: 'b1-10',
    level: 'beginner',
    title: 'Test Finale Beginner',
    description: 'Completa il livello beginner',
    text: 'Benvenuti nel corso di digitazione. Imparerete a scrivere velocemente con entrambe le mani.',
    targetWPM: 25,
    unlocked: true,
    completed: false,
    order: 10,
  },
};

export function getLessonsByLevel(level: TypingLesson['level']): TypingLesson[] {
  return Object.values(LESSONS)
    .filter((lesson) => lesson.level === level)
    .sort((a, b) => a.order - b.order);
}

export function getLessonById(id: string): TypingLesson | undefined {
  return LESSONS[id];
}

export function getNextLesson(currentLessonId: string): TypingLesson | undefined {
  const current = LESSONS[currentLessonId];
  if (!current) return undefined;

  const lessonsByLevel = getLessonsByLevel(current.level);
  const currentIndex = lessonsByLevel.findIndex((l) => l.id === currentLessonId);

  if (currentIndex >= 0 && currentIndex < lessonsByLevel.length - 1) {
    return lessonsByLevel[currentIndex + 1];
  }

  return undefined;
}

export function unlockNextLessons(completedLessonId: string): void {
  const completed = LESSONS[completedLessonId];
  if (!completed) return;

  const nextLesson = getNextLesson(completedLessonId);
  if (nextLesson) {
    nextLesson.unlocked = true;
  }
}
