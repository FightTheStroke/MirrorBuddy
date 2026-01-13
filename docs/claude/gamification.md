# Gamification System

XP, achievements, levels, streaks, and seasonal progression for student engagement.

## Overview

MirrorBuddy uses a dual-progression system:
- **Legacy XP**: 11 levels (0-64000 XP) for all-time progression
- **MirrorBucks (MB)**: 100 levels per season (Fortnite/Duolingo style)

Seasons reset quarterly aligned with Italian school trimesters.

## Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Constants | `src/lib/constants/xp-rewards.ts` | Legacy XP values |
| Constants | `src/lib/constants/mirrorbucks.ts` | MirrorBucks values |
| Achievements | `src/lib/gamification/achievements.ts` | Achievement definitions |
| Seasons | `src/lib/gamification/seasons.ts` | Season calculation |
| Database | `src/lib/gamification/db.ts` | Persistence operations |
| Store | `src/lib/stores/progress-store.ts` | Zustand state |
| Actions | `src/lib/stores/progress-store-actions.ts` | State logic |
| API | `/api/gamification/*` | REST endpoints |

## MirrorBucks Rewards

| Activity | MirrorBucks | Notes |
|----------|-------------|-------|
| **Pomodoro** | | |
| Complete pomodoro | 15 MB | Single 25-min session |
| Complete cycle | +15 MB | Bonus after 4 pomodoros |
| First of day | +10 MB | Daily bonus |
| **Maestri Sessions** | | |
| Per minute | 5 MB | Conversation time |
| Per question | 10 MB | Each question asked |
| Session max | 100 MB | Cap per session |
| **Flashcards** | | |
| Again (rating 1) | 2 MB | Need more review |
| Hard (rating 2) | 5 MB | Difficult recall |
| Good (rating 3) | 10 MB | Correct answer |
| Easy (rating 4) | 15 MB | Very easy recall |
| **Achievements** | | |
| Onboarding | 50 MB | First tool use |
| Streak (3 days) | 100 MB | |
| Streak (7 days) | 250 MB | |
| Streak (30 days) | 1000 MB | |
| Level milestones | 500 MB | Levels 10, 50, 100 |
| Exploration | 200 MB | Try all tools/maestri |
| Time-based | 150 MB | Study hours, time of day |
| **Daily/Weekly** | | |
| Daily login | 10 MB | |
| Weekly goal | 200 MB | Complete weekly target |

## Level Progression

### MirrorBucks Levels (1-100 per season)

```typescript
import { calculateSeasonLevel } from '@/lib/constants/mirrorbucks';

const level = calculateSeasonLevel(mirrorBucks);
// Level 1-10: 100 MB increments (100, 200, 300...)
// Level 11-30: 50 MB increments
// Level 31-100: Progressive curve (exponential growth)
```

### Legacy XP Levels (1-11 all-time)

```typescript
import { calculateLevel, XP_PER_LEVEL } from '@/lib/constants/xp-rewards';

const level = calculateLevel(totalXP);
// [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000]
```

## Achievements

All achievements defined in `src/lib/gamification/achievements.ts`.

### Categories

| Category | Examples | Rewards |
|----------|----------|---------|
| `onboarding` | First chat, quiz, mindmap, flashcards | 50 MB each |
| `streak` | 3, 7, 30, 100 day streaks | 100-5000 MB |
| `xp` | Reach level 10, 50, 100 | 500-10000 MB |
| `exploration` | All subjects, all maestri, all tools | 200-500 MB |
| `time` | Study 1h, 10h, night owl, early bird | 150-500 MB |
| `mastery` | 100% subject mastery, perfect quiz | 200-1000 MB |
| `social` | Share content (future) | 100 MB |

### Achievement Structure

```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji
  category: 'onboarding' | 'streak' | 'xp' | 'exploration' | 'time' | 'mastery' | 'social';
  requirement: number;
  xpReward: number; // Legacy
  mirrorBucksReward: number;
}
```

