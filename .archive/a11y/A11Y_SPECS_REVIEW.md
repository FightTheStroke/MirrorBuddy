# A11y Specs Review: Minimal Edits for Localized Paths & Consistent Setup

## Summary

Review of 8 accessibility spec files reveals **inconsistent patterns** in:

1. **Path usage** - Some use `/it/welcome` (localized), others use `/welcome` (unlocalized)
2. **Setup patterns** - TOS modal bypass code duplicated across files
3. **Locale fixture usage** - a11y-locales.spec.ts uses fixtures properly; others don't

---

## Current State Analysis

### ✅ Good: a11y-locales.spec.ts

- Uses `testAllLocales()` from fixtures
- Uses `localePage.goto()` (locale-aware)
- Consistent setup with `setupTosModalBypass()`
- Proper `localeOptions` handling

### ❌ Issues: Other a11y-\*.spec.ts files

| File                                  | Issue                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **accessibility.spec.ts**             | Lines 445, 493, 574, etc: Uses `/it/welcome` (mixed locale); should use default path or locale fixture |
| **a11y-data-testid.spec.ts**          | All tests use `await page.goto("/")` (unlocalized); should be parameterized                            |
| **a11y-floating-button.spec.ts**      | All tests use unlocalized paths; no locale coverage                                                    |
| **a11y-quick-panel.spec.ts**          | All tests use unlocalized paths; no locale coverage                                                    |
| **a11y-skip-link.spec.ts**            | Line 17: Tests only `/` + some unlocalized pages; needs locale params                                  |
| **a11y-new-features.spec.ts**         | Mixed: some use `/it/welcome` (hardcoded), others use unlocalized paths                                |
| **a11y-quick-panel-advanced.spec.ts** | All tests use unlocalized paths; no locale fixture                                                     |

---

## Key Observations

### Pattern 1: TOS Modal Bypass Duplication

**Current state:**

- `accessibility.spec.ts`: Duplicates TOS mock in `beforeEach` (lines 61-69, 113-121, etc.)
- `a11y-locales.spec.ts`: Consolidates as `setupTosModalBypass()` function (lines 41-52)

**Issue:** Code repeated 4+ times in accessibility.spec.ts

### Pattern 2: Hardcoded Localized Paths

**Current state:**

- `accessibility.spec.ts` line 445: `await page.goto("/it/welcome");` ← hardcoded Italian
- `a11y-new-features.spec.ts` lines 21, 493, 574: Same hardcoded Italian paths

**Issue:** Tests only run in Italian locale; ignores other locales

### Pattern 3: No Locale Fixture Usage in Most Files

**Current state:**

- Only `a11y-locales.spec.ts` imports from `./fixtures`
- All other files: `import { test, expect } from "@playwright/test"` (no locale support)

---

## Proposed Minimal Edits

### EDIT 1: accessibility.spec.ts - Import locale fixtures

**Location:** Line 22-23 (replace imports)

```diff
- import { test, expect } from "@playwright/test";
+ import { test, expect, testAllLocales } from "./fixtures";
- import AxeBuilder from "@axe-core/playwright";

- // IMPORTANT: These tests check unauthenticated pages (welcome, legal, etc.)
- // Override global storageState to start without authentication
- test.use({ storageState: undefined });
+ import AxeBuilder from "@axe-core/playwright";
+
+ // IMPORTANT: These tests check unauthenticated pages (welcome, legal, etc.)
+ // Override global storageState to start without authentication
+ test.use({ storageState: undefined });
```

### EDIT 2: accessibility.spec.ts - Add consolidated TOS helper

**Location:** After line 27 (add function)

```diff
  test.use({ storageState: undefined });
+
+ /**
+  * Setup function to bypass ToS modal
+  * TosGateProvider checks both localStorage AND calls /api/tos
+  */
+ async function setupTosModalBypass(page: import("@playwright/test").Page) {
+   await page.route("/api/tos", async (route) => {
+     await route.fulfill({
+       status: 200,
+       contentType: "application/json",
+       body: JSON.stringify({
+         accepted: true,
+         version: "1.0",
+       }),
+     });
+   });
+ }
```

### EDIT 3: accessibility.spec.ts - Replace beforeEach duplication

**Location:** Lines 61-69, 113-121, 268-276, 388-396, 434-442, 557-565, 631-640, 697-705
**Pattern:** Replace all 8+ identical `beforeEach` blocks with single function call

Example (line 61-69):

```diff
  test.describe("WCAG 2.1 AA Compliance", () => {
    test.beforeEach(async ({ page }) => {
-     await page.route("**/api/tos", (route) =>
-       route.fulfill({
-         status: 200,
-         contentType: "application/json",
-         body: JSON.stringify({ accepted: true, version: "1.0" }),
-       }),
-     );
+     await setupTosModalBypass(page);
    });
```

### EDIT 4: accessibility.spec.ts - Use unlocalized paths in PAGES_TO_TEST

**Location:** Lines 30-48 (PAGES_TO_TEST definition - already good, no change needed)

### EDIT 5: accessibility.spec.ts - Replace hardcoded Italian paths

**Location:** Lines 445, 457-459, 470-472, 493-494, 524-525, 539-541, 574, 594, 610, 642-643, 649-650, 674, 681-682, 687, 707-708, 722-723, 757-759

Replace all `/it/welcome` with `/welcome`:

```diff
  test("floating button visible and WCAG compliant size", async ({ page }) => {
-   await page.goto("/it/welcome");
+   await page.goto("/welcome");
    await page.waitForLoadState("domcontentloaded");
```

**Count:** ~12 instances

