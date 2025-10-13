# Code Coverage Monitoring

This document describes the code coverage setup and monitoring process for MirrorBuddy.

## Coverage Goal

**Target: 80% line coverage**

We aim to maintain at least 80% line coverage across the codebase to ensure robust testing and code quality.

## Running Tests with Coverage

### Option 1: Automated Script (Recommended)

Run the automated coverage script:

```bash
./scripts/run-tests-with-coverage.sh
```

This script will:
- Clean previous build artifacts
- Run the full test suite with coverage enabled
- Generate coverage reports
- Display coverage summary
- Compare against the 80% target

### Option 2: Manual Xcode

1. Open `MirrorBuddy.xcodeproj` in Xcode
2. Select the **MirrorBuddy** scheme
3. Go to **Product** → **Scheme** → **Edit Scheme** (⌘<)
4. Select **Test** in the left sidebar
5. Go to **Options** tab
6. Check **Code Coverage** checkbox
7. Under **Code Coverage**, select **Some Targets** and choose:
   - ✅ MirrorBuddy (main app target)
8. Click **Close**
9. Run tests: **Product** → **Test** (⌘U)

### Option 3: Command Line

```bash
xcodebuild test \
    -scheme MirrorBuddy \
    -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=latest' \
    -derivedDataPath ./DerivedData \
    -enableCodeCoverage YES
```

## Viewing Coverage Reports

### In Xcode

1. Run tests with coverage enabled
2. Open **Report Navigator** (⌘9)
3. Select the latest test run
4. Click the **Coverage** tab
5. View coverage percentages for each file and function

### Command Line Reports

After running tests with the automated script, view generated reports:

```bash
# View text report
cat coverage-reports/coverage.txt

# View JSON report (for automation)
cat coverage-reports/coverage.json

# View HTML report (if xcpretty installed)
open DerivedData/test-report.html
```

### Coverage Badge

The automated script generates a coverage badge SVG:

```bash
coverage-reports/badge.svg
```

Colors:
- 🟢 Green (≥80%): Target met
- 🟡 Yellow (60-79%): Below target
- 🔴 Red (<60%): Critical

## Coverage Analysis

### Generate Coverage Report

To generate coverage reports without running tests again:

```bash
./scripts/generate-coverage-report.sh
```

This extracts coverage data from the most recent test run and generates:
- JSON report for CI/CD integration
- Text report for human reading
- Coverage badge SVG
- Summary with target comparison

### Understanding Coverage Metrics

**Line Coverage**: Percentage of code lines executed during tests

```
Total Lines: 1000
Executed Lines: 850
Coverage: 85%
```

**Function Coverage**: Percentage of functions called during tests

**Branch Coverage**: Percentage of conditional branches executed

### Coverage by Component

Key areas to maintain high coverage:

| Component | Target | Priority |
|-----------|--------|----------|
| Models | 90%+ | Critical |
| API Clients | 85%+ | High |
| Processing Pipeline | 80%+ | High |
| View Models | 80%+ | High |
| UI Views | 60%+ | Medium |
| Services | 85%+ | High |

## Improving Coverage

### Identify Gaps

In Xcode Coverage Report:
1. Sort by **Coverage %** (ascending)
2. Focus on files with <80% coverage
3. Look for red (uncovered) lines

### Add Tests

For uncovered code:

```swift
// Example: Untested error handling
func processData() throws {
    guard isValid else {
        throw ProcessingError.invalid  // ⚠️ Not covered
    }
    // ... processing logic
}

// Add test:
func testProcessDataThrowsOnInvalid() throws {
    let processor = DataProcessor()
    processor.isValid = false

    XCTAssertThrowsError(try processor.processData()) { error in
        XCTAssertEqual(error as? ProcessingError, .invalid)
    }
}
```

### Test Categories

Ensure tests cover:

1. **Happy Path**: Normal, expected behavior
2. **Error Cases**: All error conditions
3. **Edge Cases**: Boundary conditions
4. **Integration**: Component interactions

## CI/CD Integration

### GitHub Actions (Future)

```yaml
- name: Run Tests with Coverage
  run: ./scripts/run-tests-with-coverage.sh

- name: Upload Coverage Report
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage-reports/coverage.json
    fail_ci_if_error: true
```

### Quality Gate

Tests fail if coverage drops below 80%:

```bash
./scripts/generate-coverage-report.sh
# Exit code 1 if below target
```

## Coverage Tools

### Required

- **Xcode**: Built-in coverage support (xccov)
- **xcodebuild**: Command-line test runner

### Optional

- **xcpretty**: Pretty test output
  ```bash
  gem install xcpretty
  ```

- **Python 3**: Coverage analysis and badge generation
  ```bash
  brew install python3
  ```

## Best Practices

### Do

✅ Run tests with coverage before committing
✅ Review coverage report after adding features
✅ Test error handling paths
✅ Test edge cases and boundary conditions
✅ Aim for 80%+ coverage on new code

### Don't

❌ Chase 100% coverage (diminishing returns)
❌ Write tests just for coverage metrics
❌ Skip testing complex logic
❌ Ignore coverage trends over time

## Monitoring Coverage Trends

### Check Coverage Regularly

```bash
# Quick coverage check
./scripts/generate-coverage-report.sh | grep "Overall Line Coverage"
```

### Track Over Time

Keep a coverage log:

```bash
echo "$(date): $(./scripts/generate-coverage-report.sh | grep 'Overall')" >> coverage-history.txt
```

### Review in Pull Requests

Before merging:
1. Run full test suite with coverage
2. Ensure no coverage regression
3. New code should have ≥80% coverage

## Troubleshooting

### No Coverage Data

**Problem**: Coverage report shows 0%

**Solution**:
- Enable code coverage in scheme settings
- Use `-enableCodeCoverage YES` flag
- Check DerivedData is not corrupted

### Low Coverage on UI Code

**Problem**: SwiftUI views have low coverage

**Solution**:
- Extract logic to ViewModels (testable)
- Use ViewInspector library for view testing
- Focus coverage on business logic

### Flaky Coverage Numbers

**Problem**: Coverage varies between runs

**Solution**:
- Clean build folder between runs
- Use fresh DerivedData directory
- Ensure tests are deterministic

## References

- [Apple's Code Coverage Documentation](https://developer.apple.com/documentation/xcode/code-coverage)
- [xccov Documentation](https://developer.apple.com/documentation/xcode/gathering-code-coverage-metrics)
- [XCTest Framework](https://developer.apple.com/documentation/xctest)

## Maintenance

**Scripts Location**: `scripts/`
- `run-tests-with-coverage.sh`: Main test + coverage script
- `generate-coverage-report.sh`: Report generation

**Reports Location**: `coverage-reports/`
- `coverage.json`: Machine-readable coverage data
- `coverage.txt`: Human-readable report
- `badge.svg`: Visual coverage indicator

**Last Updated**: October 2025
