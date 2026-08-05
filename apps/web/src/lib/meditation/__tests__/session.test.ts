/**
 * A guided meditation is mostly silence, and the silence has to be real.
 *
 * A model asked to "pause" fills the gap: it encourages, it checks in, it
 * narrates the silence away. So the silence is not requested from the model, it
 * is imposed on the session — the inbound voice is switched off for the
 * interval, and nothing the model might say can reach the room.
 *
 * These are accessibility contracts as much as behaviour: the session must end
 * the instant the student wants it to, and it must never require a body that
 * works.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildPlan, MAX_SILENCE_S, MIN_SILENCE_S, MeditationSession } from '../session';

function fakeVoice() {
  const tracks = [{ enabled: true }, { enabled: true }];
  return {
    tracks,
    silence: () => tracks.forEach((t) => (t.enabled = false)),
    restore: () => tracks.forEach((t) => (t.enabled = true)),
    get audible() {
      return tracks.every((t) => t.enabled);
    },
  };
}

describe('buildPlan', () => {
  it('never turns a session into a token gesture', () => {
    expect(buildPlan('respiro', 0).silenceSeconds).toBe(MIN_SILENCE_S);
    expect(buildPlan('respiro', -5).silenceSeconds).toBe(MIN_SILENCE_S);
  });

  it('never leaves a child sitting in silence indefinitely', () => {
    expect(buildPlan('respiro', 999).silenceSeconds).toBe(MAX_SILENCE_S);
  });

  it('offers a practice for a body that cannot sit up or breathe on command', () => {
    const plan = buildPlan('corpo', 3);
    expect(plan.opening).toMatch(/sdraiat|carrozzin|come stai|posizione/i);
    expect(plan.opening).not.toMatch(/trattien|respiro profondo|inspira lentamente/i);
  });

  it('falls back to a real practice when the model asks for something unknown', () => {
    const plan = buildPlan('astrologia lunare', 2);
    expect(plan.practice).toBeTruthy();
    expect(plan.silenceSeconds).toBe(120);
  });
});

describe('MeditationSession', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('imposes the silence rather than asking for it', async () => {
    const voice = fakeVoice();
    const bells: number[] = [];
    const session = new MeditationSession({
      plan: buildPlan('respiro', 1),
      silenceVoice: voice.silence,
      restoreVoice: voice.restore,
      ringBell: () => bells.push(Date.now()),
    });

    session.start();
    await vi.advanceTimersByTimeAsync(50);
    expect(bells).toHaveLength(1); // opening bell
    expect(voice.audible).toBe(false); // and then, actual silence

    await vi.advanceTimersByTimeAsync(60_000);
    expect(bells).toHaveLength(2); // closing bell
    expect(voice.audible).toBe(true); // the voice comes back
  });

  it('ends the instant the student asks, without waiting out the timer', async () => {
    const voice = fakeVoice();
    const session = new MeditationSession({
      plan: buildPlan('respiro', 10),
      silenceVoice: voice.silence,
      restoreVoice: voice.restore,
      ringBell: () => {},
    });

    session.start();
    await vi.advanceTimersByTimeAsync(50);
    expect(voice.audible).toBe(false);

    session.cancel();
    await vi.advanceTimersByTimeAsync(10);
    expect(voice.audible).toBe(true); // no child is ever stuck in a session
    expect(session.isRunning).toBe(false);
  });

  it('gives the voice back even when the bell throws', async () => {
    const voice = fakeVoice();
    const session = new MeditationSession({
      plan: buildPlan('respiro', 1),
      silenceVoice: voice.silence,
      restoreVoice: voice.restore,
      ringBell: () => {
        throw new Error('no audio device');
      },
    });

    session.start();
    await vi.advanceTimersByTimeAsync(60_500);
    expect(voice.audible).toBe(true); // a mute session is worse than no session
    expect(session.isRunning).toBe(false);
  });

  it('reports how much of the silence is left, for a visible countdown', async () => {
    const session = new MeditationSession({
      plan: buildPlan('respiro', 2),
      silenceVoice: () => {},
      restoreVoice: () => {},
      ringBell: () => {},
    });

    session.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(session.secondsLeft).toBeLessThanOrEqual(90);
    expect(session.secondsLeft).toBeGreaterThan(80);
    session.cancel();
  });
});
