# Implementation Plans

This folder contains all implementation plans for ConvergioEdu features.

## Folder Structure

```
docs/plans/
  completed/     # Finished plans (merged to main)
  in-progress/   # Plans currently being worked on
  README.md      # This file
```

## Plan Status

### Completed

| Plan | Date | Description | ADR |
|------|------|-------------|-----|
| MirrorBuddyPlanDec29 | 2025-12-29 | Conversation-First + Triangle of Support | 0010, 0012 |
| VoiceExperiencePlanDec29 | 2025-12-29 | Voice UX improvements | 0012 |
| ConversationFirstPlanDec29 | 2025-12-29 | Architecture overhaul | 0010 |
| MaestroToolsPlanDec30 | 2025-12-30 | Interactive tools system | 0009 |
| LandingShowcasePlanDec30 | 2025-12-30 | Showcase mode for offline | - |
| LocalStorageMigrationPlanDec31 | 2025-12-31 | Database-first architecture | 0015 |
| SessionSummaryUnifiedArchive-2026-01-01 | 2026-01-01 | Session summaries + unified archive | 0019 |

### In Progress

| Plan | Date | Description | ADR | Branch |
|------|------|-------------|-----|--------|
| KnowledgeBaseOptimization-2026-01-01 | 2026-01-01 | Knowledge base lazy loading | - | TBD |
| **UnifiedArchive-2026-01-01** | 2026-01-01 | Knowledge Hub - Unified Material Archive | 0020 | `feature/knowledge-hub` |

## Plan Template

See `@docs/plan-template.md` for the standard plan format.

## Workflow

1. Create plan in `in-progress/`
2. Create corresponding ADR in `docs/adr/`
3. Work on dedicated worktree/branch
4. Thor review before completion
5. Merge PR to main
6. Move plan to `completed/`

## Quality Gates

Before marking a plan as complete:

- [ ] All checkpoints marked done
- [ ] `npm run lint && npm run typecheck && npm run build` passes
- [ ] Thor quality review passed
- [ ] PR merged to main
- [ ] CHANGELOG updated
