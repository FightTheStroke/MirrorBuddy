/**
 * Test suite for Emmy Noether — mathematics maestra
 *
 * Noether's biography is one of exclusion: barred from enrolling, unpaid for
 * seven years, lecturing under a man's name, then dismissed for being Jewish.
 * A student can ask about any of that at any moment, and the answer has to be
 * truthful without being graphic, and without turning her into a victim.
 * These tests pin that contract.
 */
import { describe, it, expect } from 'vitest';
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from '../index';

const noether = () => getMaestroById('noether');

describe('Emmy Noether maestra', () => {
  it('is registered and reachable by id', () => {
    expect(noether()?.id).toBe('noether');
    expect(noether()?.name).toBe('Noether');
  });

  it('teaches mathematics, and the subject is nameable in the UI', () => {
    expect(noether()?.subject).toBe('mathematics');
    expect(getAllSubjects()).toContain('mathematics');
    expect(SUBJECT_NAMES.mathematics).toBeTruthy();
  });

  it('has an avatar and a greeting like every other maestro', () => {
    expect(noether()?.avatar).toMatch(/\.webp$/);
    expect(noether()?.greeting?.length).toBeGreaterThan(10);
  });

  it('does not take over Euclide, who still teaches the same subject', () => {
    expect(getMaestroById('euclide')?.subject).toBe('mathematics');
  });
});

describe('What Noether must never do with her own biography', () => {
  const prompt = () => noether()?.systemPrompt ?? '';

  it('tells the truth about being kept out because she was a woman', () => {
    expect(prompt()).toMatch(/perch[ée] era una donna|era una donna/i);
    expect(prompt()).toMatch(/senza stipendio/i);
    expect(prompt()).toMatch(/Non menti e non nascondi|non menti/i);
  });

  it('names the 1933 dismissal without describing the persecution', () => {
    expect(prompt()).toMatch(/1933/);
    expect(prompt()).toMatch(/Non descrivi mai/i);
  });

  it('refuses to make her a victim', () => {
    expect(prompt()).toMatch(/Non la trasformi in una vittima/i);
    expect(prompt()).toMatch(/ostinazione/i);
  });

  it('always lands on those who blocked her being wrong', () => {
    expect(prompt()).toMatch(/aveva\s+torto/i);
  });

  it('redirects a student who seems to be speaking about themselves', () => {
    expect(prompt()).toMatch(/adulto\s+di\s+fiducia/i);
    expect(prompt()).toMatch(/escluso|messo da parte/i);
  });
});

describe('Noether and Euclide share a subject without competing', () => {
  const prompt = () => noether()?.systemPrompt ?? '';

  it('sends the student to Euclide when he suits them better', () => {
    expect(prompt()).toMatch(/Euclide/);
    expect(prompt()).toMatch(/Resta con Euclide|non competi|non lo sminuisci/i);
  });
});

describe('Noether respects the students in front of her', () => {
  const prompt = () => noether()?.systemPrompt ?? '';

  it('never asks a student to go faster', () => {
    expect(prompt()).toMatch(/mai di andare più veloce/i);
  });

  it('does not treat badly written digits as a mathematics error', () => {
    expect(prompt()).toMatch(/numeri scritti male/i);
  });

  it('never presents a conjecture as a theorem', () => {
    expect(prompt()).toMatch(/congettura/i);
  });
});
