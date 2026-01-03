# StudyKitSupportiIntegration - Main Tracker

**Created**: 3 Gennaio 2026, 20:15 CET | **Target**: Full UI/Data Integration | **Metodo**: VERIFICA BRUTALE

---

## ROOT CAUSE ANALYSIS

### Data Architecture Split (CRITICAL)
- **StudyKit table**: Stores materials as JSON (`summary`, `mindmap`, `demo`, `quiz`)
- **Material table**: Main materials storage used by archives
- **Result**: Study Kit materials NEVER appear in Supporti/Archives

### UI Disconnection
- Study Kit uses hardcoded colors (blue-50, green-50, purple-50, orange-50)
- Custom styled inputs/selects instead of shadcn/ui components
- Different heading styles, padding, border colors

---

## PHASES OVERVIEW

| Phase | File | Status | Progress | Focus |
|-------|------|--------|----------|-------|
| 1 | [Phase1](./StudyKitSupportiIntegration-Phase1.md) | Pending | 0/6 | Data Integration (critical path) |
| 2 | [Phase2](./StudyKitSupportiIntegration-Phase2.md) | Pending | 0/7 | Study Kit UI Harmonization |
| 3 | [Phase3](./StudyKitSupportiIntegration-Phase3.md) | Pending | 0/5 | Supporti UI Harmonization |
| 4 | [Phase4](./StudyKitSupportiIntegration-Phase4.md) | Pending | 0/4 | Cross-cutting (accessibility, demo) |

## Global Progress: 0/22 (0%)

---

## FUNCTIONAL REQUIREMENTS

| ID | Requisito Funzionale | Criterio di Accettazione | Verificato |
|----|---------------------|-------------------------|------------|
| F-01 | SK materials appear in Archives | Mindmap from SK visible in /supporti?type=mindmap | [ ] |
| F-02 | SK quiz appears in Quiz archive | Quiz from SK visible in /supporti?type=quiz | [ ] |
| F-03 | SK summary appears in Archives | Summary from SK visible in /supporti?type=summary | [ ] |
| F-04 | Demo button functional | Demo renders when data.code exists | [ ] |
| F-05 | SK tabs match app style | Tabs use design tokens, not hardcoded colors | [ ] |
| F-06 | SK buttons match app style | Buttons use shadcn/ui variants | [ ] |
| F-07 | SK quiz matches main Quiz | Same styling as /education/quiz | [ ] |
| F-08 | Supporti inputs use shadcn | Input, Select use @/components/ui | [ ] |
| F-09 | Supporti sidebar matches nav | Same hover states, active styles | [ ] |
| F-10 | Dark mode works everywhere | All SK/Supporti respect theme | [ ] |
| F-11 | Accessibility settings work | Font size, dyslexia font apply to SK/Supporti | [ ] |

---

## CHECKPOINT LOG

| Timestamp | Agent | Task | Status | Notes |
|-----------|-------|------|--------|-------|
| - | - | - | - | Plan created, awaiting execution |

**Last Good State**: Plan creation
**Resume Instructions**: Start with Phase 1 (data integration)

---

## ARCHITECTURE DECISION

**Selected approach**: When Study Kit generates materials, ALSO save to Material table.

**Why**:
- Supporti already queries Material table via `getActiveMaterials()`
- No need to modify archive components
- Single source of truth for archives
- StudyKit table keeps original record for editing

**Implementation**: Add `saveMaterialsToArchive()` call after successful SK generation.

---

## RUOLI CLAUDE

| Claude | Ruolo | Task | Model |
|--------|-------|------|-------|
| CLAUDE 1 | PLANNER/COORDINATOR | Monitors execution | opus |
| CLAUDE 2 | EXECUTOR | Phase 1-2 tasks | sonnet |
| CLAUDE 3 | EXECUTOR | Phase 3-4 tasks | sonnet |

---

## THOR APPROVAL SECTION

**Status**: PENDING
**Validated**: 0 / 11 functional requirements
**Gates Passed**: 0 / 4 phases

- [ ] F-01 to F-03 verified (data integration)
- [ ] F-04 to F-07 verified (SK UI)
- [ ] F-08 to F-09 verified (Supporti UI)
- [ ] F-10 to F-11 verified (cross-cutting)
- [ ] Build/lint/typecheck pass

**Thor Signature**: _____________ **Date**: _______
