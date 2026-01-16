import type { Subject, ToolType } from '@/types';
import type { EmotionalIndicator } from './types';

export const SUBJECT_PATTERNS: Record<Subject, RegExp[]> = {
  mathematics: [
    /\b(matematic\w*|calcol\w*|equazion\w*|formul\w*|geometr\w*|algebr\w*|aritmetic\w*|derivat\w*|percentual\w*)\b/i,
    /\b(problema|esercizio)\s+(di\s+)?(matematica|calcolo)\b/i,
  ],
  physics: [
    /\b(fisic\w*|forz\w*|energia\w*|velocità|velocita|acceleraz\w*|moto\b|gravità|gravita|cinematic\w*|dinamic\w*|meccanic\w*)\b/i,
    /\b(legge|leggi|principio)\s+(di\s+)?(fisica|newton)\b/i,
  ],
  chemistry: [
    /\b(chimica|elemento|composto|reazione|molecola|atomo)\b/i,
    /\b(tavola\s+periodica|formula\s+chimica)\b/i,
  ],
  biology: [
    /\b(biologia|cellula|organismo|sistema|anatomia|fisiologia|fotosintes[iì])\b/i,
    /\b(pianta|animale|corpo\s+umano)\b/i,
  ],
  history: [
    /\b(storia|storico|epoca|periodo|guerra|battaglia|risorgimento|romana|romani|greci|grecia|greco)\b/i,
    /\b(antico|antich[iy]|medioevo|medioevale|rinascimento|rivoluzione|mondiale)\b/i,
  ],
  geography: [
    /\b(geografia|paese|nazione|continente|capitale|montagna|fiume)\b/i,
    /\b(mappa|cartina|territorio)\b/i,
  ],
  italian: [
    /\b(italiano|grammatica|sintassi|analisi|letteratura|poesia|divina\s+commedia|promessi\s+sposi|manzoni|dante)\b/i,
    /\b(verbo|sostantivo|aggettivo|analisi\s+grammaticale|analisi\s+del\s+periodo)\b/i,
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
  computerScience: [
    /\b(informatica|programmazione|coding|algoritm[oi]|computer|software|hardware)\b/i,
  ],
  health: [],
  philosophy: [],
  internationalLaw: [],
  spanish: [
    /spagnol/i,
    /español/i,
    /spanish/i,
    /casa\s*di?\s*carta/i,
    /money\s*heist/i,
    /alex\s*pina/i,
    /castellano/i,
    /reggaeton/i,
  ],
  storytelling: [
    /storytelling/i,
    /public\s*speaking/i,
    /presentazion/i,
    /parlare\s*in\s*pubblico/i,
    /comunicazion/i,
  ],
  supercazzola: [
    /supercazzol/i,
    /antani/i,
    /mascetti/i,
    /amici\s*miei/i,
    /scappellamento/i,
    /tapioca/i,
  ],
  sport: [
    /\bsport\b/i,
    /\bnuot[oa]|nuotar/i,
    /\batletic/i,
    /\bparalimpic/i,
    /\bmovimento/i,
    /\ballenament/i,
    /\besercizi/i,
  ],
};

export const EMOTIONAL_PATTERNS: Record<EmotionalIndicator, RegExp[]> = {
  frustration: [
    /\b(non\s+capisco|non\s+riesco|difficile|impossibile|frustrat[oa])\b/i,
    /\b(bloccato|perso|confuso|non\s+ce\s+la\s+faccio|mi\s+arrendo|stuf[ao])\b/i,
  ],
  anxiety: [
    /\b(ansia|ansioso|ansiosa|preoccupat[oa]|paura|timore|stressat[oa]|stress)\b/i,
    /\b(non\s+ce\s+la\s+faccio\s+in\s+tempo|poco\s+tempo|senza\s+tempo|scadenza|in\s+ritardo)\b/i,
  ],
  sadness: [
    /\b(trist[oe]|tristezza|depresso|depressa|demoralizzat[oa])\b/i,
    /\b(male|non\s+va\s+bene|non\s+ho\s+voglia|mi\s+sento\s+giu)\b/i,
  ],
  loneliness: [
    /\b(solo|solitaria?|isolat[oa]|nessuno)\b/i,
    /\b(non\s+ho\s+amici|nessuno\s+mi\s+capisce|mi\s+sento\s+sol[oa]|mi\s+sento\s+esclus[oa]|emarginat[oa])\b/i,
  ],
  overwhelm: [
    /\b(troppo|troppa|sovraccarico|sopraffatto)\b/i,
    /\b(non\s+so\s+da\s+dove\s+iniziare|troppe\s+cose)\b/i,
  ],
  excitement: [
    /\b(eccitat[oa]|entusiasta|felice|content[oa]|evviva)\b/i,
    /\b(bello|fantastico|meraviglioso|ce\s+l'ho\s+fatta|finalmente)\b/i,
  ],
  confidence: [
    /\b(sicuro|fiducioso|capace|bravo)\b/i,
    /\b(ce\s+la\s+posso\s+fare|riesco)\b/i,
  ],
};

export const METHOD_PATTERNS: RegExp[] = [
  /\b(come\s+studio|come\s+(devo|posso)\s+studiare|metodo\s+di\s+studio|organizz|pianific|non\s+so\s+da\s+dove\s+iniziare)\b/i,
  /\b(come\s+imparo|tecnica|strategia|memorizz|concentr[ao]|concentrarmi)\b/i,
  /\b(come\s+ripasso|schemat|riassunt|gestire\s+(meglio\s+)?(il\s+)?tempo)\b/i,
];

export const TOOL_PATTERNS: RegExp[] = [
  /\b(crea(mi)?|fammi|fai|genera|prepara|costruisci|voglio|vorrei|dammi)\s+(una\s+)?(mappa\s*(mentale|concettuale)?|schema|diagramma|flashcard|carte\s+di\s+ripasso|quiz|test|verifica)\b/i,
  /\b(flashcard|mappa\s*(mentale|concettuale)?|schema)\b.*\b(su|di)\b/i,
  /\b(prepara|crea)\b.*\b(quiz|test|verifica)\b/i,
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
  /\b(badge|punti\s+(esperienza|xp)|streak)\b/i,
];

export const TOOL_TYPE_PATTERNS: Record<ToolType, RegExp[]> = {
  mindmap: [
    /\b(mappa\s*(mentale|concettuale)?)\b/i,
    /\b(schema|diagramma|mappa)\b/i,
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
  calculator: [
    /\b(calcol[ao]|calcolatrice)\b/i,
    /\b(quanto\s+fa)\b/i,
  ],
  chart: [],
  pdf: [],
  homework: [],
  webcam: [],
  'study-kit': [],
};

export const CRISIS_PATTERNS: RegExp[] = [
  /\b(voglio\s+morire|non\s+voglio\s+vivere|farmi\s+del\s+male|suicid)\b/i,
  /\b(ammazzar(mi|si)|tagliar(mi|si))\b/i,
  /\b(nessuno\s+mi\s+vuole|nessuno\s+mi\s+ama|sarebbe\s+meglio\s+se\s+non\s+esistessi)\b/i,
  /\b(mi\s+odio|mi\s+faccio\s+schifo)\b/i,
];

