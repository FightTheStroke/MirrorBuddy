# Review Task: $ARGUMENTS

Thoroughly review a completed task to verify it actually works before marking as done.

## Usage

```
/review-task <task-id>
```

Example: `/review-task 91` to review Task 91 (Extended Voice Recording)

## Review Checklist

### 1. Get Task Details

```bash
task-master show $ARGUMENTS
```

Review all requirements and subtasks.

### 2. Code Review

For each file modified in this task:

a) **Read the implementation:**
   - Use Read tool to examine all modified files
   - Check for Swift 6 concurrency compliance (@MainActor, nonisolated)
   - Verify error handling is user-friendly
   - Confirm Italian localization for UI strings

b) **Check for common issues:**
   - ❌ Threading violations (background thread accessing @MainActor)
   - ❌ Force unwraps (use guard let or optional chaining)
   - ❌ Missing error handling
   - ❌ Hardcoded English strings (should be Italian)
   - ❌ Magic numbers (use named constants)
   - ❌ Retain cycles (check [weak self] in closures)

c) **Verify architecture:**
   - ✅ SOLID principles followed
   - ✅ Dependency injection used where appropriate
   - ✅ SwiftData models properly defined
   - ✅ View models separate from views

### 3. Test the Implementation

**CRITICAL: Actually build and test, don't assume it works!**

a) **Build the app:**
```bash
cd /Users/roberdan/GitHub/MirrorBuddy
xcodebuild -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro' clean build
```

b) **Check for compilation errors** - fix any found

c) **Run the app** in simulator and:
   - Navigate to the feature implemented
   - Test all subtask functionality
   - Try edge cases and error scenarios
   - Verify Italian text displays correctly
   - Check VoiceOver accessibility

d) **Run tests:**
```bash
xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### 4. Verify Subtask Completion

For each subtask:
```bash
task-master show $ARGUMENTS
```

Confirm:
- ✅ Subtask marked as "done"
- ✅ Implementation notes logged via update-subtask
- ✅ All acceptance criteria met
- ✅ Files mentioned actually modified

### 5. Check Documentation

Verify documentation updated:
- ✅ ADR created if architectural decision made
- ✅ API documentation for new public methods
- ✅ README.md updated if user-facing feature
- ✅ CHANGELOG.md has entry for this task
- ✅ Code comments explain "why" not just "what"

### 6. Review Commit

```bash
git log --oneline -1
git show HEAD
```

Verify commit:
- ✅ References task ID (#$ARGUMENTS)
- ✅ Descriptive message explaining changes
- ✅ Lists files modified
- ✅ Explains testing approach
- ✅ Includes Co-Authored-By: Claude

### 7. Integration Check

Verify task integrates with existing code:
- ✅ No breaking changes to other features
- ✅ Dependencies properly satisfied
- ✅ No regressions introduced
- ✅ Follows existing code style and patterns

## Review Outcomes

### ✅ PASS - Task Complete

If all checks pass:
```bash
task-master set-status --id=$ARGUMENTS --status=done
```

Report: "Task $ARGUMENTS reviewed and verified. All requirements met. ✅"

### ⚠️ ISSUES FOUND - Needs Fixes

If issues found:
```bash
task-master set-status --id=$ARGUMENTS --status=in-progress
```

Create checklist of issues:
```bash
task-master update-task --id=$ARGUMENTS --prompt="Review found issues:
1. [Issue 1]
2. [Issue 2]
3. [Issue 3]

Needs fixing before marking done."
```

Fix issues, then run review again.

### 🚫 BLOCKED - Dependencies Missing

If blocked by incomplete dependencies:
```bash
task-master set-status --id=$ARGUMENTS --status=blocked
```

Report which dependencies need completion.

## Common Review Failures

### "Non fa un cazzo" - Feature doesn't work

**Root causes:**
- Code not actually tested (only assumed to work)
- Compilation errors ignored
- Simulator/device testing skipped
- Edge cases not handled

**Fix:** Actually test the feature thoroughly!

### "Crashato" - App crashes

**Root causes:**
- Threading violations (@MainActor accessed from background)
- Force unwraps on nil values
- Unhandled errors
- Memory issues (retain cycles)

**Fix:** Use Xcode debugger to find crash, add proper error handling

### "Non compila" - Doesn't compile

**Root causes:**
- Syntax errors
- Missing imports
- Wrong API signatures
- Type mismatches

**Fix:** Run xcodebuild and fix all compilation errors

### Documentation outdated

**Root causes:**
- Skipped documentation step
- Assumed docs not needed
- Forgot to update CHANGELOG

**Fix:** Update all relevant documentation files

## Notes

- **Never skip testing** - "it should work" is not acceptable
- **Actually run the app** - don't assume from code review
- **Check edge cases** - nil values, empty arrays, network failures
- **Verify Italian text** - no English strings in UI
- **Test accessibility** - VoiceOver should work
- **Review is not optional** - it's part of the workflow
