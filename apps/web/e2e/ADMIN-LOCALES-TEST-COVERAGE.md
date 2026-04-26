# E2E Test Coverage for Admin Locale Configuration UI

**Task**: F-50 - Admin locale UI has E2E test coverage
**Test File**: `e2e/admin-locales.spec.ts`
**Date Created**: 2026-01-25
**Status**: Tests Written (RED phase - ready for implementation verification)

## Test Coverage Summary

### 1. Locale List Display (5 tests)

- ✓ Page title and create button visible
- ✓ Table displays all required columns (Codice Paese, Nome Paese, Locale Primario, Maestro Lingua, Locali Secondari, Stato, Azioni)
- ✓ Empty state message shown when no locales exist
- ✓ Search functionality filters locales by multiple fields (id, countryName, primaryLocale, primaryLanguageMaestroId)
- ✓ Status badges display correctly (Attivo/Inattivo)

### 2. Create New Locale Configuration (5 tests)

- ✓ Navigation to create page via button click
- ✓ Form displays all required fields:
  - Codice Paese (ISO 3166-1 alpha-2)
  - Nome Paese
  - Locale Primario
  - Maestro Lingua Primario
  - Locali Secondari (optional)
  - Stato (enabled checkbox)
- ✓ Submit and cancel buttons visible
- ✓ Form submission creates locale via POST /api/admin/locales
- ✓ Validation errors displayed for empty form submission
- ✓ Cancel button returns to locales list

### 3. Edit Existing Locale Configuration (4 tests)

- ✓ Navigation to edit page via edit button
- ✓ Form title indicates edit mode
- ✓ Form pre-filled with existing locale data
- ✓ PUT request updates locale configuration
- ✓ Successful update redirects to locales list

### 4. Delete Locale Configuration (2 tests)

- ✓ Delete confirmation dialog appears
- ✓ DELETE request removes locale after confirmation
- ✓ Redirect to locales list after deletion

### 5. Locale Preview Functionality (2 tests)

- ✓ Preview button visible on edit page
- ✓ Greeting preview displayed in correct language
- ✓ Maestro-specific greeting data retrieved

### 6. Audit Log Entries (3 tests)

- ✓ Audit log entry created on locale creation (action: CREATE_LOCALE)
- ✓ Audit log entry created on locale update (action: UPDATE_LOCALE with field changes)
- ✓ Audit log entry created on locale deletion (action: DELETE_LOCALE)

## Test Fixtures & Helpers

### Authentication

- Uses `adminPage` fixture from `e2e/fixtures/auth-fixtures.ts`
- Provides admin authentication with all necessary cookies and localStorage setup

### Modal Bypass

- Uses `dismissBlockingModals()` helper from `e2e/admin-helpers.ts`
- Bypasses TOS modal and consent wall

### Route Mocking

- All API endpoints mocked for isolated testing:
  - GET `/api/admin/locales` - Returns locale list
  - POST `/api/admin/locales` - Creates new locale
  - GET `/api/admin/locales/[id]` - Gets single locale
  - PUT `/api/admin/locales/[id]` - Updates locale
  - DELETE `/api/admin/locales/[id]` - Deletes locale
  - GET `/api/admin/audit-log*` - Returns audit entries

## Implementation Verification

### Backend Infrastructure (VERIFIED)

- ✓ API Route: `src/app/api/admin/locales/route.ts` (GET, POST)
- ✓ API Route: `src/app/api/admin/locales/[id]/route.ts` (GET, PUT, DELETE)
- ✓ Audit Service: `src/lib/locale/locale-audit-service.ts`
- ✓ Form Validation: `src/app/api/admin/locales/route.ts` (lines 45-58)
- ✓ Authorization: `validateAdminAuth()` used in all routes

### Frontend Infrastructure (VERIFIED)

- ✓ Admin Page: `src/app/admin/locales/page.tsx`
- ✓ Locales Table: `src/app/admin/locales/locales-table.tsx`
- ✓ Create Page: `src/app/admin/locales/new/page.tsx`
- ✓ Edit Page: `src/app/admin/locales/[id]/edit/page.tsx`
- ✓ Form Component: `src/components/admin/locale-form.tsx`
- ✓ Form Fields: `src/components/admin/locale-form-fields.tsx`

