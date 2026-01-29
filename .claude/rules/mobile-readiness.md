# Mobile Readiness Rules - MirrorBuddy

## Touch Targets: ALL interactive elements MUST be 44px x 44px minimum (WCAG 2.5.5)

## Mobile-First Breakpoints (Tailwind)

| Breakpoint | Width     | Use Case                   |
| ---------- | --------- | -------------------------- |
| (base)     | < 640px   | Mobile phones              |
| `sm:`      | >= 640px  | Large phones               |
| `md:`      | >= 768px  | Tablets portrait           |
| `lg:`      | >= 1024px | Tablets landscape/desktops |

Always start with mobile styles, add larger breakpoints.

## ANTI-PATTERN: `w-full sm:w-*` (BLOCKED by pre-commit hook)

Use instead: `w-28 sm:w-72` or `w-full max-w-xs sm:w-72` or `w-[min(7rem,85vw)] sm:w-72`

## CI Enforcement

Mobile E2E runs on every PR: iPhone SE (375x667), Pixel 7 (412x915), iPad Mini (768x1024).
Config: `CI_MOBILE_TESTS=1` in `playwright.config.ts`

## Pre-Merge UI Checklist

- Touch targets >= 44px
- No horizontal scroll on mobile
- Mobile-first grid classes
- Sidebar: overlay mobile, persistent desktop

## Full reference: `@docs/claude/mobile-readiness.md`
