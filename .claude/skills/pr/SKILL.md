---
name: pr
description: Open a PR with MirrorBuddy checklist — ci:summary green, conventional commit, issue link, wait CI, require explicit user approval before merge.
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
context: inline
user-invocable: true
---

# PR Skill — MirrorBuddy

Encodes recurring PR workflow. Prevents premature merges, skipped version bumps, missing issue links.

## Activation

Message contains `/pr` or `/pr {title}`.

## Hard Rules (NEVER skip)

1. `npm run ci:summary` green before `git push`.
2. Conventional commit subject (`feat|fix|chore|docs|refactor|test|release(scope): ...`).
3. PR body MUST link issue: `Closes #<n>` or `Refs #<n>`.
4. After push: run `gh pr checks <n>` — paste full output.
5. All checks SUCCESS → ask user: **"May I merge?"** — wait explicit yes.
6. NEVER `gh pr merge` autonomously. NEVER `--no-verify`. NEVER force-push to main.

## Workflow

### Phase 1 — Pre-flight

```bash
git status --short
git branch --show-current  # must NOT be main
npm run ci:summary         # must be green
```

If on main → abort. Create branch or worktree first (`/worktree-start`).

### Phase 2 — Commit

Use heredoc. Conventional format. Co-author line.

```bash
git add <specific files>
git commit -m "$(cat <<'EOF'
feat(scope): concise subject

Why this change (not what). Reference issue.

Closes #<n>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Phase 3 — Push + PR

```bash
git push -u origin <branch>
gh pr create --title "type(scope): subject" --body "$(cat <<'EOF'
## Summary
- <1-3 bullets>

## Test plan
- [ ] ci:summary green
- [ ] <feature-specific verification>

Closes #<n>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Phase 4 — CI watch

```bash
gh pr checks <n>   # paste output to user
```

All green → ask: **"May I merge?"**
Any red → fix, new commit (NEVER --amend pushed commits).

### Phase 5 — Merge (ONLY after explicit user yes)

```bash
gh pr merge <n> --squash --delete-branch
```

## Forbidden

- `git push --no-verify`
- `gh pr merge` without user yes
- `--amend` on pushed commits
- merge with red/pending CI
- hardcoded secrets in diff
- `console.log` left in
- missing issue link

## Related

- `/worktree-start` — create isolated worktree before coding
- `/verify-done` — gate before claiming completion
- `/release` — full release validation
