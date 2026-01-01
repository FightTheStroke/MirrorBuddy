/**
 * ConvergioEdu App Knowledge Base
 *
 * Centralized documentation for all app features.
 * Used by the coach to provide technical support.
 *
 * IMPORTANT: Update this file with each release when adding new features.
 * Last updated: 2025-12 (v1.0)
 */

// ============================================================================
// VERSION INFO
// ============================================================================

export const APP_VERSION = {
  version: '1.0.0',
  lastUpdated: '2025-12',
  releaseNotes: 'https://github.com/ConvergioEdu/convergio-edu/releases',
};

// ============================================================================
// FEATURE CATEGORIES
// ============================================================================

export interface FeatureInfo {
  name: string;
  description: string;
  location: string;
  howToUse: string[];
  tips?: string[];
  troubleshooting?: string[];
  relatedFeatures?: string[];
}

export interface FeatureCategory {
  name: string;
  icon: string;
  features: FeatureInfo[];
}

// ============================================================================
// MAESTRI (AI Tutors)
// ============================================================================

export const MAESTRI_KNOWLEDGE: FeatureCategory = {
  name: 'Maestri AI',
  icon: 'GraduationCap',
  features: [
    {
      name: '17 Maestri Storici',
      description:
        'Tutori AI basati su figure storiche, ognuno esperto in una materia specifica.',
      location: 'Home > Scegli un Maestro',
      howToUse: [
        'Dalla home, scorri la griglia dei Maestri',
        'Clicca su un Maestro per iniziare una lezione',
        'Puoi scrivere o usare la voce per parlare',
      ],
      tips: [
        'Ogni Maestro ha un suo stile di insegnamento unico',
        'Puoi cambiare Maestro in qualsiasi momento',
        'I Maestri possono creare flashcard, mappe e quiz durante la lezione',
      ],
      troubleshooting: [
        'Se il Maestro non risponde, controlla la connessione internet',
        'Per problemi di voce, vedi la sezione "Chiamate Vocali"',
      ],
      relatedFeatures: ['Chiamate Vocali', 'Strumenti Didattici'],
    },
    {
      name: 'Chiamate Vocali',
      description:
        "Parla a voce con i Maestri usando l'API Azure Realtime.",
      location: 'Durante una lezione > Icona telefono',
      howToUse: [
        "Apri una lezione con un Maestro",
        "Clicca l'icona del telefono in alto a destra",
        "Attendi che la connessione si stabilisca",
        "Parla normalmente, il Maestro ti risponde a voce",
        "Clicca il telefono rosso per terminare",
      ],
      tips: [
        'Usa cuffie per una migliore qualita audio',
        'Parla chiaramente e aspetta che il Maestro finisca',
        "La trascrizione appare in chat durante la chiamata",
      ],
      troubleshooting: [
        'Microfono non funziona: controlla i permessi del browser',
        "Audio non si sente: verifica volume e che l'audio non sia mutato",
        'Connessione lenta: prova a ricaricare la pagina',
        'HTTPS richiesto: il microfono funziona solo su localhost o HTTPS',
      ],
    },
  ],
};

// ============================================================================
// STRUMENTI DIDATTICI
// ============================================================================

