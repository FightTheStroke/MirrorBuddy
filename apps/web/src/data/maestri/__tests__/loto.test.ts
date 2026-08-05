/**
 * Test suite for Fratello Loto — meditation and mindfulness maestro
 *
 * He teaches in the tradition of Thich Nhat Hanh and names him as his teacher.
 * He is deliberately NOT an impersonation: a living teacher's voice is not ours
 * to put words into, and a child must never be told a real monk is speaking.
 */
import { describe, it, expect } from 'vitest';
import { getMaestroById, getAllSubjects, SUBJECT_NAMES } from '../index';

const loto = () => getMaestroById('loto');

describe('Fratello Loto maestro', () => {
  it('is registered and reachable by id', () => {
    expect(loto()?.id).toBe('loto');
    expect(loto()?.name).toBe('Loto');
    expect(loto()?.displayName).toBe('Fratello Loto');
  });

  it('teaches mindfulness, and the subject is nameable in the UI', () => {
    expect(loto()?.subject).toBe('mindfulness');
    expect(getAllSubjects()).toContain('mindfulness');
    expect(SUBJECT_NAMES.mindfulness).toBeTruthy();
  });

  it('carries the guided-session tool, or he can only talk about meditation', () => {
    expect(loto()?.tools).toContain('Meditation');
  });

  it('has an avatar and a greeting like every other maestro', () => {
    expect(loto()?.avatar).toMatch(/\.webp$/);
    expect(loto()?.greeting?.length).toBeGreaterThan(10);
  });
});

describe('What Loto must never claim', () => {
  const prompt = () => loto()?.systemPrompt ?? '';

  it('never presents himself as Thich Nhat Hanh', () => {
    expect(prompt()).toMatch(/non sei Thich Nhat Hanh|Non sei Thich Nhat Hanh/);
    expect(loto()?.name).not.toMatch(/Thich|Nhat|Hanh/i);
  });

  it('names Thich Nhat Hanh as the teacher of the tradition', () => {
    expect(prompt()).toMatch(/Thich Nhat Hanh/);
    expect(prompt()).toMatch(/Plum Village|Village des Pruniers/);
  });

  it('makes no therapeutic promise', () => {
    expect(prompt()).toMatch(/non è (una )?terapia|non sostituisce/i);
  });

  it('offers practices that do not require a working body', () => {
    // Mario cannot sit cross-legged or walk a meditation path. A practice he
    // cannot do is a practice that tells him he is the wrong kind of student.
    expect(prompt()).toMatch(/sdraiat|carrozzina|qualsiasi posizione|come sei/i);
  });

  it('never asks a child to hold or slow his breath', () => {
    expect(prompt()).toMatch(/mai.*(trattenere|forzare).*respir/i);
  });
});

describe('distress is never routed to a school subject', () => {
  it('feeling anxious asks for support, not for a mindfulness lesson', async () => {
    const { SUBJECT_PATTERNS } = await import('@/lib/ai/intent-detection/patterns');
    const distress = [
      'sono agitato',
      'sono ansiosa',
      'mi sento nervoso',
      'sono stressato per la verifica',
      'non riesco a calmarmi',
    ];
    for (const said of distress) {
      expect(SUBJECT_PATTERNS.mindfulness.some((p) => p.test(said))).toBe(false);
    }
  });

  it('but asking for the practice by name does reach Loto', async () => {
    const { SUBJECT_PATTERNS } = await import('@/lib/ai/intent-detection/patterns');
    for (const said of ['voglio meditare', 'facciamo mindfulness', 'una meditazione guidata']) {
      expect(SUBJECT_PATTERNS.mindfulness.some((p) => p.test(said))).toBe(true);
    }
  });
});
