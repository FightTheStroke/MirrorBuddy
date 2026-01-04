# Phase 1: Riorganizzazione Navigazione (Zaino/Astuccio)

**Parent**: [Main Plan](./MirrorBuddyGamification-Main.md)
**Assignee**: CLAUDE 2 (EXECUTOR-UI)
**Priority**: ALTA - Fondamenta architetturali

---

## OBIETTIVO

Trasformare la navigazione da "Supporti/Study Kit" a metafora scolastica:
- **Zaino** = Archivio materiali con navigazione dinamica
- **Astuccio** = Strumenti creativi (quiz, mappe, demo, flashcard, upload, Study Kit)

---

## EXECUTION TRACKER

| Status | ID | Task | Files | Notes |
|--------|-----|------|-------|-------|
| [ ] | T1-01 | Creare route `/zaino` | `src/app/zaino/page.tsx` | Copy da supporti, rename |
| [ ] | T1-02 | Creare route `/astuccio` | `src/app/astuccio/page.tsx` | Hub strumenti creativi |
| [ ] | T1-03 | Redirect `/supporti` → `/zaino` | `src/app/supporti/page.tsx` | Mantieni backward compat |
| [ ] | T1-04 | Redirect `/study-kit` → `/astuccio` | `src/app/study-kit/page.tsx` | Mantieni backward compat |
| [ ] | T1-05 | Creare ZainoView con nav dinamica | `src/app/zaino/components/zaino-view.tsx` | Cartelle dinamiche |
| [ ] | T1-06 | Creare ZainoSidebar navigazione | `src/app/zaino/components/zaino-sidebar.tsx` | Breadcrumb + filtri |
| [ ] | T1-07 | Creare AstuccioView hub | `src/app/astuccio/components/astuccio-view.tsx` | Grid strumenti |
| [ ] | T1-08 | Creare ToolCard componente | `src/app/astuccio/components/tool-card.tsx` | Card per ogni tool |
| [ ] | T1-09 | Implementare preview contenuti | `src/components/education/archive/content-preview.tsx` | Modal preview |
| [ ] | T1-10 | Integrare ricerca vocale Coach | `src/app/zaino/components/voice-search.tsx` | Hook coach esistente |
| [ ] | T1-11 | Aggiornare navigation links | `src/components/conversation/conversation-flow.tsx:~50` | Zaino/Astuccio |
| [ ] | T1-12 | Test accessibilità navigazione | E2E test | WCAG 2.1 AA |

---

## TASK DETAILS

### T1-01: Creare route `/zaino`
```typescript
// src/app/zaino/page.tsx
export default function ZainoPage() {
  return <ZainoView />
}
```

### T1-05: ZainoView con navigazione dinamica
Requisiti:
- **Livello 1**: Tipo navigazione (Materia | Data | Tipo Contenuto)
- **Livello 2**: Cartelle dinamiche basate su scelta L1
- **Livello 3**: Contenuti con preview
- Breadcrumb sempre visibile
- Ricerca fuzzy (Fuse.js esistente)
- Rispetta `accessibilityStore` settings

Struttura navigazione:
```
Per Materia → [Matematica, Italiano, ...] → [Argomento | Data] → Contenuti
Per Data → [2026, 2025] → [Mesi] → [Giorni] → Contenuti
Per Tipo → [Mappe, Quiz, Demo, ...] → [Materia | Data] → Contenuti
```

### T1-07: AstuccioView hub strumenti
Grid con card per ogni strumento:
- **Mappa Mentale** → apre tool mindmap
- **Quiz** → apre tool quiz
- **Demo Interattiva** → apre tool demo (STEM)
- **Flashcard** → apre tool flashcard
- **Riassunto** → apre tool summary
- **Study Kit** → apre upload PDF + genera tutto
- **Carica Materiale** → upload generico (PDF, immagini)
- **Scatta Foto** → webcam capture

### T1-09: Preview contenuti
- Mappe mentali: render SVG/canvas thumbnail
- Quiz: mostra prima domanda
- Demo: screenshot o GIF animata
- Riassunti: prime 200 parole
- Flashcard: card frontale

### T1-10: Ricerca vocale Coach
- Bottone microfono in Zaino
- Attiva coach in modalità ricerca
- Coach interpreta richiesta ("trova le mappe di matematica")
- Aggiorna filtri automaticamente
- Legge risultati ad alta voce

---

## ACCEPTANCE CRITERIA

- [ ] `/zaino` mostra tutti i materiali con navigazione a cartelle
- [ ] Cambio tipo navigazione (Materia/Data/Tipo) riorganizza cartelle
- [ ] `/astuccio` mostra grid 8 strumenti
- [ ] Click su strumento apre il tool corretto
- [ ] Preview funziona per mappe, quiz, riassunti
- [ ] Ricerca vocale trova e filtra materiali
- [ ] Accessibilità: keyboard nav, screen reader, contrast ok
- [ ] Redirect da vecchie route funziona

---

## FILE DEPENDENCIES

```
src/app/zaino/
├── page.tsx (T1-01)
└── components/
    ├── zaino-view.tsx (T1-05)
    ├── zaino-sidebar.tsx (T1-06)
    └── voice-search.tsx (T1-10)

src/app/astuccio/
├── page.tsx (T1-02)
└── components/
    ├── astuccio-view.tsx (T1-07)
    └── tool-card.tsx (T1-08)

src/components/education/archive/
└── content-preview.tsx (T1-09)
```

---

## REUSE FROM EXISTING

- `src/app/supporti/components/supporti-view.tsx` → base per ZainoView
- `src/app/supporti/components/sidebar.tsx` → base per ZainoSidebar
- `src/components/study-kit/*` → integrato in Astuccio
- `src/lib/stores/materials-db.ts` → IndexedDB già pronto
- Fuse.js già configurato per fuzzy search

---

## ESTIMATED COMPLEXITY

| Task | Complexity | LOC New | LOC Modified |
|------|------------|---------|--------------|
| T1-01 | Low | 20 | 0 |
| T1-02 | Low | 20 | 0 |
| T1-03 | Trivial | 5 | 0 |
| T1-04 | Trivial | 5 | 0 |
| T1-05 | High | 200 | 0 |
| T1-06 | Medium | 150 | 0 |
| T1-07 | Medium | 100 | 0 |
| T1-08 | Low | 60 | 0 |
| T1-09 | Medium | 120 | 0 |
| T1-10 | High | 150 | 50 |
| T1-11 | Low | 0 | 30 |
| T1-12 | Medium | 50 | 0 |

**Total**: ~880 new LOC, ~80 modified LOC
