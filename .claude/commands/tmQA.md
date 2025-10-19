# 🔴 Task Master Quality Assurance (tmQA)

Comprehensive quality assurance system that verifies all completed tasks meet the highest standards.

## 🎯 Purpose

Systematically verify that all tasks marked as "done" in Task Master:
- ✅ Are **actually complete** and **working**
- 📚 Have **complete documentation**
- 🧹 Don't introduce **technical debt**
- 🎯 Align with **repository mission and objectives**

## Usage

```
/tmQA
```

This command launches the task-checker agent to perform comprehensive quality assurance on all completed tasks and generates a detailed report.

## 🔴 Brutally Honest Approach

**NO SUGARCOATING. NO EXCUSES. ONLY TRUTH.**

This QA process is **brutally honest** because:

- **If it doesn't work, we say it doesn't work** - No "mostly works" or "should work"
- **Technical debt is called out by name** - No hiding behind "could be improved"
- **Missing documentation = FAIL** - No excuses about "planning to add it later"
- **Fake implementations are exposed** - Tasks marked "done" with no actual code
- **Quality issues are HIGH severity** - Not "minor improvements"

### The tmQA Philosophy

```
✅ PASS = Production ready, no compromises
⚠️ PARTIAL = Has issues, needs fixes before shipping
🔴 FAIL = Not acceptable, start over or major rework
```

**No middle ground. No "good enough for now."**

### Report Language

The report uses **direct, unambiguous language**:

❌ **NEVER say:**
- "Could be improved"
- "Might have issues"
- "Some edge cases not handled"
- "Should work fine"
- "Mostly complete"

✅ **ALWAYS say:**
- "Code quality: FAIL - Duplicated logic in 5 places"
- "Documentation: INCOMPLETE - No ADR, no comments, no README update"
- "Implementation: BROKEN - Feature crashes on launch"
- "Testing: MISSING - 0 tests written"
- "Technical debt: HIGH - 47 TODO comments, no error handling"

### If You Find Issues, Say It Loudly

```markdown
🚨 CRITICAL: Task X marked "done" but feature doesn't work
🚨 CRITICAL: No tests, no documentation, hardcoded values everywhere
🚨 CRITICAL: Introduced 3 memory leaks and broke 2 existing features
```

**The goal is improvement through honesty, not comfort through lies.**

## 🔴 Quality Assurance Checklist

### 1. 🎯 Mission & Objectives Alignment

For each task, verify it aligns with repository goals:

**Read project documentation:**
```bash
cat README.md
cat CLAUDE.md
cat .taskmaster/docs/prd.txt
```

**Verify:**
- [ ] Task contributes to project mission
- [ ] Implements requirements from PRD
- [ ] Follows architectural decisions (ADRs)
- [ ] Supports long-term project goals
- [ ] No scope creep or unnecessary features

**Questions to ask:**
- Does this task move the project forward?
- Is this aligned with the product vision?
- Would this be valuable to end users?
- Does this follow the technical roadmap?

### 2. 🧹 Technical Debt Assessment

**Code Quality Checks:**
- [ ] No TODO comments left in production code
- [ ] No FIXME or HACK comments
- [ ] No commented-out code blocks
- [ ] No hardcoded values (use constants/config)
- [ ] No copy-paste code duplication
- [ ] No overly complex functions (> 50 lines)
- [ ] No circular dependencies
- [ ] No unused imports or variables

**Architecture Review:**
- [ ] Follows SOLID principles
- [ ] Proper separation of concerns
- [ ] Dependency injection used appropriately
- [ ] No tight coupling between modules
- [ ] Clean Architecture layers respected
- [ ] DDD patterns applied correctly

**Performance & Scalability:**
- [ ] No N+1 query problems
- [ ] Proper indexing on database queries
- [ ] Efficient algorithms (no unnecessary O(n²))
- [ ] No memory leaks (check closures)
- [ ] Async operations handled properly
- [ ] Caching strategy appropriate

**Security:**
- [ ] No exposed secrets or API keys
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS prevention (if applicable)
- [ ] CSRF protection (if applicable)
- [ ] Authentication/authorization correct

**Maintainability:**
- [ ] Code is self-documenting
- [ ] Meaningful variable/function names
- [ ] Consistent code style
- [ ] Follows project conventions
- [ ] Easy to understand for new developers

### 3. 📚 Documentation Completeness

