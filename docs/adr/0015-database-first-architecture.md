# ADR 0015: Database-First Architecture (No localStorage)

## Status

Accepted

## Date

2025-12-31

## Context

The application was using a hybrid storage approach:

- Zustand stores with `persist()` middleware storing to localStorage
- Direct localStorage calls for various features (mindmaps, quizzes, flashcards, etc.)
- Database as secondary storage synced periodically

This caused several issues:

1. **Data loss**: localStorage is device-specific and can be cleared by browsers
2. **No sync**: Data didn't sync across devices/browsers
3. **Inconsistency**: Race conditions between localStorage and database
4. **GDPR complexity**: Hard to export/delete all user data
5. **Debugging difficulty**: State split across multiple storage layers

Issue #64 was created to consolidate all localStorage to database as single source of truth.

## Decision

**Database is the single source of truth for all user data.**

### Migrated Data

| Category                          | Old Storage                              | New Storage                          |
| --------------------------------- | ---------------------------------------- | ------------------------------------ |
| Settings (theme, language, a11y)  | localStorage (`convergio-settings`)      | `/api/user/settings`                 |
| Progress (XP, levels, streaks)    | localStorage (`convergio-progress`)      | `/api/progress`                      |
| Masteries (subject mastery state) | localStorage (`convergio_mastery_state`) | `/api/progress.masteries`            |
| Mindmaps                          | localStorage                             | `/api/materials?toolType=mindmap`    |
| Flashcard decks                   | localStorage                             | `/api/materials?toolType=flashcard`  |
| Quizzes                           | localStorage                             | `/api/materials?toolType=quiz`       |
| Homework sessions                 | localStorage                             | `/api/materials?toolType=homework`   |
| **Demos/HTML snippets**           | Zustand in-memory                        | `/api/materials?toolType=demo`       |
| **Summaries**                     | Zustand in-memory                        | `/api/materials?toolType=summary`    |
| Conversations                     | localStorage                             | `/api/conversations`                 |
| Calendar events                   | localStorage                             | `/api/scheduler`                     |
| Accessibility settings            | localStorage                             | `/api/user/settings`                 |
| Onboarding state                  | localStorage                             | `/api/user/onboarding`               |
| Pomodoro stats                    | localStorage                             | `/api/user/pomodoro`                 |
| Parent dashboard views            | localStorage                             | `/api/profile/last-viewed`           |
| Azure cost config                 | localStorage                             | `/api/user/settings.azureCostConfig` |

### Zustand Store Changes

Removed `persist()` middleware from all stores:

- `app-store.ts` (SettingsStore, ProgressStore, ChatStore, VoiceSessionStore, ConfettiStore, ThemeStore)
- `conversation-flow-store.ts`
- `method-progress-store.ts`
- `onboarding-store.ts`
- `pomodoro-store.ts`
- `accessibility-store.ts`
- `calendar-store.ts`
- `notification-store.ts`
- `telemetry-store.ts`

### Acceptable localStorage Uses

Only these are allowed:

1. **Cleanup operations**: During `resetAllData()` to clear legacy data
2. **Device-specific caches**: Browser permissions, PWA install banner dismissal
3. **Test files**: Checking localStorage as security vulnerability pattern
4. **Trial mode visitor tracking** (ADR 0056): `mirrorbuddy-visitor-id` cookie for anonymous user tracking
5. **Consent management** (GDPR): `mirrorbuddy-consent`, `mirrorbuddy-unified-consent` for cookie/ToS consent
6. **Accessibility preferences**: `mirrorbuddy-a11y` for instant accessibility settings (device-specific)

### sessionStorage for Temporary Session ID

Until authentication is implemented, we use `sessionStorage` for temporary user ID:

```typescript
// In hooks that need userId
const userId = sessionStorage.getItem("convergio-user-id") || "default-user";
```

This is acceptable because:

- sessionStorage is cleared on browser close
- It's only a temporary solution until proper auth
- It doesn't persist across sessions (no data portability concern)

## Implementation

### API Pattern

All data access goes through REST APIs:

