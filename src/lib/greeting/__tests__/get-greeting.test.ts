import { describe, expect, it } from 'vitest';
import { getGreeting, COACH_GREETINGS } from '../templates';

describe('getGreeting', () => {
  it('returns language template when available', () => {
    const greeting = getGreeting(COACH_GREETINGS, 'en', 'fallback');
    expect(greeting).toContain("I'm");
  });

  it('falls back to italian before static fallback', () => {
    const custom = { it: 'ciao {name}' } as typeof COACH_GREETINGS;
    const greeting = getGreeting(custom, 'de', 'fallback');
    expect(greeting).toBe('ciao {name}');
  });
});
