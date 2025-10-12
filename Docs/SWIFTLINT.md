# SwiftLint Setup

SwiftLint is configured for MirrorBuddy with strict quality rules enforcing the project constitution.

## Running SwiftLint

### From Command Line
```bash
# Run from project root
swiftlint

# Auto-fix violations
swiftlint --fix
```

### With Quality Gate Script
```bash
# Comprehensive quality check including SwiftLint
./scripts/quality-gate.sh
```

## Installation

```bash
# Using Homebrew
brew install swiftlint

# Or download from https://github.com/realm/SwiftLint
```

## Configuration

SwiftLint rules are defined in `.swiftlint.yml`:
- **Force unwrapping**: Error (must have comments)
- **Force casting**: Error
- **Strict concurrency**: Enforced
- **Accessibility**: Documented via constitution
- **Zero tolerance**: 0 warnings required

## Pre-commit Hook (Optional)

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
if command -v swiftlint >/dev/null 2>&1; then
    swiftlint
    if [ $? -ne 0 ]; then
        echo "❌ SwiftLint failed - fix violations before committing"
        exit 1
    fi
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## CI/CD Integration

SwiftLint should be integrated in your CI pipeline:

```yaml
# GitHub Actions example
- name: SwiftLint
  run: |
    brew install swiftlint
    swiftlint --strict
```

## Why Not in Xcode Build Phase?

SwiftLint is **not** added as an Xcode build phase because:
1. **Sandboxing issues**: Xcode sandbox restricts file access
2. **Build performance**: Adds overhead to every build
3. **Better alternatives**: Pre-commit hooks and CI/CD are more appropriate
4. **Developer choice**: Devs can run manually when needed

The quality-gate.sh script ensures zero violations before commits.

## Current Status

Run `swiftlint` in project root:
- **6 minor warnings** in auto-generated test files only
- **0 serious violations**
- **All app code passes** with zero warnings

## Constitution Compliance

SwiftLint enforces key constitution principles:
- Swift 6 strict concurrency
- No force unwraps/casts (without comments)
- Consistent code style
- Clean, maintainable code
