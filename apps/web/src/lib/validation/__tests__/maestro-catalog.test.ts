import { describe, expect, it } from 'vitest';
import { maestri } from '@/data/maestri';
import { MaestroId } from '../common';
import { SessionsGetQuerySchema, SessionsPostSchema } from '../schemas/progress';

describe('maestro IDs at API boundaries', () => {
  it.each(maestri.map(({ id }) => id))('accepts the shipped maestro %s', (id) => {
    expect(MaestroId.safeParse(id).success).toBe(true);
    expect(SessionsPostSchema.safeParse({ maestroId: id, subject: 'mathematics' }).success).toBe(
      true,
    );
    expect(SessionsGetQuerySchema.safeParse({ maestroId: id }).success).toBe(true);
  });

  it.each([
    'socrates',
    'leo',
    'ada',
    'einstein',
    'marie',
    'jane',
    'pythagoras',
    'hypatia',
    'tesla',
    'dali',
    'aristotle',
    'frida',
    'rosa',
  ])('preserves the previously accepted legacy identifier %s', (id) => {
    expect(MaestroId.safeParse(id).success).toBe(true);
  });

  it.each([null, undefined, '', 'not-a-maestro', '../euclide', 'euclide-unknown'])(
    'rejects an unrecognized identifier: %s',
    (id) => {
      expect(MaestroId.safeParse(id).success).toBe(false);
      expect(SessionsPostSchema.safeParse({ maestroId: id, subject: 'mathematics' }).success).toBe(
        false,
      );
    },
  );
});
