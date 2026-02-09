---
description: 'WCAG 2.1 AA accessibility rules and 7 DSA profiles'
applyTo: 'src/lib/accessibility/**/*,src/components/**/*.tsx'
---

# Accessibility Rules

## 7 DSA Profiles (`src/lib/accessibility/`)

Dyslexia | ADHD | Visual Impairment | Motor Impairment |
Autism | Auditory Impairment | Cerebral Palsy

## WCAG 2.1 AA Requirements

- **Contrast**: 4.5:1 normal text, 3:1 large text
- **Focus**: Visible indicators on all interactive elements
- **Keyboard**: All functionality accessible via keyboard (Tab, Enter, Escape)
- **Motion**: Respect `prefers-reduced-motion`
- **Text**: 200% zoom without horizontal scroll

## UI Component Checklist

- Test with each accessibility profile enabled
- Verify keyboard navigation flow
- Check color contrast in high contrast mode
- Ensure TTS reads content correctly
- Test with reduced motion enabled

## State Management

```typescript
// CORRECT — Zustand store
import { useAccessibilityStore } from '@/lib/accessibility';

// WRONG — never use localStorage for a11y settings
localStorage.setItem('a11y-profile', ...);
```

Reference: ADR 0060
