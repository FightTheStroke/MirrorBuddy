# Mobile Readiness

> Mobile-first responsive design with CI-enforced device testing

## Quick Reference

| Key           | Value                    |
| ------------- | ------------------------ |
| Config        | `playwright.config.ts`   |
| Mobile tests  | `e2e/mobile/`            |
| CI trigger    | `CI_MOBILE_TESTS=1`      |
| Layout        | `src/components/layout/` |
| Touch minimum | 44x44px (WCAG 2.5.5)     |

## Tailwind Breakpoints (Mobile-First)

| Breakpoint | Width     | Use Case                   | Example          |
| ---------- | --------- | -------------------------- | ---------------- |
| (base)     | < 640px   | Mobile phones              | `text-sm`        |
| `sm:`      | >= 640px  | Large phones               | `sm:text-base`   |
| `md:`      | >= 768px  | Tablets portrait           | `md:grid-cols-2` |
| `lg:`      | >= 1024px | Tablets landscape/desktops | `lg:grid-cols-3` |

Always start with mobile styles, add larger breakpoints progressively.

## BLOCKED Pattern: `w-full sm:w-*`

Pre-commit hook blocks `w-full sm:w-*`. Use instead:

```html
<!-- Fixed width with responsive scaling -->
<div className="w-28 sm:w-72 lg:w-64">
  <!-- Constrained full-width -->
  <div className="w-full max-w-xs sm:w-72">
    <!-- Viewport-aware with clamp -->
    <div className="w-[min(7rem,85vw)] sm:w-72"></div>
  </div>
</div>
```

## CI Device Matrix

| Device     | Viewport | CI Project   | Runs in CI |
| ---------- | -------- | ------------ | ---------- |
| iPhone SE  | 375x667  | `iphone-se`  | Yes (core) |
| Pixel 7    | 412x915  | `pixel-7`    | Yes (core) |
| iPad Mini  | 768x1024 | `ipad-mini`  | Yes (core) |
| iPhone 13  | 390x844  | `iphone-13`  | Local only |
| iPad Land. | 1024x768 | `ipad-land.` | Local only |
| Galaxy S24 | 360x780  | `galaxy-s24` | Local only |
| iPhone 15P | 393x852  | `iphone-15p` | Local only |

**CI timeout**: 45s for mobile projects (vs 30s desktop) due to hydration variance.

## Sidebar Behavior

- **Mobile** (< 768px): Overlay drawer, closes on navigation
- **Desktop** (>= 1024px): Persistent sidebar, always visible

## Touch Target Implementation

```typescript
// Minimum 44x44px for all interactive elements
<button className="min-h-[44px] min-w-[44px] p-3">

// Icon buttons need explicit sizing
<IconButton className="h-11 w-11 flex items-center justify-center">
```

## Pre-Merge Checklist

- [ ] Touch targets >= 44px on all interactive elements
- [ ] No horizontal scroll on 375px viewport
- [ ] Mobile-first grid classes (base -> sm -> md -> lg)
- [ ] Sidebar: overlay on mobile, persistent on desktop
- [ ] Test with `CI_MOBILE_TESTS=1 npx playwright test`

## See Also

- `playwright.config.ts` - Full device configuration
- `.claude/rules/mobile-readiness.md` - Compact rules
- `e2e/mobile/responsive-layout.spec.ts` - Cross-device responsive tests