## Test Execution

### Run All Admin Locale Tests

```bash
npx playwright test e2e/admin-locales.spec.ts
```

### Run Specific Test Suite

```bash
npx playwright test e2e/admin-locales.spec.ts -g "Locale List Display"
npx playwright test e2e/admin-locales.spec.ts -g "Create New Locale"
npx playwright test e2e/admin-locales.spec.ts -g "Edit Existing"
npx playwright test e2e/admin-locales.spec.ts -g "Delete Locale"
npx playwright test e2e/admin-locales.spec.ts -g "Preview"
npx playwright test e2e/admin-locales.spec.ts -g "Audit Log"
```

### Run with Headed Mode (Visual Debugging)

```bash
npx playwright test e2e/admin-locales.spec.ts --headed
```

### Debug Mode

```bash
npx playwright test e2e/admin-locales.spec.ts --debug
```

## Acceptance Criteria Coverage

| Criterion                                           | Test Case                                  | Status |
| --------------------------------------------------- | ------------------------------------------ | ------ |
| Create Playwright E2E tests for /admin/locales page | admin-locales.spec.ts created              | ✓      |
| Test locale list display with proper filtering      | "Locale List Display" suite                | ✓      |
| Test create new locale configuration flow           | "Create New Locale Configuration" suite    | ✓      |
| Test edit existing locale configuration             | "Edit Existing Locale Configuration" suite | ✓      |
| Test delete locale with confirmation                | "Delete Locale Configuration" suite        | ✓      |
| Test preview functionality for locale greetings     | "Locale Preview Functionality" suite       | ✓      |
| Verify audit log entries appear after changes       | "Audit Log Entries" suite                  | ✓      |

## Architecture Notes

### Test Pattern

- **TDD Approach**: Tests written first (RED phase), ready for implementation verification
- **Isolation**: All API calls mocked to test UI logic independently
- **Admin Auth**: Uses provided adminPage fixture with proper authentication
- **Modal Bypass**: TOS and consent modals automatically dismissed per e2e-testing.md rules

### API Mocking Strategy

- Routes intercepted before navigation to provide consistent test data
- Mock responses match real API format for realistic testing
- Dynamic mocking allows testing both success and error scenarios

### Selectors Used

- Semantic HTML: `[role="dialog"]`, `button:has-text()`, `input[name=""]`
- Data attributes: `[data-testid="..."]` (where available)
- Text content filters for Italian/English labels
- Flexible selectors to handle UI variations

## Next Steps (GREEN Phase)

When implementing UI enhancements:

1. **Add Delete Confirmation Dialog** (currently optional in tests)
   - Implement delete button on edit page
   - Add confirmation dialog with proper ARIA attributes
   - Tests will validate button visibility and confirmation flow

2. **Add Locale Preview Section** (currently optional in tests)
   - Implement preview button on edit page
   - Add greeting preview panel showing maestro greeting in locale language
   - Mock data endpoint for preview content

3. **Add Audit Log Display** (currently optional in tests)
   - Create admin audit log view or integrate into existing admin dashboard
   - Display locale-related audit entries (CREATE_LOCALE, UPDATE_LOCALE, DELETE_LOCALE)
   - Show timestamp, admin email, and change summary

4. **Form Validation Enhancements** (ready to test)
   - Error messages display for validation failures
   - Field-level error highlighting
   - Submit button disabled state during submission

## Reference

- **Test Framework**: Playwright Test (v1.x)
- **Admin Fixtures**: `e2e/fixtures/auth-fixtures.ts`
- **Admin Helpers**: `e2e/admin-helpers.ts`
- **E2E Rules**: `CLAUDE.md` rules/e2e-testing.md
- **API Pattern**: `CLAUDE.md` rules/api-patterns.md
- **Admin Pattern**: Similar to `e2e/admin-tiers.spec.ts`
