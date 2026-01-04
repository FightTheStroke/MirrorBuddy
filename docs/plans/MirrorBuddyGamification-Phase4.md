# Phase 4: Dashboard Professionale

**Parent**: [Main Plan](./MirrorBuddyGamification-Main.md)
**Assignee**: CLAUDE 3 (EXECUTOR-LOGIC)
**Priority**: MEDIA - Dipende da Phase 2
**Depends On**: Phase 2 (MirrorBucks data per visualizzazione)

---

## OBIETTIVO

Creare dashboard moderna e professionale che sfrutti TUTTA la telemetria disponibile:
- Tempo studio (oggi/settimana/mese/stagione)
- MirrorBucks e progressione livelli
- Costi Azure (se disponibili)
- Token consumati
- Sessioni per maestro
- Trend apprendimento
- Design data-driven

---

## EXECUTION TRACKER

| Status | ID | Task | Files | Notes |
|--------|-----|------|-------|-------|
| [ ] | T4-01 | Audit telemetria esistente | Research | Inventario segnali |
| [ ] | T4-02 | Creare DashboardLayout | `src/components/dashboard/dashboard-layout.tsx` | Grid responsive |
| [ ] | T4-03 | Creare StatCard componente | `src/components/dashboard/stat-card.tsx` | Riutilizzabile |
| [ ] | T4-04 | Creare TimeStudyChart | `src/components/dashboard/time-study-chart.tsx` | Grafico tempo |
| [ ] | T4-05 | Creare MaestroUsageChart | `src/components/dashboard/maestro-usage-chart.tsx` | Pie/bar chart |
| [ ] | T4-06 | Integrare Azure costs (se disponibile) | `src/components/dashboard/azure-costs-card.tsx` | API Azure |
| [ ] | T4-07 | Creare route `/dashboard` | `src/app/dashboard/page.tsx` | Entry point |

---

## TASK DETAILS

### T4-01: Audit Telemetria Esistente

**Segnali già disponibili (da progress-store):**
- `mirrorBucks` / `seasonMirrorBucks`
- `level` / `seasonLevel`
- `streak.current` / `streak.longest`
- `sessions[]` - array con: maestroId, subject, duration, date, grade
- `masteries{}` - per subject: percentage, tier, lastStudied
- `achievements[]` - badge sbloccati

**Segnali da conversation-store:**
- `conversations[]` - count, messages per conversation
- Message timestamps → calcolo tempo attivo

**Segnali da settings-store:**
- User preferences
- Accessibility settings attivi

**Segnali da telemetry (se presente):**
- `src/components/telemetry/telemetry-dashboard.tsx` → Azure costs?
- API calls count
- Token usage

**Da verificare:**
- `/api/analytics` endpoint
- Azure cost management API integration
- Token tracking nel backend

### T4-02: DashboardLayout
```typescript
// Grid layout responsive
const DashboardLayout = ({ children }) => (
  <div className="dashboard-grid">
    {/*
      Mobile: 1 col
      Tablet: 2 col
      Desktop: 3 col
      Large: 4 col
    */}
    {children}
  </div>
)
```

### T4-03: StatCard
```typescript
interface StatCardProps {
  title: string
  value: string | number
  change?: number        // % change from previous period
  changeLabel?: string   // "vs ieri", "vs settimana scorsa"
  icon?: ReactNode
  color?: 'blue' | 'green' | 'orange' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}

// Esempio uso:
<StatCard
  title="Tempo Studio Oggi"
  value="1h 23m"
  change={+15}
  changeLabel="vs ieri"
  icon={<Clock />}
  color="blue"
/>
```

### T4-04: TimeStudyChart
- Grafico a barre/linee
- Toggle: Oggi | Settimana | Mese | Stagione
- Breakdown per materia (stacked)
- Usa recharts (già nel progetto?) o chart.js
- Accessibile: tabella dati alternativa per screen reader

### T4-05: MaestroUsageChart
- Pie chart o horizontal bar
- Top 5 maestri più usati
- Mostra: nome, % sessioni, tempo totale
- Click → filtra altre metriche per quel maestro

