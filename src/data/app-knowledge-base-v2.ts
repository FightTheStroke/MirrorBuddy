/**
 * ConvergioEdu App Knowledge Base v2
 *
 * OPTIMIZED: Lazy retrieval instead of full injection.
 * Base prompt: ~200 tokens (index only)
 * On-demand: ~500 tokens per relevant category
 *
 * IMPORTANT: Update this file with each release when adding new features.
 * Last updated: 2026-01 (v1.1)
 */

// ============================================================================
// VERSION INFO
// ============================================================================

export const APP_VERSION = {
  version: '1.1.0',
  lastUpdated: '2026-01',
  releaseNotes: 'https://github.com/ConvergioEdu/convergio-edu/releases',
};

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export type KnowledgeCategory =
  | 'maestri'
  | 'voice'
  | 'tools'
  | 'flashcards'
  | 'mindmaps'
  | 'quizzes'
  | 'coach'
  | 'buddy'
  | 'gamification'
  | 'pomodoro'
  | 'scheduler'
  | 'notifications'
  | 'ambient_audio'
  | 'accessibility'
  | 'account'
  | 'privacy'
  | 'troubleshooting';

// ============================================================================
// FEATURE INDEX (Compact - always loaded)
// ============================================================================

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

  // Gamification
  xp: ['gamification'],
  punti: ['gamification'],
  livello: ['gamification'],
  streak: ['gamification'],
  badge: ['gamification'],

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

// ============================================================================
// KNOWLEDGE CONTENT (Loaded on demand)
// ============================================================================

const KNOWLEDGE_CONTENT: Record<KnowledgeCategory, string> = {
  maestri: `**17 Maestri Storici**
Tutori AI basati su figure storiche. Dalla home, scegli un Maestro per iniziare.
- Euclide (Matematica), Marie Curie (Chimica), Feynman (Fisica)
- Galileo (Astronomia), Darwin (Scienze), Manzoni (Italiano)
- Shakespeare (Inglese), Erodoto (Storia), Humboldt (Geografia)
- Da Vinci (Arte), Mozart (Musica), Ada Lovelace (Informatica)
- Adam Smith (Economia), Socrate (Filosofia), Cicerone (Ed. Civica)
- Ippocrate (Ed. Fisica), Chris (Storytelling)
Ogni Maestro ha stile unico. Possono creare flashcard, mappe, quiz durante le lezioni.`,

  voice: `**Chiamate Vocali**
Parla a voce con i Maestri via Azure Realtime API.
Come usare: Durante lezione > icona telefono > parla > telefono rosso per terminare.
Tips: Usa cuffie, parla chiaramente, trascrizione in chat.
Problemi: Controlla permessi microfono, HTTPS richiesto, ricarica pagina se lento.`,

  tools: `**Strumenti Didattici**
I Maestri possono creare durante le lezioni:
- Flashcard FSRS: ripetizione spaziata
- Mappe Mentali: concetti visuali
- Quiz: verifica comprensione
- Demo: simulazioni interattive
Chiedi al Maestro: "Fammi una mappa su...", "Fammi un quiz su..."`,

  flashcards: `**Flashcard FSRS**
Sistema ripetizione spaziata con algoritmo FSRS-5.
Dove: Menu > Flashcard | Create dal Maestro
Come: Clicca Ripassa, valuta (Difficile/OK/Facile/Perfetto).
L'algoritmo calcola quando rivedere. 5 XP per carta ripetuta.`,

  mindmaps: `**Mappe Mentali**
Mappe concettuali interattive, modificabili anche a voce.
Dove: Create dal Maestro | Menu > I Miei Materiali
Comandi vocali: "Aggiungi Roma sotto Italia", "Espandi Liguria"
Clicca nodi per espandere/collassare.`,

  quizzes: `**Quiz Interattivi**
Quiz a risposta multipla per verificare comprensione.
Chiedi al Maestro: "Fammi un quiz su..."
XP in base a risposte corrette. Puoi ripetere quiz salvati.`,

  coach: `**Coach (Melissa/Roberto/Chiara/Andrea/Favij)**
Coach di metodo di studio. Aiutano con organizzazione e strategie.
5 coach disponibili con personalita' diverse.
Obiettivo: sviluppare AUTONOMIA, non dipendenza.
Scelgi il tuo preferito in Impostazioni.`,

  buddy: `**Buddy (Mario/Maria)**
Compagno virtuale che condivide le tue difficolta'.
Per supporto emotivo, non accademico.
Stessa eta', non giudica, sempre dalla tua parte.
Scegli Mario/Maria in Impostazioni.`,

  gamification: `**Sistema XP e Livelli**
Guadagna XP studiando:
- Lezioni: 10-50 XP
- Flashcard: 5 XP/carta
- Quiz: 10-30 XP
- Pomodoro: 15 XP
Livelli sbloccano badge. Streak giornaliera (7/30/100/365 giorni).`,

  pomodoro: `**Timer Pomodoro**
25 min studio + 5 min pausa. Ogni 4 pomodori: pausa 15 min.
Dove: Barra in alto (icona timer) | Settings > ADHD
15 XP per pomodoro completato. Tempi personalizzabili.
Attiva notifiche browser per promemoria.`,

  scheduler: `**Calendario Settimanale**
Pianifica sessioni di studio.
Dove: Menu > Piano di Studio
Clicca giorno > aggiungi sessione > materia, orario, durata.
Collega a Maestro specifico. Attiva promemoria.`,

  notifications: `**Notifiche Smart**
Promemoria per studio, streak, flashcard.
Dove: Settings > Notifiche
Imposta ore di silenzio. Melissa puo' leggere a voce (TTS).
Se non arrivano: verifica permessi browser.`,

  ambient_audio: `**Audio Ambientale**
Suoni per concentrazione, generati dal browser.
Dove: Barra in alto (icona cuffie) | Settings > Audio
Preset: Focus (alpha), Deep Work (beta+marrone), Pioggia, Natura, Biblioteca, Caffe.
Si ferma durante chiamate vocali. Integrazione Pomodoro disponibile.
Usa cuffie per binaural beats.`,

  accessibility: `**Accessibilita'**
7 profili rapidi: Dislessia, ADHD, Autismo, Visivo, Uditivo, Motorio.
Dove: Settings > Accessibilita'
- Font OpenDyslexic per dislessia
- Modalita' ADHD: riduce distrazioni, timer Pomodoro
- Alto contrasto per problemi visivi
- Text-to-Speech per lettura ad alta voce`,

  account: `**Profilo Studente**
Dove: Settings > Profilo
Modifica nome, eta', anno scolastico.
Indica difficolta' di apprendimento.
Dashboard Genitori: richiede consenso GDPR, dati aggregati.`,

  privacy: `**Privacy (GDPR)**
Dove: Settings > Privacy
- Esporta dati: JSON o PDF
- Cancella dati: eliminati entro 30 giorni
- Revoca consenso genitori in qualsiasi momento
I genitori vedono solo progressi aggregati, mai conversazioni.`,

  troubleshooting: `**Problemi Comuni**
App non carica: Ricarica (Cmd+R), svuota cache, altro browser.
Login: Verifica email, usa "Password dimenticata".
Audio/Voce: Permessi microfono, cuffie, HTTPS richiesto.
Progressi persi: Verifica login, ricarica pagina.
Notifiche: Abilita nel browser, controlla ore silenzio.`,
};

