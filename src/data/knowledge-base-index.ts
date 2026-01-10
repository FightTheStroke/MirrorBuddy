/**
 * Knowledge Base Feature Index
 * Maps keywords to knowledge categories for lazy loading
 */

import type { KnowledgeCategory } from './knowledge-base-types';

/**
 * Compact index for quick topic detection.
 * Maps keywords to categories for lazy loading.
 */
export const FEATURE_INDEX: Record<string, KnowledgeCategory[]> = {
  // Maestri
  maestro: ['maestri'],
  professore: ['maestri'],
  euclide: ['maestri'],
  'marie curie': ['maestri'],
  feynman: ['maestri'],
  galileo: ['maestri'],
  darwin: ['maestri'],
  manzoni: ['maestri'],
  shakespeare: ['maestri'],
  erodoto: ['maestri'],
  humboldt: ['maestri'],
  'da vinci': ['maestri'],
  leonardo: ['maestri'],
  mozart: ['maestri'],
  'ada lovelace': ['maestri'],
  'adam smith': ['maestri'],
  socrate: ['maestri'],
  cicerone: ['maestri'],
  ippocrate: ['maestri'],
  chris: ['maestri'],

  // Voice
  voce: ['voice'],
  chiamata: ['voice'],
  telefono: ['voice'],
  microfono: ['voice'],
  audio: ['voice', 'ambient_audio'],
  parlare: ['voice'],

  // Tools
  strumenti: ['tools', 'flashcards', 'mindmaps', 'quizzes'],
  flashcard: ['flashcards', 'tools'],
  carte: ['flashcards'],
  ripasso: ['flashcards'],
  mappa: ['mindmaps', 'tools'],
  'mappa mentale': ['mindmaps'],
  quiz: ['quizzes', 'tools'],
  domande: ['quizzes'],
  demo: ['tools'],

  // Support
  coach: ['coach'],
  melissa: ['coach'],
  roberto: ['coach'],
  chiara: ['coach'],
  andrea: ['coach'],
  favij: ['coach'],
  buddy: ['buddy'],
  mario: ['buddy'],
  maria: ['buddy'],

  // Gamification (MirrorBucks & Seasons)
  xp: ['gamification'],
  punti: ['gamification'],
  livello: ['gamification'],
  streak: ['gamification'],
  badge: ['gamification'],
  mirrorbucks: ['gamification'],
  stagione: ['gamification'],
  stagioni: ['gamification'],
  trimestre: ['gamification'],
  classifica: ['gamification'],
  achievement: ['gamification'],

  // Navigation (Zaino/Astuccio)
  zaino: ['navigation', 'tools'],
  astuccio: ['navigation', 'tools'],
  materiali: ['navigation'],
  archivio: ['navigation'],
  supporti: ['navigation'],

  // Pomodoro
  pomodoro: ['pomodoro', 'gamification'],
  timer: ['pomodoro'],
  pausa: ['pomodoro'],
  concentrazione: ['pomodoro', 'ambient_audio'],

  // Scheduler
  calendario: ['scheduler'],
  piano: ['scheduler'],
  programma: ['scheduler'],
  promemoria: ['scheduler', 'notifications'],

  // Notifications
  notifiche: ['notifications'],
  avvisi: ['notifications'],

  // Ambient Audio
  cuffie: ['ambient_audio'],
  musica: ['ambient_audio'],
  suoni: ['ambient_audio'],
  'rumore bianco': ['ambient_audio'],
  binaural: ['ambient_audio'],
  focus: ['ambient_audio', 'pomodoro'],

  // Accessibility
  accessibilita: ['accessibility'],
  dislessia: ['accessibility'],
  adhd: ['accessibility'],
  autismo: ['accessibility'],
  contrasto: ['accessibility'],
  font: ['accessibility'],

  // Account
  profilo: ['account'],
  account: ['account'],
  impostazioni: ['account', 'accessibility'],
  genitori: ['account', 'privacy'],
  dashboard: ['account'],

  // Privacy
  privacy: ['privacy'],
  gdpr: ['privacy'],
  dati: ['privacy'],
  cancella: ['privacy'],
  esporta: ['privacy'],

  // Troubleshooting
  'non funziona': ['troubleshooting'],
  problema: ['troubleshooting'],
  errore: ['troubleshooting'],
  aiuto: ['troubleshooting'],
  bloccato: ['troubleshooting'],
};
