# Accessibility — MirrorBuddy

## 7 DSA Profiles (`src/lib/accessibility/`)

Dyslexia | ADHD | Visual | Motor | Autism | Auditory | Cerebral Palsy.

## WCAG 2.1 AA

- Contrast: 4.5:1 normal / 3:1 large
- Visible focus on interactive elements
- Full keyboard (Tab/Enter/Escape)
- Respect `prefers-reduced-motion`
- 200% zoom no horizontal scroll

## Component checklist

- [ ] Test each profile enabled
- [ ] Keyboard nav (Tab/Enter/Escape)
- [ ] Contrast in high-contrast mode
- [ ] TTS reads correctly
- [ ] Reduced motion

## Store: `useAccessibilityStore` from `@/lib/accessibility` (Zustand — NOT localStorage)

## Ref: `@docs/claude/accessibility.md` | ADR 0060