## Seasons

Italian school trimesters, quarterly reset.

| Season | Dates | Icon |
|--------|-------|------|
| **Autunno** (Fall) | Sep 1 - Nov 30 | 🍂 |
| **Inverno** (Winter) | Dec 1 - Feb 28/29 | ❄️ |
| **Primavera** (Spring) | Mar 1 - May 31 | 🌸 |
| **Estate** (Summer) | Jun 1 - Aug 31 | ☀️ |

### Season Functions

```typescript
import { getCurrentSeason, getDaysRemainingInSeason, hasSeasonChanged } from '@/lib/gamification/seasons';

const season = getCurrentSeason();
// { name: 'Autunno', startDate: Date, endDate: Date, icon: '🍂' }

const daysLeft = getDaysRemainingInSeason();

if (hasSeasonChanged('Primavera')) {
  // Reset seasonal progress
}
```

## Streaks

Daily study tracking with multipliers.

### Multipliers

| Streak Length | Multiplier | Effect |
|---------------|------------|--------|
| 1+ days | 1.1x | +10% MirrorBucks |
| 3+ days | 1.25x | +25% MirrorBucks |
| 7+ days | 1.5x | +50% MirrorBucks |

### Streak State

```typescript
interface Streak {
  current: number;
  longest: number;
  lastStudyDate?: Date;
}
```

## Integration Examples

### Award MirrorBucks

```typescript
import { useProgressStore } from '@/lib/stores/progress-store';

const { addMirrorBucks, addXP } = useProgressStore();

// Award MirrorBucks (preferred)
addMirrorBucks(15, 'Pomodoro completed', sessionId, 'Pomodoro');

// Backward compatibility (calls addMirrorBucks internally)
addXP(10);
```

### Update Streak

```typescript
import { useProgressStore } from '@/lib/stores/progress-store';

const { updateStreak } = useProgressStore();

// Update streak with study minutes
updateStreak(25);
```

### Check Achievements

```typescript
import { checkAchievementCondition } from '@/lib/gamification/achievements';

const unlocked = checkAchievementCondition('first_quiz', {
  quizzesCompleted: 1,
  streak: { current: 5 },
  seasonLevel: 10,
});
```

### Unlock Achievement

```typescript
import { useProgressStore } from '@/lib/stores/progress-store';

const { unlockAchievement } = useProgressStore();

unlockAchievement('first_chat');
// Triggers notification and awards MirrorBucks
```

## Database Operations

All operations in `src/lib/gamification/db.ts`.

### Award Points

```typescript
import { awardPoints } from '@/lib/gamification/db';

const result = await awardPoints(
  userId,
  15, // points
  'Pomodoro completed', // reason
  sessionId, // optional source ID
  'Pomodoro' // optional source type
);

// Returns: { pointsAwarded, multiplier, totalPoints, seasonPoints, mirrorBucks, level, tier, leveledUp }
```

### Update Streak

```typescript
import { updateStreak } from '@/lib/gamification/db';

const streak = await updateStreak(userId, 25);
// Returns: { currentStreak, longestStreak, todayMinutes, goalMetToday }
```

### Get Progression

```typescript
import { getProgression } from '@/lib/gamification/db';

const progress = await getProgression(userId);
// Returns: { level, tier, totalPoints, seasonPoints, mirrorBucks, currentSeason, pointsToNextLevel, progressPercent, streak }
```

## Tiers

Based on season level:

