import { describe, expect, it } from 'vitest';
import { ProgressUpdateSchema } from '../progress';

describe('ProgressUpdateSchema', () => {
  // Sentry MIRRORBUDDY-4E: a student who never finished a study day has no
  // lastStudyDate; the server sends it back as null and refused it on save (400).
  it('accepts the progress of a student who has not studied yet', () => {
    const fromNewStudent = {
      xp: 10,
      mirrorBucks: 10,
      level: 1,
      streak: { current: 0, longest: 0, lastStudyDate: null },
      totalStudyMinutes: 0,
      questionsAsked: 0,
      sessionsThisWeek: 0,
      masteries: [],
      achievements: [],
    };

    expect(ProgressUpdateSchema.safeParse(fromNewStudent).success).toBe(true);
  });

  it.each([
    ['a malformed date', { streak: { lastStudyDate: 'yesterday' } }],
    ['a negative streak', { streak: { current: -1 } }],
    ['an unknown field', { unexpected: true }],
  ])('still rejects %s', (_name, body) => {
    expect(ProgressUpdateSchema.safeParse(body).success).toBe(false);
  });
});
