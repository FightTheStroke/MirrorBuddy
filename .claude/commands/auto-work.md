# Auto Work Command

**Autonomous sequential execution** of Task Master tasks. Works through the task queue automatically until completion or user interruption.

## Usage

```bash
/auto-work                  # Start autonomous execution from next task
/auto-work --from 15        # Start from specific task
/auto-work --limit 5        # Execute max 5 tasks then stop
/auto-work --until-blocked  # Stop when hitting a blocked task
```

---

## How It Works

### Continuous Execution Loop

```
┌─────────────────────────────────────┐
│  1. Find next available task        │
│     ↓                                │
│  2. Verify dependencies satisfied   │
│     ↓                                │
│  3. Create feature branch           │
│     ↓                                │
│  4. Execute agent                   │
│     ↓                                │
│  5. Run quality checks              │
│     ↓                                │
│  6. Commit & merge                  │
│     ↓                                │
│  7. Mark task done                  │
│     ↓                                │
│  8. Show progress                   │
│     ↓                                │
│  9. Continue to step 1 ─────────────┤
│     (until no more tasks or limit)  │
└─────────────────────────────────────┘
```

---

## Autonomous Workflow

### Phase 1: Initial Assessment

```bash
$ /auto-work

🤖 AUTO-WORK MODE ACTIVATED

Analyzing task queue...
- Total tasks: 83
- Completed: 12
- Pending: 71
- Blocked: 0

Foundation phase: ✅ 11/11 complete
Ready for parallel-capable tasks!

Execution plan (next 10 available):
1. Task 15 - Keychain Storage (foundation-agent) ~2h
2. Task 16 - Google OAuth (api-agent) ~3h
3. Task 17 - Drive Listing (api-agent) ~2h
4. Task 18 - Drive Download (api-agent) ~2h
5. Task 26 - Dashboard UI (swiftui-agent) ~4h
6. Task 27 - Material Cards (swiftui-agent) ~2h
7. Task 35 - Camera Integration (vision-agent) ~3h
8. Task 31 - Realtime API (voice-agent) ~4h
9. Task 19 - PDF Extraction (api-agent) ~2h
10. Task 20 - Summary Generation (api-agent) ~3h

Estimated total time: ~27 hours
Estimated completion: 3-4 work days (sequential)

Starting in 5 seconds... (Ctrl+C to cancel)
```

### Phase 2: Task Execution

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 TASK 15/83: Keychain Storage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: foundation-agent
Dependencies: ✅ All satisfied
Branch: feature/task-15-keychain-storage

Launching /foundation-agent 15...

[Agent executes task - shows progress]

✅ Implementation complete!
- Created: Core/Security/SecureStorage.swift
- Created: Tests/SecurityTests/SecureStorageTests.swift
- Modified: MirrorBuddy.xcodeproj

Quality checks:
- SwiftLint: ✅ 0 warnings
- Build: ✅ Success (3.2s)
- Tests: ✅ 3/3 passed

Committing...
✅ Committed: feat(task-15): implement keychain storage

Merging to main...
✅ Merged successfully

Updating TaskMaster...
✅ Task 15 marked as done

Progress: 13/83 (15.7%) ████░░░░░░░░░░░░░░░░

Moving to next task in 3 seconds...
```

### Phase 3: Continuous Progress

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 TASK 16/83: Google OAuth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: api-agent
Dependencies: ✅ Task 15 done
Branch: feature/task-16-oauth

Launching /api-agent 16...

[Agent works...]

✅ Complete!
Progress: 14/83 (16.9%) ████░░░░░░░░░░░░░░░░

Moving to next task...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 TASK 17/83: Drive Listing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Continues automatically...]
```

### Phase 4: Completion or Pause

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 SESSION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tasks completed in this session: 10
Time elapsed: 6 hours 23 minutes
Tasks remaining: 61

Completed:
✅ Task 15 - Keychain Storage
✅ Task 16 - Google OAuth
✅ Task 17 - Drive Listing
✅ Task 18 - Drive Download
✅ Task 26 - Dashboard UI
✅ Task 27 - Material Cards
✅ Task 35 - Camera Integration
✅ Task 31 - Realtime API
✅ Task 19 - PDF Extraction
✅ Task 20 - Summary Generation

Progress: 22/83 (26.5%) ██████░░░░░░░░░░░░░░

Next available tasks:
1. Task 21 - Mind Map Generation (mindmap-agent)
2. Task 28 - Material Detail View (swiftui-agent)
3. Task 36 - GPT-5 Vision (vision-agent)

Resume with: /auto-work
Exit: /stop
```

---

## Smart Interruption Handling

### User Interruption (Ctrl+C)

```bash
[During task execution]

^C
⚠️ INTERRUPTION DETECTED

Current task: Task 16 (Google OAuth)
Status: 67% complete (implementing error handling)

Options:
1. Continue this task then pause
2. Abort current task (rollback changes)
3. Pause immediately (save progress)

Choice: 1

Finishing current task...
✅ Task 16 complete

Session paused after 2 tasks.
Resume with: /auto-work --from 17
```

### Automatic Pause Triggers

```bash
⏸️ AUTO-PAUSE TRIGGERED

Reason: Blocked task encountered
Task 42 (Calendar Integration) blocked by Task 16 (incomplete)

Completed before pause: 1 task (Task 15)
Remaining: 70 tasks

Next available non-blocked task: Task 26 (Dashboard UI)

