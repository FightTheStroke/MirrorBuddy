# 🔴 tmQA - Task Master Quality Assurance System

## Overview

tmQA is a **brutally honest** quality assurance system for Task Master projects that verifies all completed tasks meet the highest standards through comprehensive automated checks and parallel agent execution.

## Key Features

### 🔴 Brutally Honest Reporting
- **No sugarcoating** - If it doesn't work, it says "FAIL 🔴"
- **Direct language** - "Code quality: FAIL - Duplicated logic in 5 places"
- **Clear severity** - CRITICAL/HIGH/MEDIUM/LOW with no ambiguity
- **Exposes fake implementations** - Tasks marked done with no actual code

### 🚀 Maximum Parallelism
- Launches **ALL verification agents simultaneously** in one message
- Uses Task tool with multiple subagents (task-checker, Explore)
- **4x faster** than serial execution
- Example: 4 tasks verified in ~10 min vs ~40 min serial

### 🧹 Repository Cleanliness (NEW!)
- Scans for junk files (.DS_Store, temp files, logs)
- Detects build artifacts in repo
- Verifies .gitignore completeness
- Checks documentation freshness
- Reports git status and uncommitted changes
- Identifies orphaned files

### 📁 Complete Repository Analysis
- Full feature catalog with dependencies
- Feature dependency graph
- Module coupling/cohesion analysis
- Architecture pattern detection
- Circular dependency detection

## What tmQA Checks

### 1. 🧹 Repository Cleanliness
- **Git Status**: Untracked files, uncommitted changes
- **Junk Files**: .DS_Store, *.tmp, *.log, *.bak, *.cache
- **Build Artifacts**: DerivedData, build/, xcuserdata
- **.gitignore**: Coverage for all necessary patterns
- **Documentation**: Freshness compared to code activity
- **Orphaned Files**: old/, backup/, archive/ directories

### 2. 🎯 Mission Alignment
- Task aligns with project goals
- In PRD scope
- No scope creep
- Fits repository organization

### 3. 🧹 Technical Debt
- Code quality (TODO/FIXME/HACK comments)
- Architecture patterns (SOLID, DDD, Clean Architecture)
- Performance (N+1 queries, indexing)
- Security (secrets, validation)
- Maintainability
- Module coupling/cohesion
- Circular dependencies

### 4. 📚 Documentation
- Code documentation (docstrings, comments)
- Project docs (README, ADRs, CHANGELOG)
- Task documentation (subtask notes)

### 5. ✅ Implementation
- All subtasks complete
- Build succeeds
- Tests pass (>80% coverage)
- Feature works end-to-end
- Edge cases handled

### 6. 📁 Repository Organization
- Complete feature catalog
- Feature dependency graph
- Module interconnections
- Architecture patterns used
- Feature completeness map

## Architecture

### Agent System

tmQA uses **N + 2 agents** running in parallel:

1. **N Task-Checker Agents** (one per completed task)
   - Subagent type: `task-checker`
   - Verifies individual task completion
   - Checks implementation, tests, documentation
   - Reports per-task findings

2. **Repository Cleanliness Inspector** (1 agent)
   - Subagent type: `task-checker`
   - Scans entire repository for junk
   - Analyzes .gitignore
   - Checks documentation freshness
   - Reports cleanliness score

3. **Architecture Analyzer** (1 agent)
   - Subagent type: `Explore`
   - Maps complete feature catalog
   - Builds dependency graph
   - Analyzes coupling/cohesion
   - Detects architecture patterns

### Intelligent Model Selection

tmQA automatically uses different Claude models based on task complexity:

**🚀 Claude 3.5 Haiku** (Fast & Cost-Effective)
- **Use for**: Repository Cleanliness Inspector
- **Tasks**: File scanning, pattern matching, git operations
- **Reasoning**: Simple operations, no deep analysis
- **Speed**: ~3-5 min
- **Cost**: Lowest

**⚡ Claude 3.5 Sonnet** (Balanced, Default)
- **Use for**: Task-checker agents, Architecture Analyzer
- **Tasks**: Code review, quality assessment, feature cataloging
- **Reasoning**: Moderate complexity, code understanding required
- **Speed**: ~5-10 min
- **Cost**: Medium

**🧠 Claude 3 Opus / Extended Thinking** (Deep Reasoning)
- **Use for**: Complex architectural decisions
- **Tasks**: Circular dependency analysis, deep coupling analysis
- **Reasoning**: Requires deep architectural understanding
- **Speed**: ~8-15 min
- **Cost**: Highest
- **Note**: Use sparingly

