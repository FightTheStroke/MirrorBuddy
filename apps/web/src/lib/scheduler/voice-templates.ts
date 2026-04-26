/**
 * Melissa's Voice Notification Templates
 * Templates for Melissa's spoken notifications
 */

import type { NotificationType } from './notification-types';

export const MELISSA_VOICE_TEMPLATES: Record<NotificationType, string[]> = {
  flashcard_due: [
    'Ehi! Hai {count} flashcard pronte per il ripasso. Il momento perfetto è adesso!',
    'Ci sono {count} carte che ti aspettano. Un ripasso veloce?',
    'Le tue flashcard chiamano! {count} carte da ripassare.',
  ],
  streak_warning: [
    'La tua streak di {days} giorni sta per finire! Anche solo 5 minuti contano.',
    'Non perdere la tua serie! {days} giorni di studio consecutivi.',
    'Ehi campione! La tua streak è a rischio. Un veloce ripasso?',
  ],
  scheduled_session: [
    'Tra {minutes} minuti è ora di studiare {subject}. Sei pronto?',
    'Il tuo appuntamento con {subject} sta per iniziare!',
    'È quasi ora di {subject}! Prepara il materiale.',
  ],
  suggestion: [
    'Ho un suggerimento per te: che ne dici di ripassare {subject}?',
    'Basandomi sui tuoi progressi, ti consiglio di provare {subject}.',
    'Un piccolo consiglio: potresti dare una rinfrescata a {subject}.',
  ],
  achievement: [
    'Fantastico! Hai sbloccato un nuovo traguardo: {achievement}!',
    'Complimenti! Nuovo achievement: {achievement}!',
    'Wow! {achievement} sbloccato! Continua così!',
  ],
  weekly_summary: [
    'Questa settimana hai studiato {minutes} minuti. Ottimo lavoro!',
    'Riepilogo settimanale: {sessions} sessioni completate!',
    'Hai fatto {minutes} minuti di studio questa settimana. Bravo!',
  ],
};
