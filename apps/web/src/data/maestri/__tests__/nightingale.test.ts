/**
 * Test suite for Florence Nightingale — health maestra
 *
 * Health is the highest-risk subject on this platform: a child can describe a
 * symptom, a fear about their body, or self-harm at any moment. The medical
 * boundaries below are not style preferences, and neither is the rule that she
 * never comments on a student's weight or body. These tests pin that contract.
 */
import { describe, it, expect } from 'vitest';
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from '../index';

const nightingale = () => getMaestroById('nightingale');

describe('Florence Nightingale maestra', () => {
  it('is registered and reachable by id', () => {
    expect(nightingale()?.id).toBe('nightingale');
    expect(nightingale()?.name).toBe('Nightingale');
  });

  it('teaches health, and the subject is nameable in the UI', () => {
    expect(nightingale()?.subject).toBe('health');
    expect(getAllSubjects()).toContain('health');
    expect(SUBJECT_NAMES.health).toBeTruthy();
  });

  it('has an avatar and a greeting like every other maestro', () => {
    expect(nightingale()?.avatar).toMatch(/\.webp$/);
    expect(nightingale()?.greeting?.length).toBeGreaterThan(10);
  });

  it('does not take over Ippocrate, who still teaches the same subject', () => {
    expect(getMaestroById('ippocrate')?.subject).toBe('health');
  });
});

describe('Medical boundaries Nightingale may never cross', () => {
  const prompt = () => nightingale()?.systemPrompt ?? '';

  it('never diagnoses, not even as a possibility', () => {
    expect(prompt()).toMatch(/Non fai mai diagnosi/i);
    expect(prompt()).toMatch(/nemmeno.*potrebbe essere/i);
  });

  it('never recommends or discourages a treatment', () => {
    expect(prompt()).toMatch(/Non consigli e non sconsigli mai/i);
    expect(prompt()).toMatch(/farmaci/i);
  });

  it('never comments on a student body or weight', () => {
    expect(prompt()).toMatch(/Non commenti mai il peso/i);
    expect(prompt()).toMatch(/mangiare di meno/i);
  });

  it('does not investigate a reported symptom, but refers on', () => {
    expect(prompt()).toMatch(/non indaghi/i);
    expect(prompt()).toMatch(/medico vero/i);
  });

  it('escalates self-harm to a trusted adult instead of handling it alone', () => {
    expect(prompt()).toMatch(/farsi\s+del\s+male/i);
    expect(prompt()).toMatch(/non gestisci la situazione da sola/i);
    expect(prompt()).toMatch(/mai una vergogna/i);
  });
});

describe('Nightingale teaches evidence, including how numbers mislead', () => {
  const prompt = () => nightingale()?.systemPrompt ?? '';

  it('teaches that a chart can lie without a single false figure', () => {
    expect(prompt()).toMatch(/smascherare un grafico/i);
    expect(prompt()).toMatch(/non parte da zero/i);
  });

  it('never states a figure without saying where it came from', () => {
    expect(prompt()).toMatch(/senza dire da dove viene/i);
  });
});

describe('What Nightingale must never do with her own biography', () => {
  const prompt = () => nightingale()?.systemPrompt ?? '';

  it('tells the truth about being forbidden to train, and about her illness', () => {
    expect(prompt()).toMatch(/Non menti e non nascondi|non menti/i);
    expect(prompt()).toMatch(/dal\s+proprio\s+letto|dal letto/i);
  });

  it('never describes her illness or the military hospitals in raw detail', () => {
    expect(prompt()).toMatch(/Non descrivi mai/i);
  });

  it('refuses to make her a victim', () => {
    expect(prompt()).toMatch(/Non la trasformi in una vittima/i);
  });

  it('does not turn a disabled body into an example to live up to', () => {
    expect(prompt()).toMatch(/senza retorica/i);
    expect(prompt()).toMatch(/da imitare a tutti i costi/i);
  });

  it('redirects a student who seems to be speaking about themselves', () => {
    expect(prompt()).toMatch(/adulto\s+di\s+fiducia/i);
    expect(prompt()).toMatch(/del proprio corpo/i);
  });
});

describe('Nightingale respects the students in front of her', () => {
  const prompt = () => nightingale()?.systemPrompt ?? '';

  it('never assumes the student body works like the example', () => {
    expect(prompt()).toMatch(/non dai \*\*mai\*\* per scontato/i);
  });

  it('treats tiredness and pain as information, not laziness', () => {
    expect(prompt()).toMatch(/non colpe e non pigrizia/i);
  });

  it('never asks a student to go faster', () => {
    expect(prompt()).toMatch(/mai di andare più veloce/i);
  });
});
