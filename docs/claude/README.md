# On-Demand Documentation System

Claude Code loads this documentation on-demand to reduce context usage.

## Usage

Reference files with `@docs/claude/filename.md` in conversation.

## Available Documentation

| File | Purpose |
|------|---------|
| `mirrorbuddy.md` | Triangle of Support, Coach/Buddy system, character routing |
| `voice-api.md` | Azure Realtime API, models, session config, debug |
| `tools.md` | Tool execution, mindmap/quiz/flashcard creation |
| `notifications.md` | Server-side notifications, PWA push |
| `parent-dashboard.md` | GDPR consent, parent-professor chat |
| `pomodoro.md` | Timer phases, XP rewards |
| `onboarding.md` | Voice onboarding with Melissa |
| `ambient-audio.md` | Procedural audio, presets, Pomodoro integration |

## Context Optimization (Jan 2026)

Changes made to reduce context from 132k to ~50k tokens at session start:

| Optimization | Savings |
|--------------|---------|
| Consolidated 6 rules → 1 | ~10k tokens |
| Archived 52 agents (kept 9) | ~4k tokens |
| Disabled pr-review-toolkit plugin | ~1k tokens |
| Archived 3 unused skills | ~1k tokens |
| Slimmed CLAUDE.md (833 → 157 lines) | ~7k tokens |

## Manual Compact

Auto-compact triggers at 95% (not configurable). Use `/compact` proactively at ~85% for better performance.

## Per-Project Settings

`.claude/settings.json` can override:
- `enabledPlugins` - Enable/disable plugins
- `permissions` - Tool permissions
- `hooks` - Custom automation
