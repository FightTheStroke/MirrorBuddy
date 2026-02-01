# Codex Task Delegation Template

## Instructions for the Codex Agent

You are executing a single task from a plan. Follow these rules EXACTLY.

### Git Workflow (NON-NEGOTIABLE)

1. **Create a branch**: `git checkout -b codex/{task_id}` (e.g. `codex/T5-03`)
2. **ONE commit per task**: Never combine multiple tasks in one commit
3. **Conventional commit message**: `{type}({scope}): {description} [Plan {plan_id}, {task_id}]`
   - Example: `feat(api): migrate user routes to pipe() [Plan 113, T5-03]`
4. **NEVER commit to main**: If you find yourself on main, STOP and create a branch first
5. **NEVER touch files outside the scope**: Only modify files listed in the task
6. **No unrelated changes**: Don't fix typos, add comments, or "improve" code not in scope

### Validation (MANDATORY before commit)

```bash
npx tsc --noEmit                    # Must pass with 0 errors
npx eslint {changed_files} --quiet  # Must pass with 0 errors/warnings
```

If either fails, fix the issues before committing. Do not commit broken code.

### Output Format

After completing the task, report EXACTLY this structure:

```
## Task: {task_id}
Branch: codex/{task_id}
Commit: {sha} {message}

### Files Changed
- {file}: {what changed}

### Validation
- TypeScript: PASS/FAIL
- ESLint: PASS/FAIL

### Notes
{anything the coordinator needs to know}
```

---

## Task Details (fill in before delegating)

- **Plan**: {plan_id}
- **Task ID**: {task_id}
- **Description**: {what to do}
- **Files** (ONLY these):
  - {file1}
  - {file2}
- **Pattern to apply**: {migration pattern or reference}
- **Verification**: {grep/test commands to confirm success}
- **Do NOT**: {explicit exclusions}