```typescript
// Load data
const response = await fetch("/api/user/settings");
const settings = await response.json();

// Save data (fire-and-forget for UI responsiveness)
void fetch("/api/user/settings", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(settings),
});
```

### Zustand Store Pattern

Stores now sync with database instead of localStorage:

```typescript
// OLD (removed)
export const useSettingsStore = create(
  persist(
    (set) => ({
      /* ... */
    }),
    { name: "convergio-settings" },
  ),
);

// NEW
export const useSettingsStore = create((set) => ({
  /* ... state and actions ... */
}));

// Sync on mount in components or via useEffect
```

### Material Hooks

Dedicated hooks for each material type in `use-saved-materials.ts`:

- `useMindmaps()` - CRUD for mindmaps
- `useQuizzes()` - CRUD for quizzes
- `useFlashcardDecks()` - CRUD for flashcard decks
- `useHomeworkSessions()` - CRUD for homework sessions
- `useDemos()` - CRUD for interactive demos/HTML snippets
- `useSavedTools(toolType)` - Generic hook for summaries and other tools

All use `/api/materials` endpoint with `toolType` parameter.

### Data Deletion

`resetAllData()` in `onboarding-store.ts` now:

1. Calls `/api/user/data` DELETE to clear database
2. Clears any remaining localStorage (legacy cleanup)
3. Clears sessionStorage
4. Redirects to `/welcome`

## Consequences

### Positive

- **Single source of truth**: All data in database
- **Cross-device sync**: Data available on any device after auth
- **GDPR compliance**: Easy to export/delete all user data
- **Debugging**: Clear data flow through REST APIs
- **Reliability**: No localStorage clearing issues

### Negative

- **Network dependency**: Requires server connection for persistence
- **Initial load**: Slight delay on hydration from database
- **Offline support**: Currently degraded (future PWA work)
- **eslint-disable tech debt**: `use-saved-materials.ts` and `flashcards-view.tsx` use `eslint-disable react-hooks/set-state-in-effect` for data loading on mount. This is a valid pattern but triggers the linter. Future refactor: consider React Query or SWR.

### Mitigations

- Fire-and-forget saves for UI responsiveness
- Optimistic UI updates (state changes immediately, persists async)
- Error logging for failed saves
- Future: Service worker for offline queue

## Files Changed

### Stores

- `src/lib/stores/app-store.ts`
- `src/lib/stores/conversation-flow-store.ts`
- `src/lib/stores/method-progress-store.ts`
- `src/lib/stores/onboarding-store.ts`
- `src/lib/stores/pomodoro-store.ts`
- `src/lib/accessibility/accessibility-store.ts`
- `src/lib/calendar/calendar-store.ts`
- `src/lib/stores/notification-store.ts`

### Hooks

- `src/lib/hooks/use-saved-materials.ts` (added homework)
- `src/lib/hooks/use-voice-session.ts` (use store instead of localStorage)
- `src/lib/hooks/use-parent-insights-indicator.ts` (use API)

### Components

- `src/components/education/mindmaps-view.tsx`
- `src/components/education/flashcards-view.tsx`
- `src/components/education/homework-help-view.tsx`
- `src/components/education/archive-view.tsx`
- `src/components/education/html-snippets-view.tsx` (migrated to useDemos)
- `src/components/education/html-preview.tsx` (migrated to autoSaveMaterial)
- `src/components/tools/tool-result-display.tsx`
- `src/components/settings/settings-view.tsx`

### Lib

- `src/lib/education/mastery.ts` (async DB persistence)
- `src/lib/storage/materials-db.ts`

### API

- `src/app/api/profile/last-viewed/route.ts` (new)

### Schema

- `prisma/schema.prisma` (added parentDashboardLastViewed, azureCostConfig)

## References

- Issue #64: Consolidate localStorage to Database
- CLAUDE.md: Data Persistence Rules section
- `/api/materials`: Materials CRUD endpoint
- `/api/progress`: Progress and mastery endpoint
- `/api/user/settings`: Settings endpoint
- `/api/user/data`: GDPR data export/delete endpoint