**Auto-selection**: Claude Code's Task tool automatically selects the appropriate model based on prompt complexity.

### Parallel Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│ Main Claude Session (Sonnet 4.5)                       │
│ /tmQA command invoked                                   │
└────────────┬────────────────────────────────────────────┘
             │
             ├─ Get all tasks with status="done"
             │  (e.g., 4 tasks: 113, 121, 137, 138)
             │
             ├─ Launch 6 agents in ONE message:
             │
             ├──────> Agent 1: Task-checker (Sonnet) for Task 113
             ├──────> Agent 2: Task-checker (Sonnet) for Task 121
             ├──────> Agent 3: Task-checker (Sonnet) for Task 137
             ├──────> Agent 4: Task-checker (Sonnet) for Task 138
             ├──────> Agent 5: Cleanliness (Haiku) Inspector
             └──────> Agent 6: Architecture (Sonnet) Analyzer
                      │
                      │ (All execute simultaneously)
                      │
             ┌────────┴─────────────────────────────────┐
             │ Wait for all agents to complete          │
             │ (~10 min wall time)                      │
             │ Cost optimized via Haiku for simple tasks│
             └────────┬─────────────────────────────────┘
                      │
                      ├─ Collect all agent reports
                      ├─ Compile into TMQAReport.md
                      └─ Update task statuses
```

## Output Report

### Location
`Docs/TMQAReport.md`

### Structure

```markdown
# 🔴 Task Master Quality Assurance Report

## 📊 Executive Summary
- Pass rate, critical issues, repository cleanliness status

## 🧹 Repository Cleanliness Report
- Git status
- Junk files found (with paths)
- .gitignore assessment
- Documentation freshness
- Cleanup actions required
- Cleanliness score

## 📁 Repository Organization Analysis
- Project structure tree
- Feature catalog
- Dependency graph
- Interconnection matrix
- Architecture patterns
- Coupling/cohesion analysis
- Feature completeness map

## 🎯 Mission Alignment Analysis
- Overall alignment score
- Tasks aligned vs out-of-scope
- Scope creep detection

## 🧹 Technical Debt Assessment
- Debt items by category and severity
- Critical technical debt
- Recommendations

## 📚 Documentation Status
- Documentation completeness
- Missing ADRs
- CHANGELOG gaps

## ✅ Implementation Quality
- Build status
- Test status
- Functional issues

## 🔴 Per-Task Detailed Results
[Individual reports for each task]

## 🚨 Critical Issues Requiring Immediate Action
[HIGH severity issues with impact and actions]

## 📈 Quality Trends
- Improvements
- Concerns
- Common patterns

## 🎯 Recommendations
- Immediate actions
- Short-term improvements
- Long-term process changes
- Technical debt reduction plan

## 📊 Metrics
[Table with targets and status]
```

## Usage

### Basic Usage

```bash
/tmQA
```

### Workflow

1. **Invocation**: Run `/tmQA` command
2. **Agent Launch**: 6+ agents launched in parallel
3. **Verification**: Each agent performs comprehensive checks
4. **Report Generation**: Results compiled into `Docs/TMQAReport.md`
5. **Review**: Read report and identify critical issues
6. **Action**: Address HIGH severity items immediately
7. **Re-verify**: Run `/tmQA` again after fixes

### Example Session

```bash
# 1. Run comprehensive QA
/tmQA

# Output: Launched 6 agents in parallel...
# Wait ~10 minutes

# 2. Review the report
cat Docs/TMQAReport.md

# 3. Found critical issues in Task 113
# Fix them
/execute-task 113

