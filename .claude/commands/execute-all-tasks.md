# Execute All Remaining Tasks (FULLY AUTOMATED)

**COMANDO PRINCIPALE** per eseguire AUTOMATICAMENTE tutti i task pendenti di Task Master in un loop continuo senza mai bloccarsi, con:
- ✅ Espansione automatica dei task complessi
- ✅ Implementazione, test e commit automatici
- ✅ Retry automatico in caso di errore
- ✅ Continuazione automatica al prossimo task
- ✅ NESSUN intervento umano richiesto

## ⚡ Quick Start

```bash
# OPZIONE 1: Usa lo script bash (RACCOMANDATO - completamente automatico)
bash .claude/scripts/execute-all-tasks.sh

# OPZIONE 2: Usa il workflow manuale qui sotto (richiede il mio intervento)
# → Vedi "Workflow Completo" sotto
```

## Workflow Completo (Manuale - Richiede intervento)

Per ogni task pendente fino al completamento totale:

### 1. Get Next Task
```bash
task-master next
```

If no tasks available, report completion and stop.

### 2. Understand and Expand Task

a) Get full task details:
```bash
task-master show <task-id>
```

b) Analyze complexity:
```bash
task-master analyze-complexity --ids=<task-id> --research
```

c) If complexity score >= 5 OR task has no subtasks, expand it:
```bash
task-master expand --id=<task-id> --research --force
```

d) Read the expanded subtasks:
```bash
task-master show <task-id>
```

### 3. Execute Task Implementation

For each subtask in order:

a) Mark subtask as in-progress:
```bash
task-master set-status --id=<task-id>.<subtask-id> --status=in-progress
```

b) Read relevant codebase files identified in the task description

c) Implement the subtask following:
   - Swift 6 strict concurrency rules (@MainActor, nonisolated)
   - SwiftUI + SwiftData best practices
   - Italian localization for UI strings
   - Accessibility considerations (VoiceOver, Dynamic Type)
   - Child-friendly, dyslexia-friendly design patterns

d) Log implementation notes:
```bash
task-master update-subtask --id=<task-id>.<subtask-id> --prompt="Implemented [what was done]. Files modified: [list]. Challenges: [any issues]. Testing: [how verified]."
```

e) Mark subtask as done:
```bash
task-master set-status --id=<task-id>.<subtask-id> --status=done
```

### 4. Build and Test (MANDATORY)

**CRITICAL: NEVER skip this step. "Non fa un cazzo" is unacceptable!**

a) Build the project:
```bash
cd /Users/roberdan/GitHub/MirrorBuddy
xcodebuild -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro' clean build
```

b) If build FAILS:
- Fix all compilation errors
- Re-run build
- Do NOT proceed until build succeeds

c) Run tests:
```bash
xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

d) ACTUALLY TEST the feature in simulator:
- Open MirrorBuddy app in iOS Simulator
- Navigate to the implemented feature
- Test all functionality manually
- Verify Italian text displays correctly
- Test edge cases (nil values, empty data, errors)
- **NEVER say "dovrebbe funzionare" - TEST IT!**

e) If crashes or doesn't work:
- Use Xcode debugger to identify issue
- Fix the problem
- Re-test from step (a)
- Repeat until it ACTUALLY works

### 5. Update Documentation (MANDATORY)

After verifying everything works, update ALL relevant documentation:

**Always update:**
- CHANGELOG.md - Add entry for this task with date and changes

**Update if applicable:**
- ADR (Architectural Decision Records) - Document any architectural decisions
- API documentation - Document new public methods and services
- README.md - Update if new user-facing features added
- Code comments - Explain complex logic (the "why", not the "what")

**Example CHANGELOG.md entry:**
```markdown
## [Unreleased]

### Added
- Task #99: Fixed Audio Pipeline for Bidirectional Streaming
  - Implemented PCM16 audio encoding from microphone
  - OpenAI WebSocket connection now sends audio chunks
  - Audio response parsing and playback working
  - Files: AudioPipelineManager.swift, OpenAIRealtimeClient.swift
```

### 6. Commit Changes

Create a detailed commit following this format:

```bash
git add .

git commit -m "$(cat <<'EOF'
feat: [task title from Task Master]

Task #<task-id>: [Full task description]

Changes:
- [List of main changes made]
- [Include files modified]
- [Note any breaking changes]

Implementation details:
[Brief explanation of approach taken]