export const TOOLS_KNOWLEDGE: FeatureCategory = {
  name: 'Strumenti Didattici',
  icon: 'Wrench',
  features: [
    {
      name: 'Flashcard FSRS',
      description:
        'Sistema di ripetizione spaziata con algoritmo FSRS-5 per memorizzazione ottimale.',
      location: 'Menu > Flashcard | Oppure create dal Maestro durante lezione',
      howToUse: [
        "Vai a Menu > Flashcard per vedere le tue carte",
        "Clicca 'Ripassa' per iniziare una sessione",
        'Valuta ogni carta: Difficile, OK, Facile, o Perfetto',
        "L'algoritmo calcola quando rivedere ogni carta",
      ],
      tips: [
        'Ripassa ogni giorno per mantenere la streak',
        'Piu ripeti, piu le carte diventano facili',
        'Puoi creare flashcard chiedendo al Maestro',
      ],
      troubleshooting: [
        'Carte non si aggiornano: ricarica la pagina',
        'Progressi persi: controlla di essere loggato',
      ],
      relatedFeatures: ['Maestri AI', 'Sistema XP'],
    },
    {
      name: 'Mappe Mentali',
      description:
        'Mappe concettuali interattive create durante le lezioni, modificabili con comandi vocali.',
      location: 'Create dal Maestro durante lezione | Menu > I Miei Materiali',
      howToUse: [
        "Chiedi al Maestro 'Fammi una mappa su...'",
        "La mappa appare nella chat",
        'Puoi espanderla, modificarla, salvarla',
        'Durante chiamata vocale, puoi modificarla a voce',
      ],
      tips: [
        "Comandi vocali: 'Aggiungi Roma sotto Italia', 'Espandi Liguria'",
        'Clicca sui nodi per espandere/collassare',
        'Le mappe salvate sono in Menu > I Miei Materiali',
      ],
    },
    {
      name: 'Quiz Interattivi',
      description: 'Quiz a risposta multipla creati dai Maestri per verificare comprensione.',
      location: 'Create dal Maestro durante lezione',
      howToUse: [
        "Chiedi al Maestro 'Fammi un quiz su...'",
        "Rispondi alle domande cliccando l'opzione corretta",
        "Ricevi feedback immediato e spiegazioni",
      ],
      tips: [
        'I quiz guadagnano XP in base alle risposte corrette',
        'Puoi ripetere i quiz salvati',
      ],
    },
    {
      name: 'Demo Interattive',
      description: 'Simulazioni e animazioni per visualizzare concetti.',
      location: 'Create dal Maestro durante lezione',
      howToUse: [
        "Chiedi al Maestro 'Mostrami come funziona...'",
        "La demo interattiva appare nella chat",
        "Interagisci con i controlli della simulazione",
      ],
    },
  ],
};

// ============================================================================
// COACH E BUDDY
// ============================================================================

export const SUPPORT_KNOWLEDGE: FeatureCategory = {
  name: 'Supporto allo Studio',
  icon: 'Heart',
  features: [
    {
      name: 'Coach (Melissa/Roberto)',
      description:
        'Coach di metodo di studio che aiuta con organizzazione, concentrazione e strategie.',
      location: 'Menu > Coach | Automatico quando chiedi aiuto sul metodo',
      howToUse: [
        "Chiedi aiuto su come studiare",
        "Il Coach ti aiuta a organizzarti",
        "Puoi chiamare il Coach a voce come i Maestri",
      ],
      tips: [
        'Il Coach conosce le tue difficolta e adatta i consigli',
        'Puoi scegliere il tuo Coach preferito in Impostazioni',
      ],
    },
    {
      name: 'Buddy (Mario/Maria)',
      description:
        "Compagno di studio virtuale che capisce le tue difficolta perche' le condivide.",
      location: 'Menu > Buddy | Automatico quando hai bisogno di supporto emotivo',
      howToUse: [
        "Il Buddy appare quando hai bisogno di supporto emotivo",
        "Puoi scegliere Mario o Maria in Impostazioni",
        "Parla liberamente, il Buddy ti capisce",
      ],
      tips: [
        "Il Buddy ha la tua stessa eta' (circa) e le tue stesse difficolta'",
        'Non giudica mai, e sempre dalla tua parte',
      ],
    },
  ],
};

// ============================================================================
// GAMIFICATION
// ============================================================================

export const GAMIFICATION_KNOWLEDGE: FeatureCategory = {
  name: 'Gamification',
  icon: 'Trophy',
  features: [
    {
      name: 'Sistema XP e Livelli',
      description: 'Guadagna punti esperienza studiando e sale di livello.',
      location: 'Barra in alto | Profilo',
      howToUse: [
        'Ogni azione di studio guadagna XP',
        'Piu XP = livello piu alto',
        'I livelli sbloccano badge e riconoscimenti',
      ],
      tips: [
        'Lezioni complete: 10-50 XP',
        'Flashcard ripassate: 5 XP per carta',
        'Quiz completati: 10-30 XP in base al punteggio',
        'Pomodoro completato: 15 XP',
      ],
    },
    {
      name: 'Streak Giornaliera',
      description: 'Mantieni la streak studiando ogni giorno.',
      location: 'Barra in alto (icona fuoco)',
      howToUse: [
        'Studia almeno una volta al giorno',
        'La streak aumenta ogni giorno consecutivo',
        'Perdi la streak se salti un giorno',
      ],
      tips: [
        "Ricevi avvisi se la streak e' a rischio",
        'Milestone streak: 7, 30, 100, 365 giorni',
      ],
    },
    {
      name: 'Timer Pomodoro',
      description: '25 min studio + 5 min pausa per ADHD e concentrazione.',
      location: 'Barra in alto (icona timer) | Settings > ADHD',
      howToUse: [
        'Clicca il timer nella barra in alto',
        "Avvia un pomodoro di 25 minuti",
        "Fai pausa di 5 minuti quando suona",
        "Dopo 4 pomodori, pausa lunga di 15 minuti",
      ],
      tips: [
        'Ogni pomodoro completato = 15 XP',
        'Puoi personalizzare i tempi in Impostazioni',
        'Notifiche browser per ricordarti le pause',
      ],
      troubleshooting: [
        'Notifiche non arrivano: abilita notifiche browser',
        "Timer non si sente: controlla volume sistema",
      ],
    },
  ],
};

