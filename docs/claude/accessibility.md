# Accessibility

> WCAG 2.1 AA compliance with 7 DSA profiles, Instant Access floating panel, and education-specific adaptations

## Quick Reference

| Key        | Value                              |
| ---------- | ---------------------------------- |
| Store      | `src/lib/accessibility/`           |
| Components | `src/components/accessibility/`    |
| Education  | `src/lib/education/accessibility/` |
| Cookie     | `mirrorbuddy-a11y` (90 days)       |
| ADR        | 0060                               |

## 7 DSA Profiles

| Profile             | Key Adaptations                                       |
| ------------------- | ----------------------------------------------------- |
| Dyslexia            | OpenDyslexic font, extra letter/line spacing, TTS     |
| Dyscalculia         | Color-coded digits, visual place value, no math timer |
| ADHD                | Pomodoro (15/5 min), max 5 bullets, break reminders   |
| Visual Impairment   | High contrast, large text, TTS enabled                |
| Motor Impairment    | Keyboard nav, large click targets (44px), voice input |
| Autism              | Reduced motion, literal language, topic warnings      |
| Auditory Impairment | Visual cues, captions, no audio-only content          |

## Instant Access (ADR 0060)

Floating button (bottom-right, 44x44px) opens quick panel with profile presets:

```typescript
// Already in providers.tsx -- no manual setup needed
import { A11yInstantAccess } from "@/components/accessibility";

// Cookie persistence (no auth required)
interface A11yCookieData {
  version: string;
  activeProfile: string | null;
  overrides: Partial<AccessibilitySettings>;
  browserDetectedApplied: boolean;
}
```

## Browser Auto-Detection (First Visit)

- `prefers-reduced-motion: reduce` -> reducedMotion: true
- `prefers-contrast: more` -> highContrast: true
- Applied once, then respects manual changes

## Zustand Store

```typescript
import { useAccessibilityStore } from "@/lib/accessibility";
const { settings, applyDyslexiaProfile, applyADHDProfile, activeProfile } =
  useAccessibilityStore();
```

## Education Runtime Functions

```typescript
// Direct imports (no hooks needed)
import { syllabifyText } from "@/lib/education/accessibility/dyslexia";
import { formatNumberColored } from "@/lib/education/accessibility/dyscalculia";
import { limitBulletPoints, getSessionDuration } from "@/lib/education";
import { getAdjustedTimeout, shouldUseVoiceInput } from "@/lib/education";
```

## Key Files

| File                       | Purpose                      |
| -------------------------- | ---------------------------- |
| `a11y-cookie-storage.ts`   | Cookie CRUD (90-day persist) |
| `browser-detection.ts`     | OS/browser preference detect |
| `accessibility-store.ts`   | Zustand store with profiles  |
| `a11y-floating-button.tsx` | 44x44px trigger button       |
| `a11y-quick-panel.tsx`     | Settings panel with presets  |
| `a11y-instant-access.tsx`  | Container component          |

## WCAG 2.1 AA Compliance

| Criterion         | Implementation                     |
| ----------------- | ---------------------------------- |
| 1.4.3 Contrast    | 4.5:1 minimum on all text          |
| 2.1.1 Keyboard    | Tab/Enter/Escape navigation        |
| 2.4.7 Focus       | ring-2 visible focus indicators    |
| 2.5.5 Target Size | 44x44px minimum on all buttons     |
| 4.1.2 ARIA        | Labels on all interactive controls |

## See Also

- `.claude/rules/accessibility.md` -- profile checklist for new components
- `src/lib/education/ACCESSIBILITY.md` -- full API reference (605 lines)
- ADR 0060 (instant accessibility), ADR 0015 (no localStorage for user data)