**Code Documentation:**
- [ ] All public APIs have docstrings
- [ ] Complex logic has explanatory comments
- [ ] Comments explain "why" not just "what"
- [ ] Type annotations present (TypeScript/Python)
- [ ] Examples provided for complex functions

**Project Documentation:**
- [ ] README.md updated (if user-facing feature)
- [ ] API documentation updated
- [ ] Architecture Decision Records (ADRs) created
- [ ] CHANGELOG.md has entry for this task
- [ ] Migration guides (if breaking changes)

**Task Documentation:**
- [ ] All subtasks have implementation notes
- [ ] Task details are complete and accurate
- [ ] Dependencies are documented
- [ ] Test strategy is documented
- [ ] Known issues/limitations documented

### 4. ✅ Complete Implementation

**Functional Completeness:**
- [ ] All subtasks marked "done"
- [ ] All acceptance criteria met
- [ ] Feature works end-to-end
- [ ] Edge cases handled
- [ ] Error cases handled gracefully

**Code Exists and Works:**
- [ ] Files mentioned in task actually exist
- [ ] Code compiles/builds without errors
- [ ] No runtime errors or crashes
- [ ] Feature behaves as specified
- [ ] Integration with existing code works

**Testing:**
- [ ] Build succeeds: `xcodebuild` / `npm run build` / `pytest`
- [ ] All tests pass
- [ ] New tests added for new functionality
- [ ] Test coverage adequate (>80%)
- [ ] Integration tests pass
- [ ] Manual testing performed

**Git History:**
- [ ] Commits reference task IDs
- [ ] Commit messages are descriptive
- [ ] Changes are logical and atomic
- [ ] No merge conflicts
- [ ] Branch follows naming convention

## 🔴 Workflow

### Step 1: Get All Completed Tasks

```bash
task-master list --status=done
```

Review the list and note all task IDs marked as "done".

### Step 2: Launch Task-Checker Agents (PARALLEL EXECUTION)

**🚀 MAXIMUM PARALLELISM STRATEGY**

Launch task-checker agents for **ALL** completed tasks **IN PARALLEL** for maximum speed:

**Step 2.1: Intelligent Model Selection**

tmQA uses different Claude models based on task complexity for optimal speed/accuracy balance:

**🚀 Claude 3.5 Haiku** (Fast, Cost-Effective)
- Repository Cleanliness Inspector
- Simple file scanning tasks
- .gitignore verification
- Git status checks
- **Why**: File operations, pattern matching, no deep reasoning needed
- **Speed**: ~3-5 min

**⚡ Claude 3.5 Sonnet** (Balanced, Default)
- Task-checker agents (most tasks)
- Architecture Analyzer
- Feature catalog building
- Code review
- **Why**: Requires code understanding, pattern detection, quality assessment
- **Speed**: ~5-10 min

**🧠 Claude 3 Opus / Extended Thinking** (Deep Reasoning)
- Complex architectural decisions
- Circular dependency analysis
- Deep coupling/cohesion analysis
- **Why**: Requires deep reasoning about system design
- **Speed**: ~8-15 min
- **Note**: Use sparingly, only for complex analysis

**Recommendation**: Let Claude Code auto-select. The Task tool will choose appropriately based on prompt complexity.

**Step 2.2: Prepare Agent List**

```bash
# Get all done task IDs
task-master list --status=done | grep -o "Task [0-9]*" | awk '{print $2}'
```

Example output: `113, 121, 137, 138` (4 tasks)

**Step 2.3: Launch ALL Agents in SINGLE Message**

**CRITICAL**: Use **ONE message** with **MULTIPLE Task tool calls** to launch all agents simultaneously.

Example for 4 tasks:
```
I will launch 4 task-checker agents in parallel to verify tasks 113, 121, 137, and 138 simultaneously.

[Use Task tool - agent 1 for task 113]
[Use Task tool - agent 2 for task 121]
[Use Task tool - agent 3 for task 137]
[Use Task tool - agent 4 for task 138]
```

**Why parallel?**
- 4 tasks serially = ~40 minutes (10 min each)
- 4 tasks parallel = ~10 minutes (all at once)
- **4x FASTER** ⚡

**Step 2.4: Special Agents for Global Analysis**

In addition to per-task agents, launch **2 special agents** for repository-wide analysis:

**Agent A: Repository Cleanliness Inspector**
- Single dedicated agent
- Scans entire repo for junk files
- Checks .gitignore completeness
- Verifies documentation freshness
- Runs in parallel with task agents

