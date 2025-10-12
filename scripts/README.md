# MirrorBuddy Automation Scripts

This directory contains automation scripts for agent-driven development.

---

## Available Scripts

### `agent-init.sh`
Initialize an agent with its specification and assigned tasks.

**Usage**:
```bash
./scripts/agent-init.sh <agent-id>
```

**Example**:
```bash
./scripts/agent-init.sh foundation-agent
```

**What it does**:
- Shows agent specification
- Lists assigned tasks
- Reminds of constitution principles
- Provides next steps

---

### `daily-standup.sh`
Generate a daily standup report with project status.

**Usage**:
```bash
./scripts/daily-standup.sh
```

**What it reports**:
- Overall progress (from Task Master)
- Git status and recent commits
- Build status
- Test status
- SwiftLint warnings
- Blockers (manual update)
- Next steps

**Best practice**: Run every morning before starting work.

---

### `quality-gate.sh`
Check if code meets quality requirements before merge.

**Usage**:
```bash
./scripts/quality-gate.sh
```

**What it checks**:
1. Build succeeds
2. SwiftLint: 0 warnings
3. All tests pass
4. Test coverage >80%
5. No unaddressed TODOs
6. Constitution compliance

**Exit codes**:
- `0`: All checks passed ✅
- `1`: One or more checks failed ❌

**Best practice**: Run before every commit and PR.

---

## Setup

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

---

## Integration with Git Hooks

### Pre-commit hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
./scripts/quality-gate.sh
```

This runs quality checks before every commit.

---

## Integration with CI/CD

These scripts can be integrated into CI/CD pipelines:

**GitHub Actions example**:

```yaml
name: Quality Gate
on: [push, pull_request]
jobs:
  quality:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Quality Gate
        run: ./scripts/quality-gate.sh
```

---

## Task Master Integration

Scripts use Task Master CLI when available:

- `tm get-tasks`: List all tasks
- `tm next-task`: Get next task to work on
- `tm set-task-status <id> <status>`: Update task status
- `tm add-task`: Add new task

Install Task Master: [task-master-ai](https://www.npmjs.com/package/task-master-ai)

---

## Agent Workflow

Typical agent workflow using these scripts:

1. **Morning**: Run `daily-standup.sh` to see status
2. **Start work**: Run `agent-init.sh <your-agent-id>` to load context
3. **During work**: Update tasks in Task Master
4. **Before commit**: Run `quality-gate.sh` to verify quality
5. **End of day**: Commit and push, update Task Master

---

## Customization

Feel free to customize these scripts for your workflow. They are templates that can be adapted to your needs.

---

**Automate repetitive tasks. Focus on building. 🤖**
