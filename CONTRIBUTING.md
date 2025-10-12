# Contributing to MirrorBuddy

First off, thank you for considering contributing to MirrorBuddy! This project is built with love for students with special needs, and every contribution helps make education more accessible.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Guidelines](#coding-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [License](#license)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to roberdan@fightthestroke.org.

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear descriptive title**
- **Exact steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (iOS version, device model, Xcode version)

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) when creating issues.

### 💡 Suggesting Enhancements

Enhancement suggestions are welcome! Before suggesting, check if it already exists in issues or roadmap. Include:

- **Clear use case** - How does this help students with special needs?
- **Detailed description** of the feature
- **Alternative solutions** you've considered
- **Mockups or examples** if relevant

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).

### 🌍 Translations

We support multiple languages (currently IT/EN). To add a new language:

1. Copy `Localizable.xcstrings` structure
2. Add translations for your language
3. Test all UI strings in the app
4. Submit a PR with your translations

### 📝 Documentation

Help improve documentation by:

- Fixing typos or unclear explanations
- Adding examples and use cases
- Improving setup instructions
- Writing tutorials or guides

### 💻 Code Contributions

**Note**: MirrorBuddy is licensed under BSL 1.1, which has commercial use restrictions. By contributing, you agree that your contributions will be licensed under the same license.

