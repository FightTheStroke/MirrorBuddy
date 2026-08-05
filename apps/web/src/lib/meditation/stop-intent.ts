/**
 * Recognising a child who wants out.
 *
 * The robot has had this since the rest trap (ADR 0170); the browser did not,
 * which meant a student could ask a muted tab to stop and be ignored for up to
 * ten minutes. Deliberately narrow: it must not fire on ordinary speech during
 * a lesson, only on an unmistakable request to end.
 */

/**
 * Words that mean "stop" only when they are essentially the whole utterance.
 * "basta" is the trap: "basta così" ends the session, "basta poco per capirlo"
 * is a child following the lesson, and obeying the second would be rude.
 */
const ONLY_WHEN_ALONE = ['basta', 'ferma', 'finito', 'stop'];

const STOP_INTENTS = [
  'basta',
  'smetti',
  'stop',
  'fermati',
  'ferma',
  'zitto',
  'silenzio',
  'esci',
  'annulla',
  'abbiamo finito',
  'ho finito',
  'finito',
  'non voglio piu',
  'non voglio più',
  'lasciami',
  'torniamo a studiare',
  'basta cosi',
  'basta così',
];

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Compiled once, from the module constant above: no caller-supplied input ever
// reaches the RegExp constructor.
const MATCHERS = STOP_INTENTS.map((intent) => {
  const needle = stripAccents(intent);
  // eslint-disable-next-line security/detect-non-literal-regexp -- built from STOP_INTENTS, a module constant
  return { needle, pattern: new RegExp(`(^|\\s)${needle}(\\s|$)`) };
});

/** True when the student is asking to end what is currently happening. */
export function isStopIntent(transcript: string): boolean {
  const text = stripAccents(transcript.toLowerCase())
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return false;

  const words = text.split(' ').length;

  return MATCHERS.some(({ needle, pattern }) => {
    if (!pattern.test(text)) return false;
    if (ONLY_WHEN_ALONE.includes(needle) && words > 3) return false;
    return true;
  });
}