// ============================================================================
// SCHEDULER E NOTIFICHE
// ============================================================================

export const SCHEDULER_KNOWLEDGE: FeatureCategory = {
  name: 'Piano di Studio',
  icon: 'Calendar',
  features: [
    {
      name: 'Calendario Settimanale',
      description: 'Pianifica le tue sessioni di studio settimanali.',
      location: 'Menu > Piano di Studio | Home > Calendario',
      howToUse: [
        'Vai a Piano di Studio',
        'Clicca su un giorno per aggiungere sessione',
        "Scegli materia, orario e durata",
        "Attiva promemoria se vuoi notifiche",
      ],
      tips: [
        "Pianifica in anticipo per non dimenticare",
        "Collega le sessioni a un Maestro specifico",
      ],
    },
    {
      name: 'Notifiche Smart',
      description: 'Promemoria intelligenti per studio, streak e flashcard.',
      location: 'Settings > Notifiche | Piano di Studio > Preferenze',
      howToUse: [
        "Abilita notifiche in Impostazioni",
        "Scegli quali tipi di notifiche ricevere",
        "Imposta ore di silenzio (niente notifiche di notte)",
      ],
      tips: [
        'Melissa legge le notifiche a voce se abiliti TTS',
        "Puoi silenziare durante orari specifici",
      ],
      troubleshooting: [
        "Notifiche non arrivano: verifica permessi browser",
        "Troppe notifiche: regola l'intervallo minimo",
      ],
    },
  ],
};

// ============================================================================
// AMBIENT AUDIO
// ============================================================================

export const AMBIENT_AUDIO_KNOWLEDGE: FeatureCategory = {
  name: 'Audio Ambientale',
  icon: 'Headphones',
  features: [
    {
      name: 'Suoni per Concentrazione',
      description: 'Audio ambientale procedurale per migliorare focus e studio.',
      location: 'Barra in alto (icona cuffie) | Settings > Audio Ambientale',
      howToUse: [
        "Clicca l'icona cuffie nella barra in alto",
        'Scegli un preset (Focus, Deep Work, Pioggia, ecc.)',
        'Usa il cursore per regolare il volume',
        "Clicca play/pause per controllare l'audio",
      ],
      tips: [
        'I suoni sono generati dal browser, non serve scaricare nulla',
        'Usa cuffie per binaural beats (richiede stereo)',
        "L'audio si ferma automaticamente durante le chiamate vocali",
        'Puoi combinare piu suoni nelle impostazioni avanzate',
      ],
      troubleshooting: [
        'Audio non si sente: controlla volume sistema',
        'Binaural beats non funzionano: usa cuffie stereo',
        'Audio si ferma: normale durante chiamate vocali (ADR-0018)',
      ],
      relatedFeatures: ['Timer Pomodoro', 'Chiamate Vocali'],
    },
    {
      name: 'Preset Audio',
      description: 'Combinazioni predefinite di suoni per diversi contesti.',
      location: 'Cuffie > Menu preset | Settings > Audio Ambientale',
      howToUse: [
        'Focus: onde alpha per studio rilassato',
        'Deep Work: beta + rumore marrone per concentrazione intensa',
        'Pioggia: pioggia + camino + temporale',
        'Natura: foresta + oceano',
        'Biblioteca: ambiente silenzioso con fruscii',
        'Caffe: ambiente da bar/Starbucks',
      ],
      tips: [
        'Deep Work e ottimo per matematica e compiti difficili',
        'Focus e ideale per lettura e ripasso',
        'Pioggia aiuta a rilassarsi durante studio lungo',
      ],
    },
    {
      name: 'Integrazione Pomodoro',
      description: "L'audio si avvia/ferma con il timer Pomodoro.",
      location: 'Settings > Audio Ambientale > Pomodoro',
      howToUse: [
        "Attiva 'Avvia con Pomodoro' in impostazioni",
        'Scegli il preset da usare durante focus',
        'Audio si ferma automaticamente nelle pause (opzionale)',
      ],
      tips: [
        'Combina Deep Work con Pomodoro per massima concentrazione',
        'Durante le pause puoi tenere audio attivo o fermo',
      ],
    },
  ],
};

