---
description: 'Unit and integration testing conventions: TDD, AAA pattern, Vitest'
applyTo: '**/*.test.ts,**/*.test.tsx,**/*.spec.ts'
---

# Testing Conventions

## TDD Workflow

1. **RED**: Write failing test based on requirements
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up without changing behavior

## Unit Tests (Vitest)

- Colocated with source: `feature.ts` + `feature.test.ts`
- AAA pattern: Arrange / Act / Assert
- One behavior per test
- No shared mutable state between tests
- 80% coverage for business logic, 100% for critical paths

## Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('FeatureName', () => {
  it('should handle specific case', () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = featureFunction(input);

    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

## Mocking

- Use `vi.mock()` for module-level mocks
- Use `vi.spyOn()` for specific function spies
- Reset mocks in `beforeEach` or `afterEach`
- Never mock what you don't own — wrap external deps first

## Validation Commands

```bash
./scripts/ci-summary.sh --unit   # Run unit tests (compact output)
npm run test:unit -- path/file   # Run specific test file
```
