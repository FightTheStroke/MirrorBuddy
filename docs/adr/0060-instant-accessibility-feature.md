# ADR 0060: Instant Accessibility Feature

**Date**: 2026-01-19
**Status**: Accepted
**Context**: Need for immediate, persistent accessibility settings without authentication

## Problem

Users with accessibility needs (dyslexia, ADHD, visual impairments, etc.) must be able to:

1. Access accessibility settings immediately on any page
2. Persist their preferences across sessions without login
3. Have browser-detected preferences applied automatically
4. Track accessibility feature usage for analytics

## Decision

Implement an "Instant Accessibility" feature with:

### 1. Floating Button + Quick Panel

- Fixed position button (bottom-right, z-50)
- 44x44px minimum (WCAG 2.5.5 Target Size)
- Quick panel with 7 profile presets and common toggles
- Focus trap and keyboard navigation (Escape to close)

### 2. Cookie Persistence

- `mirrorbuddy-a11y` cookie (90-day expiration)
- Stores active profile and setting overrides
- No authentication required
- Version-controlled for future migrations

### 3. Browser Preference Detection

- Auto-detect on first visit (if no cookie):
  - `prefers-reduced-motion: reduce` → reducedMotion: true
  - `prefers-contrast: more` → highContrast: true
  - `prefers-color-scheme: dark` → handled by theme system
- Applied once, then respects user's manual changes

### 4. Telemetry Integration

- Category: 'accessibility'
- Actions: profile_activated, setting_changed, reset_to_defaults
- Aggregated in admin dashboard widget

## Architecture

```
src/lib/accessibility/
├── a11y-cookie-storage.ts    # Cookie CRUD operations
├── browser-detection.ts      # OS/browser preference detection
├── a11y-telemetry.ts         # Event tracking helper
└── accessibility-store.ts    # Zustand store (modified)

src/components/accessibility/
├── a11y-floating-button.tsx  # Fixed position trigger
├── a11y-quick-panel.tsx      # Settings panel
├── a11y-profile-button.tsx   # Profile preset buttons
└── a11y-instant-access.tsx   # Container component

src/app/api/dashboard/
└── a11y-stats/route.ts       # Admin stats endpoint

src/app/admin/analytics/components/
└── a11y-stats-widget.tsx     # Dashboard widget
```

## Profile Presets

| Profile   | Key Settings                        |
| --------- | ----------------------------------- |
| Dislessia | OpenDyslexic font, extra spacing    |
| ADHD      | Pomodoro mode, focus helper         |
| Visivo    | High contrast, large text, TTS      |
| Motorio   | Large click targets, keyboard nav   |
| Autismo   | Reduced motion, predictable layouts |
| Uditivo   | Visual cues, captions               |
| Motorio+  | Motor + cognitive combined          |

## Cookie Structure

```typescript
interface A11yCookieData {
  version: string; // "1" for migrations
  activeProfile: string | null;
  overrides: Partial<AccessibilitySettings>;
  browserDetectedApplied: boolean;
}
```

## WCAG 2.1 AA Compliance

| Criterion           | Implementation              |
| ------------------- | --------------------------- |
| 1.4.3 Contrast      | 4.5:1 minimum on all text   |
| 2.1.1 Keyboard      | Tab/Enter/Escape navigation |
| 2.4.7 Focus Visible | ring-2 focus indicators     |
| 2.5.5 Target Size   | 44x44px minimum on button   |
| 4.1.2 ARIA          | Labels on all controls      |

## E2E Test Coverage

- Button visibility on all pages (including legal)
- Panel open/close interactions
- Profile activation and font changes
- Cookie persistence after refresh
- Keyboard navigation and focus trap

## Consequences

### Positive

- Users get immediate accessibility without signup
- Settings persist across browser sessions
- Browser preferences respected automatically
- Analytics provide insight into feature usage
- WCAG 2.1 AA compliant implementation

### Negative

- Cookie increases page weight slightly (~500 bytes)
- Browser detection may not match user's actual needs
- Multiple devices don't sync (no auth)

## Migration Path

If cookie version changes:

1. Old version detected → clear cookie
2. Re-run browser preference detection
3. User reconfigures if needed

## Files Modified/Created

**Created (13 files)**:

- src/lib/accessibility/a11y-cookie-storage.ts
- src/lib/accessibility/browser-detection.ts
- src/lib/accessibility/a11y-telemetry.ts
- src/components/accessibility/a11y-floating-button.tsx
- src/components/accessibility/a11y-quick-panel.tsx
- src/components/accessibility/a11y-profile-button.tsx
- src/components/accessibility/a11y-instant-access.tsx
- src/app/api/dashboard/a11y-stats/route.ts
- src/app/admin/analytics/components/a11y-stats-widget.tsx
- e2e/a11y-instant-access.spec.ts
- src/lib/accessibility/**tests**/a11y-cookie-storage.test.ts
- src/lib/accessibility/**tests**/browser-detection.test.ts
- docs/adr/0060-instant-accessibility-feature.md

**Modified (7 files)**:

- src/lib/accessibility/accessibility-store.ts
- src/components/accessibility/accessibility-provider.tsx
- src/components/accessibility/index.ts
- src/components/providers.tsx
- src/app/cookies/content.tsx
- src/app/admin/analytics/page.tsx
- e2e/global-setup.ts
