# ADR 0104: i18n Namespace Wrapper Key Convention

## Status

Accepted

## Date

2026-01-31

## Context

During Plan 109 (Push-CI-Knowledge), we discovered a **critical bug** in the i18n message loading system that caused **4 cross-namespace key collisions**, resulting in **84 ESLint warnings** and **37+ E2E test failures**.

### The Bug: Object.assign Collision

The original implementation in `src/i18n/request.ts` used `Object.assign()` to merge namespace files:

```typescript
// BEFORE - BROKEN
const messages: Messages = {};
for (const ns of namespaces) {
  const nsData = await import(`@/messages/${locale}/${ns}.json`);
  Object.assign(messages, nsData); // ❌ Direct merge causes collisions
}
```

This caused **last-write-wins collisions** when multiple JSON files contained the same top-level key:

| Key               | Original Owner  | Clobbered By    | Impact                          |
| ----------------- | --------------- | --------------- | ------------------------------- |
| `compliance`      | compliance.json | welcome.json    | Compliance page broken          |
| `tools`           | tools.json      | education.json  | Tools list showed wrong content |
| `parentDashboard` | admin.json      | education.json  | Parent dashboard inaccessible   |
| `navigation`      | home.json       | navigation.json | Nav menu inconsistent           |

### Why This Happened

**JSON files had no wrapper key** - content was directly at root level:

```json
// messages/it/compliance.json - BEFORE
{
  "title": "Trasparenza IA",
  "description": "...",
  "compliance": { ... }  // ❌ Same key as filename - collision risk
}
```

When `Object.assign()` merged all namespaces, any duplicate top-level key from a later namespace would **silently overwrite** the earlier one.

### Impact

- **84 ESLint warnings** - `no-missing-i18n-keys` rule couldn't find expected keys
- **37+ E2E test failures** - Pages showed wrong/missing translations
- **Silent production bug** - No runtime errors, just broken UI
- **Hard to debug** - Collision only visible by comparing JSON files manually

## Decision

**All i18n JSON files MUST use a single wrapper key matching the filename.**

### Rules

1. **JSON Structure**: All content wrapped under key matching namespace name
2. **Loading Logic**: Namespace-scoped loading with automatic unwrapping
3. **ESLint Validation**: Rule validates against unwrapped content structure

### Implementation

#### 1. JSON File Convention

Every namespace file wraps all content under a single key matching the filename:

```json
// messages/it/compliance.json - AFTER
{
  "compliance": {
    "title": "Trasparenza IA",
    "description": "...",
    "sections": { ... }
  }
}
```

**Pattern**: `{ "[namespace]": { ...all content... } }`

#### 2. Loading Logic with Unwrapping

Updated `src/i18n/request.ts` to use namespace-scoped loading:

```typescript
// AFTER - FIXED
const messages: Messages = {};
for (const ns of namespaces) {
  const nsData = await import(`@/messages/${locale}/${ns}.json`);
  messages[ns] = (nsData as Record<string, any>)[ns] || nsData;
}
```

**Logic**:

- If JSON has wrapper key (e.g., `nsData.compliance`), unwrap it: `messages.compliance = nsData.compliance`
- If no wrapper key (legacy), use as-is: `messages[ns] = nsData`
- Result: Each namespace isolated in `messages[ns]`, preventing collisions

#### 3. ESLint Rule Adaptation

Updated `eslint-local-rules/no-missing-i18n-keys.js` to validate against unwrapped content:

```javascript
// Unwrap namespace if present
const namespaceContent =
  messagesData[namespace]?.[namespace] || messagesData[namespace];
```

This allows the rule to check keys against the actual nested structure while maintaining compatibility with both formats during migration.

### Migration Process (Plan 109)

1. **Restructured 17 namespace files** - All content wrapped under matching key
2. **Updated loading logic** - Added unwrapping in `request.ts`
3. **Fixed ESLint rule** - Validates against unwrapped content
4. **Verified fix** - 84 warnings eliminated, 37+ E2E tests passing

| Namespace     | Lines Changed | Wrapper Key Added |
| ------------- | ------------- | ----------------- |
| compliance    | 84            | ✓                 |
| tools         | 156           | ✓                 |
| admin         | 124           | ✓                 |
| navigation    | 45            | ✓                 |
| welcome       | 67            | ✓                 |
| education     | 198           | ✓                 |
| chat          | 89            | ✓                 |
| settings      | 112           | ✓                 |
| auth          | 56            | ✓                 |
| common        | 134           | ✓                 |
| errors        | 78            | ✓                 |
| metadata      | 34            | ✓                 |
| home          | 91            | ✓                 |
| landing       | 102           | ✓                 |
| tier          | 67            | ✓                 |
| wizard        | 45            | ✓                 |
| accessibility | 38            | ✓                 |

## Consequences

### Positive

- **Zero collisions** - Each namespace isolated, impossible to overwrite
- **Type safety** - Structure matches `Messages` type in next-intl
- **Debugging** - Clear ownership: `messages.compliance.title` belongs to compliance.json
- **ESLint accuracy** - Rule validates correct key paths
- **Future-proof** - New namespaces follow same pattern automatically
- **All 84 ESLint warnings eliminated**
- **All 37+ E2E failures resolved**

### Negative

- **Deeper nesting** - Keys accessed as `t("compliance.title")` instead of `t("title")`
  - **Mitigation**: Namespace prefix already required per ADR 0082, no change to component code
- **File size** - Extra wrapper key adds 2 lines per file (minimal)
- **Migration effort** - 17 files restructured (one-time, completed in Plan 109)

### Developer Experience

**BEFORE** (collision risk):

```typescript
// Component code
const t = useTranslations('compliance');
t('title'); // ❓ Could return wrong value if key collision exists

// JSON - ambiguous ownership
{
  "title": "...",
  "compliance": { ... }
}
```

**AFTER** (collision-proof):

```typescript
// Component code - UNCHANGED
const t = useTranslations('compliance');
t('title'); // ✓ Always returns compliance.title

// JSON - clear ownership
{
  "compliance": {
    "title": "...",
    "sections": { ... }
  }
}
```

## Enforcement

### 1. File Structure Convention

Every namespace JSON file MUST follow this pattern:

```json
{
  "[namespace-name]": {
    // All content here
  }
}
```

**Validation**: ESLint rule `no-missing-i18n-keys` expects this structure.

### 2. Loading Logic

`src/i18n/request.ts` automatically unwraps namespace keys during loading. No component code changes required.

### 3. Code Review

PRs adding new namespaces must include wrapper key. Check via:

```bash
# Verify namespace file has wrapper key
jq 'keys | length == 1' messages/it/[namespace].json
# Should return: true
```

## References

- Plan 109: Push-CI-Knowledge (collision bug discovery & fix)
- ADR 0082: i18n Namespace Structure
- ADR 0101: i18n Translation Key Naming Convention (camelCase)
- next-intl documentation: https://next-intl-docs.vercel.app/
- File: `src/i18n/request.ts` (loading logic)
- File: `eslint-local-rules/no-missing-i18n-keys.js` (validation)
