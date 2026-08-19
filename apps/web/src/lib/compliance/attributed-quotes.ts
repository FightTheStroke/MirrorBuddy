/**
 * Speaker-attributed quotations in free prose (DATA-GOVERNANCE-SOP.md, G-7).
 *
 * The provenance suite could only see a quotations *heading*. That catches a
 * curated list of a series' dialogue, which is how the original exposure
 * announced itself, but it is blind to the same material written into ordinary
 * prose — proven by mutation during the gate on the IP provenance card.
 *
 * What carries the risk is not a quoted string. The corpus is full of work
 * titles, coined terms and rhetorical questions in quotes, and none of them
 * reproduce anyone's expression. The risk is a quoted string presented as
 * *something a named person or character said*. That is what this finds.
 */

const OPEN_QUOTE = '[«"“]';
const CLOSE_QUOTE = '[»"”]';

/** Verbs that present the following text as someone's own words, it + en. */
const SPEECH_VERB =
  '(?:dice|diceva|dicono|dicevano|afferma|affermava|sostiene|sosteneva|ripete|ripeteva|' +
  'racconta|raccontava|scrive|scriveva|osserva|osservava|dichiara|dichiarava|esclama|' +
  'esclamava|risponde|rispondeva|chiede|chiedeva|ammonisce|ammoniva|says|said|writes|' +
  'wrote|tells|told|asks|asked|replies|replied|observes|observed|declares|declared)';

/** A capitalised name, optionally multi-word: "Cassese", "Alex Pina". */
const NAME = "[A-ZÀ-Þ][\\p{L}'’-]+(?:[ \\t]+[A-ZÀ-Þ][\\p{L}'’-]+){0,2}";

/**
 * Labels that open a line with a colon but name no one: locale codes, and the
 * structural markers the corpus uses to lay out examples. Without these the
 * script-form rule reads `ES: "el plan"` as someone quoting Spanish, and
 * `Student: "non capisco"` as a real student being reproduced.
 */
const STRUCTURAL_LABELS = new Set(
  [
    'EN',
    'IT',
    'ES',
    'FR',
    'DE',
    'PT',
    'LAT',
    'GR',
    'Student',
    'Studente',
    'Studenti',
    'Domanda',
    'Risposta',
    'Esempio',
    'Esempi',
    'Nota',
    'Obiettivo',
    'Input',
    'Output',
    'Prompt',
    'Tono',
    'Stile',
    'Contesto',
    'Inizio',
    'Svolta',
    'Fine',
    'Crisi',
    'Problema',
    'Soluzione',
    'Situazione',
    'Caso',
    'Scenario',
    'Tip',
    'Suggerimento',
    'Errore',
    'Correzione',
  ].map((label) => label.toLowerCase()),
);

function isStructuralLabel(speaker: string): boolean {
  return STRUCTURAL_LABELS.has(speaker.trim().toLowerCase());
}

/** Words that may sit between the verb and the quote: "ripeteva spesso che i giovani," */
const FILLER = '[^.!?\\n]{0,80}';

export interface AttributedQuote {
  /** The quoted text, without its quote marks. */
  quote: string;
  /** The name the quote is attributed to. */
  speaker: string;
  /** 1-based line number in the source text. */
  line: number;
}

interface Rule {
  regex: RegExp;
  speakerGroup: number;
  quoteGroup: number;
}

function rules(): Rule[] {
  return [
    // Cassese ripeteva spesso che i giovani, "non ancora disillusi", ...
    {
      regex: new RegExp(
        `(${NAME})\\s+${SPEECH_VERB}\\b${FILLER}?${OPEN_QUOTE}([^«»"“”\\n]{4,200})${CLOSE_QUOTE}`,
        'gu',
      ),
      speakerGroup: 1,
      quoteGroup: 2,
    },
    // "Il piano è il piano", diceva il Professore.
    {
      regex: new RegExp(
        `${OPEN_QUOTE}([^«»"“”\\n]{4,200})${CLOSE_QUOTE}[, \\t]*(?:${SPEECH_VERB})[ \\t]+(?:il|lo|la|l'|the)?[ \\t]*(${NAME})`,
        'gu',
      ),
      speakerGroup: 2,
      quoteGroup: 1,
    },
    // Mascetti: "Come se fosse antani"    (script form, at line start)
    {
      regex: new RegExp(
        `^\\s*(?:[-*]\\s*)?(${NAME})\\s*:\\s*${OPEN_QUOTE}([^«»"“”\\n]{4,200})${CLOSE_QUOTE}`,
        'gmu',
      ),
      speakerGroup: 1,
      quoteGroup: 2,
    },
    // "Come se fosse antani" — Mascetti
    {
      regex: new RegExp(
        `${OPEN_QUOTE}([^«»"“”\\n]{4,200})${CLOSE_QUOTE}[ \\t]*[—–-]{1,2}[ \\t]*(${NAME})`,
        'gu',
      ),
      speakerGroup: 2,
      quoteGroup: 1,
    },
  ];
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === '\n') line += 1;
  }
  return line;
}

/**
 * Every quoted string in `text` that is presented as a named speaker's words.
 * Deduplicated by quote + speaker, in order of first appearance.
 */
export function findAttributedQuotes(text: string): AttributedQuote[] {
  const found = new Map<string, AttributedQuote>();

  for (const rule of rules()) {
    for (const match of text.matchAll(rule.regex)) {
      const speaker = match[rule.speakerGroup]?.trim();
      const quote = match[rule.quoteGroup]?.trim();
      if (speaker === undefined || quote === undefined) continue;

      if (isStructuralLabel(speaker)) continue;

      const key = `${speaker}::${quote}`;
      if (!found.has(key)) {
        found.set(key, { quote, speaker, line: lineOf(text, match.index ?? 0) });
      }
    }
  }

  return [...found.values()].sort((a, b) => a.line - b.line);
}
