# Implementation Plans

Kanban board per i piani di implementazione di MirrorBuddy.

## Folder Structure

```
docs/plans/
├── todo/              # Da fare
├── doing/             # In esecuzione
├── done/              # Completati
├── reference/         # Documentazione di riferimento
└── README.md          # Questo file
```

## Kanban Board

### TODO

| Plan | Data | Descrizione | Priority |
|------|------|-------------|----------|
| 🔴 [TESTS TO BE DONE ASAP](todo/TestToBeDoneAsap.md) | 2026-01-02 | **CRITICAL - E2E failures + Manual tests - BLOCKS PR merge** | **CRITICAL** |
| [ToolsInChatNavigation](todo/ToolsInChatNavigation-2026-01-02.md) | 2026-01-02 | Fix navigazione tool nella chat normale | MEDIUM |
| [RepoMigration-MirrorBuddy](todo/RepoMigration-MirrorBuddy-2026-01-02.md) | 2026-01-02 | Rebrand MirrorBuddy → MirrorBuddy + transfer ownership | MEDIUM |
| [DashboardAnalytics](todo/DashboardAnalytics-2026-01.md) | 2026-01-02 | Dashboard analytics enhancement (backlog) | LOW |

### DOING

| Plan | Data | Descrizione | Branch |
|------|------|-------------|--------|
| [MasterPlan Sprint 2026-01](doing/MasterPlan-Sprint-2026-01.md) | 2026-01-01 | Sprint planning Q1 2026 | vari |

### DONE

| Plan | Data | Descrizione | ADR |
|------|------|-------------|-----|
| MirrorBuddyPlanDec29 | 2025-12-29 | Conversation-First + Triangle of Support | 0010, 0012 |
| VoiceExperiencePlanDec29 | 2025-12-29 | Voice UX improvements | 0012 |
| ConversationFirstPlanDec29 | 2025-12-29 | Architecture overhaul | 0010 |
| MaestroToolsPlanDec30 | 2025-12-30 | Interactive tools system | 0009 |
| LandingShowcasePlanDec30 | 2025-12-30 | Showcase mode for offline | - |
| LocalStorageMigrationPlanDec31 | 2025-12-31 | Database-first architecture | 0015 |
| SessionSummaryUnifiedArchive | 2026-01-01 | Session summaries + unified archive | 0019 |
| [BRUTAL-VERIFICATION-REPORT](done/BRUTAL-VERIFICATION-REPORT-2026-01-02.md) | 2026-01-02 | Code existence verification (all ✅) | - |
| [BRUTAL-VERIFICATION-REPORT-FUNCTIONAL](done/BRUTAL-VERIFICATION-REPORT-FUNCTIONAL-2026-01-02.md) | 2026-01-02 | Functional verification (4 issues, 1 fixed) | - |
| [ManualTests Sprint 2026-01](done/ManualTests-Sprint-2026-01.md) | 2026-01-02 | Merged into TestToBeDoneAsap.md | - |

## Workflow

```
TODO ──► DOING ──► DONE
```

1. **TODO**: Crea piano in `todo/` con nome `[Feature]-[YYYY-MM-DD].md`
2. **DOING**: Sposta in `doing/` quando inizi il lavoro
3. **DONE**: Sposta in `done/` dopo merge PR

## Quality Gates

Prima di spostare in `done/`:

- [ ] Tutti i checkpoint completati
- [ ] `npm run lint && npm run typecheck && npm run build` passa
- [ ] Thor quality review passata
- [ ] PR merged to main
- [ ] CHANGELOG aggiornato

## Plan Template

Vedi `@docs/plan-template.md` per il formato standard.
