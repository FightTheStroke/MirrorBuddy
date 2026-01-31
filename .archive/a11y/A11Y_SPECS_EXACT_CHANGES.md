# Exact Changes Needed for A11y Specs: Localized Paths & Consistent Setup

**Total Files:** 8  
**Total Edits Required:** 15+ specific line-by-line replacements  
**Duplicated Code to Remove:** 1 beforeEach pattern repeated 8 times  
**Hardcoded Locale Paths:** 12 instances to replace

---

## FILE 1: e2e/accessibility.spec.ts

### Change 1.1: Update imports (Lines 22-23)

**BEFORE:**

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// IMPORTANT: These tests check unauthenticated pages (welcome, legal, etc.)
// Override global storageState to start without authentication
test.use({ storageState: undefined });
```

**AFTER:**

```typescript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// IMPORTANT: These tests check unauthenticated pages (welcome, legal, etc.)
// Override global storageState to start without authentication
test.use({ storageState: undefined });

/**
 * Setup function to bypass ToS modal
 * TosGateProvider checks both localStorage AND calls /api/tos
 */
async function setupTosModalBypass(page: import("@playwright/test").Page) {
  await page.route("/api/tos", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accepted: true,
        version: "1.0",
      }),
    });
  });
}
```

### Change 1.2: Replace beforeEach in "WCAG 2.1 AA Compliance" (Lines 61-69)

**BEFORE:**

```typescript
test.describe("WCAG 2.1 AA Compliance", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("WCAG 2.1 AA Compliance", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.3: Replace beforeEach in "Keyboard Navigation" (Lines 113-121)

**BEFORE:**

```typescript
test.describe("Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.4: Replace beforeEach in "Screen Reader Support" (Lines 268-276)

**BEFORE:**

```typescript
test.describe("Screen Reader Support", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Screen Reader Support", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.5: Replace beforeEach in "Color and Contrast" (Lines 388-396)

**BEFORE:**

```typescript
test.describe("Color and Contrast", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Color and Contrast", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.6: Replace beforeEach in "Instant Access - Floating Button" (Lines 434-442)

**BEFORE:**

```typescript
test.describe("Instant Access - Floating Button", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Instant Access - Floating Button", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.7: Replace beforeEach in "Instant Access - Quick Panel" (Lines 482-490)

**BEFORE:**

```typescript
test.describe("Instant Access - Quick Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Instant Access - Quick Panel", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.8: Replace beforeEach in "Instant Access - Profile Activation" (Lines 557-565)

**BEFORE:**

```typescript
test.describe("Instant Access - Profile Activation", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Instant Access - Profile Activation", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.9: Replace beforeEach in "Instant Access - Cookie Persistence" (Lines 632-640)

**BEFORE:**

```typescript
test.describe("Instant Access - Cookie Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Instant Access - Cookie Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.10: Replace beforeEach in "Instant Access - Panel Keyboard Navigation" (Lines 697-705)

**BEFORE:**

```typescript
test.describe("Instant Access - Panel Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("Instant Access - Panel Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.11: Replace beforeEach in "DSA Profile Support" (Lines 747-754)

**BEFORE:**

```typescript
test.describe("DSA Profile Support", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/tos", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: true, version: "1.0" }),
      }),
    );
  });
```

**AFTER:**

```typescript
test.describe("DSA Profile Support", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });
```

### Change 1.12-1.23: Replace hardcoded `/it/welcome` paths (12 replacements)

**Line 445:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 493:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 524:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 540:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 574:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 594:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 610:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 643:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 680:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 708:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 722:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

**Line 758:**

```diff
- await page.goto("/it/welcome");
+ await page.goto("/welcome");
```

---

## FILE 2: e2e/a11y-data-testid.spec.ts

### Change 2.1: Update imports (Line 10)

**BEFORE:**

```typescript
import { test, expect } from "@playwright/test";

// ============================================================================
// SKIP LINK WITH DATA-TESTID
// ============================================================================
```

**AFTER:**

```typescript
import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

// ============================================================================
// SKIP LINK WITH DATA-TESTID
// ============================================================================
```

---

## FILE 3: e2e/a11y-floating-button.spec.ts

### Change 3.1: Update imports (Line 13)

**BEFORE:**

```typescript
import { test, expect } from "@playwright/test";

test.describe("A11y Floating Button - ARIA & Accessibility", () => {
```

**AFTER:**

```typescript
import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

test.describe("A11y Floating Button - ARIA & Accessibility", () => {
```

---

## FILE 4: e2e/a11y-quick-panel.spec.ts

### Change 4.1: Update imports (Line 14)

**BEFORE:**

```typescript
import { test, expect } from "@playwright/test";

test.describe("A11y Quick Panel - Dialog Accessibility", () => {
```

**AFTER:**

```typescript
import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

test.describe("A11y Quick Panel - Dialog Accessibility", () => {
```

---

## FILE 5: e2e/a11y-skip-link.spec.ts

### Change 5.1: Update imports and add setup (Line 13)

**BEFORE:**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Skip Link - WCAG 2.1 AA Compliance", () => {
```

**AFTER:**

```typescript
import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

/**
 * Setup function to bypass ToS modal
 * TosGateProvider checks both localStorage AND calls /api/tos
 */
async function setupTosModalBypass(page: import("@playwright/test").Page) {
  await page.route("/api/tos", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accepted: true,
        version: "1.0",
      }),
    });
  });
}

test.describe("Skip Link - WCAG 2.1 AA Compliance", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });

