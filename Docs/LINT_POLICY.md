# SwiftLint Policy

## Current Status (2025-10-18)
- **Baseline violations**: 370 (208 warnings + 162 errors)
- **Affected files**: 75 Swift files
- **Policy**: Zero tolerance for NEW violations

## Top Violation Types
1. `force_unwrapping` (119) - Forced unwraps without nil checks
2. `identifier_name` (54) - Non-conforming variable/function names
3. `non_optional_string_data_conversion` (32) - Unsafe String/Data conversions
4. `file_length` (23) - Files exceeding length limits
5. `type_body_length` (21) - Types exceeding body length limits

## Enforcement Strategy
### Pre-Commit Hook
- Prevents commits that increase violation count above 370
- Run manually: `.git/hooks/pre-commit`

### CI Integration (TODO - Task 118.3)
- Add SwiftLint check to GitHub Actions/CI pipeline
- Fail builds on new violations

## Developer Workflow
```bash
# Check violations before commit
swiftlint lint

# Auto-fix safe violations (use with caution!)
swiftlint --fix --format

# Run locally
swiftlint lint --path MirrorBuddy/
```

## Technical Debt Plan
Existing violations will be addressed incrementally:
- Priority 1: `force_unwrapping`, `force_try`, `force_cast` (safety issues)
- Priority 2: `file_length`, `type_body_length`, `function_body_length` (maintainability)
- Priority 3: `identifier_name`, formatting issues (style)

## Configuration
See `.swiftlint.yml` for current rules and exclusions.
