# Work Session Command

**Realistic continuous workflow** for executing multiple TaskMaster tasks in sequence with human checkpoints.

## What This ACTUALLY Does

✅ **Real capabilities**:
- Identifies next available task from TaskMaster
- Loads appropriate agent spec
- Follows constitution rules STRICTLY
- Implements the task with tests
- Builds on **IpadDiMario simulator** (as per constitution)
- Creates proper git commit
- Updates TaskMaster status
- Asks "Continue?" between tasks

❌ **Does NOT**:
- Run in background
- Execute automatically without checkpoints
- Merge branches automatically
- Skip quality gates

---

## Usage

```bash
/work-session           # Start session, work on next available task
/work-session 5         # Work on next 5 tasks, then stop
/work-session task 11   # Work on specific task
```

---

## Workflow Per Task

### Step 1: Task Selection
```bash
# Read TaskMaster
task-master next

# Output example:
# Task 11: OpenAI API Client Infrastructure
# Agent: api-agent
# Dependencies: ✅ All satisfied
```

### Step 2: Preparation
```bash
# Read agent spec
cat .claude/specs/api-integration-agent.md

# Read constitution
cat .claude/constitution.md

# Check current branch
git status

# Verify on main
git checkout main
```

### Step 3: Feature Branch
```bash
# Create branch following convention
git checkout -b feature/task-11-openai-client

# Convention: feature/task-{ID}-{slug}
```

### Step 4: Implementation

**Following constitution rules**:
- ✅ Write tests FIRST (TDD)
- ✅ SwiftData models with proper relationships
- ✅ Error handling with specific errors
- ✅ Async/await properly used
- ✅ VoiceOver support for any UI
- ✅ Touch targets ≥ 44×44pt
- ✅ Mario-first design

**Code quality**:
- Swift 6 strict concurrency
- No force unwraps without comments
- Descriptive names
- Clear error types

### Step 5: Build & Test

**CRITICAL: Use IpadDiMario simulator** (per constitution line 393-410):

```bash
# Build
xcodebuild \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=IpadDiMario' \
  build

# Run tests
xcodebuild \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=IpadDiMario' \
  test

# SwiftLint (must be 0 warnings)
swiftlint
```

**If build/tests fail**:
- Fix issues
- Re-run build & test
- Do NOT proceed to commit

### Step 6: Git Commit

**Format per constitution (line 423-438)**:

```bash
git add .
git commit -m "Task 11: Implement OpenAI API Client Infrastructure

- Created OpenAIClient with async/await support
- Implemented GPT-5 chat completion, vision, and DALL-E 3
- Added WebSocket support for Realtime API
- Implemented comprehensive error handling and retry logic
- Added rate limiting with actor-based limiter
- Created 40+ unit tests with >90% coverage

Tested on IpadDiMario simulator:
- Build: ✅ Success
- Tests: ✅ 42/42 passed
- SwiftLint: ✅ 0 warnings
- Coverage: 91%

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 7: Merge to Main

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feature/task-11-openai-client --no-ff

# Delete feature branch
git branch -d feature/task-11-openai-client

# Push to remote
git push origin main
```

### Step 8: Update TaskMaster

```bash
# Mark task as done
task-master set-status --id=11 --status=done

# If task has subtasks, mark each subtask done:
task-master set-status --id=11.1 --status=done
task-master set-status --id=11.2 --status=done
# ... etc
```

### Step 9: Checkpoint

```markdown
✅ Task 11 Complete!

**Summary**:
- Files created: 8
- Tests added: 42
- Coverage: 91%
- Build time: 12.3s
- Test time: 8.7s

**Next available task**: Task 12 (Gemini API Client)

**Continue with Task 12? (y/n)**
```

---

## Session Example

```bash
$ /work-session 3

🎯 WORK SESSION STARTED
Target: Complete next 3 available tasks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK 1/3: OpenAI API Client (ID: 11)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: api-integration-agent
Complexity: 8/10
Estimated time: 3-4 hours
Subtasks: 9

Loading spec: .claude/specs/api-integration-agent.md ✓
Reading constitution: .claude/constitution.md ✓

Creating branch: feature/task-11-openai-client ✓

Implementing subtask 11.1: Design OpenAIClient Class...
[detailed work...]
✓ Complete

Implementing subtask 11.2: GPT-5 Chat Completion...
[detailed work...]
✓ Complete

[... all 9 subtasks ...]

Building on IpadDiMario simulator...
⚙️  Build succeeded (12.3s)

Running tests on IpadDiMario simulator...
✅ All 42 tests passed (8.7s)

Running SwiftLint...
✅ 0 warnings, 0 errors

Committing...
✅ Committed: "Task 11: Implement OpenAI API Client Infrastructure"

Merging to main...
✅ Merged successfully

Updating TaskMaster...
✅ Task 11 marked as done

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TASK 1/3 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Time: 3h 42m
Files: 8 created, 2 modified
Tests: 42 added (all passing)
Coverage: 91%

Progress: 13/83 tasks (15.7%) ████░░░░░░░░░░░░░░░░

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK 2/3: Gemini API Client (ID: 12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: api-integration-agent
Complexity: 7/10
Estimated time: 2-3 hours

Continue? (y/n/stop) _
```