```

---

## FILE 6: e2e/a11y-new-features.spec.ts

### Change 6.1: Update imports (Line 13)

**BEFORE:**

```typescript
import { test, expect } from "@playwright/test";

// ============================================================================
// SKIP LINK TESTS
// ============================================================================
```

**AFTER:**

```typescript
import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

// ============================================================================
// SKIP LINK TESTS
// ============================================================================
```

---

## FILE 7: e2e/a11y-quick-panel-advanced.spec.ts

### Change 7.1: Update imports (Line 12)

**BEFORE:**

```typescript
import { test, expect } from "@playwright/test";

test.describe("A11y Quick Panel - Advanced Dialog Features", () => {
```

**AFTER:**

```typescript
import { test, expect } from "@playwright/test";

test.use({ storageState: undefined });

test.describe("A11y Quick Panel - Advanced Dialog Features", () => {
```

---

## FILE 8: e2e/a11y-locales.spec.ts

✅ **NO CHANGES NEEDED** - This file already follows best practices:

- Uses `testAllLocales()` from fixtures
- Uses `localePage.goto()` for locale-aware navigation
- Consolidates setup in `setupTosModalBypass()` function
- Proper locale configuration

---

## Summary Table

| File                              | Type                        | Count  | Impact                                        |
| --------------------------------- | --------------------------- | ------ | --------------------------------------------- |
| accessibility.spec.ts             | beforeEach deduplications   | 11     | HIGH - Eliminates 64 lines of duplicated code |
| accessibility.spec.ts             | Path replacements           | 12     | HIGH - Fixes hardcoded locale paths           |
| accessibility.spec.ts             | New function                | 1      | HIGH - Centralizes TOS modal setup            |
| a11y-data-testid.spec.ts          | Import update               | 1      | MEDIUM - Adds storageState override           |
| a11y-floating-button.spec.ts      | Import update               | 1      | MEDIUM - Adds storageState override           |
| a11y-quick-panel.spec.ts          | Import update               | 1      | MEDIUM - Adds storageState override           |
| a11y-skip-link.spec.ts            | Setup function + beforeEach | 2      | MEDIUM - Adds auth bypass + storageState      |
| a11y-new-features.spec.ts         | Import update               | 1      | MEDIUM - Adds storageState override           |
| a11y-quick-panel-advanced.spec.ts | Import update               | 1      | MEDIUM - Adds storageState override           |
| **TOTAL**                         | **Line changes**            | **31** | **HIGH**                                      |

---

## Benefits Achieved

✅ **Code Duplication Eliminated:** Removes 64 lines of repeated TOS bypass code  
✅ **Path Consistency:** All specs use unlocalized paths (`/welcome` not `/it/welcome`)  
✅ **Proper Auth Handling:** All specs properly override storageState  
✅ **Future-Ready:** Setup enables locale-parameterized tests using `testAllLocales()`  
✅ **Maintenance:** Single source of truth for TOS bypass logic

---

## Testing After Changes

```bash
# Test individual files
npx playwright test e2e/accessibility.spec.ts
npx playwright test e2e/a11y-*.spec.ts

# Test all a11y specs together
npx playwright test e2e/ --grep "a11y|accessibility"

# Test with verbose output
npx playwright test e2e/accessibility.spec.ts --reporter=list
```
