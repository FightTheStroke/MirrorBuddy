# Phase 5: Fix & Polish

**Parent**: [Main Plan](./MirrorBuddyGamification-Main.md)
**Assignee**: CLAUDE 2 + CLAUDE 3
**Priority**: BASSA - Finalizzazione
**Depends On**: Phase 1, 2, 3, 4

---

## OBIETTIVO

Completare l'esperienza con fix minori e polish:
- Tool list responsive
- Accesso genitori da sidebar
- Parent dashboard con contenuto default
- Coach aggiornato per nuove feature
- Thor validation finale

---

## EXECUTION TRACKER

| Status | ID | Task | Files | Notes |
|--------|-----|------|-------|-------|
| [ ] | T5-01 | Tool list responsive | `src/components/conversation/tool-buttons.tsx` | Wrap su schermi stretti |
| [ ] | T5-02 | Rimuovere barra XP redundante | `src/components/gamification/xp-info.tsx` | Sostituire con parent access |
| [ ] | T5-03 | Bottone accesso genitori | `src/components/navigation/parent-access-button.tsx` | Nuovo componente |
| [ ] | T5-04 | Parent dashboard default | `src/components/profile/parent-dashboard.tsx` | Welcome + base stats |
| [ ] | T5-05 | Aggiornare Coach knowledge | `src/data/coaches/` + prompts | Nuove feature |
| [ ] | T5-06 | Thor validation | All files | Build, lint, test, manual |

---

## TASK DETAILS

### T5-01: Tool List Responsive

Problema attuale: tool buttons su una riga, overflow su schermi stretti.

Soluzione:
```typescript
// tool-buttons.tsx
<div className={cn(
  "flex gap-2",
  "flex-wrap",           // AGGIUNTO: wrap
  "justify-center",      // center quando wrappa
  "sm:justify-start"     // left-align su desktop
)}>
  {TOOL_BUTTONS.map(tool => (
    <ToolButton key={tool.id} {...tool} />
  ))}
</div>
```

CSS aggiuntivo:
```css
.tool-buttons-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .tool-buttons-container {
    justify-content: center;
  }

  .tool-button {
    /* Versione compatta su mobile */
    padding: 0.5rem;
    font-size: 0.875rem;
  }
}
```

### T5-02: Rimuovere Barra XP Redundante

Se esiste `xp-info.tsx` in posizione basso-sinistra:
1. Rimuovere dal layout dove viene renderizzato
2. Sostituire con `ParentAccessButton`
3. Mantenere componente per possibile riuso altrove

### T5-03: Bottone Accesso Genitori
```typescript
// src/components/navigation/parent-access-button.tsx
export function ParentAccessButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/parent-dashboard')}
      className={cn(
        "fixed bottom-4 left-4",
        "flex items-center gap-2",
        "px-4 py-2 rounded-full",
        "bg-primary/10 hover:bg-primary/20",
        "text-sm font-medium",
        "transition-colors"
      )}
      aria-label="Accedi alla sezione genitori"
    >
      <Users className="w-4 h-4" />
      <span className="hidden sm:inline">Area Genitori</span>
    </button>
  )
}
```

### T5-04: Parent Dashboard Default Content

Se non ci sono dati:
```typescript
// parent-dashboard.tsx
function EmptyState() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle>Benvenuto nella Dashboard Genitori</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Qui potrai monitorare i progressi di studio.</p>
          <p>Le statistiche appariranno dopo le prime sessioni.</p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Inizia Subito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => router.push('/conversazioni')}>
            Parla con un Maestro
          </Button>
          <Button variant="outline" onClick={() => router.push('/astuccio')}>
            Esplora gli Strumenti
          </Button>
        </CardContent>
      </Card>

      {/* Coach Chat Always Available */}
      <Card>
        <CardHeader>
          <CardTitle>Parla con il Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <ParentProfessorChat />
        </CardContent>
      </Card>
    </div>
  )
}
```