// ============================================================================
// ACCESSIBILITA
// ============================================================================

export const ACCESSIBILITY_KNOWLEDGE: FeatureCategory = {
  name: 'Accessibilita',
  icon: 'Accessibility',
  features: [
    {
      name: 'Profili Rapidi',
      description: 'Preset per dislessia, ADHD, autismo e altre esigenze.',
      location: 'Settings > Accessibilita > Profili Rapidi',
      howToUse: [
        'Vai a Impostazioni > Accessibilita',
        'Scegli il profilo che ti descrive meglio',
        "Le impostazioni si applicano automaticamente",
      ],
      tips: [
        'Puoi personalizzare ogni impostazione dopo aver scelto un profilo',
        'Profili disponibili: Dislessia, ADHD, Autismo, Visivo, Uditivo, Motorio',
      ],
    },
    {
      name: 'Font OpenDyslexic',
      description: 'Font progettato per facilitare la lettura con dislessia.',
      location: 'Settings > Accessibilita > Font',
      howToUse: [
        'Vai a Impostazioni > Accessibilita',
        "Attiva 'Font per Dislessia'",
        "Il font cambia in tutta l'app",
      ],
    },
    {
      name: 'Modalita ADHD',
      description: 'Riduce distrazioni, attiva focus mode e promemoria pause.',
      location: 'Settings > Accessibilita > ADHD',
      howToUse: [
        "Attiva 'Modalita ADHD' in Impostazioni",
        'Vengono disabilitate animazioni',
        'Si attiva il timer Pomodoro',
        'Ricevi promemoria per le pause',
      ],
    },
    {
      name: 'Alto Contrasto',
      description: 'Colori ad alto contrasto per problemi visivi.',
      location: 'Settings > Accessibilita > Visivo',
      howToUse: [
        "Attiva 'Alto Contrasto' in Impostazioni",
        "I colori diventano piu' contrastati",
      ],
    },
    {
      name: 'Text-to-Speech',
      description: "L'app legge i testi ad alta voce.",
      location: 'Settings > Accessibilita > Audio',
      howToUse: [
        "Attiva 'Leggi ad alta voce' in Impostazioni",
        'I testi vengono letti automaticamente',
        "Puoi regolare la velocita' di lettura",
      ],
    },
  ],
};

// ============================================================================
// ACCOUNT E PRIVACY
// ============================================================================

export const ACCOUNT_KNOWLEDGE: FeatureCategory = {
  name: 'Account e Privacy',
  icon: 'User',
  features: [
    {
      name: 'Profilo Studente',
      description: 'Le tue informazioni e preferenze.',
      location: 'Settings > Profilo',
      howToUse: [
        'Vai a Impostazioni > Profilo',
        "Modifica nome, eta', anno scolastico",
        'Indica le tue difficolta di apprendimento',
      ],
    },
    {
      name: 'Dashboard Genitori',
      description: 'I genitori possono vedere i progressi (con consenso).',
      location: 'Settings > Genitori > Apri Dashboard',
      howToUse: [
        "Richiede consenso GDPR dello studente",
        'Il genitore vede progressi aggregati',
        "Nessun accesso alle conversazioni private",
      ],
      tips: [
        "Lo studente puo' revocare il consenso in qualsiasi momento",
        "I dati possono essere esportati o cancellati",
      ],
    },
    {
      name: 'Esporta Dati (GDPR)',
      description: 'Scarica tutti i tuoi dati in formato JSON o PDF.',
      location: 'Settings > Privacy > Esporta Dati',
      howToUse: [
        "Vai a Impostazioni > Privacy",
        "Clicca 'Esporta i miei dati'",
        'Scegli formato JSON o PDF',
        'Il file viene scaricato',
      ],
    },
    {
      name: 'Cancella Dati',
      description: 'Elimina tutti i tuoi dati (irreversibile).',
      location: 'Settings > Privacy > Elimina Account',
      howToUse: [
        "Vai a Impostazioni > Privacy",
        "Clicca 'Elimina i miei dati'",
        'Conferma la cancellazione',
        'I dati vengono eliminati entro 30 giorni',
      ],
    },
  ],
};

