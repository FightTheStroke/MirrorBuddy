# MirrorBuddyGamification - Trasformazione Fortnite/Duolingo Style

**Created**: 04 Gennaio 2026, 17:51 CET
**Target**: Esperienza studio gamificata con MirrorBucks, Stagioni, navigazione Zaino/Astuccio

## CHECKPOINT LOG

| Timestamp | Agent | Task | Status | Notes |
|-----------|-------|------|--------|-------|
| 04/01 17:51 | PLANNER | Piano creato | DONE | 5 fasi, 47 task |

**Last Good State**: Piano iniziale creato
**Resume**: Attendere approvazione utente, poi eseguire Fase 1

---

## RUOLI

| Claude | Ruolo | Model | Specializzazione |
|--------|-------|-------|------------------|
| CLAUDE 1 | PLANNER/ORCHESTRATOR | opus | Coordinamento, review |
| CLAUDE 2 | EXECUTOR-UI | sonnet | Componenti React, styling |
| CLAUDE 3 | EXECUTOR-LOGIC | sonnet | Store Zustand, API, business logic |

---

## FASE OVERVIEW

| Fase | Descrizione | Tasks | Priorità | Link |
|------|-------------|-------|----------|------|
| 1 | Zaino/Astuccio Navigation | 12 | ALTA | [Phase1](./MirrorBuddyGamification-Phase1.md) |
| 2 | MirrorBucks & Stagioni | 14 | ALTA | [Phase2](./MirrorBuddyGamification-Phase2.md) |
| 3 | Maestri Redesign | 8 | MEDIA | [Phase3](./MirrorBuddyGamification-Phase3.md) |
| 4 | Dashboard Professionale | 7 | MEDIA | [Phase4](./MirrorBuddyGamification-Phase4.md) |
| 5 | Fix & Polish | 6 | BASSA | [Phase5](./MirrorBuddyGamification-Phase5.md) |

---

## FUNCTIONAL REQUIREMENTS

| ID | Requirement | Acceptance Criteria | Phase | Verified |
|----|-------------|---------------------|-------|----------|
| F-01 | Navigazione Zaino (materiali) | Cartelle dinamiche materia/data/tipo funzionanti | 1 | [ ] |
| F-02 | Navigazione Astuccio (strumenti) | Tutti i tool creativi accessibili da Astuccio | 1 | [ ] |
| F-03 | Preview contenuti | Thumbnail/preview per mappe, demo, riassunti | 1 | [ ] |
| F-04 | Ricerca vocale Coach | Coach trova e mostra materiali su richiesta vocale | 1 | [ ] |
| F-05 | MirrorBucks invece di XP | Rename completo, logica invariata | 2 | [ ] |
| F-06 | Stagioni trimestrali | Reset contatore ogni trimestre, storico mantenuto | 2 | [ ] |
| F-07 | 100 Livelli per Stagione | Progressione Fortnite-style | 2 | [ ] |
| F-08 | Timer visibile con auto-pausa | Pausa se inattivo, countdown visibile | 2 | [ ] |
| F-09 | Achievement/Badge system | Almeno 20 badge sbloccabili | 2 | [ ] |
| F-10 | Leaderboard personale | Confronto giorno/settimana/stagione/anno | 2 | [ ] |
| F-11 | Celebrazioni level-up | Coriandoli, notifica coach, animazione | 2 | [ ] |
| F-12 | Maestri avatar grandi | Card ridisegnate senza tool buttons | 3 | [ ] |
| F-13 | Frasi celebri rotanti | Ogni maestro ha 5+ frasi, rotate random | 3 | [ ] |
| F-14 | Suggerimenti personalizzati | "Ieri hai studiato X" basato su history | 3 | [ ] |
| F-15 | Avatar maestro in sidebar | Appare durante conversazione attiva | 3 | [ ] |
| F-16 | Dashboard telemetria completa | Tutte metriche disponibili visualizzate | 4 | [ ] |
| F-17 | Costi Azure visibili | Se dati disponibili, mostrati in dashboard | 4 | [ ] |
| F-18 | Tool list responsive | Wrap corretto su schermi stretti | 5 | [ ] |
| F-19 | Accesso genitori da sidebar | Sostituisce barra XP | 5 | [ ] |
| F-20 | Parent dashboard non vuota | Contenuto default se no dati | 5 | [ ] |
| F-21 | Coach aggiornato | Conosce tutte le nuove feature | 5 | [ ] |

