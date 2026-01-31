# Pomodoro

> Timer with focus/break phases, ADHD profile integration, ambient audio coordination, and XP rewards

## Quick Reference

| Key        | Value                                       |
| ---------- | ------------------------------------------- |
| Path       | `src/components/pomodoro/`                  |
| Store      | `src/lib/stores/pomodoro-store.ts`          |
| Helpers    | `src/lib/hooks/pomodoro-helpers.ts`         |
| Widget     | `PomodoroHeaderWidget` (header bar)         |
| Full Timer | `PomodoroTimer` (standalone + compact mode) |

## Architecture

The Pomodoro system uses Zustand for state and a 1-second `setInterval` tick for countdown. Two UI variants exist: a header widget (`PomodoroHeaderWidget`) embedded in the app header, and a full `PomodoroTimer` component with circular progress, settings panel, and stats.

ADHD profile integration: the accessibility profile sets shorter focus sessions (15 min vs 25 min default) and enables break reminders via browser notifications. The `breakReminders` setting gates notification display.

Ambient audio integration (ADR 0018): when focus phase starts with `autoStartWithPomodoro` enabled, the ambient audio store applies the configured `pomodoroPreset` and starts playback. During breaks, audio pauses if `pauseDuringBreak` is enabled.

## Timer Phases

| Phase        | Default Duration | ADHD Duration | Color |
| ------------ | ---------------- | ------------- | ----- |
| `focus`      | 25 min           | 15 min        | Red   |
| `shortBreak` | 5 min            | 5 min         | Green |
| `longBreak`  | 15 min           | 15 min        | Blue  |
| `idle`       | --               | --            | Slate |

Long break triggers every `pomodorosUntilLongBreak` (default: 4) completed pomodoros.

## XP Rewards (Gamification)

| Event              | XP                           |
| ------------------ | ---------------------------- |
| Single pomodoro    | `POMODORO_XP.SINGLE`         |
| First of the day   | `+ POMODORO_XP.FIRST_OF_DAY` |
| Cycle complete (4) | `+ POMODORO_XP.CYCLE_BONUS`  |

XP is awarded via `addXP()` from the progress store. Streak updated with `updateStreak(focusMinutes)`.

## Key Files

| File                                                       | Purpose                     |
| ---------------------------------------------------------- | --------------------------- |
| `src/lib/stores/pomodoro-store.ts`                         | Zustand state + settings    |
| `src/components/pomodoro/pomodoro-timer.tsx`               | Full timer component        |
| `src/components/pomodoro/pomodoro-header-widget.tsx`       | Header bar widget           |
| `src/components/pomodoro/components/pomodoro-settings.tsx` | Settings panel              |
| `src/components/pomodoro/components/pomodoro-stats.tsx`    | Stats display               |
| `src/components/pomodoro/pomodoro-utils.ts`                | formatTime, notifications   |
| `src/lib/hooks/pomodoro-helpers.ts`                        | Phase config, progress calc |
| `src/lib/constants/xp-rewards.ts`                          | XP reward values            |

## Code Patterns

```typescript
// Store usage
import { usePomodoroStore } from '@/lib/stores/pomodoro-store';

const { phase, timeRemaining, isRunning, settings, completedPomodoros } = usePomodoroStore();

// Update settings (e.g., ADHD shorter focus)
usePomodoroStore.getState().updateSettings({ focusMinutes: 15 });

// Full timer component
import { PomodoroTimer } from '@/components/pomodoro/pomodoro-timer';
<PomodoroTimer onPomodoroComplete={(total, focusTime) => { /* handle */ }} />
<PomodoroTimer compact /> {/* Header-friendly compact mode */}
```

## Daily Tracking

The store tracks `todayPomodoros`, `todayFocusMinutes`, and `lastActiveDate`. Auto-resets daily stats when the date changes (checked in `incrementPomodoros`).

## See Also

- `docs/claude/ambient-audio.md` -- Ambient audio coordination during focus phases
- `.claude/rules/accessibility.md` -- ADHD profile settings (15min focus, break reminders)
- `src/lib/constants/xp-rewards.ts` -- XP reward configuration
