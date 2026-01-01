# Pomodoro Timer System

Timer Pomodoro per supporto ADHD con XP rewards.

## Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Hook | `src/lib/hooks/use-pomodoro-timer.ts` | Timer logic |
| Store | `src/lib/stores/pomodoro-store.ts` | Zustand |
| Component | `src/components/pomodoro/pomodoro-timer.tsx` | Full UI |
| Widget | `src/components/pomodoro/pomodoro-header-widget.tsx` | Header |

## Timer Phases

```
idle → focus (25 min) → shortBreak (5 min) → focus → ... → longBreak (15 min)
```

- **Focus**: 25 min (configurable 5-60)
- **Short Break**: 5 min (1-15)
- **Long Break**: 15 min after 4 pomodoros (10-30)

## XP Rewards

| Event | XP |
|-------|-----|
| Complete 1 pomodoro | +15 |
| First of day | +10 bonus |
| Complete cycle (4) | +15 bonus |

## Integration

- **Header**: `PomodoroHeaderWidget` in `page.tsx`
- **Notifications**: Uses `breakReminders` from accessibility
- **XP**: Calls `addXP()` from `useProgressStore`

## Usage

```typescript
import { PomodoroTimer, PomodoroHeaderWidget } from '@/components/pomodoro';

<PomodoroTimer onPomodoroComplete={(count, time) => {}} />
<PomodoroHeaderWidget />
```