---

## DIPENDENZE TRA FASI

```
FASE 1 (Zaino/Astuccio) ─────────────────────────────────┐
         │                                                │
         ▼                                                │
FASE 2 (MirrorBucks) ──► FASE 3 (Maestri) ──► FASE 5 ◄───┘
         │                      │
         ▼                      ▼
    FASE 4 (Dashboard) ─────────┘
```

- Fase 1 può iniziare subito (indipendente)
- Fase 2 può iniziare in parallelo a Fase 1
- Fase 3 dipende da Fase 2 (gamification nel redesign)
- Fase 4 dipende da Fase 2 (metriche MirrorBucks)
- Fase 5 dipende da tutte (polish finale)

---

## STRATEGIA ESECUZIONE

### Sprint 1: Fondamenta (Fase 1 + Fase 2 in parallelo)
- CLAUDE 2: Fase 1 - UI Zaino/Astuccio
- CLAUDE 3: Fase 2 - Store MirrorBucks/Stagioni

### Sprint 2: Esperienza (Fase 3 + Fase 4)
- CLAUDE 2: Fase 3 - Maestri Redesign
- CLAUDE 3: Fase 4 - Dashboard

### Sprint 3: Finalizzazione (Fase 5)
- CLAUDE 2 + 3: Fix e Polish

---

## VALIDATION CHECKLIST (Thor)

- [ ] `npm run lint` passa
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa
- [ ] `npm run test` passa (o skip se no test E2E)
- [ ] Tutti F-xx verificati manualmente
- [ ] Accessibilità WCAG 2.1 AA rispettata
- [ ] File < 300 righe
- [ ] No localStorage per user data

---

## DECISIONI ARCHITETTURALI

| Decisione | Scelta | Rationale |
|-----------|--------|-----------|
| MirrorBucks storage | Estensione progress-store.ts | Mantiene compatibilità, stessa sync REST |
| Stagioni | Nuovo campo `season` in progress | Trimestre calcolato da data |
| Zaino routing | `/zaino` (rename da /supporti) | Metafora chiara |
| Astuccio routing | `/astuccio` (nuova route) | Separa creazione da archivio |
| Leaderboard | Locale (predisposta multi-user) | userId già presente, ready per social |

---

## FILE CREATI/MODIFICATI SUMMARY

### Nuovi File (~15)
- `src/app/zaino/` - Nuova route
- `src/app/astuccio/` - Nuova route
- `src/components/gamification/mirrorbucks-*.tsx` - Nuovi componenti
- `src/components/gamification/season-*.tsx` - Stagioni
- `src/components/gamification/leaderboard.tsx`
- `src/components/gamification/achievements-panel.tsx`
- `src/components/gamification/level-up-celebration.tsx`
- `src/data/maestri/quotes.ts` - Frasi celebri

### File Modificati (~25)
- `src/lib/stores/progress-store.ts` - MirrorBucks, Stagioni
- `src/components/maestros/maestro-card.tsx` - Redesign
- `src/components/maestros/maestri-grid.tsx` - Redesign
- `src/components/conversation/tool-buttons.tsx` - Responsive
- `src/components/profile/parent-dashboard.tsx` - Default content
- E altri (vedi file di fase)

---

## PROSSIMI PASSI

1. **Utente approva piano** → Procedi
2. **Crea branch**: `git checkout -b feature/gamification-fortnite`
3. **Esegui Sprint 1**: Fase 1 + Fase 2 in parallelo
4. **Review checkpoint** dopo ogni fase
5. **Thor validation** prima di merge
