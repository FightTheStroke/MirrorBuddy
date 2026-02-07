# ADR-0134: Gamification UI - Surface Backend Achievements

**Status:** Accepted
**Date:** 2026-02-07
**Context:** Plan 125 WF-Documentation

## Decision

Surface existing backend achievement system with new UI layer: dedicated achievements page, streak calendar, XP/level progress bars, toast notifications on unlock, and mobile bottom nav integration. Use polling-based achievement checks after study sessions.

## Rationale

- Backend achievement system already exists; UI layer surfaces it without breaking changes
- Achievements page acts as "proof of progress" motivating continued engagement
- Streak calendar visualizes consistency (key habit driver)
- XP/level progress bars provide immediate feedback after sessions
- Toast notifications create celebration moments (dopamine hit on unlock)
- Polling after sessions avoids real-time connection overhead
- Mobile integration via bottom nav ensures discoverability on primary platform
- No backend API changes needed; leverages existing achievements endpoint

## Implementation

### Pages & Routes

**Achievements Page** (`/achievements`)

- Grid layout: 3-4 columns on desktop, 1-2 on mobile
- Each card shows: icon, title, description, unlock date, progress bar (if not unlocked)
- Filter tabs: All, Unlocked, Locked, Categories
- Sort: Unlock date desc, alphabetical
- Pagination: 20 per page

**Components**

```
<AchievementsPage>
  ├── <AchievementFilters> (All/Unlocked/Locked tabs)
  ├── <AchievementGrid>
  │   └── <AchievementCard> (icon, title, unlock date, progress bar)
  └── <Pagination>
```

### Streak Calendar

```
StreakCalendar {
  currentStreak: number
  longestStreak: number
  calendar: { date: Date, isStudied: boolean }[]
}
```

- Month view heatmap (green = studied, gray = no activity)
- Current streak counter above calendar
- Longest streak badge
- Hover tooltip shows session count for that day

### XP & Level Progress

```typescript
interface UserProgress {
  currentXP: number;
  nextLevelXP: number;
  level: number;
  progressPercent: number; // currentXP / nextLevelXP * 100
}
```

- Linear progress bar: filled % = `currentXP / nextLevelXP`
- Display: "Level 5 · 240 / 500 XP"
- Animation on level-up: bar fills to 100%, then resets
- Small icon next to bar (star, trophy)

### Toast Notifications

**On Session Complete (after polling):**

```javascript
if (newAchievements.length > 0) {
  newAchievements.forEach((ach) => {
    toast.success({
      title: `Achievement Unlocked!`,
      description: ach.title,
      icon: <AchievementIcon />,
    });
  });
}
```

- Show each unlock as separate toast (max 3 stacked)
- Auto-dismiss after 5s
- Link to achievements page on click

### Polling Strategy

**After Each Study Session:**

1. Session completes
2. POST to `/api/study/{sessionId}/complete`
3. After success, schedule poll: `setTimeout(() => pollAchievements(), 500ms)`
4. `GET /api/achievements?userId={id}` → compare with cached list
5. Show toasts for new unlocks
6. Update cache

**Mobile Bottom Nav Integration:**

- Add "Achievements" tab to existing bottom nav (5th tab or replace less critical)
- Badge shows count of new/locked achievements (`<AchievementsBadge>`)
- Opens achievements page in modal on mobile

## Key Patterns

- Poll-based achievement check (fire-and-forget, no websocket overhead)
- Toast notifications create engagement hooks without interrupting
- Streak calendar drives daily return (habit formation)
- XP bar provides intermediate reward (not just achievements)
- Backend unchanged; pure frontend display layer
- Achievement unlock dates immutable (created_at field)

## Consequences

- Motivates daily engagement through streaks and progress visibility
- Increased session frequency due to achievement system
- Mobile nav space constraint requires thoughtful tab prioritization
- Polling adds ~5-10 requests per session (minor load)
- Achievement visibility may expose grinding mechanics to users
- No real-time notifications; slight delay (500ms-2s) before toasts appear
