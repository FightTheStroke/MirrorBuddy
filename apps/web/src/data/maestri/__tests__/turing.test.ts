/**
 * Test suite for Alan Turing — computer science maestro
 *
 * Turing is the only maestro whose biography includes a persecution and an
 * early death. What he is allowed to say about it is not a style preference:
 * a child can ask "how did it end?" at any moment, and the answer has to be
 * truthful without being graphic. These tests pin that contract.
 */
import { describe, it, expect } from 'vitest';
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from '../index';

const turing = () => getMaestroById('turing');

describe('Alan Turing maestro', () => {
  it('is registered and reachable by id', () => {
    expect(turing()?.id).toBe('turing');
    expect(turing()?.name).toBe('Turing');
  });

  it('teaches computer science, and the subject is nameable in the UI', () => {
    expect(turing()?.subject).toBe('computerScience');
    expect(getAllSubjects()).toContain('computerScience');
    expect(SUBJECT_NAMES.computerScience).toBeTruthy();
  });

  it('has an avatar and a greeting like every other maestro', () => {
    expect(turing()?.avatar).toMatch(/\.webp$/);
    expect(turing()?.greeting?.length).toBeGreaterThan(10);
  });

  it('does not take over Ada Lovelace, who still teaches the same subject', () => {
    expect(getMaestroById('lovelace')?.subject).toBe('computerScience');
  });
});

describe('What Turing must never do with his own biography', () => {
  const prompt = () => turing()?.systemPrompt ?? '';

  it('tells the truth when asked how it ended', () => {
    expect(prompt()).toMatch(/omosessual/i);
    expect(prompt()).toMatch(/1952/);
    expect(prompt()).toMatch(/Non menti e non nascondi|non menti/i);
  });

  it('never describes the death, the trial or the hormone treatment', () => {
    expect(prompt()).toMatch(/Non descrivi mai/i);
    expect(prompt()).toMatch(/ormonal/i);
  });

  it('does not turn the fact into sex education', () => {
    expect(prompt()).toMatch(/educazione sessuale/i);
  });

  it('always lands on the country being wrong, not the man', () => {
    expect(prompt()).toMatch(/aveva torto il paese|il paese.*torto/i);
  });

  it('redirects a student who seems to be speaking about themselves', () => {
    expect(prompt()).toMatch(/adulto\s+di\s+fiducia/i);
  });

  it('names the pardon and the law that followed', () => {
    expect(prompt()).toMatch(/2013/);
    expect(prompt()).toMatch(/2017/);
  });
});

describe('Turing and Ada share a subject without competing', () => {
  const prompt = () => turing()?.systemPrompt ?? '';

  it('sends the student to Ada when she suits them better', () => {
    expect(prompt()).toMatch(/Ada/);
    expect(prompt()).toMatch(/Chiedi ad Ada|non competi|non la sminuisci/i);
  });
});

describe('Turing respects the students in front of him', () => {
  const prompt = () => turing()?.systemPrompt ?? '';

  it('never asks a student to go faster', () => {
    expect(prompt()).toMatch(/mai di andare più veloce/i);
  });

  it('runs code only in the sandbox', () => {
    expect(prompt()).toMatch(/Sandbox/i);
  });
});
