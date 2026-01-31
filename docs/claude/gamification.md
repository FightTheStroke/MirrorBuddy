# Gamification

> XP points, MirrorBucks virtual currency, achievements, streaks, seasonal levels, and leaderboards.

## Quick Reference

| Key        | Value                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------- |
| Path       | `src/lib/gamification/`                                                                  |
| Components | `src/components/gamification/`                                                           |
| DB Tables  | `UserGamification`, `DailyStreak`, `Achievement`, `UserAchievement`, `PointsTransaction` |
| Seasons    | Italian school trimesters (Autunno/Inverno/Primavera/Estate)                             |
| Max Level  | 100 per season (1000 XP per level)                                                       |

## Tier Progression

| Level Range | Tier         | Italian Name |
| ----------- | ------------ | ------------ |
| 1-14        | Beginner     | Principiante |
| 15-29       | Apprentice   | Apprendista  |
| 30-44       | Intermediate | Intermedio   |
| 45-59       | Advanced     | Avanzato     |
| 60-74       | Expert       | Esperto      |
| 75-89       | Master       | Maestro      |
| 90-100      | Legend       | Leggenda     |

## Streak Multipliers

| Streak Days | XP Multiplier |
| ----------- | ------------- |
| 0           | 1.0x          |
| 1-2         | 1.1x          |
| 3-6         | 1.25x         |
| 7+          | 1.5x          |

## Architecture

Points are awarded via `awardPoints(userId, points, reason)` which applies streak multipliers, updates totals, recalculates level/tier, and logs a `PointsTransaction`. MirrorBucks track 1:1 with points and serve as virtual currency.

Seasons align with Italian school trimesters. Season points reset each quarter; total points persist forever. Achievements are checked after point awards via `checkAchievements()` which batch-unlocks in a single `$transaction`.

## Achievement Categories

| Category      | Examples                                                |
| ------------- | ------------------------------------------------------- |
| `onboarding`  | First chat, first quiz, first mindmap, first flashcards |
| `streak`      | 3, 7, 30, 100 consecutive days                          |
| `xp`          | Level 10, 50, 100 milestones                            |
| `exploration` | All subjects, all maestri, all tools                    |
| `time`        | 1 hour, 10 hours studied; night owl, early bird         |
| `mastery`     | 100% subject mastery, perfect quiz score                |

## Key Files

| File                      | Purpose                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `db.ts`                   | `awardPoints()`, `updateStreak()`, `checkAchievements()`, `getProgression()` |
| `achievements-data.ts`    | 20 achievement definitions with XP/MirrorBucks rewards                       |
| `achievements.ts`         | Achievement condition checking helpers                                       |
| `gamification-helpers.ts` | `calculateLevel()`, `calculateTier()`, `calculateStreakMultiplier()`         |
| `seasons.ts`              | `getCurrentSeason()`, `getDaysRemainingInSeason()`                           |

## UI Components

| Component            | Purpose                                    |
| -------------------- | ------------------------------------------ |
| `ProgressCard`       | Overall progress summary                   |
| `StreakDisplay`      | Current/longest streak with fire animation |
| `LevelProgressBar`   | XP progress to next level                  |
| `MirrorBucksDisplay` | Virtual currency balance                   |
| `SeasonBanner`       | Current season with countdown              |
| `AchievementsPanel`  | Achievement grid with unlock status        |
| `Leaderboard`        | Seasonal ranking                           |
| `LevelUpCelebration` | Level-up animation overlay                 |

## Code Patterns

```typescript
// Award points after learning activity
import {
  awardPoints,
  updateStreak,
  checkAchievements,
} from "@/lib/gamification/db";

const result = await awardPoints(userId, 50, "quiz_completed", quizId, "Quiz");
// result: { pointsAwarded, multiplier, totalPoints, level, tier, leveledUp }

await updateStreak(userId, minutesStudied);
const newAchievements = await checkAchievements(userId);

// Get user progression for UI
import { getProgression } from "@/lib/gamification/db";
const progress = await getProgression(userId);
```

## See Also

- `src/types/index.ts` — `Achievement`, `Season`, `SeasonName` types