### T5-05: Aggiornare Coach Knowledge

Aggiungere al system prompt del Coach:
```markdown
## Nuove Funzionalità (Gennaio 2026)

### Navigazione
- **Zaino** (`/zaino`): Archivio materiali con navigazione dinamica
  - Naviga per Materia, Data o Tipo di contenuto
  - Ricerca vocale: "Trova le mappe di matematica"
- **Astuccio** (`/astuccio`): Strumenti creativi
  - Mappa Mentale, Quiz, Demo, Flashcard, Riassunto, Study Kit

### Gamification MirrorBucks
- **MirrorBucks**: Punti guadagnati studiando (sostituiscono XP)
- **Stagioni**: Ogni trimestre è una "stagione" con classifica reset
- **100 Livelli**: Per stagione, stile Fortnite
- Come guadagnare:
  - Conversazione attiva: 5 MB/minuto
  - Quiz completato: 30 MB (50 se perfetto)
  - Mappa creata: 20 MB
  - E altro...
- **Achievement**: Badge sbloccabili per milestone

### Dashboard
- `/dashboard`: Statistiche complete di studio
- Tempo studio, livelli, streak, trend

Quando lo studente chiede aiuto sulla navigazione o gamification,
spiega queste nuove funzionalità in modo entusiasta e incoraggiante.
```

### T5-06: Thor Validation Checklist

```bash
# 1. Build
npm run build
# Deve passare senza errori

# 2. Lint
npm run lint
# 0 errori, 0 warning critici

# 3. Typecheck
npm run typecheck
# 0 errori TypeScript

# 4. Test
npm run test
# Tutti i test passano

# 5. Manual Testing
- [ ] /zaino carica e naviga correttamente
- [ ] /astuccio mostra tutti i tool
- [ ] MirrorBucks display corretto
- [ ] Timer sessione funziona con auto-pausa
- [ ] Level-up mostra celebrazione
- [ ] Maestri page redesign ok
- [ ] Dashboard mostra dati reali
- [ ] Parent dashboard ha contenuto
- [ ] Tool list responsive su mobile
- [ ] Accessibilità: keyboard nav ok
- [ ] Accessibilità: screen reader ok
```

---

## ACCEPTANCE CRITERIA

- [ ] Tool buttons wrappano correttamente su mobile
- [ ] Barra XP sostituita da bottone Area Genitori
- [ ] Parent dashboard mai vuota
- [ ] Coach risponde correttamente su Zaino/Astuccio/MirrorBucks
- [ ] Build/lint/typecheck passano
- [ ] Test E2E passano (se presenti)

---

## FILE DEPENDENCIES

```
src/components/conversation/
└── tool-buttons.tsx (T5-01) MODIFY

src/components/gamification/
└── xp-info.tsx (T5-02) MODIFY/DELETE

src/components/navigation/
└── parent-access-button.tsx (T5-03) NEW

src/components/profile/
└── parent-dashboard.tsx (T5-04) MODIFY

src/data/coaches/
└── [coach files] (T5-05) MODIFY
```

---

## ESTIMATED COMPLEXITY

| Task | Complexity | LOC New | LOC Modified |
|------|------------|---------|--------------|
| T5-01 | Low | 0 | 20 |
| T5-02 | Low | 0 | 15 |
| T5-03 | Low | 50 | 0 |
| T5-04 | Medium | 80 | 40 |
| T5-05 | Medium | 0 | 100 |
| T5-06 | High | 0 | 0 |

**Total**: ~130 new LOC, ~175 modified LOC

---

## DEFINITION OF DONE

Progetto completo quando:
1. Tutti i F-xx nel Main Plan verificati ✓
2. Thor validation passata ✓
3. Utente ha testato manualmente ✓
4. Nessun regression su funzionalità esistenti ✓
5. CHANGELOG.md aggiornato ✓
6. Commit con messaggio descrittivo ✓
