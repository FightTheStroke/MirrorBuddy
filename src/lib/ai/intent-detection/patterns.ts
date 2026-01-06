import type { Subject, ToolType } from '@/types';
import type { EmotionalIndicator } from './types';

export const SUBJECT_PATTERNS: Record<Subject, RegExp[]> = {
  mathematics: [
    /\b(matemat|calcol|equazion|formul|geometr|algebra|aritmetica)\b/i,
    /\b(problema|esercizio)\s+(di\s+)?(matematica|calcolo)\b/i,
  ],
  physics: [
    /\b(fisica|forza|energia|velocità|accelerazione|moto|gravità)\b/i,
    /\b(legge|principio)\s+(di\s+)?(fisica|newton)\b/i,
  ],
  chemistry: [
    /\b(chimica|elemento|composto|reazione|molecola|atomo)\b/i,
    /\b(tavola\s+periodica|formula\s+chimica)\b/i,
  ],
  biology: [
    /\b(biologia|cellula|organismo|sistema|anatomia|fisiologia)\b/i,
    /\b(pianta|animale|corpo\s+umano)\b/i,
  ],
  history: [
    /\b(storia|storico|epoca|periodo|guerra|battaglia)\b/i,
    /\b(antico|medioevo|rinascimento|rivoluzione)\b/i,
  ],
  geography: [
    /\b(geografia|paese|nazione|continente|capitale|montagna|fiume)\b/i,
    /\b(mappa|cartina|territorio)\b/i,
  ],
  italian: [
    /\b(italiano|grammatica|sintassi|analisi|letteratura|poesia)\b/i,
    /\b(verbo|sostantivo|aggettivo|analisi\s+grammaticale)\b/i,
  ],
  english: [
    /\b(inglese|english|grammar|verb|noun|adjective)\b/i,
    /\b(translation|traduzione)\b/i,
  ],
  art: [
    /\b(arte|artistico|disegno|pittura|scultura|storia\s+dell'arte)\b/i,
    /\b(artista|opera|quadro)\b/i,
  ],
  music: [
    /\b(musica|musicale|nota|strumento|compositore|melodia)\b/i,
    /\b(chitarra|piano|violino)\b/i,
  ],
  civics: [],
  economics: [],
  computerScience: [],
  health: [],
  philosophy: [],
  internationalLaw: [],
};

export const EMOTIONAL_PATTERNS: Record<EmotionalIndicator, RegExp[]> = {
  frustration: [
    /\b(non\s+capisco|non\s+riesco|difficile|impossibile|frustrato)\b/i,
    /\b(bloccato|perso|confuso)\b/i,
  ],
  anxiety: [
    /\b(ansia|ansioso|preoccupato|paura|timore)\b/i,
    /\b(non\s+ce\s+la\s+faccio|tempo|scadenza)\b/i,
  ],
  sadness: [
    /\b(triste|tristezza|depresso|demoralizzato)\b/i,
    /\b(male|male|non\s+va\s+bene)\b/i,
  ],
  loneliness: [
    /\b(solo|solitario|isolato|nessuno)\b/i,
    /\b(non\s+ho\s+amici|nessuno\s+mi\s+capisce)\b/i,
  ],
  overwhelm: [
    /\b(troppo|troppa|sovraccarico|sopraffatto)\b/i,
    /\b(non\s+so\s+da\s+dove\s+iniziare|troppe\s+cose)\b/i,
  ],
  excitement: [
    /\b(eccitato|entusiasta|felice|contento)\b/i,
    /\b(bello|fantastico|meraviglioso)\b/i,
  ],
  confidence: [
    /\b(sicuro|fiducioso|capace|bravo)\b/i,
    /\b(ce\s+la\s+posso\s+fare|riesco)\b/i,
  ],
};

export const METHOD_PATTERNS: RegExp[] = [
  /\b(come\s+studio|metodo\s+di\s+studio|organizz|pianific)\b/i,
  /\b(come\s+imparo|tecnica|strategia)\b/i,
  /\b(come\s+ripasso|schemat|riassunt)\b/i,
];

export const TOOL_PATTERNS: RegExp[] = [
  /\b(mappa\s+mentale|schema|diagramma)\b/i,
  /\b(flashcard|carte|ripasso)\b/i,
  /\b(quiz|test|verifica)\b/i,
  /\b(mi\s+aiuti|fai)\s+(a\s+fare|con)\s+(le\s+)?flashcard\b/i,
];

export const TECH_SUPPORT_PATTERNS: RegExp[] = [
  /\b(app|applicazione|sito|mirrorbuddy|piattaforma)\b/i,
  /\b(come\s+si\s+usa|come\s+(funziona|uso)\s+(l'|la\s+)?app)\b/i,
  /\b(voce|microfono|audio|chiamat[ae]\s+vocal[ei])\b/i,
  /\b(impostazion[ei]|settings?|config|preferenz[ae])\b/i,
  /\b(tema|scuro|chiaro|dark\s+mode|light\s+mode)\b.*\b(cambi|attiv|dove|come)\b/i,
  /\b(font|carattere|opendyslexic)\b.*\b(cambiare|attivare|dove)\b/i,
  /\b(timer|pomodoro)\b/i,
  /\b(notific[ah]e?|promemoria|avvis[oi])\b.*\b(attivare|disattivare|non\s+arrivano|dove)\b/i,
  /\b(account|profilo|login|accesso|password)\b.*\b(creare|cambiare|recuperare|dove)\b/i,
  /\b(bug|errore|problema\s+tecnico|bloccato)\b/i,
  /\b(non\s+(carica|funziona|si\s+apre|risponde|va))\b/i,
];

export const TOOL_TYPE_PATTERNS: Record<ToolType, RegExp[]> = {
  mindmap: [
    /\b(mappa\s*(mentale|concettuale)?)\b/i,
    /\b(schema|diagramma)\b/i,
    /\b(organizza\s*(le\s+)?idee)\b/i,
  ],
  quiz: [
    /\b(quiz|test|verifica|interrogazione)\b/i,
    /\b(domande|esercizi)\b/i,
    /\b(mi\s+interroghi?)\b/i,
  ],
  flashcard: [
    /\b(flashcard|flash\s*card)\b/i,
    /\b(carte\s+(per\s+)?ripass(o|are))\b/i,
    /\b(schede\s+di\s+studio)\b/i,
  ],
  demo: [
    /\b(demo|simulazione|animazione)\b/i,
    /\b(mostra(mi)?\s+(come|cosa))\b/i,
    /\b(interattiv[ao])\b/i,
  ],
  search: [],
  diagram: [],
  timeline: [],
  summary: [],
  formula: [],
  chart: [],
  pdf: [],
  homework: [],
  webcam: [],
};

export const CRISIS_PATTERNS: RegExp[] = [
  /\b(voglio\s+morire|non\s+voglio\s+vivere|farmi\s+del\s+male|suicid)\b/i,
  /\b(ammazzar(mi|si)|tagliar(mi|si))\b/i,
  /\b(nessuno\s+mi\s+vuole|nessuno\s+mi\s+ama|sarebbe\s+meglio\s+se\s+non\s+esistessi)\b/i,
  /\b(mi\s+odio|mi\s+faccio\s+schifo)\b/i,
];

