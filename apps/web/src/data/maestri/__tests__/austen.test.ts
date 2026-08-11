/**
 * Test suite for Jane Austen — english maestra
 *
 * Two contracts matter here. Her books were published anonymously because she
 * was a woman, and a student can ask why at any moment. And irony is genuinely
 * hard for many students on this platform to recognise, so the prompt must
 * forbid turning it into a guessing game. These tests pin both.
 */
import { describe, it, expect } from 'vitest';
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from '../index';

const austen = () => getMaestroById('austen');

describe('Jane Austen maestra', () => {
  it('is registered and reachable by id', () => {
    expect(austen()?.id).toBe('austen');
    expect(austen()?.name).toBe('Austen');
  });

  it('teaches english, and the subject is nameable in the UI', () => {
    expect(austen()?.subject).toBe('english');
    expect(getAllSubjects()).toContain('english');
    expect(SUBJECT_NAMES.english).toBeTruthy();
  });

  it('has an avatar and a greeting like every other maestro', () => {
    expect(austen()?.avatar).toMatch(/\.webp$/);
    expect(austen()?.greeting?.length).toBeGreaterThan(10);
  });

  it('does not take over Shakespeare, who still teaches the same subject', () => {
    expect(getMaestroById('shakespeare')?.subject).toBe('english');
  });
});

describe('What Austen must never do with her own biography', () => {
  const prompt = () => austen()?.systemPrompt ?? '';

  it('tells the truth about publishing without her name', () => {
    expect(prompt()).toMatch(/By a Lady/i);
    expect(prompt()).toMatch(/Non menti e non nascondi|non menti/i);
  });

  it('never describes her illness or her death', () => {
    expect(prompt()).toMatch(/Non descrivi mai/i);
    expect(prompt()).toMatch(/malattia/i);
  });

  it('refuses to make her a victim', () => {
    expect(prompt()).toMatch(/Non la trasformi in una vittima/i);
  });

  it('always lands on the rule being wrong, not the woman', () => {
    expect(prompt()).toMatch(/Aveva\s+torto\s+la\s+regola/i);
  });

  it('redirects a student who seems to be speaking about themselves', () => {
    expect(prompt()).toMatch(/adulto\s+di\s+fiducia/i);
    expect(prompt()).toMatch(/nascondere/i);
  });
});

describe('Austen never turns irony into a trap', () => {
  const prompt = () => austen()?.systemPrompt ?? '';

  it('explains irony instead of making the student guess it', () => {
    expect(prompt()).toMatch(/L'ironia si spiega, non si fa indovinare/i);
    expect(prompt()).toMatch(/senza farne un indovinello/i);
  });

  it('does not treat a different reading as a wrong answer', () => {
    expect(prompt()).toMatch(/Niente domande a risposta giusta/i);
    expect(prompt()).toMatch(/non gli dici che ha sbagliato/i);
  });
});

describe('Austen and Shakespeare share a subject without competing', () => {
  const prompt = () => austen()?.systemPrompt ?? '';

  it('sends the student to Shakespeare when he suits them better', () => {
    expect(prompt()).toMatch(/Shakespeare/);
    expect(prompt()).toMatch(/Vai da Shakespeare|non competi|non lo sminuisci/i);
  });
});

describe('Austen respects the students in front of her', () => {
  const prompt = () => austen()?.systemPrompt ?? '';

  it('never asks a student to go faster', () => {
    expect(prompt()).toMatch(/mai di andare più veloce/i);
  });

  it('keeps the quoted text short and offers to read it aloud', () => {
    expect(prompt()).toMatch(/due righe/i);
    expect(prompt()).toMatch(/ad alta voce/i);
  });

  it('does not summarise a book so the student can skip reading it', () => {
    expect(prompt()).toMatch(/Non riassumi un libro/i);
  });
});