**Agent B: Architecture Analyzer**
- Single dedicated agent
- Maps complete feature catalog
- Builds dependency graph
- Analyzes coupling/cohesion
- Runs in parallel with task agents

**Total agents = N tasks + 2 global agents**

Example: 4 tasks = 6 agents running simultaneously

**Model Selection Strategy:**
- Cleanliness Inspector → Haiku (fast file scanning)
- Architecture Analyzer → Sonnet (balanced analysis)
- Task-checkers → Sonnet (default for code review)

**Step 2.5: Agent Instructions Template**

**For each task-checker agent**, provide these instructions:

```
🔴 COMPREHENSIVE QA VERIFICATION - Task ID: <task-id>

Perform exhaustive quality assurance following the tmQA protocol:

## 0. REPOSITORY ORGANIZATION ANALYSIS (📁)
**FIRST TIME ONLY** - If this is the first task being verified, analyze the entire repository:

- Map complete directory structure
- Identify ALL features in the codebase
- Document feature locations (which files implement which features)
- Build feature dependency graph (which features depend on which)
- Identify architecture patterns used
- Analyze module cohesion and coupling
- Find circular dependencies
- Assess feature completeness (implementation, tests, docs)

Use glob patterns to find feature implementations:
```bash
# Find all Swift/TS/Python/etc files
find . -name "*.swift" -o -name "*.ts" -o -name "*.py"

# Search for feature keywords
grep -r "class.*Manager" .
grep -r "protocol.*Service" .
grep -r "struct.*View" .
```

Build the complete feature catalog for the report.

## 1. REPOSITORY CLEANLINESS (🧹)
**EVERY TIME** - Always check repository cleanliness:

### Git Status Check
```bash
git status
```

**Look for:**
- Untracked files that shouldn't exist
- Modified files not committed
- Uncommitted changes

### Junk Files Detection
```bash
# macOS junk
find . -name ".DS_Store"

# Build artifacts
find . -name "*.build" -o -name "DerivedData" -o -name "build/"
find . -name "*.xcodeproj/xcuserdata" -o -name "*.xcworkspace/xcuserdata"

# Temporary files
find . -name "*.tmp" -o -name "*.temp" -o -name "*~" -o -name "*.bak"

# Log files
find . -name "*.log"

# Node/npm artifacts (if applicable)
find . -name "node_modules" -type d

# Python artifacts (if applicable)
find . -name "__pycache__" -o -name "*.pyc"

# Cache files
find . -name ".cache" -o -name "*.cache"

# Backup files
find . -name "*.orig" -o -name "*.swp" -o -name "*.swo"

