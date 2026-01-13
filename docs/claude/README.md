# On-Demand Documentation System

Claude Code loads this documentation on-demand to reduce context usage.

## Usage

Reference files with `@docs/claude/filename.md` in conversation.

## Available Documentation

| File | Purpose |
|------|---------|
| `ambient-audio.md` | Procedural audio, presets, Pomodoro integration |
| `api-routes.md` | API endpoints reference |
| `buddies.md` | 5 Peer Buddies definitions |
| `coaches.md` | 5 Learning Coaches definitions |
| `conversation-memory.md` | Memory injection, context management |
| `database.md` | Prisma schema, models, relations |
| `gamification.md` | XP, MirrorBucks, achievements, seasons |
| `knowledge-hub.md` | Materials, collections, search |
| `learning-path.md` | Progressive learning paths, topic analysis |
| `mirrorbuddy.md` | Triangle of Support, character routing |
| `notifications.md` | Server-side notifications, PWA push |
| `onboarding.md` | Voice onboarding with Melissa |
| `parent-dashboard.md` | GDPR consent, parent-professor chat |
| `pomodoro.md` | Timer phases, XP rewards |
| `session-summaries.md` | Session summary generation |
| `summary-tool.md` | Summary tool, export formats |
| `tools.md` | Tool execution, mindmap/quiz/flashcard |
| `voice-api.md` | Azure Realtime API, models, debug |

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
