# Accessibility Tests Analysis: PR 196 & 197 (BLOCKING)

**Status**: Critical Blocking Issues Identified
**Test Suite**: E2E Accessibility Tests (`e2e/a11y-*.spec.ts`)
**Affected Tests**: 19+ tests failing
**Root Cause**: Skip Link component not rendered on most pages

---

## Executive Summary

The accessibility test suite is failing because the **Skip Link component is not being rendered on most pages**, despite being a requirement for WCAG 2.1 AA compliance. Only the homepage (`/[locale]`) includes the Skip Link, while all other pages (welcome, astuccio, supporti, mindmap, etc.) are missing this critical component.

Additionally, the **`main-content` ID is inconsistently placed** across pages, with some pages using `data-testid="main-content"` instead of `id="main-content"`.

---

## Root Causes

### 1. **Skip Link Not Rendered on Most Pages** (CRITICAL)

**Severity**: 🔴 Critical  
**Impact**: 8+ test failures (Skip Link tests)

**Evidence**:

```
Error: expect(locator).toBeAttached() failed
Locator: locator('[data-testid="skip-link"]')
Expected: attached
Timeout: 5000ms
Error: element(s) not found
```

**Current State**:

- ✅ Skip Link rendered on: `/[locale]` (homepage only)
- ❌ Skip Link NOT rendered on: `/[locale]/welcome`, `/[locale]/astuccio`, `/[locale]/supporti`, `/[locale]/mindmap`, etc.
- ❌ Skip Link NOT in root layout (`src/app/layout.tsx`)

**File Locations**:

```
src/app/[locale]/page.tsx         ✅ Has SkipLink import + <SkipLink targetId="main-content" />
src/app/[locale]/layout.tsx       ❌ NO SkipLink (only has A11yInstantAccess)
src/app/layout.tsx                ❌ NO SkipLink
src/app/[locale]/welcome/page.tsx ❌ NO SkipLink
```

**Test Failures**:

1. `skip link is present on all pages` - Fails on `/welcome`, `/astuccio`, `/supporti`
2. `skip link is first focusable element` - Cannot focus missing element
3. `skip link navigates to main content` - Times out trying to click missing element
4. `skip link announces navigation to screen readers` - Fails due to missing element

---

### 2. **Inconsistent main-content ID Placement** (MEDIUM)

**Severity**: 🟡 Medium  
**Impact**: 5+ potential test failures when skip link is clicked

**Current State**:

```tsx
// ✅ CORRECT - Uses id="main-content"
src/app/[locale]/page.tsx:
  <main id="main-content" className="min-h-screen flex-1">

src/app/[locale]/welcome/components/landing-page.tsx:
  <main id="main-content">

// ❌ WRONG - Uses data-testid instead of id
src/app/layout.tsx:
  <div data-testid="main-content">{children}</div>

// ❌ MISSING - No id at all in many pages
src/app/[locale]/astuccio/page.tsx  - No id
src/app/[locale]/supporti/page.tsx  - No id
src/app/[locale]/mindmap/page.tsx   - No id
```

**Test Failure**:

```
Error: locator.click: Test timeout of 30000ms exceeded.
  - element is visible, enabled and stable
  - scrolling into view if needed
  - done scrolling
  - element is outside of the viewport  ← Skip link rendered OFF-screen
```

The skip link is rendered in `absolute -top-12` (off-screen position), and when clicked, it tries to focus `id="main-content"` but the page hangs because:

