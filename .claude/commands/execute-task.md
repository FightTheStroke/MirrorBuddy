# Execute Single Task: $ARGUMENTS

**COMANDO SINGOLO** per eseguire un task specifico di Task Master con espansione, comprensione, implementazione, test, documentazione e commit.

Questo comando garantisce:
- ✅ Il task viene CAPITO ED ESPANSO prima dell'esecuzione
- ✅ Ogni subtask viene implementato con test appropriati
- ✅ La documentazione viene SEMPRE aggiornata
- ✅ Un commit Git viene fatto DOPO il task completato
- ✅ Non si dice mai "funziona" senza testare ("non fa un cazzo" è INACCETTABILE)

## Usage

```bash
/execute-task <task-id>
```

**Examples:**
- `/execute-task 99` - Execute Task 99 (Fix Audio Pipeline)
- `/execute-task 100` - Execute Task 100 (Voice Conversation Persistence)
- `/execute-task 104` - Execute Task 104 (Integrate ContextBannerView)

## Workflow

### 1. Get Task Details

```bash
task-master show $ARGUMENTS
```

Review all requirements, dependencies, and existing subtasks.

### 2. Analyze and Expand

```bash
task-master analyze-complexity --ids=$ARGUMENTS --research
```

If complexity >= 5 OR no subtasks exist:
```bash
task-master expand --id=$ARGUMENTS --research --force
task-master show $ARGUMENTS
```

### 3. Execute Each Subtask

For each subtask in order:

a) **Start subtask:**
```bash
task-master set-status --id=$ARGUMENTS.<subtask-num> --status=in-progress
```

b) **Read relevant files** mentioned in subtask description

c) **Implement** following:
   - Swift 6 strict concurrency (@MainActor, nonisolated)
   - SwiftUI + SwiftData best practices
   - Italian localization
   - Accessibility (VoiceOver, Dynamic Type)
   - Child-friendly, dyslexia-friendly design

d) **Test implementation** - actually verify it works, don't assume

e) **Log implementation:**
```bash
task-master update-subtask --id=$ARGUMENTS.<subtask-num> --prompt="Implemented [what]. Files: [list]. Testing: [how verified]. Challenges: [if any]."
```

f) **Complete subtask:**
```bash
task-master set-status --id=$ARGUMENTS.<subtask-num> --status=done
```

### 4. Build and Test (MANDATORY)

**CRITICAL: NEVER skip this step!**

a) **Build the project:**
```bash
cd /Users/roberdan/GitHub/MirrorBuddy
xcodebuild -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro' clean build
```

b) **If build fails:**
- Fix all compilation errors
- Re-run build
- Do NOT proceed until build succeeds

c) **Run tests:**
```bash
xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

d) **ACTUALLY TEST in simulator:**
- Open MirrorBuddy app in iOS Simulator
- Navigate to the implemented feature
- Test all functionality manually
- Verify Italian text correct
- Test edge cases (nil, empty data, errors)
- **NEVER say "dovrebbe funzionare" without testing!**

e) **If crashes or doesn't work:**
- Use Xcode debugger to find issue
- Fix the problem
- Re-test from step (a)
- Repeat until ACTUALLY works

### 5. Update Documentation (MANDATORY)

**Always update:**
- CHANGELOG.md - Add entry with date and changes

**Update if applicable:**
- ADR (Architectural Decision Records) - Document architectural decisions
- API documentation - Document new public methods
- README.md - Update for user-facing features
- Code comments - Explain complex logic ("why", not "what")

### 6. Commit Changes

```bash
git add .

git commit -m "$(cat <<'EOF'
feat: [task title]

Task #$ARGUMENTS: [description]

Changes:
- [list main changes]
- [files modified]

Implementation:
[brief explanation of approach]

Testing:
[how verified it works]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git status
```

### 6. Complete Task

```bash
task-master set-status --id=$ARGUMENTS --status=done
```

### 7. Show Next Available Task

```bash
task-master next
```

## Quality Standards

- ✅ **Test everything** - never claim it works without testing
- ✅ **Use Swift 6 concurrency** - @MainActor, Task, nonisolated
- ✅ **Handle errors gracefully** - user-friendly Italian messages
- ✅ **Document changes** - update ADRs and docs
- ✅ **Commit with context** - detailed commit messages

## If Task is Blocked

If dependencies not met:
```bash
task-master set-status --id=$ARGUMENTS --status=blocked
```

Report which dependencies need completion first.

## If New Requirements Found

Add new tasks discovered during implementation:
```bash
task-master add-task --prompt="[new requirement found]" --research
```

## Notes

- Use `--research` flag for AI-powered analysis
- Break large tasks into 5-10 subtasks
- Italian for all UI strings
- "non fa un cazzo" is **unacceptable** - test thoroughly!