# 4. Re-run QA to verify
/tmQA
```

## Report Language Examples

### ❌ NEVER Say

- "Could be improved"
- "Might have issues"
- "Some edge cases not handled"
- "Should work fine"
- "Mostly complete"

### ✅ ALWAYS Say

- "Code quality: **FAIL** - Duplicated logic in 5 places"
- "Documentation: **INCOMPLETE** - No ADR, no comments, no README update"
- "Implementation: **BROKEN** - Feature crashes on launch"
- "Testing: **MISSING** - 0 tests written"
- "Technical debt: **HIGH** - 47 TODO comments, no error handling"
- "Repository: **DIRTY** - 23 .DS_Store files, build artifacts in git"

## Status Ratings

### Overall Status
- ✅ **PASS**: Production ready, no compromises
- ⚠️ **PARTIAL**: Has issues, needs fixes before shipping
- 🔴 **FAIL**: Not acceptable, start over or major rework

### Cleanliness Score
- **EXCELLENT**: 90-100% - Pristine repository
- **GOOD**: 70-89% - Minor cleanup needed
- **FAIR**: 50-69% - Moderate issues
- **POOR**: <50% - Major cleanup required

### Severity Levels

#### 🔴 CRITICAL
- Secrets in repo
- Build artifacts committed
- Security vulnerabilities
- **Action**: Fix immediately

#### ⚠️ HIGH
- No tests
- Missing documentation
- Performance issues
- **Action**: Fix this sprint

#### 💡 MEDIUM
- Junk files scattered
- TODO comments
- Code duplication
- **Action**: Fix next sprint

#### 💬 LOW
- Minor style issues
- Orphaned files
- Editor configs
- **Action**: Nice to have

## Integration

### With Task Master

```bash
# After QA, update task status
task-master set-status --id=113 --status=review

# Log QA findings
task-master update-task --id=113 --prompt="🔴 QA Issues: [list]"

# After fixes, re-verify
task-master set-status --id=113 --status=done
task-master update-task --id=113 --append --prompt="✅ QA Verified"
```

### With Git

```bash
# Before major commits
/tmQA

# Clean up junk files found
find . -name ".DS_Store" -delete

# Update .gitignore based on findings

# Commit cleanup
git add .gitignore
git commit -m "chore: repository cleanup based on tmQA findings"
```

## Best Practices

### When to Run

- **Weekly**: Before sprint planning
- **Pre-release**: Before major versions
- **After major features**: Verify quality
- **When quality concerns**: Find all issues at once
- **Before code freeze**: Ensure cleanliness

### Interpreting Results

1. **Read Executive Summary first** - Get overall picture
2. **Check Critical Issues** - Address immediately
3. **Review Cleanliness Report** - Clean up repo
4. **Scan Per-Task Results** - Identify patterns
5. **Follow Recommendations** - Systematic improvement

### Acting on Findings

#### Priority Order

1. 🔴 **CRITICAL** - Stop everything, fix now
2. ⚠️ **HIGH** - This sprint
3. 💡 **MEDIUM** - Next sprint
4. 💬 **LOW** - Backlog

#### Common Actions

**For dirty repository:**
```bash
# Remove junk files
find . -name ".DS_Store" -delete
find . -name "*.log" -delete

# Update .gitignore
echo ".DS_Store" >> .gitignore
echo "*.log" >> .gitignore
```

**For outdated documentation:**
```bash
# Update CHANGELOG
echo "## [Version] - $(date +%Y-%m-%d)" >> CHANGELOG.md

# Update README if needed
```

**For technical debt:**
```bash
# Create tasks to address debt
task-master add-task --prompt="Refactor duplicated logic in UserManager"
task-master add-task --prompt="Add missing tests for AuthService"
```

## Comparison with /review-task

| Feature | `/review-task <id>` | `/tmQA` |
|---------|---------------------|---------|
| **Scope** | Single task | ALL done tasks |
| **Depth** | Implementation | Implementation + Architecture + Cleanliness |
| **Report** | Terminal output | `Docs/TMQAReport.md` |
| **Analysis** | Task-specific | Repository-wide |
| **Tech Debt** | Basic check | Comprehensive scan |
| **Features** | No | Complete catalog with dependencies |
| **Cleanliness** | No | Full repository scan |
| **Parallelism** | N/A (1 task) | Maximum (all agents parallel) |
| **Speed** | ~5 min | ~10 min for multiple tasks |
| **Use Case** | Quick task check | Deep quality audit |

## Philosophy

> **"Fatto bene è meglio di fatto veloce"**
> _Done well is better than done fast!_

### Core Principles

1. **Honesty over comfort** - Truth helps improvement
2. **Quality is non-negotiable** - No "good enough for now"
3. **Cleanliness matters** - Junk accumulates into problems
4. **Documentation is code** - Undocumented = doesn't exist
5. **Technical debt compounds** - Pay it down regularly
6. **Architecture evolves** - Keep track of changes
7. **Speed through parallelism** - Work smarter, not longer

### Goals

- ✅ Catch quality issues before they ship
- ✅ Maintain clean, professional repository
- ✅ Track architectural evolution
- ✅ Identify technical debt early
- ✅ Ensure documentation stays current
- ✅ Provide actionable improvement plans
- ✅ Fast execution through parallelism

---

**tmQA v1.0** • The goal is improvement through honesty, not comfort through lies. 🔴
