/**
 * Test suite for Frida Kahlo — art maestra
 *
 * Kahlo is the only maestra who worked from a bed and a wheelchair, on a
 * platform whose students often have bodies that do not cooperate. That makes
 * her the easiest character to get wrong: the failure mode is inspiration
 * porn — "she suffered and made great art, so can you". The biography rules
 * below exist to make that impossible, and these tests pin them.
 */
import { describe, it, expect } from 'vitest';
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from '../index';

const kahlo = () => getMaestroById('kahlo');

describe('Frida Kahlo maestra', () => {
  it('is registered and reachable by id', () => {
    expect(kahlo()?.id).toBe('kahlo');
    expect(kahlo()?.name).toBe('Kahlo');
  });

  it('teaches art, and the subject is nameable in the UI', () => {
    expect(kahlo()?.subject).toBe('art');
    expect(getAllSubjects()).toContain('art');
    expect(SUBJECT_NAMES.art).toBeTruthy();
  });

  it('has an avatar and a greeting like every other maestro', () => {
    expect(kahlo()?.avatar).toMatch(/\.webp$/);
    expect(kahlo()?.greeting?.length).toBeGreaterThan(10);
  });

  it('does not take over Leonardo, who still teaches the same subject', () => {
    expect(getMaestroById('leonardo')?.subject).toBe('art');
  });
});

describe('What Kahlo must never do with her own biography', () => {
  const prompt = () => kahlo()?.systemPrompt ?? '';

  it('tells the truth when asked, instead of hiding the polio and the accident', () => {
    expect(prompt()).toMatch(/Non menti e non nascondi/i);
    expect(prompt()).toMatch(/polio/i);
  });

  it('never describes her injuries, operations or pain to a child', () => {
    expect(prompt()).toMatch(/Non descrivi mai/i);
    expect(prompt()).toMatch(/operazioni/i);
  });

  it('keeps her miscarriages and her private life out of a lesson', () => {
    expect(prompt()).toMatch(/figli\s+che\s+non\s+ha\s+potuto\s+avere/i);
    expect(prompt()).toMatch(/vita\s+sentimentale/i);
  });

  it('refuses both the victim and the hero-to-imitate reading', () => {
    expect(prompt()).toMatch(/Non la trasformi in una vittima/i);
    expect(prompt()).toMatch(/eroina da imitare/i);
  });

  it('never claims that suffering is what makes an artist', () => {
    expect(prompt()).toMatch(/la\s+sofferenza\s+rende\s+artisti/i);
    expect(prompt()).toMatch(/forza\s+di\s+volontà/i);
  });

  it('never uses her story to lecture a student who is having a bad day', () => {
    expect(prompt()).toMatch(/per\s+fare\s+la\s+morale/i);
    expect(prompt()).toMatch(/va\s+bene\s+così/i);
  });

  it('redirects a student who seems to be speaking about their own body', () => {
    expect(prompt()).toMatch(/adulto\s+di\s+fiducia/i);
    expect(prompt()).toMatch(/non\s+fai\s+l'esperta/i);
  });
});

describe('Kahlo teaches art to someone who cannot draw well', () => {
  const prompt = () => kahlo()?.systemPrompt ?? '';

  it('never calls a work ugly, and asks about intent instead', () => {
    expect(prompt()).toMatch(/Mai la parola "brutto"/i);
    expect(prompt()).toMatch(/cosa volevi far sentire/i);
  });

  it('puts meaning before technique', () => {
    expect(prompt()).toMatch(/Prima il significato, poi la tecnica/i);
  });

  it('gives a concrete method for painting a feeling', () => {
    expect(prompt()).toMatch(/Simboli, non descrizioni/i);
    expect(prompt()).toMatch(/dipingi l'oggetto/i);
  });

  it('attacks the blank page rather than the student', () => {
    expect(prompt()).toMatch(/Cominciare male è cominciare/i);
    expect(prompt()).toMatch(/foglio\s+bianco/i);
  });

  it('sends the student to Leonardo for technique rather than competing', () => {
    expect(prompt()).toMatch(/LEONARDO E TE/);
    expect(prompt()).toMatch(/Vai da Leonardo/i);
  });
});

describe('Kahlo respects the students in front of her', () => {
  const prompt = () => kahlo()?.systemPrompt ?? '';

  it('never assumes a student can hold a pencil', () => {
    expect(prompt()).toMatch(/come\s+si\s+muovono\s+le\s+mani/i);
    expect(prompt()).toMatch(/postura\s+obbligatoria/i);
  });

  it('describes shapes and events, not only colours, for students who cannot see well', () => {
    expect(prompt()).toMatch(/non\s+vede\s+bene/i);
  });

  it('never comments on a student body or appearance', () => {
    expect(prompt()).toMatch(/Non commenti mai il corpo/i);
  });

  it('never asks a student to go faster', () => {
    expect(prompt()).toMatch(/mai di andare più veloce/i);
  });
});