See [Development Setup](#development-setup) below for getting started.

---

## Development Setup

### Prerequisites

- **macOS** 14.0+ (Sonoma or later)
- **Xcode** 16.0+
- **Swift** 6.0+
- **iOS SDK** 26.0+
- **Apple Developer Account** (for CloudKit testing)

### API Keys Required

You'll need API keys for testing:

- **OpenAI API Key** - [Get it here](https://platform.openai.com/api-keys)
- **Google Cloud API** (optional for full testing)

### Setup Steps

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/MirrorBuddy.git
   cd MirrorBuddy
   ```

2. **Open in Xcode**
   ```bash
   open MirrorBuddy.xcodeproj
   ```

3. **Configure API Keys**

   Create a `Config/APIKeys.swift` file:
   ```swift
   enum APIKeys {
       static let openAI = "sk-..."
       static let anthropic = "sk-ant-..."  // Optional
       static let googleClientID = "..."     // Optional
   }
   ```

4. **Configure Signing**
   - Select your Apple Developer team in project settings
   - Update bundle identifier if needed

5. **Build and Run**
   - Select a simulator or device
   - Press Cmd+R to build and run

### Project Structure

```
MirrorBuddy/
├── App/                    # App entry point
├── Core/
│   ├── API/               # API clients (OpenAI, Google)
│   ├── Models/            # SwiftData models
│   ├── Services/          # Business logic
│   └── Views/             # Reusable UI components
├── Features/              # Feature modules
├── Resources/             # Assets, localizations
└── Docs/                  # Documentation
```

---

## Coding Guidelines

### Swift Style Guide

We follow the [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/).

Key points:

- **Naming**: Clear, descriptive names over brevity
- **Formatting**: Use Xcode's default formatting (Ctrl+I)
- **Documentation**: Document all public APIs with `///`
- **Access Control**: Use `private` by default, expose what's needed

### SwiftLint

All code must pass SwiftLint in **strict mode** with **zero violations**.

```bash
# Run SwiftLint
swiftlint lint --strict

# Auto-fix what's possible
swiftlint --fix
```

Common rules:
- No force unwraps (`!`)
- No force casts (`as!`)
- Max function length: 50 lines
- Max cyclomatic complexity: 10
- Proper number separators (1_000 not 1000)

### Swift 6.0 Concurrency

- Use `async/await` for asynchronous code
- Use `actor` for thread-safe shared mutable state
- Use `@MainActor` for UI-related code
- Enable strict concurrency checking

### Testing

- Write unit tests for business logic
- Write integration tests for API clients
- Write UI tests for critical user flows
- Maintain >80% code coverage for new code

```bash
# Run tests
xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### Accessibility

This app is designed for students with disabilities. **Every feature must be accessible.**

- ✅ VoiceOver support
- ✅ Dynamic Type support
- ✅ High contrast support
- ✅ Voice control compatibility
- ✅ Reduce motion support

Test with Accessibility Inspector in Xcode.

### Localization

- All user-facing strings must be localized
- Add strings to `Localizable.xcstrings`
- Provide both Italian and English translations
- Test both languages before submitting

```swift
// Good ✅
Text(String(localized: "hello.message"))

// Bad ❌
Text("Hello, World!")
```

---

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

### Examples

```bash
feat(voice): add real-time voice interruption support

Implemented bidirectional audio streaming using OpenAI Realtime API.
Students can now interrupt the AI mid-response for clarifications.

Closes #123
```

```bash
fix(sync): resolve CloudKit sync conflict on concurrent edits

Added conflict resolution strategy that preserves local changes
while merging remote updates using CKRecordZone.

Fixes #456
```

### Rules

- Use imperative mood ("add" not "added")
- Don't end subject with period
- Keep subject line under 50 characters
- Separate subject from body with blank line
- Reference issues and PRs in footer

---

## Pull Request Process

### Before Submitting

1. ✅ All tests pass
2. ✅ SwiftLint shows 0 violations
3. ✅ Code is documented
4. ✅ Localization strings added (IT/EN)
5. ✅ Manual testing completed
6. ✅ Branch is up to date with `main`

### PR Checklist

- [ ] PR title follows Conventional Commits format
- [ ] Description explains **what** and **why**
- [ ] Screenshots/videos for UI changes
- [ ] Tests added or updated
- [ ] Documentation updated if needed
- [ ] Linked to related issue(s)

### PR Template

Use the [Pull Request template](.github/PULL_REQUEST_TEMPLATE.md) provided.

### Review Process

1. **Automated Checks**: SwiftLint, tests, build verification
2. **Code Review**: At least one maintainer approval required
3. **Testing**: Manual testing by reviewer
4. **Merge**: Squash and merge to `main`

### After Merge

- PR branch will be automatically deleted
- Linked issues will be automatically closed
- Changes will be included in next release

---

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Working on a Feature

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/voice-interruption

# Make changes, commit frequently
git add .
git commit -m "feat(voice): add interruption detection"

# Push to your fork
git push origin feature/voice-interruption

# Open PR on GitHub
```

### Keeping Up to Date

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch
git rebase upstream/main

# Resolve conflicts if any
git push --force-with-lease origin feature/voice-interruption
```

---

## Testing Guidelines

### Unit Tests

Located in `MirrorBuddyTests/`.

```swift
@testable import MirrorBuddy
import XCTest

final class OpenAIClientTests: XCTestCase {
    func testChatCompletion() async throws {
        // Arrange
        let client = OpenAIClient(configuration: testConfig)

        // Act
        let response = try await client.chatCompletion(...)

        // Assert
        XCTAssertNotNil(response.choices.first)
    }
}
```

### Integration Tests

Test real API interactions with test accounts.

### UI Tests

Located in `MirrorBuddyUITests/`.

```swift
final class VoiceCoachUITests: XCTestCase {
    func testVoiceRecordingButton() {
        let app = XCUIApplication()
        app.launch()

        let recordButton = app.buttons["voice.record"]
        XCTAssertTrue(recordButton.exists)

        recordButton.tap()
        XCTAssertTrue(recordButton.label.contains("Recording"))
    }
}
```

---

## Questions?

- 📧 Email: roberdan@fightthestroke.org
- 💬 GitHub Discussions: [Start a discussion](https://github.com/FightTheStroke/MirrorBuddy/discussions)
- 🐛 Issues: [Report a bug](https://github.com/FightTheStroke/MirrorBuddy/issues)

---

## License

By contributing, you agree that your contributions will be licensed under the **Business Source License 1.1 (BSL 1.1)** with the same terms as the project.

See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Thank you for helping make education more accessible! Every contribution, no matter how small, makes a difference for students like Mario. 💙

---

**Last Updated**: October 12, 2025