### T4-06: Azure Costs Card
```typescript
// Verifica se esiste API
// Se sì:
interface AzureCostsData {
  currentMonth: number
  previousMonth: number
  breakdown: {
    openai: number
    storage: number
    compute: number
  }
  tokenUsage: {
    input: number
    output: number
    total: number
  }
}

// Se no API disponibile, mostrare:
<StatCard
  title="Costi Azure"
  value="Non disponibile"
  icon={<AlertCircle />}
/>
```

### T4-07: Route Dashboard
```typescript
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Row 1: Key Stats */}
      <StatCard title="MirrorBucks" ... />
      <StatCard title="Livello" ... />
      <StatCard title="Streak" ... />
      <StatCard title="Tempo Oggi" ... />

      {/* Row 2: Charts */}
      <TimeStudyChart span={2} />
      <MaestroUsageChart />

      {/* Row 3: Details */}
      <AchievementsRecent />
      <SeasonProgress />
      <AzureCostsCard /> {/* if available */}
    </DashboardLayout>
  )
}
```

---

## METRICHE DA VISUALIZZARE

| Metrica | Fonte | Priorità |
|---------|-------|----------|
| MirrorBucks totali | progress-store | ALTA |
| MirrorBucks stagione | progress-store | ALTA |
| Livello corrente | progress-store | ALTA |
| Streak giorni | progress-store | ALTA |
| Tempo studio oggi | sessions[] | ALTA |
| Tempo studio settimana | sessions[] | ALTA |
| Sessioni completate | sessions.length | MEDIA |
| Maestri incontrati | unique maestroIds | MEDIA |
| Materia più studiata | sessions by subject | MEDIA |
| Quiz completati | sessions with quiz | MEDIA |
| Achievement recenti | achievements[] | MEDIA |
| Trend apprendimento | mastery changes | MEDIA |
| Costi Azure | API (se disponibile) | BASSA |
| Token usati | API (se disponibile) | BASSA |

---

## ACCEPTANCE CRITERIA

- [ ] Dashboard accessibile da nuova route `/dashboard`
- [ ] Almeno 4 stat cards con dati reali
- [ ] Grafico tempo studio con toggle periodo
- [ ] Grafico uso maestri
- [ ] Tutti i dati da store reali (no mock)
- [ ] Responsive: funziona su mobile/tablet/desktop
- [ ] Accessibile: WCAG 2.1 AA, screen reader support
- [ ] Costi Azure mostrati se API disponibile

---

## FILE DEPENDENCIES

```
src/app/dashboard/
└── page.tsx (T4-07) NEW

src/components/dashboard/
├── dashboard-layout.tsx (T4-02) NEW
├── stat-card.tsx (T4-03) NEW
├── time-study-chart.tsx (T4-04) NEW
├── maestro-usage-chart.tsx (T4-05) NEW
├── azure-costs-card.tsx (T4-06) NEW
├── achievements-recent.tsx NEW
├── season-progress.tsx NEW (reuse from Phase 2?)
└── index.ts NEW
```

---

## CHART LIBRARY

Verificare se già presente nel progetto:
- `recharts` - React-based, accessibile
- `chart.js` + `react-chartjs-2`
- `visx` - più low-level

Se nessuna presente, installare `recharts`:
```bash
npm install recharts
```

---

## ESTIMATED COMPLEXITY

| Task | Complexity | LOC New | LOC Modified |
|------|------------|---------|--------------|
| T4-01 | Low | 0 | 0 |
| T4-02 | Medium | 80 | 0 |
| T4-03 | Medium | 100 | 0 |
| T4-04 | High | 180 | 0 |
| T4-05 | Medium | 120 | 0 |
| T4-06 | Medium | 100 | 0 |
| T4-07 | Low | 80 | 0 |

**Total**: ~660 new LOC, ~0 modified LOC

---

## DESIGN REFERENCE

Ispirazione: dashboard moderne tipo Vercel, Linear, Notion analytics
- Dark mode support
- Subtle gradients
- Smooth animations (rispettando reducedMotion)
- Clear data hierarchy
- Tooltips informativi