**Your options**:
- `y` → Continue with Task 12
- `n` → Skip Task 12, show next task
- `stop` → End session, show summary

---

## Quality Gates (Enforced)

Every task must pass:
- [ ] All subtasks implemented
- [ ] Tests written (TDD)
- [ ] Build succeeds on **IpadDiMario**
- [ ] All tests pass on **IpadDiMario**
- [ ] SwiftLint: 0 warnings
- [ ] Coverage > 80% for new code
- [ ] VoiceOver working (if UI task)
- [ ] Commit message follows format
- [ ] TaskMaster updated

**If ANY gate fails**:
→ Stop session
→ Show error
→ Ask for guidance

---

## Constitution Compliance Checklist

Per task, I verify:

### Build & Test (Lines 391-417)
- [x] Use **IpadDiMario simulator** (NEVER macOS or iPhone)
- [x] Run xcodebuild with correct destination
- [x] All tests pass before commit

### Git Commits (Lines 419-438)
- [x] Commit after each task
- [x] Descriptive message with task number
- [x] Include implementation details
- [x] Include test results
- [x] Add Co-Authored-By Claude

### Code Quality (Lines 93-150)
- [x] Swift style guidelines
- [x] Specific error types
- [x] Async/await patterns
- [x] SwiftData best practices

### Mario-First Design (Lines 301-387)
- [x] Voice-first if UI
- [x] One-handed operation
- [x] Working memory support
- [x] Dyslexia-friendly text
- [x] Encouraging tone

### Security (Lines 265-298)
- [x] No hardcoded API keys
- [x] Keychain for secrets
- [x] No sensitive data in logs

---

## Error Handling

### Build Fails
```
❌ Build failed on IpadDiMario simulator

Error: Use of unresolved identifier 'foo'
File: OpenAIClient.swift:42

Actions:
1. Fix error
2. Rebuild
3. Continue

Session paused. Fix error and run:
/work-session continue
```

### Tests Fail
```
❌ Tests failed: 2/42 failing

Failed tests:
- testChatCompletion_withInvalidKey_throwsError
- testRateLimiter_exceedsLimit_throttlesRequests

Session paused. Fix tests and run:
/work-session continue
```

### SwiftLint Warnings
```
❌ SwiftLint: 3 warnings

Warnings:
- Line length exceeds 120 characters (OpenAIClient.swift:89)
- Force unwrapping (OpenAIClient.swift:156)
- TODO comment (OpenAIClient.swift:203)

Session paused. Fix warnings (0 required per constitution).
```

---

## Session Summary

At end of session:

```markdown
🎉 WORK SESSION COMPLETE

**Duration**: 8h 23m
**Tasks completed**: 3/3
**Progress**: 15/83 → 18/83 (21.7%)

### Completed Tasks
1. ✅ Task 11 - OpenAI API Client (3h 42m)
2. ✅ Task 12 - Gemini API Client (2h 18m)
3. ✅ Task 13 - Google APIs Client (2h 23m)

### Metrics
- Files created: 22
- Files modified: 8
- Tests added: 98
- Tests passing: 98/98
- Coverage: 89% average
- SwiftLint warnings: 0
- Build failures: 0
- Commits: 3

### Git History
```
f3a82b1 Task 13: Create Google APIs Client for Workspace Integration
a7d91e4 Task 12: Create Google Gemini API Client
c2e45f7 Task 11: Implement OpenAI API Client Infrastructure
```

### Next Available Tasks
1. Task 14 - API Error Handling (depends on 11,12,13) ✅ Ready
2. Task 15 - Keychain Storage (no dependencies) ✅ Ready
3. Task 35 - Camera Integration (no dependencies) ✅ Ready

**Resume session**: /work-session
**Work on specific task**: /work-session task 14
```

---

## Interruption Handling

If you interrupt (Ctrl+C or new message):

```
⚠️ SESSION INTERRUPTED

Current task: Task 12 (Gemini API Client)
Progress: 60% (implementation done, tests pending)
Branch: feature/task-12-gemini-client

Options:
1. Complete current task then stop
2. Abort current task (discard changes)
3. Pause and save progress

What would you like to do? _
```

---

## Realistic Expectations

**What I'll do**:
- Work through tasks methodically
- Follow constitution STRICTLY
- Build/test on IpadDiMario ALWAYS
- Commit properly
- Ask for checkpoint between tasks
- Stop on ANY error

**What I WON'T do**:
- Skip quality checks
- Commit broken code
- Use wrong simulator
- Ignore SwiftLint warnings
- Proceed without your approval at checkpoints

**Estimated pace**:
- Simple task (complexity 3-5): 1-2 hours
- Medium task (complexity 6-7): 2-3 hours
- Complex task (complexity 8-10): 3-5 hours
- Tasks with subtasks: Add time per subtask

**Realistic session**:
- 2-3 simple tasks in 4 hours
- 1-2 medium tasks in 4 hours
- 1 complex task in 4 hours

---

Ready to start? I'll begin with Task 11 (OpenAI API Client) immediately.

**Just say**: "Start" or "Go" or "Begin work session"
