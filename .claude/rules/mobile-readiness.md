# Mobile Readiness Rules - MirrorBuddy

## CI Enforcement (Automatic)

Mobile E2E tests run automatically in CI on every PR:

| Device    | Viewport   | Purpose                    |
| --------- | ---------- | -------------------------- |
| iPhone SE | 375 × 667  | Smallest supported iPhone  |
| Pixel 7   | 412 × 915  | Standard Android flagship  |
| iPad Mini | 768 × 1024 | Tablet portrait breakpoint |

**CI Job**: `mobile-e2e` in `.github/workflows/ci.yml`
**Config**: `CI_MOBILE_TESTS=1` enables mobile projects in `playwright.config.ts`

## WCAG 2.5.5 Touch Target Requirements

All interactive elements MUST be at least **44px × 44px**:

```tsx
// CORRECT - meets minimum
<button className="min-h-[44px] min-w-[44px] p-3">Click</button>
<button className="h-11 w-11">Icon</button>

// INCORRECT - too small
<button className="h-8 w-8">X</button>  // 32px - FAILS
<button className="p-1">Click</button>   // Too small
```

### Helper Fixture

```typescript
import { test, expect } from "@/e2e/mobile/fixtures";

test("button meets touch target", async ({ mobile }) => {
  const button = page.locator("button");
  await mobile.verifyTouchTarget(button); // Asserts ≥ 44px
});
```

## Responsive Breakpoints

MirrorBuddy uses Tailwind's mobile-first breakpoints:

| Breakpoint | Width    | Use Case                   |
| ---------- | -------- | -------------------------- |
| (base)     | < 640px  | Mobile phones              |
| `sm:`      | ≥ 640px  | Large phones               |
| `md:`      | ≥ 768px  | Tablets portrait           |
| `lg:`      | ≥ 1024px | Tablets landscape/desktops |
| `xl:`      | ≥ 1280px | Large desktops             |

### Mobile-First Pattern

Always start with mobile styles, then add larger breakpoints:

```tsx
// CORRECT - mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// INCORRECT - desktop-first (requires overrides)
<div className="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
```

## Required Responsive Patterns

### 1. Grid Layouts

```tsx
// Cards: 1 col mobile → 2 col tablet → 3 col desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Sidebar + Content: stack mobile → side-by-side desktop
<div className="flex flex-col lg:flex-row">
```

### 2. Navigation

```tsx
// Hamburger menu: visible mobile → hidden desktop
<button className="lg:hidden">☰</button>

// Full nav: hidden mobile → visible desktop
<nav className="hidden lg:flex">
```

### 3. Typography

```tsx
// Headings: smaller mobile → larger desktop
<h1 className="text-2xl md:text-3xl lg:text-4xl">

// Body text: comfortable reading on all devices
<p className="text-base md:text-lg">
```

### 4. Spacing

```tsx
// Padding: tighter mobile → spacious desktop
<section className="p-4 md:p-6 lg:p-8">

// Gaps: consistent but scalable
<div className="gap-3 md:gap-4 lg:gap-6">
```

## Testing Mobile Features

### Local Testing

```bash
# Run all mobile tests
npx playwright test e2e/mobile/

# Run specific device
npx playwright test --project=iphone-se
npx playwright test --project=pixel-7
npx playwright test --project=ipad-mini

# Run full device matrix (9 devices)
npx playwright test e2e/mobile/ --project=iphone-se --project=iphone-13 \
  --project=pixel-7 --project=ipad-mini --project=ipad-landscape \
  --project=galaxy-s24 --project=galaxy-a55 --project=galaxy-tab-s9 \
  --project=iphone-15-pro
```

### Unit Tests

```bash
# Run responsive utility tests
npm run test:unit -- mobile-utils
```

## Pre-Merge Checklist

Before merging any PR that touches UI:

- [ ] **Touch targets**: All buttons/links ≥ 44px × 44px
- [ ] **Horizontal scroll**: No horizontal scrollbar on mobile
- [ ] **Responsive grid**: Uses mobile-first classes
- [ ] **Text readability**: Adequate font size on small screens
- [ ] **Tap spacing**: Interactive elements have sufficient spacing
- [ ] **Sidebar behavior**: Overlay on mobile, persistent on desktop
- [ ] **Navigation**: Hamburger menu works on mobile

## Common Mistakes

### 1. Fixed Widths

```tsx
// BAD - breaks on mobile
<div className="w-[800px]">

// GOOD - responsive
<div className="w-full max-w-4xl">
```

### 2. Desktop-Only Layouts

```tsx
// BAD - assumes desktop
<div className="flex flex-row gap-8">

// GOOD - stacks on mobile
<div className="flex flex-col md:flex-row gap-4 md:gap-8">
```

### 3. Small Touch Targets

```tsx
// BAD - too small for fingers
<button className="text-xs p-1">

// GOOD - accessible
<button className="text-sm p-3 min-h-[44px]">
```

### 4. Hidden Content

```tsx
// BAD - important content hidden on mobile
<div className="hidden md:block">Important info</div>

// GOOD - visible but reorganized
<div className="order-last md:order-first">Important info</div>
```

## File Locations

| File                                   | Purpose                         |
| -------------------------------------- | ------------------------------- |
| `e2e/mobile/fixtures.ts`               | Mobile test helpers             |
| `e2e/mobile/responsive-layout.spec.ts` | Core responsive tests           |
| `e2e/mobile/iphone.spec.ts`            | iPhone-specific tests           |
| `e2e/mobile/android.spec.ts`           | Android-specific tests          |
| `e2e/mobile/ipad.spec.ts`              | Tablet-specific tests           |
| `playwright.config.ts`                 | Device project configuration    |
| `.github/workflows/ci.yml`             | Mobile E2E CI job               |
| `src/lib/responsive/__tests__/`        | Unit tests for responsive utils |

## ADR References

- **ADR 0064**: Mobile UX responsive design requirements
- **WCAG 2.5.5**: Touch target size requirements (Level AAA)
