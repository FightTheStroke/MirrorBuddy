# Accessibility Tests - Quick Fix Reference (PR 196 & 197)

## 🔴 Critical Issues (Fix Immediately)

### Issue #1: Skip Link Missing from Most Pages

**Test Failure**: `skip link is present on all pages`

```
Error: element(s) not found
Locator: locator('[data-testid="skip-link"]')
```

**Fix**: Add to `src/app/[locale]/layout.tsx` (top of component):

```tsx
import { SkipLink } from "@/components/accessibility/skip-link";

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!validateLocale(locale)) notFound();
  const messages = await getMessages();

  return (
    <LocaleProvider locale={locale} messages={messages}>
      <SkipLink targetId="main-content" /> {/* ← ADD THIS LINE */}
      <A11yInstantAccess />
      <HreflangLinks />
      {children}
    </LocaleProvider>
  );
}
```

**Affected Tests**: 8 tests

- ❌ skip link is present on all pages
- ❌ skip link is first focusable element
- ❌ skip link navigates to main content
- ❌ skip link announces to screen readers

---

### Issue #2: main-content ID Not Present

**Test Failure**: `skip link navigates to main content` (timeout)

```
element is outside of the viewport
retrying click action... (30 seconds timeout)
```

**Fix**: Update `src/app/layout.tsx`:

```tsx
// BEFORE:
<div data-testid="main-content">{children}</div>

// AFTER:
<main id="main-content">{children}</main>
```

**Also Add to These Pages**:

- `src/app/[locale]/astuccio/page.tsx` → wrap content in `<main id="main-content">`
- `src/app/[locale]/supporti/page.tsx` → wrap content in `<main id="main-content">`
- `src/app/[locale]/mindmap/page.tsx` → wrap content in `<main id="main-content">`
- (and 10+ other content pages)

**Affected Tests**: 5 tests

- ❌ skip link navigates to main content
- ❌ skip link announces to screen readers
- ❌ Multiple quick panel tests (depend on skip link working)

---

### Issue #3: Remove Duplicate Skip Link from Homepage

**File**: `src/app/[locale]/page.tsx`

```tsx
// DELETE THESE LINES:
import { SkipLink } from "@/components/accessibility/skip-link";
<SkipLink targetId="main-content" />; // Remove this line

// The skip link is now in the layout, so this is redundant
```

---

## 🟡 Secondary Issues

### Issue #4: Verify sr-only CSS

**File**: Check your Tailwind CSS or global CSS for:

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
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

If not present, add to your CSS. The `focus:not-sr-only` Tailwind class requires `:focus` styles to exist.

---

## ✅ Components Already Correct

These components are working fine and need NO changes:

- ✅ A11y Floating Button (`src/components/accessibility/a11y-floating-button.tsx`)
- ✅ Quick Panel (`src/components/accessibility/a11y-quick-panel.tsx`)
- ✅ Toggle Switches (with `role="switch"` and `aria-checked`)
- ✅ Data-testids (all present and correct)

---

## Test Command

After making fixes, run:

```bash
E2E_TESTS=1 npx playwright test e2e/a11y-skip-link.spec.ts --reporter=list
```

Should see:

```
✓ skip link is present on all pages
✓ skip link is first focusable element
✓ skip link navigates to main content
✓ skip link announces to screen readers
✓ skip link is hidden by default
✓ skip link becomes visible on focus
✓ skip link has proper contrast
✓ skip link has accessible aria-label
```

---

## Files to Modify

| File                          | Action                          | Priority    |
| ----------------------------- | ------------------------------- | ----------- |
| `src/app/[locale]/layout.tsx` | Add SkipLink import & component | 🔴 CRITICAL |
| `src/app/layout.tsx`          | Change data-testid to id        | 🔴 CRITICAL |
| `src/app/[locale]/page.tsx`   | Remove duplicate SkipLink       | 🔴 CRITICAL |
| 12+ content pages             | Add `id="main-content"` wrapper | 🟡 MEDIUM   |

---

## Testing Strategy

1. **Unit Check** (5 min):

   ```bash
   # Verify changes compile
   npm run typecheck
   ```

2. **Smoke Test** (15 min):

   ```bash
   # Test skip link on homepage
   E2E_TESTS=1 npx playwright test e2e/a11y-skip-link.spec.ts -g "present on all pages"
   ```

3. **Full A11y Test** (45 min):

   ```bash
   # Test all accessibility features
   E2E_TESTS=1 npx playwright test e2e/a11y-*.spec.ts --reporter=list
   ```

4. **Regression Test** (30 min):
   ```bash
   # Verify you didn't break other tests
   E2E_TESTS=1 npx playwright test e2e/smoke --reporter=list
   ```

---

## Expected Outcome

✅ **After Fixes**: All 40+ accessibility tests passing

- 8 skip-link tests ✓
- 8 skip-link data-testid tests ✓
- 6 floating button tests ✓
- 8 quick panel tests ✓
- 10+ other accessibility tests ✓

❌ **Before Fixes**: 22 tests failing

- Missing skip-link element
- Timeout on click interaction
- main-content ID not found

---

## Troubleshooting

**Issue**: Tests still failing after adding SkipLink

- [ ] Verify import is correct: `import { SkipLink } from "@/components/accessibility/skip-link"`
- [ ] Check `targetId="main-content"` matches the ID on your main element
- [ ] Restart dev server: `npm run reboot`
- [ ] Clear test cache: `rm -rf .next test-results`

**Issue**: Skip link visible on page (sr-only not working)

- [ ] Check sr-only CSS exists in globals or Tailwind
- [ ] Verify `focus:not-sr-only` class is in Tailwind config
- [ ] Check CSS for `position: absolute; width: 1px; height: 1px;`

**Issue**: Skip link doesn't navigate to main content

- [ ] Verify `id="main-content"` is on a focusable element (like `<main>`)
- [ ] Check browser console for JavaScript errors
- [ ] Verify `targetId` prop matches the ID on your element

---

## Related Files (Reference)

- **Tests**: `e2e/a11y-skip-link.spec.ts`, `e2e/a11y-data-testid.spec.ts`
- **Component**: `src/components/accessibility/skip-link.tsx`
- **Analysis**: `ACCESSIBILITY_TEST_ANALYSIS.md` (detailed root cause analysis)

---

**Estimated Time to Fix**: 2-3 hours  
**Complexity**: Low-Medium  
**Risk**: Low (accessibility features, no breaking changes)