| Level Range | Tier |
|-------------|------|
| 90-100 | `leggenda` |
| 75-89 | `maestro` |
| 60-74 | `esperto` |
| 45-59 | `avanzato` |
| 30-44 | `intermedio` |
| 15-29 | `apprendista` |
| 1-14 | `principiante` |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gamification/points` | POST | Award MirrorBucks |
| `/api/gamification/streak` | POST | Update daily streak |
| `/api/progress` | GET/PUT | Load/sync progress |
| `/api/progress/sessions` | GET/POST | Session history |

## Adding New Rewards

1. **Add constant** to `src/lib/constants/mirrorbucks.ts`:
   ```typescript
   export const MIRRORBUCKS_REWARDS = {
     // ...
     NEW_ACTIVITY: 25,
   } as const;
   ```

2. **Award in component/tool**:
   ```typescript
   const { addMirrorBucks } = useProgressStore();
   addMirrorBucks(MIRRORBUCKS_REWARDS.NEW_ACTIVITY, 'Activity completed');
   ```

3. **Optional: Add achievement** in `src/lib/gamification/achievements.ts`:
   ```typescript
   {
     id: 'new_achievement',
     name: 'Achievement Name',
     description: 'Complete the new activity',
     icon: '🎯',
     category: 'exploration',
     requirement: 1,
     xpReward: 50,
     mirrorBucksReward: 50,
   }
   ```

## Notifications

Gamification triggers automatic notifications:

- **Level Up**: `onLevelUp(level, title)` from `@/lib/notifications/triggers`
- **Streak Milestone**: `onStreakMilestone(days)` at 3, 7, 30, 100 days
- **Achievement**: `onAchievement(name, description)` when unlocked
- **MirrorBucks Toast**: Automatic `+X MB` toast on reward

## Season Reset

Seasons reset automatically when detected:

1. `hasSeasonChanged()` checks current season vs. stored
2. `checkAndResetSeason()` archives progress to `seasonHistory`
3. `seasonMirrorBucks` and `seasonLevel` reset to 0/1
4. `mirrorBucks` (all-time) and `allTimeLevel` persist

## Testing

```bash
# Test gamification logic
npm run test -- gamification

# Manual testing checklist
- [ ] Award MirrorBucks from different sources
- [ ] Verify streak multipliers apply
- [ ] Complete achievement conditions
- [ ] Cross season boundary
- [ ] Verify level-up notifications
- [ ] Check tier progression
```

## Migration Notes

- **Legacy `xp` field**: Maps to `mirrorBucks` for backward compatibility
- **Legacy `level` field**: Maps to `allTimeLevel`
- **`addXP()`**: Internally calls `addMirrorBucks()`
- **Season fields**: `seasonMirrorBucks` and `seasonLevel` are primary for UI

## Common Patterns

### Pomodoro Completion

```typescript
import { MIRRORBUCKS_REWARDS } from '@/lib/constants/mirrorbucks';

// Single pomodoro
addMirrorBucks(MIRRORBUCKS_REWARDS.POMODORO_SINGLE, 'Pomodoro completed');

// First of day
if (isFirstToday) {
  addMirrorBucks(MIRRORBUCKS_REWARDS.POMODORO_FIRST_OF_DAY, 'First pomodoro of day');
}

// Cycle bonus
if (count % 4 === 0) {
  addMirrorBucks(MIRRORBUCKS_REWARDS.POMODORO_CYCLE_BONUS, 'Pomodoro cycle bonus');
}
```

### Flashcard Review

```typescript
import { MIRRORBUCKS_BY_FLASHCARD_RATING } from '@/lib/constants/mirrorbucks';

const mbEarned = MIRRORBUCKS_BY_FLASHCARD_RATING[rating]; // 'again' | 'hard' | 'good' | 'easy'
addMirrorBucks(mbEarned, `Flashcard reviewed: ${rating}`);
```

### Session XP

```typescript
import { MIRRORBUCKS_REWARDS } from '@/lib/constants/mirrorbucks';

// Time-based
const minuteXP = durationMinutes * MIRRORBUCKS_REWARDS.MAESTRI_PER_MINUTE;

// Question-based
const questionXP = questionsAsked * MIRRORBUCKS_REWARDS.MAESTRI_PER_QUESTION;

// Capped total
const sessionXP = Math.min(
  minuteXP + questionXP,
  MIRRORBUCKS_REWARDS.MAESTRI_MAX_PER_SESSION
);

addMirrorBucks(sessionXP, 'Session completed');
```
