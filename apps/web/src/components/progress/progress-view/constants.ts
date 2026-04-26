export const ACHIEVEMENTS: Array<{ id: string; name: string; desc: string; icon: string; xp: number }> = [
  { id: 'first_session', name: 'Prima Lezione', desc: 'Completa la tua prima sessione', icon: '🎓', xp: 50 },
  { id: 'streak_3', name: 'Costanza', desc: 'Mantieni una streak di 3 giorni', icon: '🔥', xp: 100 },
  { id: 'streak_7', name: 'Determinazione', desc: 'Mantieni una streak di 7 giorni', icon: '💪', xp: 250 },
  { id: 'streak_30', name: 'Inarrestabile', desc: 'Mantieni una streak di 30 giorni', icon: '🚀', xp: 1000 },
  { id: 'quiz_10', name: 'Quiz Master', desc: 'Completa 10 quiz', icon: '🧠', xp: 150 },
  { id: 'flashcards_100', name: 'Memoria di Ferro', desc: 'Rivedi 100 flashcards', icon: '📚', xp: 200 },
  { id: 'math_master', name: 'Genio Matematico', desc: 'Raggiungi livello esperto in matematica', icon: '🔢', xp: 500 },
  { id: 'polyglot', name: 'Poliglotta', desc: 'Studia 3 lingue diverse', icon: '🌍', xp: 300 },
  { id: 'night_owl', name: 'Gufo Notturno', desc: 'Studia dopo le 22:00', icon: '🦉', xp: 50 },
  { id: 'early_bird', name: 'Mattiniero', desc: 'Studia prima delle 7:00', icon: '🐦', xp: 50 },
  { id: 'study_marathon', name: 'Maratona', desc: 'Studia per 2 ore consecutive', icon: '⏱️', xp: 200 },
  { id: 'perfectionist', name: 'Perfezionista', desc: 'Ottieni 100% in un quiz', icon: '💯', xp: 100 },
];

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