// ============================================================================
// TROUBLESHOOTING GENERALE
// ============================================================================

export const GENERAL_TROUBLESHOOTING: Record<string, string[]> = {
  'App non carica': [
    'Ricarica la pagina (Cmd/Ctrl + R)',
    'Svuota la cache del browser',
    'Prova un altro browser (Chrome, Firefox, Safari)',
    'Controlla la connessione internet',
  ],
  'Login non funziona': [
    'Verifica di aver confermato email',
    "Prova 'Password dimenticata'",
    'Contatta supporto se problema persiste',
  ],
  'Audio/Voce non funziona': [
    'Controlla permessi microfono nel browser',
    'Verifica che nessun altra app usi il microfono',
    "Prova con cuffie/auricolari",
    "Su mobile: l'app funziona meglio con Chrome",
    'HTTPS richiesto: usa localhost o un dominio HTTPS',
  ],
  'Progressi non salvati': [
    'Verifica di essere loggato',
    'Controlla connessione internet',
    'Ricarica la pagina',
    "I progressi si sincronizzano ogni pochi secondi",
  ],
  'Notifiche non arrivano': [
    'Abilita notifiche nel browser',
    "Controlla che non siano in 'Ore di silenzio'",
    'Verifica impostazioni notifiche app',
  ],
};

// ============================================================================
// AGGREGATED KNOWLEDGE BASE
// ============================================================================

export const ALL_FEATURE_CATEGORIES: FeatureCategory[] = [
  MAESTRI_KNOWLEDGE,
  TOOLS_KNOWLEDGE,
  SUPPORT_KNOWLEDGE,
  GAMIFICATION_KNOWLEDGE,
  SCHEDULER_KNOWLEDGE,
  AMBIENT_AUDIO_KNOWLEDGE,
  ACCESSIBILITY_KNOWLEDGE,
  ACCOUNT_KNOWLEDGE,
];

/**
 * Generate a formatted knowledge base string for coach prompts.
 * This is injected into the coach's system prompt when handling tech support.
 */
export function generateKnowledgeBasePrompt(): string {
  let prompt = `## KNOWLEDGE BASE CONVERGIO (v${APP_VERSION.version})\n\n`;

  for (const category of ALL_FEATURE_CATEGORIES) {
    prompt += `### ${category.name}\n\n`;

    for (const feature of category.features) {
      prompt += `**${feature.name}**\n`;
      prompt += `${feature.description}\n`;
      prompt += `Dove: ${feature.location}\n`;
      prompt += `Come usare:\n`;
      for (const step of feature.howToUse) {
        prompt += `- ${step}\n`;
      }
      if (feature.tips && feature.tips.length > 0) {
        prompt += `Consigli:\n`;
        for (const tip of feature.tips) {
          prompt += `- ${tip}\n`;
        }
      }
      if (feature.troubleshooting && feature.troubleshooting.length > 0) {
        prompt += `Problemi comuni:\n`;
        for (const t of feature.troubleshooting) {
          prompt += `- ${t}\n`;
        }
      }
      prompt += '\n';
    }
  }

  prompt += `### Troubleshooting Generale\n\n`;
  for (const [problem, solutions] of Object.entries(GENERAL_TROUBLESHOOTING)) {
    prompt += `**${problem}**:\n`;
    for (const solution of solutions) {
      prompt += `- ${solution}\n`;
    }
    prompt += '\n';
  }

  return prompt;
}

/**
 * Get suggested prompts for common tech support questions.
 * Used by the support chat UI.
 */
export const TECH_SUPPORT_SUGGESTED_PROMPTS = [
  {
    icon: 'Phone',
    text: 'Come funzionano le chiamate vocali?',
    category: 'voice',
  },
  {
    icon: 'BookOpen',
    text: 'Come creo le flashcard?',
    category: 'tools',
  },
  {
    icon: 'Calendar',
    text: 'Come pianifico lo studio?',
    category: 'scheduler',
  },
  {
    icon: 'Accessibility',
    text: "Come attivo il font per dislessia?",
    category: 'accessibility',
  },
  {
    icon: 'Bell',
    text: 'Come imposto le notifiche?',
    category: 'notifications',
  },
  {
    icon: 'Trophy',
    text: 'Come funzionano XP e livelli?',
    category: 'gamification',
  },
];
