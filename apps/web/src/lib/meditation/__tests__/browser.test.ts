/**
 * Browser wiring for a guided session. The contracts that matter here are not
 * about audio quality: they are that the student's voice comes back, that two
 * sessions can never overlap, and that leaving never leaves a muted tab.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildPlan } from '../session';
import {
  armBrowserMeditation,
  currentSession,
  meditationIsArmed,
  openingFinished,
  startBrowserMeditation,
  stopBrowserMeditation,
} from '../browser';

function fakeAudioElement() {
  return {
    muted: false,
    pause: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
  } as unknown as HTMLAudioElement & { pause: ReturnType<typeof vi.fn> };
}

describe('startBrowserMeditation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    stopBrowserMeditation();
    vi.useRealTimers();
  });

  it('mutes the model and cancels the turn it is on', () => {
    const audioElement = fakeAudioElement();
    const cancelResponse = vi.fn();

    startBrowserMeditation(buildPlan('respiro', 1), { audioElement, cancelResponse });

    expect(cancelResponse).toHaveBeenCalled(); // nothing left streaming into the silence
    expect(audioElement.muted).toBe(true);
  });

  it('gives the voice back when the silence is over', async () => {
    const audioElement = fakeAudioElement();
    startBrowserMeditation(buildPlan('respiro', 1), { audioElement, cancelResponse: vi.fn() });

    await vi.advanceTimersByTimeAsync(60_000);

    expect(audioElement.muted).toBe(false);
    expect(currentSession()).toBeNull();
  });

  it('never lets two sessions overlap', () => {
    const audioElement = fakeAudioElement();
    const first = startBrowserMeditation(buildPlan('respiro', 5), {
      audioElement,
      cancelResponse: vi.fn(),
    });
    const second = startBrowserMeditation(buildPlan('corpo', 2), {
      audioElement,
      cancelResponse: vi.fn(),
    });

    expect(first.isRunning).toBe(false);
    expect(second.isRunning).toBe(true);
  });

  it('leaving the page does not leave a muted tab', () => {
    const audioElement = fakeAudioElement();
    startBrowserMeditation(buildPlan('respiro', 5), { audioElement, cancelResponse: vi.fn() });

    stopBrowserMeditation();

    expect(audioElement.muted).toBe(false);
    expect(currentSession()).toBeNull();
  });
});

describe('armBrowserMeditation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    stopBrowserMeditation();
    vi.useRealTimers();
  });

  it('does not mute the maestro while he is still introducing the practice', () => {
    const audioElement = fakeAudioElement();

    armBrowserMeditation(buildPlan('respiro', 1), { audioElement, cancelResponse: vi.fn() });

    expect(audioElement.muted).toBe(false); // the introduction must be audible
    expect(currentSession()).toBeNull();
    expect(meditationIsArmed()).toBe(true);
  });

  it('starts the silence once the introduction is over', () => {
    const audioElement = fakeAudioElement();
    armBrowserMeditation(buildPlan('respiro', 1), { audioElement, cancelResponse: vi.fn() });

    openingFinished();

    expect(audioElement.muted).toBe(true);
    expect(currentSession()?.isRunning).toBe(true);
    expect(meditationIsArmed()).toBe(false);
  });

  it('an unrelated turn ending later does not start a second session', () => {
    const audioElement = fakeAudioElement();
    armBrowserMeditation(buildPlan('respiro', 1), { audioElement, cancelResponse: vi.fn() });
    openingFinished();
    const started = currentSession();

    openingFinished();

    expect(currentSession()).toBe(started);
  });
});
