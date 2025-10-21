# Repository Guidelines

## Project Structure & Module Organization
The SwiftUI app lives in `MirrorBuddy/`: `App/` bootstraps scenes, `Core/` hosts shared services (data, networking, speech), and `Features/` houses dashboards, voice flows, and other user-facing modules. Shared assets (fonts, colors, localized strings) reside in `MirrorBuddy/Resources/`. Tests are split between `MirrorBuddyTests/` for unit, integration, and performance coverage and `MirrorBuddyUITests/` for UI automation. Documentation and playbooks stay in `Docs/`, with automation helpers in `scripts/`.

## Build, Test, and Development Commands
- `xcodebuild build -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 16'` verifies a clean compile for the default target.
- `./scripts/quality-gate.sh` runs the full pre-merge gauntlet (build, SwiftLint, tests, coverage sanity).
- `./scripts/run-tests-with-coverage.sh` executes the XCTest suite with coverage data and regenerates the HTML report in `DerivedData/`.
- `swiftlint` (from the repo root) enforces the zero-warning lint policy defined in `.swiftlint.yml`; install with Homebrew if needed.

## Coding Style & Naming Conventions
SwiftLint is authoritative—do not merge with warnings or disabled rules unless explicitly approved in `Docs/LINT_POLICY.md`. Follow standard Swift casing (`UpperCamelCase` types, `lowerCamelCase` members) and keep files aligned with their primary type name. Prefer four-space indentation (Xcode default), explicit access control, and documented reasoning for any `try?` or optional handling. Force unwraps and casts are blocked; if unavoidable, annotate with context and constitution justification.

## Testing Guidelines
The project relies on XCTest for unit, integration, performance, and UI coverage. Aim for ≥80 % line coverage (quality gate threshold) and keep new tests alongside the code under test—e.g., `MirrorBuddyTests/VoiceConversationViewModelTests.swift` for view models and `MirrorBuddyUITests/` for user journeys. Name suites with the `FeatureNameTests` pattern. Run targeted suites with `xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:<TestBundle/TestClass>`. Regenerate coverage reports before submitting PRs and summarize failures in the PR thread.

## Commit & Pull Request Guidelines
Adopt the conventional commit prefixes seen in history (`feat:`, `fix:`, `chore:`, `docs:`) and keep subjects imperative. Reference Task Master IDs or GitHub issues when available. Before a PR, run `./scripts/quality-gate.sh`, confirm lint/test status, and record results in the PR body. Provide context, link relevant `Docs/` specs, attach simulator screenshots for UI updates, and log regressions or follow-ups against `Docs/QA_CHECKLIST.md`.

## Security & Configuration Tips
Never commit credentials—copy `Config/APIKeys.swift.example` to `Config/APIKeys.swift` locally and load secrets via environment variables or schemes. For Google and CloudKit setup, follow `Docs/GOOGLE_API_SETUP.md`, `Docs/GOOGLE_OAUTH_SETUP.md`, and `Docs/CLOUDKIT_SETUP.md`. Document network-scope changes in `Docs/DATA_GOVERNANCE.md` and confirm they align with the principles in `SECURITY.md`.
