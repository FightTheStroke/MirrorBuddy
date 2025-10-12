# Agent Orchestration Command

Analyzes Task Master dependencies and coordinates parallel execution of multiple specialized agents to maximize development velocity.

## Usage

```
/orchestrate                    # Analyze and execute next available tasks
/orchestrate task $TASK_ID      # Execute specific task with appropriate agent
/orchestrate phase $PHASE_NUM   # Execute all tasks in a phase
```

## How It Works

1. **Dependency Analysis**: Reads tasks.json and builds dependency graph
2. **Agent Mapping**: Maps each task to appropriate specialized agent
3. **Parallel Execution**: Identifies tasks with no blocking dependencies
4. **Coordination**: Launches multiple agents concurrently when possible
5. **Progress Tracking**: Updates Task Master as agents complete work

## Agent Assignment Rules

Based on `agents.yaml` configuration:

### Phase 0: Foundation (Weeks 1-2)
- **Tasks 1-15**: `foundation-agent` (BLOCKS ALL - must run first)

### Phase 1: Core Features (Weeks 3-6)
Can run in parallel after Phase 0:
- **Tasks 16-20, 23-25, 42-43**: `api-agent`
- **Tasks 26-29, 44**: `swiftui-agent`
- **Task 31, 33-34**: `voice-agent`
- **Task 35-36, 38**: `vision-agent`
- **Tasks 21-22, 39-41**: `mindmap-agent`
- **Tasks 30, 72**: `automation-agent`

### Phase 2: Advanced Features (Weeks 7-10)
- **Tasks 46-54, 78-79**: Various agents based on feature area
- **Tasks 55-56**: `swiftui-agent` + `api-agent`

### Phase 3: Polish & Launch (Weeks 11-12)
- **Tasks 60, 73-77**: `accessibility-agent` (HIGH PRIORITY)
- **Tasks 61-65**: `test-agent`
- **Task 66-71**: `test-agent` + `qa-agent`
- **Tasks 80-81**: Final preparation

## Orchestration Logic

```yaml
# From agents.yaml
foundation-agent:
  parallel: false          # MUST run alone
  max_concurrent: 1
  blocks: ["all"]         # Blocks everything
  blocked_by: []

swiftui-expert-agent:
  parallel: true          # Can run with others
  max_concurrent: 3       # Up to 3 tasks at once
  blocked_by: ["foundation-agent"]

api-integration-agent:
  parallel: true
  max_concurrent: 3
  blocked_by: ["foundation-agent"]

# ... (other agents)
```

## Execution Strategy

### Step 1: Check Foundation
```bash
# Foundation complete?
task-master get-task --id=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 --status

# If not complete, run foundation-agent first
```

### Step 2: Identify Ready Tasks
```bash
# Get all pending tasks
task-master list --status=pending --with-subtasks

# Filter by:
# - Dependencies satisfied
# - Not blocked by incomplete tasks
# - Agent not at max_concurrent
```

### Step 3: Launch Agents in Parallel
```typescript
// Pseudo-code for parallel execution
const readyTasks = analyzeDepend encies()
const agentGroups = groupByAgent(readyTasks)

// Launch up to max_parallel_agents (5) concurrently
for (const [agent, tasks] of agentGroups) {
  if (tasks.length <= agent.max_concurrent) {
    // Launch all tasks for this agent
    await Promise.all(
      tasks.map(task => executeAgent(agent, task))
    )
  }
}
```

### Step 4: Monitor & Update
```bash
# As agents complete:
# 1. Mark tasks as done
# 2. Check if new tasks are unblocked
# 3. Launch next wave of agents
# 4. Update daily standup report
```

## Example Orchestration Session

```bash
# Week 1-2: Foundation Phase
/orchestrate phase 0
# Runs: foundation-agent on tasks 1-15 (sequentially)
# Status: ████████████░░░░░░░░ 60% (9/15 done)

# Week 3: Parallel Development Begins!
/orchestrate
# Analyzes: All foundation tasks done ✅
# Launches in parallel:
#   - api-agent: Tasks 16, 17, 18 (Google Drive)
#   - swiftui-agent: Task 26 (Dashboard UI)
#   - swiftdata-agent: Custom queries
#   - voice-agent: Task 31 (Realtime API)

# Week 4: More Parallel Work
/orchestrate
# Current:
#   - api-agent: Tasks 19, 20 (PDF + AI processing)
#   - swiftui-agent: Tasks 27, 28, 29 (Material views + Voice UI)
#   - mindmap-agent: Tasks 21, 22 (Generation + DALL-E)
#   - vision-agent: Tasks 35, 36 (Camera + Vision API)

# Week 11: Polish & Test
/orchestrate phase 3
# Launches:
#   - accessibility-agent: Tasks 60, 73-77
#   - test-agent: Tasks 61-65
#   - qa-agent: Code review all completed features
```

## Quality Gates

Before launching any agent:
- [ ] Dependencies satisfied
- [ ] Foundation tasks complete (for non-foundation agents)
- [ ] Previous agent work approved by QA
- [ ] API budget available
- [ ] Tests passing for dependent tasks

After agent completes:
- [ ] `/qa-agent task $TASK_ID` passes
- [ ] Task marked as done in Task Master
- [ ] Dependent tasks notified
- [ ] Progress report updated

## Daily Standup Report

Generated automatically at 09:00 CET:

```markdown
# MirrorBuddy Development Standup - 2025-10-13

## Yesterday's Progress
- ✅ foundation-agent: Completed Tasks 1-10 (CloudKit sync working!)
- ✅ api-agent: Completed Task 16 (Google OAuth)
- 🔄 swiftui-agent: In progress Task 26 (Dashboard 80% done)

## Today's Plan
- 🚀 swiftui-agent: Complete Task 26, start 27-28
- 🚀 api-agent: Tasks 17-18 (Drive integration)
- 🚀 voice-agent: Start Task 31 (Realtime API)
- 🚀 mindmap-agent: Start Task 21 (Generation)

## Blockers
- None! Foundation complete ✅

## Questions for Human
- Design feedback needed for Dashboard (Task 26)
- Confirm DALL-E cost budget for mind map images
```

## Escalation Triggers

Escalate to human if:
- Agent blocked > 2 hours
- API rate limit exceeded
- Critical bug found
- Security vulnerability detected
- Architecture decision required
- Cost exceeds budget

---

## Implementation

When you execute this command, you will:

1. **Read agent configuration**:
   ```bash
   cat .claude/agents/agents.yaml
   ```

2. **Get current task status**:
   ```bash
   task-master list --with-subtasks
   ```

3. **Analyze dependency graph**:
   - Build graph from task dependencies
   - Identify tasks with all dependencies satisfied
   - Group by assigned agent

4. **Execute agents**:
   Use Task tool with multiple concurrent invocations:
   ```typescript
   await Promise.all([
     Task({
       subagent_type: "general-purpose",
       prompt: "/api-agent 16"
     }),
     Task({
       subagent_type: "general-purpose",
       prompt: "/swiftui-agent 26"
     }),
     Task({
       subagent_type: "general-purpose",
       prompt: "/voice-agent 31"
     })
   ])
   ```

5. **Monitor and update**:
   - Wait for completion
   - Update Task Master
   - Generate progress report
   - Identify next wave

---

**Coordinate agents like a symphony conductor. Build in parallel, deliver faster. 🎼**
