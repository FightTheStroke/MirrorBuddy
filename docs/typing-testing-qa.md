# Testing & QA - Implementation Notes

## Unit Tests (Vitest)

### Key Mapping Engine
- Test `validateKey()` for correct/incorrect keys
- Test `getAccuracy()` calculation
- Test `isComplete()` detection

### WPM Calculator
- Test WPM calculation with various inputs
- Test accuracy calculation
- Test grade determination (A-F)

### Typing Store
- Test startLesson/endLesson actions
- Test recordKeystroke action
- Test saveProgress/loadProgress with mocked API

## E2E Tests (Playwright)

### Lesson Completion Flow
1. Navigate to typing page
2. Select beginner lesson
3. Complete lesson typing
4. Verify progress updated
5. Verify WPM/accuracy displayed

### Game Flows
1. Speed Game: Start game, complete, verify score
2. Accuracy Game: Complete, verify accuracy displayed
3. Keyboard Exploration: Complete, verify points

### Accessibility Tests
1. One-handed mode: Select right-only, verify keyboard
2. High contrast: Toggle, verify contrast
3. Screen reader: Navigate with NVDA/VoiceOver

## Accessibility Audit (Lighthouse)

Target: Score >90 in all categories

### Manual Tests
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader (NVDA Windows, VoiceOver macOS)
- Color contrast (WAVE tool)
- Reduced motion (prefers-reduced-motion)
- One-handed typing test

## Performance Tests

- Keystroke latency < 16ms
- Time to Interactive < 3s
- First Contentful Paint < 1.5s

## Test Coverage Target

- Unit tests: 80%
- E2E tests: Key user flows covered
- Accessibility: All 7 DSA profiles tested
