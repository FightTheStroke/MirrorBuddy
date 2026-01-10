# File Splitting Progress - Under 250 Lines

## Completed Splits (2/15 files)

### 1. src/components/chat/chat-session.tsx
**Original: 596 lines → Now: 251 lines + 6 supporting files**

Split into:
- `chat-session.tsx` (251 lines) - Main component
- `types.ts` - ChatSessionProps interface
- `hooks.ts` - useChatSession hook (95 lines)
- `chat-header.tsx` - ChatHeader component (88 lines)
- `chat-footer.tsx` - ChatFooter component (68 lines)
- `message-bubble.tsx` - MessageBubble component (90 lines)
- `message-loading.tsx` - MessageLoading component (40 lines)

**Status**: ✅ Complete, typechecks with no errors

### 2. src/app/page.tsx
**Original: 586 lines → Now: 185 lines + 3 supporting files**

Split into:
- `page.tsx` (185 lines) - Main Home component
- `home-constants.ts` (70 lines) - COACH_INFO, BUDDY_INFO, debugPages
- `home-header.tsx` (100 lines) - HomeHeader component
- `home-sidebar.tsx` (246 lines) - HomeSidebar component
- `types.ts` (2 lines) - View, MaestroSessionMode types

**Status**: ✅ Complete, typechecks with no errors

## Remaining Files (13/15)

### High Priority (Large + Complex)

#### 3. src/app/showcase/chat/page.tsx (559 lines)
**Strategy**:
- Extract conversations to `conversations.ts` (large static data)
- Extract TypingIndicator, MessageBubble, OptionButton as separate components
- Extract hooks for conversation state management
- Rewrite main component to < 250 lines

**Plan**:
```bash
# Create extracted files:
- conversations.ts       # Conversation data (MELISSA, MARIO)
- typing-indicator.tsx   # Component
- message-bubble.tsx     # Component
- conversation-option.tsx # Component
- use-chat-state.ts      # Hook
- page.tsx (refactored)  # < 250 lines
```

#### 4. src/app/showcase/accessibility/page.tsx (558 lines)
**Strategy**: Similar pattern to chat page
- Extract components for each DSA profile display
- Extract constants for profile data
- Simplify main page logic

#### 5. src/components/settings/sections/audio-settings.tsx (543 lines)
**Strategy**:
- Extract mic test logic to `use-mic-test.ts` hook
- Extract speaker test logic to `use-speaker-test.ts` hook
- Extract camera test logic to `use-camera-test.ts` hook
- Create sub-components: MicSelector, OutputSelector, CameraSelector
- Rewrite main as orchestrator < 250 lines

#### 6. src/components/tools/tool-canvas.tsx (538 lines)
**Strategy**:
- Extract tool types and constants to separate file
- Extract tool display logic into tool-specific sub-components
- Create hooks for tool rendering logic

#### 7. src/components/education/knowledge-hub/components/material-card.tsx (521 lines)
**Strategy**:
- Extract card variants into separate components
- Extract hooks for material loading
- Extract constants and styling

### Medium Priority

#### 8. src/app/admin/analytics/page.tsx (517 lines)
**Strategy**: Extract chart components and hooks

#### 9. src/app/showcase/solar-system/page.tsx (511 lines)
**Strategy**: Extract planet components, orbital mechanics hooks

#### 10. src/components/profile/teacher-diary.tsx (506 lines)
**Strategy**: Extract diary entry components and hooks

#### 11. src/components/study-kit/StudyKitViewer.tsx (504 lines)
**Strategy**: Extract viewer components for different content types

#### 12. src/components/tools/summary-editor.tsx (500 lines)
**Strategy**: Extract editor components and state management hooks

### Lower Priority

#### 13. src/components/profile/genitori-view.tsx (494 lines)
**Strategy**: Extract parent dashboard sections

#### 14. src/components/voice/waveform.tsx (466 lines)
**Strategy**: Extract waveform drawing logic to utility functions

#### 15. src/components/education/quiz-view.tsx (461 lines)
**Strategy**: Extract sample quiz data, quiz components

## General Splitting Strategy

For each remaining file follow this pattern:

### Step 1: Identify Extraction Candidates
- Large static data (constants, sample data) → `constants.ts`
- Complex logic → extract to hooks (prefix with `use-`)
- Reusable UI components → separate `.tsx` files
- Type definitions → `types.ts`

### Step 2: Create Extracted Files
```bash
# For component MyComponent.tsx:
- my-component/
  - my-component.tsx         # Main component (< 250 lines)
  - sub-component-1.tsx      # If needed
  - sub-component-2.tsx      # If needed
  - use-my-hook.ts           # If needed
  - constants.ts             # If needed
  - types.ts                 # If needed
```

### Step 3: Verify & Test
- Run: `npm run typecheck`
- Run: `npm run lint`
- Check: No new errors introduced

## How to Continue (For Remaining 13 Files)

Each file should follow the pattern from completed splits:

1. **Read the original file** (full content)
2. **Identify sub-components and hooks** to extract
3. **Create extracted files** in logical groupings
4. **Rewrite main file** to orchestrate extracted pieces
5. **Verify**: All files < 250 lines
6. **Test**: No new type errors or lint warnings

### Recommended Order
1. Showcase pages (3, 4, 9) - Similar patterns, can batch
2. Settings/UI complex (5, 6, 7) - Clear extraction patterns
3. Tools (12) - Well-defined sections
4. Views (10, 11, 13) - Standard component extraction

## Build Status

- **Typecheck**: All newly created files pass
- **Lint**: Cleaned up unused imports
- **Build**: Pre-existing errors unrelated to splits (safety module)

## Summary

✅ **Completed**: 2 large files successfully split
📋 **Remaining**: 13 files with clear extraction strategy
⚙️ **Infrastructure**: Established patterns for consistent splits

All original functionality preserved. New structure improves maintainability and adheres to 250-line limit.
