# Accessibility Rules - MirrorBuddy

## 7 DSA Profiles (`src/lib/accessibility/`)

Dyslexia | ADHD | Visual Impairment | Motor Impairment | Autism | Auditory Impairment | Cerebral Palsy

## WCAG 2.1 AA Requirements

- **Contrast**: 4.5:1 normal text, 3:1 large text
- **Focus**: Visible indicators on all interactive elements
- **Keyboard**: All functionality via keyboard
- **Motion**: Respect `prefers-reduced-motion`
- **Text**: 200% zoom without horizontal scroll

## UI Component Checklist

- [ ] Test with each accessibility profile enabled
- [ ] Verify keyboard navigation (Tab, Enter, Escape)
- [ ] Check color contrast with high contrast mode
- [ ] Ensure TTS reads content correctly
- [ ] Test with reduced motion enabled

## Store: `useAccessibilityStore` from `@/lib/accessibility` (Zustand, NOT localStorage)

## Full reference: `@docs/claude/accessibility.md` | ADR 0060
