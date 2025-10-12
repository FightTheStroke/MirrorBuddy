# Work Next Command

**Sequential, safe workflow** for working on the next available Task Master task with the appropriate specialized agent.

## Usage

```bash
/work-next              # Analyze and start next available task
/work-next --task 26    # Work on specific task
/work-next --show       # Show next 5 tasks without starting
```

---

## How It Works (Sequential & Safe)

### 1. **Analyze Dependencies**
```bash
# Check TaskMaster for next available task
task-master next

# Verify all dependencies are satisfied
# Check that foundation phase (1-15) is complete
```

### 2. **Identify Correct Agent**
Based on AGENT_TASK_MAPPING.md:
- Task 1-15 → foundation-agent
- Task 16-20, 23-25, 42-43 → api-agent
- Task 26-29, 32, 44-45, 55-56 → swiftui-agent
- Task 31, 33-34, 50-54 → voice-agent
- Task 35-38 → vision-agent
- Task 21-22, 39-41 → mindmap-agent
- Task 30, 72 → automation-agent
- Task 60, 73-77 → accessibility-agent
- Task 61-66 → test-agent

### 3. **Create Feature Branch**
```bash
# Automatically create branch with convention:
# feature/task-{ID}-{slug}

git checkout -b feature/task-26-dashboard-ui
```

### 4. **Execute Agent**
```bash
# Launch appropriate agent slash command
/{agent-name} {task-id}

# Example:
/swiftui-agent 26
```

### 5. **Quality Check**
```bash
# After agent completes:
# 1. Run SwiftLint
swiftlint

# 2. Build project
xcodebuild -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)' build

# 3. Run tests (if applicable)
xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)'
```

### 6. **Commit**
```bash
git add .
git commit -m "feat(task-26): implement dashboard UI

Implemented by: swiftui-agent
- Created DashboardView with subject organization
- Added MaterialCard component
- Implemented VoiceOver support
- All touch targets >= 44x44pt

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 7. **Merge to Main**
```bash
git checkout main
git merge feature/task-26-dashboard-ui
git branch -d feature/task-26-dashboard-ui

# Mark task as done
task-master set-status --id=26 --status=done
```

### 8. **Next Task**
```bash
# Automatically find next task
/work-next
```

---

## Example Session

```bash
$ /work-next

🔍 Analyzing next available task...

Found: Task 15 - Implement Secure Keychain Storage
Agent: foundation-agent
Dependencies: ✅ All satisfied (Task 1 done)
Complexity: 5/10
Estimated time: 2-3 hours

📋 Task Details:
Create secure Keychain storage for API keys and OAuth tokens.
Uses Security framework with proper access controls.

🎯 Assigned Agent: foundation-agent
Spec: .claude/specs/foundation-agent.md

Creating branch: feature/task-15-keychain-storage...
✅ Branch created

Launching agent: /foundation-agent 15

---

[Agent works on task...]

---

✅ Task completed!

Quality checks:
- SwiftLint: ✅ 0 warnings
- Build: ✅ Success
- Tests: ✅ 3/3 passed

Committing...
✅ Committed: feat(task-15): implement keychain storage

Merging to main...
✅ Merged

Updating TaskMaster...
✅ Task 15 marked as done

---

📊 Progress: 13/83 tasks complete (15.7%)

Next available tasks:
1. Task 16 - Google Drive OAuth (api-agent) ← RECOMMENDED
2. Task 26 - Dashboard UI (swiftui-agent)
3. Task 35 - Camera Integration (vision-agent)

Run /work-next to continue!
```

---

## Safety Features

### ✅ Pre-Flight Checks
- Verify working directory is clean
- Check no uncommitted changes
- Ensure on main branch before creating feature branch
- Verify dependencies satisfied

### ✅ During Execution
- Agent follows spec from .claude/specs/
- Constitution principles enforced
- Mario-first design verified
- SwiftLint runs continuously

### ✅ Post-Execution Validation
- SwiftLint must pass (0 warnings)
- Build must succeed
- Tests must pass (if present)
- Accessibility requirements checked

### ✅ Rollback on Failure
```bash
# If anything fails:
git checkout main
git branch -D feature/task-X
# Task remains in "pending" status
# No damage to main branch
```

---

## Workflow Comparison

### ❌ Without /work-next (Manual)
```bash
# 1. Figure out which task to do next
task-master list
# ... read through 83 tasks ...
# ... check dependencies manually ...

# 2. Figure out which agent to use
cat .claude/AGENT_TASK_MAPPING.md
# ... find task 26 ...
# ... oh it's swiftui-agent ...

# 3. Create branch manually
git checkout -b feature/dashboard
# ... oops, forgot naming convention ...

# 4. Launch agent
/swiftui-agent 26

# 5. Remember to test
# ... oh right, need to run tests ...

# 6. Commit
git commit -m "dashboard"
# ... oops, bad commit message ...

# 7. Merge
git checkout main
git merge feature/dashboard

# 8. Update TaskMaster
task-master set-status --id=26 --status=done

# 9. Repeat for next task
# ... what was next again? ...

⏱️ Time per task: ~15 minutes overhead
```

### ✅ With /work-next (Automated)
```bash
/work-next
# → Analyzes dependencies
# → Identifies correct agent
# → Creates properly named branch
# → Launches agent with context
# → Runs quality checks
# → Creates proper commit message
# → Merges safely to main
# → Updates TaskMaster
# → Shows next available tasks

⏱️ Time per task: ~30 seconds overhead
```

**Savings: 14.5 minutes per task × 71 remaining tasks = 17 hours saved** 🚀

---

## Advanced Options

### Show Only (No Execution)
```bash
/work-next --show

# Shows next 5 available tasks without starting work
```

### Work on Specific Task
```bash
/work-next --task 26

# Skip dependency analysis, work on Task 26 directly
# (Only if dependencies are satisfied)
```

### Dry Run
```bash
/work-next --dry-run

# Simulates entire workflow without making changes
# Useful for testing or planning
```

### Skip Tests
```bash
/work-next --skip-tests

# For tasks that don't have tests yet
# (Not recommended, but available)
```

---

## Integration with TaskMaster

Every task in TaskMaster now includes:

```json
{
  "id": 26,
  "title": "Create Subject-Organized Dashboard UI",
  "agent": "swiftui-agent",
  "agentCommand": "/swiftui-agent 26",
  "spec": ".claude/specs/swiftui-expert-agent.md",
  "qualityGates": [
    "VoiceOver labels on all elements",
    "Touch targets >= 44x44pt",
    "Dynamic Type support",
    "SwiftLint: 0 warnings"
  ]
}
```

This metadata makes /work-next intelligent and fully automated.

---

## Next Steps

After I implement this:

1. Update ALL tasks in TaskMaster with agent metadata
2. Create /work-next command logic
3. Test with Task 15 (next pending foundation task)
4. Establish workflow for remaining 71 tasks

**Estimated implementation time: ~20 minutes**

Ready to proceed? 🎯
