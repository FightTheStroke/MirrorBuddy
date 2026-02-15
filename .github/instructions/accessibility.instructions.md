---
description: 'WCAG 2.1 AA accessibility rules and 7 DSA profiles'
applyTo: 'src/lib/accessibility/**/*,src/components/**/*.tsx'
---

# Accessibility Rules

## 7 DSA Profiles

Dyslexia | ADHD | Visual Impairment | Motor Impairment | Autism | Auditory Impairment | Cerebral Palsy

## WCAG 2.1 AA

- **Contrast**: 4.5:1 normal, 3:1 large
- **Focus**: visible indicators, all interactive
- **Keyboard**: Tab/Enter/Escape, no traps
- **Motion**: respect `prefers-reduced-motion`
- **Text**: 200% zoom, no horizontal scroll

## Checklist

Test each DSA profile | keyboard nav | high contrast | TTS | reduced motion

## State

`useAccessibilityStore` from `@/lib/accessibility` — NEVER localStorage

Reference: ADR 0060

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