### EDIT 6: a11y-data-testid.spec.ts - Import locale fixtures

**Location:** Line 10 (replace import)

```diff
- import { test, expect } from "@playwright/test";

+ import { test, expect } from "./fixtures";
+
+ test.use({ storageState: undefined });
```

### EDIT 7: a11y-floating-button.spec.ts - Import locale fixtures

**Location:** Line 13 (replace import)

```diff
- import { test, expect } from "@playwright/test";

+ import { test, expect } from "./fixtures";
+
+ test.use({ storageState: undefined });
```

### EDIT 8: a11y-quick-panel.spec.ts - Import locale fixtures

**Location:** Line 14 (replace import)

```diff
- import { test, expect } from "@playwright/test";

+ import { test, expect } from "./fixtures";
+
+ test.use({ storageState: undefined });
```

### EDIT 9: a11y-skip-link.spec.ts - Import locale fixtures + add setup

**Location:** Line 13 (replace import)

```diff
- import { test, expect } from "@playwright/test";

+ import { test, expect } from "./fixtures";
+
+ test.use({ storageState: undefined });
+
+ async function setupTosModalBypass(page: import("@playwright/test").Page) {
+   await page.route("/api/tos", async (route) => {
+     await route.fulfill({
+       status: 200,
+       contentType: "application/json",
+       body: JSON.stringify({
+         accepted: true,
+         version: "1.0",
+       }),
+     });
+   });
+ }
```

### EDIT 10: a11y-skip-link.spec.ts - Add beforeEach with setup

**Location:** After line 15 (add to describe block)

```diff
  test.describe("Skip Link - WCAG 2.1 AA Compliance", () => {
+   test.beforeEach(async ({ page }) => {
+     await setupTosModalBypass(page);
+   });
+
    test("skip link is present on all pages", async ({ page }) => {
```

### EDIT 11: a11y-new-features.spec.ts - Import locale fixtures

**Location:** Line 13 (replace import)

```diff
- import { test, expect } from "@playwright/test";

+ import { test, expect } from "./fixtures";
+
+ test.use({ storageState: undefined });
```

### EDIT 12: a11y-new-features.spec.ts - Replace hardcoded Italian paths

**Location:** Lines 20, 32, 52, 73, 80, 101, 105, 123, 141, 153, 164, 182, 201, 213, 217, 237, 251, 265, 281, 307, 326, 331, 369, 390

Replace all `/it/welcome` with `/welcome`:

```diff
  test("skip link is present on all pages", async ({ page }) => {
-   const pages = ["/", "/welcome", "/astuccio", "/supporti", "/mindmap"];
+   const pages = ["/", "/welcome", "/astuccio", "/supporti", "/mindmap"];
    // (This one already correct)

    test("skip link becomes visible on focus", async ({ page }) => {
-     await page.goto("/");
+     await page.goto("/");
    // (These are already unlocalized - correct)
```

Actually, review shows a11y-new-features.spec.ts is **mostly correct** - uses `/welcome` not `/it/welcome`. Only issue is missing fixture import.

### EDIT 13: a11y-quick-panel-advanced.spec.ts - Import locale fixtures

**Location:** Line 12 (replace import)

```diff
- import { test, expect } from "@playwright/test";

+ import { test, expect } from "./fixtures";
+
+ test.use({ storageState: undefined });
```

---

## Summary of Changes by File

| File                                  | Changes                                                                                                                                     | Priority   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **accessibility.spec.ts**             | 1. Import fixtures; 2. Add `setupTosModalBypass()`; 3. Replace 8 `beforeEach` blocks; 4. Replace 12 `/it/welcome` → `/welcome`              | **HIGH**   |
| **a11y-data-testid.spec.ts**          | 1. Import fixtures; 2. Add `test.use({ storageState: undefined })`                                                                          | **MEDIUM** |
| **a11y-floating-button.spec.ts**      | 1. Import fixtures; 2. Add `test.use({ storageState: undefined })`                                                                          | **MEDIUM** |
| **a11y-quick-panel.spec.ts**          | 1. Import fixtures; 2. Add `test.use({ storageState: undefined })`                                                                          | **MEDIUM** |
| **a11y-skip-link.spec.ts**            | 1. Import fixtures; 2. Add `setupTosModalBypass()` function; 3. Add `beforeEach` with setup; 4. Add `test.use({ storageState: undefined })` | **MEDIUM** |
| **a11y-new-features.spec.ts**         | 1. Import fixtures; 2. Add `test.use({ storageState: undefined })`                                                                          | **MEDIUM** |
| **a11y-quick-panel-advanced.spec.ts** | 1. Import fixtures; 2. Add `test.use({ storageState: undefined })`                                                                          | **MEDIUM** |
| **a11y-locales.spec.ts**              | ✅ Already good                                                                                                                             | **NONE**   |

---

## Benefits of These Edits

✅ **Consistency**: All a11y specs use same patterns as a11y-locales.spec.ts  
✅ **DRY**: Eliminate TOS modal bypass duplication (8→1)  
✅ **Locale Coverage**: Enable future tests to run across all locales using `testAllLocales()`  
✅ **Maintainability**: Path management centralized in fixtures  
✅ **Correctness**: Unlocalized paths properly bypass locale redirects

---

## Implementation Order

1. **accessibility.spec.ts** (most changes, highest impact)
2. **a11y-skip-link.spec.ts** (needs function definition)
3. **a11y-data-testid.spec.ts**
4. **a11y-floating-button.spec.ts**
5. **a11y-quick-panel.spec.ts**
6. **a11y-quick-panel-advanced.spec.ts**
7. **a11y-new-features.spec.ts** (already mostly correct)
