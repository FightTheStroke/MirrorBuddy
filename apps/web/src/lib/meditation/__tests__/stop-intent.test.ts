/**
 * A child asking to stop must be obeyed, and ordinary lesson talk must not be
 * mistaken for asking to stop. Both halves are safety-relevant.
 */

import { describe, expect, it } from 'vitest';
import { isStopIntent } from '../stop-intent';

describe('isStopIntent', () => {
  it.each([
    'basta',
    'Basta!',
    'basta così',
    'smetti per favore',
    'fermati',
    'zitto',
    'ok abbiamo finito',
    'non voglio più',
    'stop',
  ])('hears "%s" as a request to stop', (phrase) => {
    expect(isStopIntent(phrase)).toBe(true);
  });

  it.each([
    'mi piace questa storia',
    'non ho capito bene',
    'puoi ripetere',
    'sono agitato',
    'basta poco per capirlo', // "basta" as a verb, not a request
    '',
  ])('does not hear "%s" as a request to stop', (phrase) => {
    expect(isStopIntent(phrase)).toBe(false);
  });
});
