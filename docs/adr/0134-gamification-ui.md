# ADR-0134: Gamification UI

## Status

Accepted

## Context

The gamification backend exists but has no user-facing UI.
Students have no visibility into their progress or achievements.

## Decision

Surface existing gamification data through new UI components:

- **Achievements page** (`/achievements`): Grid, streak calendar, XP/level bar, stats
- **Achievement toast**: Animated notification on unlock
- **Check API** (`/api/gamification/check`): Returns newly unlocked achievements
- **Polling hook** (`useAchievementChecker`): Checks after study sessions
- **Mobile integration**: Trophy icon in bottom navigation
- **i18n**: Full localization for 5 locales in `achievements.json` namespace

## Consequences

- Students get visual feedback on learning progress
- Achievement unlocks create positive reinforcement
- Polling approach is simple (post-session only)
- New i18n namespace to maintain across 5 locales