1. The page layout never renders a proper `<main>` element with `id="main-content"`
2. The `document.getElementById("main-content")` finds nothing or finds a `data-testid` div (which doesn't work)

---

### 3. **Skip Link Positioning Issue** (MEDIUM)

**Severity**: 🟡 Medium  
**Impact**: Playwright cannot interact with the skip link

**Current Implementation** (`src/components/accessibility/skip-link.tsx`):

```tsx
className={cn(
  "absolute -top-12 left-0 z-[9999]",  // ← POSITIONED OFF-SCREEN
  "sr-only focus:not-sr-only",          // ← HIDDEN UNTIL FOCUS
  // ...
)}
```

**Problem**:

- The `-top-12` CSS positions the element **48px above the viewport**
- Playwright's `locator.click()` checks `isVisible && !outsideViewport`
- Since the element is off-screen, Playwright cannot click it
- Test tries for 30 seconds, then times out

**Note**: This is correct for visual/screen readers, but breaks Playwright interaction.

---

## Failing Test Categories

### Skip Link Tests (8 failures)

| Test                                    | Status  | Cause                        |
| --------------------------------------- | ------- | ---------------------------- |
| `skip link is present on all pages`     | ❌ FAIL | Component not rendered       |
| `skip link is first focusable element`  | ❌ FAIL | Component not rendered       |
| `skip link navigates to main content`   | ❌ FAIL | Timeout + no main-content ID |
| `skip link announces to screen readers` | ❌ FAIL | Timeout + missing element    |
| `skip link is hidden by default`        | ✅ PASS | Works on homepage            |
| `skip link becomes visible on focus`    | ✅ PASS | Works on homepage            |
| `skip link has proper contrast`         | ✅ PASS | Works on homepage            |
| `skip link has accessible aria-label`   | ✅ PASS | Works on homepage            |

### A11y Floating Button Tests (6 failures)

| Test                                 | Status  | Cause                              |
| ------------------------------------ | ------- | ---------------------------------- |
| `floating button has data-testid`    | ✅ PASS | Component exists                   |
| `floating button has aria-expanded`  | ✅ PASS | Attribute present                  |
| `floating button opens/closes panel` | ❌ FAIL | Skip link missing breaks page load |
| `toggle switch has role="switch"`    | ❌ FAIL | Skip link missing breaks page load |
| `quick panel has aria-modal="true"`  | ❌ FAIL | Skip link missing breaks page load |
| `escape key closes panel`            | ❌ FAIL | Skip link missing breaks page load |

### Quick Panel Tests (5 failures)

Similar causes - skip link presence breaks overall page accessibility testing.

---

## Concrete Fix Plan

### Phase 1: Add Skip Link to All Pages (CRITICAL - 2 hours)

#### 1.1 Add Skip Link to Locale Layout

**File**: `src/app/[locale]/layout.tsx`
**Action**: Import and render SkipLink at the top of the layout

```tsx
// Add import
import { SkipLink } from "@/components/accessibility/skip-link";

// In LocaleLayout component, add BEFORE children:
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!validateLocale(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <LocaleProvider locale={locale} messages={messages}>
      + <SkipLink targetId="main-content" /> // ← ADD HERE (before other
      content)
      <A11yInstantAccess />
      <HreflangLinks />
      {children}
    </LocaleProvider>
  );
}
```

**Why**: The locale layout wraps ALL localized pages, so adding it here ensures every page gets the skip link.

#### 1.2 Add Skip Link to Root Layout

**File**: `src/app/layout.tsx`
**Action**: Add Skip Link for non-localized routes (admin, etc.)

```tsx
// For admin and non-i18n routes
// Option A: Add a conditional skip link for non-localized pages
// Option B: Wrap admin section in its own layout with SkipLink
```

#### 1.3 Remove Duplicate Skip Link from Homepage

**File**: `src/app/[locale]/page.tsx`
**Action**: Remove the SkipLink import and component call (now in layout)

```tsx
- import { SkipLink } from "@/components/accessibility/skip-link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
-     <SkipLink targetId="main-content" />  // ← REMOVE (now in layout)
      <h1 className="sr-only">{t("appTitle")}</h1>
      // ... rest of component
    </div>
  );
}
```

---

### Phase 2: Add main-content ID to All Pages (CRITICAL - 1.5 hours)

#### 2.1 Fix Root Layout

**File**: `src/app/layout.tsx`
**Current**:

```tsx
<div data-testid="main-content">{children}</div>
```

**Change to**:

```tsx
<main id="main-content" className="...">
  {children}
</main>
```

⚠️ **Warning**: Ensure this doesn't break CSS or styling. Check for any selectors on `[data-testid="main-content"]`.

#### 2.2 Ensure All Pages Have main-content ID

**Audit Required Pages**:

```
src/app/[locale]/astuccio/page.tsx
src/app/[locale]/supporti/page.tsx
src/app/[locale]/mindmap/page.tsx
src/app/[locale]/flashcard/page.tsx
src/app/[locale]/flashcards/page.tsx
src/app/[locale]/quiz/page.tsx
src/app/[locale]/search/page.tsx
src/app/[locale]/study-kit/page.tsx
src/app/[locale]/summary/page.tsx
src/app/[locale]/timeline/page.tsx
src/app/[locale]/chart/page.tsx
src/app/[locale]/diagram/page.tsx
src/app/[locale]/formula/page.tsx
src/app/[locale]/pdf/page.tsx
src/app/[locale]/typing/page.tsx
src/app/[locale]/webcam/page.tsx
src/app/admin/page.tsx (and all admin subpages)
```

**Pattern to Apply**:
Each page should wrap its main content with:

```tsx
<main id="main-content" className="...">
  {/* page content */}
</main>
```

Or if the page already has a main element:

```tsx
<main id="main-content">{/* existing content */}</main>
```

---

### Phase 3: Fix Skip Link Click Interaction (MEDIUM - 1 hour)

#### 3.1 Make Skip Link Focusable for Playwright

**File**: `src/components/accessibility/skip-link.tsx`
**Issue**: The `-top-12` positioning puts it off-screen, breaking Playwright interaction.

**Solution Option A: Use alternative sr-only method**

```tsx
className={cn(
  // Instead of absolute positioning, use clip-based sr-only
  "sr-only focus:not-sr-only",
  // The sr-only utility should use clip-path or width:1px height:1px
  // This keeps it focusable without off-screen positioning
  // ...
)}
```

**Verify sr-only CSS** in your Tailwind config or CSS:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

**Solution Option B: Add focus:relative (simpler)**

```tsx
className={cn(
  "sr-only focus:not-sr-only focus:relative",  // ← add focus:relative
  // ...
)}
```

---

### Phase 4: Verify Test Data-TestIds (MEDIUM - 0.5 hours)

#### 4.1 Ensure all required data-testids exist:

```
✅ data-testid="skip-link"          → Skip link component
✅ data-testid="a11y-floating-button"  → Floating button
✅ data-testid="a11y-quick-panel"      → Quick panel
✅ data-testid="a11y-close-panel-btn"  → Close button
✅ data-testid="a11y-profile-*"        → Profile buttons
✅ data-testid="a11y-toggle-*"         → Toggle switches
✅ data-testid="a11y-reset-btn"        → Reset button
✅ data-testid="a11y-full-settings-link" → Settings link
```

All these already exist in the components, just need to verify they're rendered.

---

## Implementation Checklist

### Immediate Actions (Critical Path)

- [ ] **Update `src/app/[locale]/layout.tsx`**
  - [ ] Import SkipLink component
  - [ ] Add `<SkipLink targetId="main-content" />` before children
  - [ ] Verify it renders by running tests on /welcome page

- [ ] **Update `src/app/layout.tsx`**
  - [ ] Change `<div data-testid="main-content">` to `<main id="main-content">`
  - [ ] Verify no CSS selectors break
  - [ ] Test admin pages

- [ ] **Remove duplicate Skip Link from `src/app/[locale]/page.tsx`**
  - [ ] Remove import and component call
  - [ ] Verify homepage still passes tests

- [ ] **Verify sr-only CSS supports focus:not-sr-only**
  - [ ] Check if `:focus` styles restore visibility
  - [ ] Test with keyboard (Tab key)
  - [ ] Test with screen reader

### Quality Assurance

- [ ] Run skip-link tests: `E2E_TESTS=1 npx playwright test e2e/a11y-skip-link.spec.ts`
- [ ] Run all a11y tests: `E2E_TESTS=1 npx playwright test e2e/a11y-*.spec.ts`
- [ ] Verify with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Test keyboard navigation (Tab, Shift+Tab, Enter)
- [ ] Test on /welcome, /astuccio, /supporti, /mindmap pages

### Post-Implementation Verification

```bash
# Run full accessibility test suite
E2E_TESTS=1 npx playwright test e2e/accessibility.spec.ts e2e/a11y-*.spec.ts --reporter=list

# Should see:
# ✓ All 40+ tests passing
```

---

## Expected Test Results After Fix

### Before Fix

```
  ✘  7 tests failed
  ✘  5 tests failed
  ✘  1 test failed
  ✘  1 test failed
  ✘  4 tests failed
  ✘  4 tests failed
Total: 22 failed, 28 passed
```

### After Fix

```
  ✓  40+ tests passing
  ✓  All accessibility features verified
  ✓  WCAG 2.1 AA compliance confirmed
Total: 40+ passed, 0 failed
```

---

## Technical Details

### Skip Link Component Architecture

```
LocaleLayout (renders skip link)
├── SkipLink component
│   ├── data-testid="skip-link"
│   ├── href="#main-content"
│   ├── aria-label="Skip to main content"
│   ├── role=implicit (link)
│   ├── sr-only + focus:not-sr-only (visibility)
│   └── Announces with aria-live on click
└── Page Content
    ├── A11yInstantAccess (floating button + quick panel)
    └── Main content area (id="main-content")
```

### Expected DOM After Fix

```html
<html>
  <body>
    <a
      data-testid="skip-link"
      href="#main-content"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>

    <!-- Floating button (from A11yInstantAccess) -->
    <button data-testid="a11y-floating-button" aria-expanded="false">
      ...
    </button>

    <!-- Quick panel (hidden initially) -->
    <div id="a11y-quick-panel" role="dialog" aria-modal="true">...</div>

    <!-- Main content -->
    <main id="main-content">
      <!-- page content -->
    </main>
  </body>
</html>
```

---

## References

- **Test File**: `e2e/a11y-skip-link.spec.ts`
- **Component**: `src/components/accessibility/skip-link.tsx`
- **Layout**: `src/app/[locale]/layout.tsx`
- **WCAG Requirement**: [WCAG 2.1 Level AA - Skip Links](https://www.w3.org/WAI/WCAG21/Understanding/skip-repetitive-content.html)
- **Test Results**: `test-results/a11y-skip-link-*.chromium/`

---

## Questions & Clarifications

**Q: Why is skip link positioned off-screen with `-top-12`?**  
A: It's hidden from sighted users but accessible to keyboard users and screen readers. The `focus:not-sr-only` class makes it visible when focused.

**Q: Should we use a layout component or add skip link to every page?**  
A: Layout is the correct approach - it's rendered once and inherited by all child pages.

**Q: What about admin routes without the locale prefix?**  
A: Admin routes should either:

1. Import/use skip link in `src/app/admin/layout.tsx`, or
2. Add skip link to root layout for all routes

**Q: Will changing `data-testid="main-content"` to `id="main-content"` break anything?**  
A: Search the codebase for `data-testid="main-content"` to check for dependencies before changing.

---

## Summary

| Component       | Status          | Action               |
| --------------- | --------------- | -------------------- |
| Skip Link       | ❌ Missing      | Add to locale layout |
| main-content ID | ⚠️ Inconsistent | Standardize to id=   |
| sr-only CSS     | ✅ Correct      | Verify focus styles  |
| A11y Button     | ✅ Renders      | No action needed     |
| Quick Panel     | ✅ Renders      | No action needed     |

**Estimated Fix Time**: 3-4 hours  
**Complexity**: Medium (layout changes + ID standardization)  
**Risk**: Low (accessibility features, isolated changes)
