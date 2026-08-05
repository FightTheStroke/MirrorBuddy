/**
 * The bell, and the wiring that makes browser silence real.
 *
 * Kept apart from `session.ts` so the session logic stays testable without a
 * browser: this file is the only part that touches Web Audio and the media
 * element.
 */

'use client';

import { MeditationSession, type Plan } from './session';

const BELL_HZ = 432;
const PARTIALS = [1, 2, 2.76];
const DECAY = 1.6;
const BELL_S = 3;

/**
 * A struck bell: a few decaying partials, not a beep. Fails quietly — an
 * unavailable audio device must never stop a meditation from happening.
 */
export function ringBell(context?: AudioContext | null): void {
  const Ctor =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!Ctor) return;
  const ctx = context ?? new Ctor();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.7, now);
  master.connect(ctx.destination);

  PARTIALS.forEach((ratio, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(BELL_HZ * ratio, now);
    gain.gain.setValueAtTime(0.6 / (index + 1), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + BELL_S * (1 / DECAY));
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + BELL_S);
  });
}

export interface BrowserSessionDeps {
  audioElement: HTMLAudioElement | null;
  /** Tells the model to stop the turn it is on, so nothing is left streaming. */
  cancelResponse: () => void;
  onEnd?: (plan: Plan) => void;
}

let current: MeditationSession | null = null;
let pending: { plan: Plan; deps: BrowserSessionDeps } | null = null;

/** The session currently running in this tab, if any — for a visible countdown. */
export function currentSession(): MeditationSession | null {
  return current && current.isRunning ? current : null;
}

/**
 * Starts a session, replacing any session already running: two overlapping
 * meditations are worse than none, and a second request must never leave the
 * first one holding the mute.
 */
export function startBrowserMeditation(plan: Plan, deps: BrowserSessionDeps): MeditationSession {
  current?.cancel();
  const session = new MeditationSession({
    plan,
    silenceVoice: () => {
      deps.cancelResponse();
      if (deps.audioElement) {
        deps.audioElement.muted = true;
        deps.audioElement.pause();
      }
    },
    restoreVoice: () => {
      if (deps.audioElement) {
        deps.audioElement.muted = false;
        void deps.audioElement.play().catch(() => {
          // Autoplay policies can refuse here; the next model turn resumes playback.
        });
      }
    },
    ringBell: () => ringBell(),
    onEnd: deps.onEnd,
  });
  current = session;
  session.start();
  return session;
}

/**
 * Holds a session until the maestro has finished introducing it.
 *
 * The opening words are spoken by the model, so starting the silence at once
 * would mute the very sentence that explains the practice, and ring the bell
 * over it. `openingFinished()` is called when the model's turn completes.
 */
export function armBrowserMeditation(plan: Plan, deps: BrowserSessionDeps): void {
  pending = { plan, deps };
}

/** True while a session is waiting for the introduction to end. */
export function meditationIsArmed(): boolean {
  return pending !== null;
}

/** Called when the model finishes a turn: the room is quiet, so the bell can ring. */
export function openingFinished(): void {
  if (!pending) return;
  const { plan, deps } = pending;
  pending = null;
  startBrowserMeditation(plan, deps);
}

/** Ends any running session — leaving a page or a maestro must not leave a mute tab. */
export function stopBrowserMeditation(): void {
  pending = null;
  current?.cancel();
  current = null;
}
