# Mobile Readiness - Full Reference

## CI Enforcement

Mobile E2E on every PR: iPhone SE (375x667), Pixel 7 (412x915), iPad Mini (768x1024).
CI Job: `mobile-e2e` in `.github/workflows/ci.yml`
Config: `CI_MOBILE_TESTS=1` enables mobile projects in `playwright.config.ts`

## Touch Targets (WCAG 2.5.5)

All interactive elements: min 44px x 44px.

```tsx
// CORRECT
<button className="min-h-[44px] min-w-[44px] p-3">Click</button>
// WRONG
<button className="h-8 w-8">X</button>  // 32px
```

Helper: `await mobile.verifyTouchTarget(locator)` from `e2e/mobile/fixtures.ts`

## Mobile-First Breakpoints

| Breakpoint | Width     | Use Case                   |
| ---------- | --------- | -------------------------- |
| (base)     | < 640px   | Mobile                     |
| `sm:`      | >= 640px  | Large phones               |
| `md:`      | >= 768px  | Tablets portrait           |
| `lg:`      | >= 1024px | Tablets landscape/desktops |
| `xl:`      | >= 1280px | Large desktops             |

## Responsive Patterns

```tsx
// Grid: 1 col mobile -> 2 tablet -> 3 desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Stack mobile, side-by-side desktop
<div className="flex flex-col lg:flex-row">

// Hamburger mobile, full nav desktop
<button className="lg:hidden">Menu</button>
<nav className="hidden lg:flex">

// Responsive typography/spacing
<h1 className="text-2xl md:text-3xl lg:text-4xl">
<section className="p-4 md:p-6 lg:p-8">
```

## ANTI-PATTERN: `w-full sm:w-*`

Pre-commit hook BLOCKS this pattern. On mobile (0-639px) renders at 100% viewport.

**Alternatives:**

- `w-28 sm:w-72 lg:w-64` (fixed width)
- `w-full max-w-xs sm:w-72` (constrained)
- `w-[min(7rem,85vw)] sm:w-72` (CSS min)

## Common Mistakes

- Fixed widths: use `w-full max-w-4xl` not `w-[800px]`
- Desktop-only: use `flex flex-col md:flex-row` not `flex flex-row`
- Small targets: use `p-3 min-h-[44px]` not `text-xs p-1`
- Hidden content: use `order-last md:order-first` not `hidden md:block`

## Testing

```bash
npx playwright test e2e/mobile/
npx playwright test --project=iphone-se
npm run test:unit -- mobile-utils
```

## Pre-Merge UI Checklist

- Touch targets >= 44px
- No horizontal scroll on mobile
- Mobile-first grid classes
- Adequate font size on small screens
- Sidebar: overlay mobile, persistent desktop

## File Locations

| File                                   | Purpose               |
| -------------------------------------- | --------------------- |
| `e2e/mobile/fixtures.ts`               | Mobile test helpers   |
| `e2e/mobile/responsive-layout.spec.ts` | Core responsive tests |
| `playwright.config.ts`                 | Device project config |
| `.github/workflows/ci.yml`             | Mobile E2E CI job     |

## ADR References: 0064 (Mobile UX), WCAG 2.5.5 (Touch targets)