// ============================================================================
// LAZY RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Detect relevant categories from a user query.
 * Returns categories sorted by relevance (most matches first).
 */
export function detectCategories(query: string): KnowledgeCategory[] {
  const normalizedQuery = query.toLowerCase();
  const categoryScores = new Map<KnowledgeCategory, number>();

  for (const [keyword, categories] of Object.entries(FEATURE_INDEX)) {
    if (normalizedQuery.includes(keyword)) {
      for (const category of categories) {
        categoryScores.set(category, (categoryScores.get(category) || 0) + 1);
      }
    }
  }

  // Sort by score (descending) and return
  return Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
}

/**
 * Get knowledge content for specific categories.
 * Returns concatenated content for the requested categories.
 */
export function getKnowledgeForCategories(
  categories: KnowledgeCategory[]
): string {
  if (categories.length === 0) return '';

  const uniqueCategories = [...new Set(categories)].slice(0, 3); // Max 3 categories
  return uniqueCategories.map((cat) => KNOWLEDGE_CONTENT[cat]).join('\n\n');
}

/**
 * Get relevant knowledge for a user query.
 * Auto-detects categories and returns only relevant content.
 */
export function getRelevantKnowledge(query: string): string {
  const categories = detectCategories(query);
  if (categories.length === 0) return '';

  return `## INFORMAZIONI RILEVANTI\n\n${getKnowledgeForCategories(categories)}`;
}

// ============================================================================
// COMPACT INDEX PROMPT (Always loaded - ~200 tokens)
// ============================================================================

/**
 * Minimal prompt that tells the coach what topics they can help with.
 * Actual knowledge is loaded on-demand via getRelevantKnowledge().
 */
export function generateCompactIndexPrompt(): string {
  return `## SUPPORTO PIATTAFORMA

Conosci ConvergioEdu v${APP_VERSION.version} e puoi aiutare con:
- 17 Maestri AI e chiamate vocali
- Strumenti (flashcard FSRS, mappe mentali, quiz, demo)
- Coach e Buddy (Triangle of Support)
- Gamification (XP, livelli, streak, Pomodoro)
- Calendario e notifiche
- Audio ambientale per concentrazione
- Accessibilita' (dislessia, ADHD, autismo)
- Account e privacy (GDPR)

Se lo studente chiede aiuto su questi argomenti, rispondi con le informazioni corrette.
Per problemi tecnici: verifica permessi browser, HTTPS, ricarica pagina.`;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use generateCompactIndexPrompt() + getRelevantKnowledge() instead.
 * Kept for backward compatibility during transition.
 */
export function generateKnowledgeBasePrompt(): string {
  // Return compact version instead of full dump
  return generateCompactIndexPrompt();
}

// ============================================================================
// TECH SUPPORT SUGGESTED PROMPTS
// ============================================================================

export const TECH_SUPPORT_SUGGESTED_PROMPTS = [
  { icon: 'Phone', text: 'Come funzionano le chiamate vocali?', category: 'voice' },
  { icon: 'BookOpen', text: 'Come creo le flashcard?', category: 'flashcards' },
  { icon: 'Calendar', text: 'Come pianifico lo studio?', category: 'scheduler' },
  { icon: 'Accessibility', text: 'Come attivo il font per dislessia?', category: 'accessibility' },
  { icon: 'Bell', text: 'Come imposto le notifiche?', category: 'notifications' },
  { icon: 'Trophy', text: 'Come funzionano XP e livelli?', category: 'gamification' },
  { icon: 'Headphones', text: 'Come uso i suoni per concentrazione?', category: 'ambient_audio' },
];