Testing:
[How the implementation was verified]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git status
```

### 6. Mark Task Complete

```bash
task-master set-status --id=<task-id> --status=done
```

### 7. Verify and Continue

a) Check task completion:
```bash
task-master list
```

b) Loop back to step 1 for next task

## Important Guidelines

### Code Quality Standards
- **NEVER** skip tests - implement and run tests for all new code
- **NEVER** say something works without actually testing it
- **ALWAYS** use proper Swift 6 concurrency patterns
- **ALWAYS** handle errors gracefully with user-friendly messages
- **ALWAYS** use Italian for user-facing strings

### Task Expansion Rules
- Expand if complexity >= 5
- Expand if task description is vague or high-level
- Expand if task affects multiple subsystems
- Skip expansion only for trivial UI tweaks or one-line fixes

### Documentation Updates
- Update ADRs for architectural decisions
- Document new APIs and services
- Update user-facing documentation for features
- Keep CHANGELOG.md current

### Commit Standards
- One commit per completed task (not per subtask)
- Descriptive commit messages with context
- Reference task ID in commit message
- Include Co-Authored-By: Claude line

### Error Handling
- If a task is blocked by dependencies, mark as blocked:
  ```bash
  task-master set-status --id=<task-id> --status=blocked
  ```
- If a task reveals new requirements, add new tasks:
  ```bash
  task-master add-task --prompt="[new requirement]" --research
  ```
- If implementation fails after 3 attempts, update task with findings:
  ```bash
  task-master update-task --id=<task-id> --prompt="Attempted implementation failed due to: [reason]. Recommended approach: [suggestion]."
  ```

## Stopping Conditions

Stop execution when:
1. All pending tasks are complete (`task-master list` shows 0 pending)
2. All remaining tasks are blocked by external dependencies
3. A critical error occurs that prevents further progress
4. User interrupts with new instructions

Report final status:
```bash
task-master list
git log --oneline -10
```

## Usage

```bash
/execute-all-tasks
```

Questo comando eseguirà **TUTTI** i task pendenti uno dopo l'altro fino al completamento o fino a quando non ci sono più task disponibili.

## Example Execution

```
🎯 Starting execution of all pending tasks...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK 1/16: Fix Audio Pipeline for Bidirectional Streaming (ID: 99)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Priority: HIGH
Dependencies: 31, 34 (✅ All satisfied)
Status: pending

Step 1: Getting task details...
✅ Task details loaded

Step 2: Analyzing complexity...
🔍 Complexity score: 8/10
📊 Recommended subtasks: 8-10

Step 3: Expanding task with research...
✅ Expanded into 9 subtasks

Subtasks:
  99.1 - Implement PCM16 audio encoding from microphone
  99.2 - Create audio chunk buffering system
  99.3 - Implement WebSocket audio transmission
  99.4 - Parse OpenAI audio response events
  99.5 - Implement audio playback callback
  99.6 - Fix JSON event parser for audio deltas
  99.7 - Add error handling for network issues
  99.8 - Implement audio level monitoring
  99.9 - Add comprehensive tests

Step 4: Executing subtasks...

  [99.1] Implementing PCM16 audio encoding...
    - Reading AudioPipelineManager.swift
    - Reading AVFoundation documentation
    - Implementing AVAudioEngine audio tap
    - Converting samples to PCM16 format
    ✅ Subtask 99.1 complete
    📝 Logged implementation notes

  [99.2] Creating audio chunk buffering...
    - Implementing ring buffer for audio chunks
    - Adding chunk size management (20ms chunks)
    ✅ Subtask 99.2 complete
    📝 Logged implementation notes

  [...continuing for all 9 subtasks...]

  ✅ All 9 subtasks complete!

Step 5: Building and testing...
  🔨 Building MirrorBuddy...
  ✅ Build succeeded (15.2s)

  🧪 Running tests...
  ✅ All tests passed (12/12)

  📱 Testing in simulator...
  - Opened VoiceConversationView
  - Pressed "Inizia Conversazione"
  - Spoke: "Ciao, mi aiuti con la matematica?"
  - ✅ Audio sent to OpenAI
  - ✅ Response received and played back
  - ✅ No crashes, no errors
  ✅ Feature verified working!

Step 6: Updating documentation...
  ✅ Updated CHANGELOG.md
  ✅ Updated code comments
  ✅ Documented new AudioChunkBuffer class

Step 7: Committing changes...
  ✅ Git commit created
  ✅ Commit message: "feat: fix audio pipeline for bidirectional streaming (Task #99)"

Step 8: Marking task complete...
  ✅ Task 99 marked as done

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TASK 1/16 COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Duration: 2h 15m
Files modified: 3
Tests added: 12
Commits: 1

Moving to next task...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK 2/16: Implement Voice Conversation Persistence (ID: 100)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Process repeats...]
```

## Notes

- This is a **long-running command** - expect hours of execution for many tasks
- Use **research mode** (`--research` flag) for complex tasks - ALWAYS for tasks with complexity >= 5
- **Test thoroughly** - "non fa un cazzo" is UNACCEPTABLE
- **Ask for clarification** if task requirements are ambiguous
- **Break large tasks** into manageable subtasks (5-10 subtasks ideal)
- **Document everything** - future you will thank you
- **Commit after each task** - granular commits make debugging easier
- **NEVER skip testing** - test in simulator, test edge cases, test errors

## Stopping Conditions

The command stops when:
1. ✅ All pending tasks completed successfully
2. ⚠️ A task fails and cannot be fixed after 3 attempts
3. 🚫 A task is blocked by unsatisfied dependencies
4. 🛑 User interrupts with new instructions

## Final Summary

```
🎉 ALL TASKS COMPLETE!

Duration: 18h 45m
Tasks completed: 16/16
Files created: 42
Files modified: 38
Tests added: 156
Commits: 16

Progress: 103/109 → 109/109 (100%) ████████████████████

All pending tasks executed successfully! 🚀
```