# Editor configs scattered around
find . -name ".vscode" -o -name ".idea" -type d
```

### .gitignore Verification
```bash
cat .gitignore
```

**Verify .gitignore includes:**
- Build directories
- IDE-specific files
- Temporary files
- Log files
- OS-specific files (.DS_Store)
- Secrets and credentials files

### Documentation Freshness
```bash
# Check when documentation was last updated
ls -lt README.md CHANGELOG.md Docs/*.md

# Compare with recent code changes
git log --since="1 month ago" --oneline | head -20
```

**Verify:**
- README.md updated within last 30 days (if active development)
- CHANGELOG.md has entry for latest changes
- Documentation reflects current codebase state
- No outdated examples or instructions
- All links work (no 404s)

### Orphaned Files
```bash
# Find files not referenced anywhere
# (manual inspection needed)

# Check for old test files
find . -name "*Test.swift" -o -name "*.test.ts" -o -name "test_*.py"

# Check for commented-out files
ls | grep -i "old\|backup\|archive\|deprecated"
```

**Issues to Report:**
- 🔴 **CRITICAL**: Secrets or credentials files not in .gitignore
- 🔴 **HIGH**: Build artifacts committed to repo
- ⚠️ **MEDIUM**: Junk files (.DS_Store, temp files) scattered around
- ⚠️ **MEDIUM**: Documentation outdated (>30 days old with recent code changes)
- ⚠️ **LOW**: Orphaned test files or old backups
- ⚠️ **LOW**: Editor configs not in .gitignore

## 2. MISSION ALIGNMENT (🎯)
- Read: README.md, CLAUDE.md, .taskmaster/docs/prd.txt
- Verify task aligns with project mission and goals
- Check if task is in PRD scope
- Confirm no scope creep
- Check task fits into overall repository organization

## 3. TECHNICAL DEBT SCAN (🧹)
- Search for TODO, FIXME, HACK in code: grep -r "TODO\|FIXME\|HACK" .
- Check for code duplication
- Review architecture patterns (SOLID, DDD, Clean Architecture)
- Verify no hardcoded values
- Check for memory leaks in closures
- Review security (no exposed secrets, proper validation)
- Assess performance (no N+1, proper indexing)
- Identify tight coupling between modules
- Find circular dependencies

## 4. DOCUMENTATION AUDIT (📚)
- Verify all public APIs documented
- Check ADRs exist for architectural decisions
- Confirm CHANGELOG.md updated
- Ensure README.md reflects changes (if applicable)
- Validate all subtasks have implementation notes
- Review inline code comments

## 5. IMPLEMENTATION VERIFICATION (✅)
- Get task details: task-master show <task-id>
- Read ALL files mentioned in task
- Build the project (appropriate build command for tech stack)
- Run ALL tests
- Test feature manually
- Verify all subtasks are genuinely complete
- Check git commits reference task ID

## 6. GENERATE DETAILED REPORT

For THIS task, create a section in TMQAReport.md:

```markdown
### 🔴 Task <task-id>: <task-title>

**Status After QA:** [PASS ✅ | FAIL 🔴 | PARTIAL ⚠️]

#### 🧹 Repository Cleanliness
- Git status: [CLEAN/DIRTY]
- Junk files found: [count or "None"]
- Build artifacts: [CLEAN/FOUND]
- Documentation freshness: [CURRENT/OUTDATED]
- .gitignore complete: [YES/NO]
- Issues: [list or "None"]

#### 🎯 Mission Alignment
- Aligned with project goals: [YES/NO]
- In PRD scope: [YES/NO]
- Issues: [list or "None"]

#### 🧹 Technical Debt
- Code quality: [PASS/FAIL]
- Architecture: [PASS/FAIL]
- Performance: [PASS/FAIL]
- Security: [PASS/FAIL]
- Issues found: [list or "None"]

#### 📚 Documentation
- Code documentation: [COMPLETE/INCOMPLETE]
- Project docs updated: [YES/NO]
- ADRs created: [YES/NO/N/A]
- Issues: [list or "None"]

#### ✅ Implementation
- All subtasks complete: [YES/NO]
- Build successful: [YES/NO]
- Tests passing: [YES/NO]
- Feature working: [YES/NO]
- Issues: [list or "None"]

#### 🔧 Required Actions
[List specific fixes needed, or "None - ready for production"]

#### 📊 Final Recommendation
[Keep as "done" | Change to "review" | Change to "in-progress"]
```

## 6. UPDATE TASK STATUS

If issues found:
```bash
task-master set-status --id=<task-id> --status=review
task-master update-task --id=<task-id> --prompt="🔴 QA Issues found: [detailed list]"
```

If passed all checks:
```bash
# Keep as done, add verification note
task-master update-task --id=<task-id> --append --prompt="✅ QA Verified: All checks passed"
```
```

**Step 2.6: Special Agent A - Repository Cleanliness Inspector**

Launch this agent **in parallel** with task agents using:

**Task tool with subagent_type="task-checker"**

Provide these instructions:

```
🧹 REPOSITORY CLEANLINESS INSPECTION

Your mission: Scan the entire repository for cleanliness issues.

## Tasks:

1. **Git Status Audit**
```bash
git status
git status --porcelain
```
Report: Untracked files, uncommitted changes, modified files

2. **Junk Files Scan**
```bash
# macOS artifacts
find . -name ".DS_Store" -print

# Build artifacts
find . -name "DerivedData" -o -name "*.build" -o -name "build/"
find . -name "*.xcodeproj/xcuserdata" -o -name "*.xcworkspace/xcuserdata"

# Temporary files
find . -name "*.tmp" -o -name "*.temp" -o -name "*~" -o -name "*.bak"

# Log files
find . -name "*.log" -print

# Cache files
find . -name ".cache" -o -name "*.cache"

# Editor artifacts
find . -name "*.swp" -o -name "*.swo" -o -name "*.orig"

# Old/backup directories
find . -type d -name "*old*" -o -name "*backup*" -o -name "*archive*"
```

3. **.gitignore Analysis**
```bash
cat .gitignore
```
Check coverage:
- Build artifacts
- IDE files (.vscode, .idea)
- OS files (.DS_Store)
- Temp files
- Secrets/credentials

4. **Documentation Freshness**
```bash
ls -lt README.md CHANGELOG.md CLAUDE.md Docs/*.md | head -20
git log --since="30 days ago" --oneline -- "*.swift" "*.ts" "*.py" | wc -l
```

Compare doc update dates with code activity.

5. **Generate Cleanliness Section for TMQAReport.md**

Include:
- Full git status
- Complete list of junk files with paths
- .gitignore gaps
- Documentation freshness table
- Cleanup actions (CRITICAL/MEDIUM/LOW)
- Cleanliness score (0-100%)

**Output:** Complete "Repository Cleanliness Report" section for the final report.
```

**Step 2.7: Special Agent B - Architecture Analyzer**

Launch this agent **in parallel** with all others using:

**Task tool with subagent_type="Explore"**

Provide these instructions:

```
📁 REPOSITORY ARCHITECTURE ANALYSIS

Your mission: Map complete feature catalog and architecture.

## Tasks:

1. **Directory Structure Mapping**
```bash
tree -L 3 -I 'DerivedData|Build|*.xcodeproj|node_modules'
# or
find . -type d -maxdepth 3 | grep -v DerivedData | grep -v Build
```

2. **Feature Discovery**
```bash
# Swift features
grep -r "class.*Manager" --include="*.swift" | cut -d: -f1 | sort -u
grep -r "protocol.*Service" --include="*.swift" | cut -d: -f1 | sort -u
grep -r "struct.*View" --include="*.swift" | cut -d: -f1 | sort -u
grep -r "final class" --include="*.swift" | cut -d: -f1 | sort -u

# Find all main Swift files
find . -name "*.swift" -not -path "*/Tests/*" | head -50
```

3. **Build Complete Feature Catalog**

For each feature found, document:
- Feature name
- Implementation status (Implemented/Partial/Planned)
- File locations
- Dependencies (imports, uses)
- Dependents (what uses this)
- Quality status (from task verifications)

4. **Dependency Graph Construction**
```bash
# Analyze imports
grep -r "^import " --include="*.swift" | head -100

# Find feature interconnections
# (analyze class references, protocol conformances)
```

5. **Architecture Pattern Detection**

Identify:
- MVVM patterns
- Repository pattern
- Service layer pattern
- Dependency injection usage
- Singleton usage

6. **Module Coupling Analysis**

Analyze:
- High cohesion modules (good)
- Low coupling modules (good)
- Tight coupling (bad)
- Circular dependencies (very bad)

7. **Generate Architecture Sections for TMQAReport.md**

Include:
- Complete project structure tree
- Full feature catalog with metadata
- Feature dependency graph
- Interconnection matrix
- Architecture patterns used
- Cohesion/coupling analysis
- Feature completeness map

**Output:** Complete "Repository Organization Analysis" section for the final report.
```

**Step 2.8: Example Parallel Launch**

**Concrete example with 4 completed tasks (113, 121, 137, 138):**

Launch **6 agents total** in **ONE message**:

```
I will launch 6 agents in parallel for comprehensive QA:

Agent 1: Task-checker for Task 113
Agent 2: Task-checker for Task 121
Agent 3: Task-checker for Task 137
Agent 4: Task-checker for Task 138
Agent 5: Repository Cleanliness Inspector
Agent 6: Architecture Analyzer

[Use Task tool with subagent_type="task-checker" - Agent 1 instructions for Task 113]
[Use Task tool with subagent_type="task-checker" - Agent 2 instructions for Task 121]
[Use Task tool with subagent_type="task-checker" - Agent 3 instructions for Task 137]
[Use Task tool with subagent_type="task-checker" - Agent 4 instructions for Task 138]
[Use Task tool with subagent_type="task-checker" - Agent 5 Cleanliness instructions]
[Use Task tool with subagent_type="Explore" - Agent 6 Architecture instructions]
```

All 6 agents execute simultaneously.

**Step 2.9: Monitor Agent Progress**

All agents run in parallel. Monitor their completion:

```bash
# Agents will report back when complete
# Task-checker agents: ~5-10 min each
# Cleanliness agent: ~3-5 min
# Architecture agent: ~5-8 min

# Total wall time: ~10 min (vs ~40 min serial)
# Speed improvement: 4x faster ⚡
```

**Wait for ALL agents to complete before proceeding to Step 3.**

### Step 3: Generate Complete Report

After all agents complete, compile their findings into **TMQAReport.md**:

```markdown
# 🔴 Task Master Quality Assurance Report

**Date:** YYYY-MM-DD
**Generated by:** /tmQA command
**Total Tasks Verified:** X

---

## 📊 Executive Summary

- **Pass Rate:** XX%
- **Tasks Passed:** X
- **Tasks Failed:** X
- **Tasks Partial:** X
- **Critical Issues:** X
- **Technical Debt Items:** X
- **Repository Cleanliness:** [CLEAN ✅ | NEEDS CLEANUP ⚠️ | DIRTY 🔴]

---

## 🧹 Repository Cleanliness Report

### Git Status
```
[Output of git status]
```

**Status:** [CLEAN ✅ | UNCOMMITTED CHANGES ⚠️ | UNTRACKED FILES 🔴]

### Junk Files Found

**macOS Artifacts:**
- .DS_Store files: X found
  - Locations: [list paths]

**Build Artifacts:**
- DerivedData: [FOUND/NOT FOUND]
- Build directories: X found
  - Locations: [list paths]
- Xcode user data: X found

**Temporary Files:**
- *.tmp/*.temp: X found
- Backup files (~, *.bak): X found
- Editor swap files (*.swp): X found
  - Locations: [list paths]

**Log Files:**
- *.log files: X found
  - Locations: [list paths]

**Cache Files:**
- .cache directories: X found
  - Locations: [list paths]

**Orphaned Files:**
- Old/backup/archive directories: X found
  - Locations: [list paths]

### .gitignore Assessment

**Status:** [COMPLETE ✅ | INCOMPLETE ⚠️ | MISSING 🔴]

**Missing entries:**
- [List patterns that should be added]

**Current coverage:**
- Build artifacts: [YES/NO]
- IDE files: [YES/NO]
- OS files: [YES/NO]
- Temporary files: [YES/NO]
- Secrets/credentials: [YES/NO]

### Documentation Freshness

| File | Last Updated | Status |
|------|--------------|--------|
| README.md | YYYY-MM-DD | [CURRENT ✅ / OUTDATED ⚠️] |
| CHANGELOG.md | YYYY-MM-DD | [CURRENT ✅ / OUTDATED ⚠️] |
| CLAUDE.md | YYYY-MM-DD | [CURRENT ✅ / OUTDATED ⚠️] |
| ADRs | YYYY-MM-DD | [CURRENT ✅ / OUTDATED ⚠️] |

**Recent code activity:** [Summary of last 30 days]

**Issues:**
- [List documentation that needs updating]

### Cleanup Actions Required

**🔴 CRITICAL (Do immediately):**
- [List critical cleanup items]

**⚠️ MEDIUM (Do this week):**
- [List medium priority items]

**💡 LOW (Nice to have):**
- [List low priority items]

### Cleanliness Score

**Overall:** [EXCELLENT 90-100% | GOOD 70-89% | FAIR 50-69% | POOR <50%]

- No junk files: [XX%]
- .gitignore complete: [XX%]
- Documentation current: [XX%]
- Git status clean: [XX%]

---

## 📁 Repository Organization Analysis

### Project Structure Overview

```
[Project Root]/
├── [Directory 1]/          # [Purpose]
│   ├── [Subdirectory]/    # [Purpose]
│   └── [Files...]
├── [Directory 2]/          # [Purpose]
└── ...
```

**Key Directories:**
- **[Directory]**: [Purpose and contents]
- **[Directory]**: [Purpose and contents]
- ...

### Feature Catalog

**Complete list of all features in the repository:**

#### Core Features
1. **[Feature Name]**
   - **Status**: [Implemented/Partial/Planned]
   - **Location**: [File paths]
   - **Dependencies**: [List of other features this depends on]
   - **Dependents**: [List of features that depend on this]
   - **Quality Status**: [PASS ✅ | FAIL 🔴 | PARTIAL ⚠️]
   - **Description**: [Brief description]

2. **[Feature Name]**
   - **Status**: [Implemented/Partial/Planned]
   - **Location**: [File paths]
   - **Dependencies**: [List]
   - **Dependents**: [List]
   - **Quality Status**: [PASS ✅ | FAIL 🔴 | PARTIAL ⚠️]
   - **Description**: [Brief description]

...

#### Supporting Features
[Same structure as above]

#### Infrastructure/Utilities
[Same structure as above]

### Feature Dependency Graph

```
Feature A
  ├─> depends on Feature B
  ├─> depends on Feature C
  └─> depends on Utility X
      └─> depends on Feature D

Feature E
  ├─> depends on Feature A
  └─> depends on Feature C

Feature F (Standalone)
```

### Feature Interconnection Matrix

| Feature | Depends On | Used By | Coupling Level |
|---------|------------|---------|----------------|
| Feature A | B, C, Util-X | E | HIGH |
| Feature B | None | A, F | MEDIUM |
| Feature C | None | A, E, G | HIGH |
| Feature D | Util-X | None | LOW |
| ... | ... | ... | ... |

**Coupling Levels:**
- **HIGH**: Used by 3+ features or critical path
- **MEDIUM**: Used by 1-2 features
- **LOW**: Standalone or minimal dependencies

### Architecture Patterns Used

- **[Pattern Name]**: [Where and how it's used]
  - Files: [List]
  - Quality: [Assessment]

- **[Pattern Name]**: [Where and how it's used]
  - Files: [List]
  - Quality: [Assessment]

### Module Organization Assessment

**Cohesion Analysis:**
- **HIGH Cohesion** (Good): [List modules]
- **MEDIUM Cohesion**: [List modules]
- **LOW Cohesion** (Problem): [List modules]

**Coupling Analysis:**
- **LOW Coupling** (Good): [List modules]
- **MEDIUM Coupling**: [List modules]
- **HIGH Coupling** (Problem): [List modules]

**Circular Dependencies:**
- [List any circular dependencies found - this is BAD]

### Feature Completeness Map

| Feature | Implementation | Tests | Documentation | Status |
|---------|---------------|-------|---------------|---------|
| Feature A | 100% | 85% | 90% | ✅ COMPLETE |
| Feature B | 70% | 40% | 50% | ⚠️ PARTIAL |
| Feature C | 30% | 0% | 20% | 🔴 INCOMPLETE |
| ... | ... | ... | ... | ... |

---

## 🎯 Mission Alignment Analysis

**Overall Alignment:** [EXCELLENT | GOOD | FAIR | POOR]

**Findings:**
- Tasks aligned with mission: X/X (XX%)
- Out-of-scope features: X
- Scope creep detected: [YES/NO]

**Issues:**
- [List tasks not aligned with mission]

---

## 🧹 Technical Debt Assessment

**Overall Code Quality:** [EXCELLENT | GOOD | FAIR | POOR]

**Debt Items Found:**
1. [Category] - [Description] - [Severity: HIGH/MEDIUM/LOW]
2. [Category] - [Description] - [Severity: HIGH/MEDIUM/LOW]
...

**By Category:**
- Code Quality Issues: X
- Architecture Violations: X
- Performance Issues: X
- Security Concerns: X
- Maintainability Issues: X

**Critical Technical Debt (HIGH severity):**
- [List critical items requiring immediate attention]

---

## 📚 Documentation Status

**Overall Documentation:** [COMPLETE | MOSTLY COMPLETE | INCOMPLETE]

**Findings:**
- Tasks with complete docs: X/X (XX%)
- Missing ADRs: X
- Outdated README: [YES/NO]
- CHANGELOG gaps: X

**Documentation Debt:**
- [List missing or incomplete documentation]

---

## ✅ Implementation Quality

**Overall Completion:** [EXCELLENT | GOOD | FAIR | POOR]

**Build Status:**
- Successful builds: X/X
- Failed builds: X/X
- Build errors: [List if any]

**Test Status:**
- Tests passing: X/X (XX%)
- Test coverage: XX%
- Missing tests: X

**Functional Issues:**
- Features not working: X
- Edge cases unhandled: X
- Error handling missing: X

---

## 🔴 Per-Task Detailed Results

[Insert individual task reports from agents here]

### 🔴 Task 1: [Title]
[Agent report]

### 🔴 Task 2: [Title]
[Agent report]

...

---

## 🏆 Quality Champions (Top Performers)

Tasks that passed all QA checks:
1. Task X: [Title] - Perfect implementation ⭐
2. Task Y: [Title] - Excellent quality ⭐
...

---

## 🚨 Critical Issues Requiring Immediate Action

1. **[Task ID]**: [Issue] - **Severity: HIGH** 🔴
   - Impact: [Description]
   - Action: [What needs to be done]

2. **[Task ID]**: [Issue] - **Severity: HIGH** 🔴
   - Impact: [Description]
   - Action: [What needs to be done]

---

## ⚠️ Medium Priority Issues

[List medium priority issues with task IDs]

---

## 📈 Quality Trends

**Improvements:**
- [What's getting better]

**Concerns:**
- [What's declining]

**Common Patterns:**
1. [Most frequent issue type] - X occurrences
2. [Second most frequent] - X occurrences
3. [Third most frequent] - X occurrences

---

## 🎯 Recommendations

### Immediate Actions (This Sprint)
1. [Action item]
2. [Action item]
3. [Action item]

### Short-term Improvements (Next Sprint)
1. [Action item]
2. [Action item]

### Long-term Process Changes
1. [Action item]
2. [Action item]

### Technical Debt Reduction Plan
1. [Step]
2. [Step]
3. [Step]

---

## 📊 Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| QA Pass Rate | XX% | >90% | 🔴/⚠️/✅ |
| Code Coverage | XX% | >80% | 🔴/⚠️/✅ |
| Documentation Complete | XX% | 100% | 🔴/⚠️/✅ |
| Technical Debt Items | X | <10 | 🔴/⚠️/✅ |
| Build Success Rate | XX% | 100% | 🔴/⚠️/✅ |
| Test Pass Rate | XX% | 100% | 🔴/⚠️/✅ |

---

## 🔄 Next Steps

1. Address critical issues (HIGH severity)
2. Review and fix failed tasks
3. Update documentation gaps
4. Reduce technical debt
5. Re-run tmQA after fixes

---

**Report End** • Generated by tmQA v1.0 • 🔴
```

Save this report to: **Docs/TMQAReport.md**

### Step 4: Review & Take Action

1. Read the complete TMQAReport.md
2. Address critical issues first (HIGH severity 🔴)
3. Create follow-up tasks for medium issues
4. Update task statuses based on findings
5. Schedule technical debt reduction work

## 🔴 Best Practices

1. **Run tmQA regularly** - Weekly or before releases
2. **Don't skip critical issues** - Address HIGH severity items immediately
3. **Track trends** - Compare reports over time
4. **Learn from patterns** - Fix root causes, not symptoms
5. **Maintain documentation** - Keep TMQAReport.md updated
6. **Re-verify after fixes** - Run tmQA again on fixed tasks

## 🚨 Common Red Flags

### 🔴 "Non funziona un cazzo"
**Symptoms:**
- Feature not working
- Build broken
- Tests failing
- Runtime crashes

**QA Action:**
- Status: `in-progress`
- Severity: HIGH
- Immediate fix required

### 🔴 "Technical Debt Bomb"
**Symptoms:**
- Multiple TODO/FIXME comments
- Duplicated code everywhere
- No tests
- Hardcoded values

**QA Action:**
- Status: `review`
- Severity: MEDIUM-HIGH
- Refactoring required

### 🔴 "Ghost Implementation"
**Symptoms:**
- Task marked done
- No code actually written
- No commits found
- Files don't exist

**QA Action:**
- Status: `pending`
- Severity: HIGH
- Re-implementation required

### 🔴 "Documentation Desert"
**Symptoms:**
- No comments
- No README updates
- No ADRs
- No CHANGELOG entry

**QA Action:**
- Status: `review`
- Severity: MEDIUM
- Documentation sprint required

## 📂 Report Location

All QA reports are saved to:
```
Docs/TMQAReport.md
```

Archive previous reports with date:
```bash
mv Docs/TMQAReport.md Docs/archive/TMQAReport-$(date +%Y-%m-%d).md
```

## 🔧 Troubleshooting

**If agents fail to complete:**
- Run serially instead of parallel
- Check API keys are configured
- Reduce batch size
- Check system resources

**If report generation fails:**
- Manually compile agent reports
- Use template structure above
- Save partial results
- Re-run failed tasks

## 📝 Integration with Task Master

The tmQA process integrates seamlessly with Task Master:

```bash
# Run QA before major milestones
/tmQA

# After fixes, re-verify specific tasks
/review-task <task-id>

# Update tasks with QA findings
task-master update-task --id=<id> --prompt="QA findings: ..."

# Change status based on QA results
task-master set-status --id=<id> --status=review
```

---

## 🎯 Remember

**The goal is not to punish - it's to improve!**

- Quality issues are learning opportunities
- Technical debt is normal - managing it is key
- Documentation gaps can be filled
- Failed QA ≠ failed developer
- Use findings to improve processes

**🔴 "Fatto bene è meglio di fatto veloce"** - Done well is better than done fast!

---

**End of tmQA Protocol** • Use with `/tmQA` command