Resume with: /auto-work --skip-blocked
Or fix blocker: /work-next --task 16
```

### Error Handling

```bash
❌ ERROR DETECTED

Task: 16 (Google OAuth)
Agent: api-agent
Error: Build failed - GoogleSignIn dependency missing

Automatic actions taken:
1. ✅ Rolled back changes
2. ✅ Deleted feature branch
3. ✅ Returned to main branch
4. ✅ Task 16 marked as "pending" (not done)

Session paused for manual intervention.

Suggested fix:
Add GoogleSignIn-iOS to Package.swift dependencies

After fix, resume with: /auto-work --from 16
```

---

## Advanced Options

### Limit Execution

```bash
# Execute max 5 tasks
/auto-work --limit 5

# Execute until 5pm
/auto-work --until 17:00

# Execute for 4 hours
/auto-work --duration 4h
```

### Skip Patterns

```bash
# Skip certain agents (e.g., if tests need manual setup)
/auto-work --skip-agent test-agent

# Skip complex tasks (complexity > 7)
/auto-work --skip-complex

# Skip blocked tasks
/auto-work --skip-blocked
```

### Priority Mode

```bash
# Execute high-priority tasks first
/auto-work --priority-first

# Execute specific phase
/auto-work --phase 1  # Core features only
```

---

## Safety Features

### Pre-Flight Checks (Every Task)
- ✅ Working directory clean
- ✅ On main branch
- ✅ All dependencies satisfied
- ✅ Build succeeds before starting
- ✅ Tests pass before starting

### During Execution
- 🔄 Continuous SwiftLint checks
- 🔄 Constitution compliance verification
- 🔄 Build validation after each file
- 🔄 Test execution (if tests exist)

### Post-Execution Validation
- ✅ SwiftLint: 0 warnings
- ✅ Build succeeds
- ✅ Tests pass
- ✅ Accessibility requirements met (if UI task)
- ✅ QA agent approval (for critical tasks)

### Automatic Rollback
If ANY check fails:
1. Discard all changes
2. Delete feature branch
3. Return to main
4. Mark task as pending
5. Pause for manual intervention

---

## Progress Tracking

### Real-Time Updates

```bash
# In separate terminal, monitor progress:
watch -n 5 'task-master list | head -20'

# Or use dashboard:
/auto-work --dashboard

# Shows live:
# - Current task
# - Agent working
# - Time elapsed
# - Tasks completed
# - Estimated time remaining
# - Recent commits
```

### Session Reports

At the end of session (or on interruption):

```markdown
## 🤖 Auto-Work Session Report
**Date**: 2025-10-13 09:00 - 15:23
**Duration**: 6h 23m
**Tasks Completed**: 10/83 (12%)

### Completed Tasks
| ID | Title | Agent | Time | Status |
|----|-------|-------|------|--------|
| 15 | Keychain Storage | foundation-agent | 1h 45m | ✅ |
| 16 | Google OAuth | api-agent | 2h 10m | ✅ |
| 17 | Drive Listing | api-agent | 35m | ✅ |
| ... | ... | ... | ... | ... |

### Quality Metrics
- SwiftLint warnings: 0
- Build failures: 0
- Test failures: 0
- Rollbacks: 0
- Average time per task: 38m

### Next Session
Recommended start: /auto-work --from 21
Estimated completion: 3 more days

### Commits Created
- 10 feature branches merged to main
- 342 files changed
- +12,450 lines added
- Clean git history maintained
```

---

## Configuration

Create `.claude/auto-work.json`:

```json
{
  "maxTasksPerSession": 10,
  "pauseAfterHours": 8,
  "pauseBetweenTasks": 3,
  "autoSkipBlocked": true,
  "requireApproval": {
    "highComplexity": true,
    "criticalTasks": true,
    "infrastructureChanges": true
  },
  "notifications": {
    "taskComplete": true,
    "sessionComplete": true,
    "errorOccurred": true
  }
}
```

---

## Comparison with Manual

### ❌ Manual Workflow

```bash
# You:
task-master next
# ... read output ...
# ... figure out which agent ...
cat AGENT_TASK_MAPPING.md
# ... find the right command ...
/api-agent 16
# ... wait for completion ...
# ... oh, need to commit ...
git add .
git commit -m "..."
# ... update taskmaster ...
task-master set-status --id=16 --status=done
# ... what's next? ...
task-master next
# ... repeat 70 more times ...

⏱️ Per task overhead: ~5 minutes
⏱️ Total overhead for 71 tasks: ~6 hours
😫 Mental fatigue: HIGH
```

### ✅ Auto-Work

```bash
# You:
/auto-work

[Goes to make coffee ☕]
[Has lunch 🍝]
[Takes a walk 🚶]
[Comes back]

# Claude:
✅ 10 tasks complete!
Progress: 22/83

⏱️ Per task overhead: 0 seconds
⏱️ Your time saved: ~6 hours
😊 Mental fatigue: ZERO
```

---

## When to Use

### ✅ Use Auto-Work When:
- You want to make rapid progress
- Tasks are well-defined
- Foundation phase is complete
- You can monitor occasionally
- You trust the agents

### ❌ Don't Use Auto-Work When:
- Tasks require design decisions
- External blockers exist (API keys, access)
- You need to review each change carefully
- Complex refactoring in progress
- Learning how agents work

---

## Emergency Stop

```bash
# In another terminal:
touch /tmp/mirrorbuddy-stop

# Auto-work will detect and pause gracefully after current task
```

---

Ready to implement? This will save you HOURS of manual coordination! 🚀
