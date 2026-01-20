# Report Mobile Friendliness - MirrorBuddy (20 Jan)

> Documento di analisi. Non committare.

## Executive summary

L'app risulta poco mobile-friendly soprattutto per la home principale (sidebar + header fissi con larghezze/margini rigidi), layout a due colonne non adattivi nelle sessioni chat/voice, componenti con larghezze fisse e griglie con breakpoints insufficienti. Su schermi < 1024px il layout sottrae spazio alla viewport, crea overflow e comprime contenuti critici.

## Problemi principali e interventi suggeriti

### P0 — Layout globale (home) non responsivo

**File**

- `src/app/home-sidebar.tsx`
- `src/app/home-header.tsx`
- `src/app/page.tsx`

**Problemi**

- Sidebar con larghezze fisse (`w-64` / `w-20`) e posizione `fixed`, sempre visibile.
- Header fisso con `left-64` / `left-20` che assume sidebar desktop; molte info su singola riga.
- Main con `ml-64` / `ml-20` e padding rigido (`p-8 pt-20`) che riduce la viewport su mobile.

**Fix suggeriti**

- Introdurre comportamento drawer/bottom-sheet su mobile:
  - Sidebar hidden di default per `<lg`, apribile con hamburger, overlay e `translate-x`.
  - Classi responsive: `lg:w-64`, `lg:ml-64`, `sm:ml-0`.
- Header: stack verticale su mobile con `flex-col sm:flex-row` + riduzione numero statistiche.
- Padding responsive: `px-4 sm:px-6 lg:px-8`, `pt-16` su mobile.

---

### P0 — Sessione Maestro (chat + voice) non adattiva

**File**

- `src/components/maestros/maestro-session.tsx`

**Problemi**

- Layout fisso a due colonne (`flex gap-4 h-[calc(100vh-8rem)]`).
- Pannello voice/history affiancato, non si adatta in verticale.

**Fix suggeriti**

- `flex-col lg:flex-row` e altezza full su mobile (`h-full` + `min-h`).
- Pannello voice/history come overlay o stack sotto chat su `<lg`.

---

### P1 — Maestri grid e filtri

**File**

- `src/components/maestros/maestri-grid.tsx`

**Problemi**

- Search input a larghezza fissa (`w-40`).
- Griglia con breakpoints limitati (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) senza step intermedi.
- Filtri orizzontali possono overfloware.

**Fix suggeriti**

- Input `w-full sm:w-40`.
- Aggiungere `sm`/`lg` per griglia: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Filtri scrollabili: `overflow-x-auto` e `whitespace-nowrap`.

---

### P1 — Tabs non scrollabili

**File**

- `src/components/ui/tabs.tsx`

**Problemi**

- Tabs list con `inline-flex` senza overflow orizzontale.

**Fix suggeriti**

- `overflow-x-auto`, `scrollbar-hide`, `flex-nowrap`.

---

### P1 — Header pagina non responsivo

**File**

- `src/components/ui/page-header.tsx`

**Problemi**

- Font size sempre `text-3xl`.

**Fix suggeriti**

- Responsivo: `text-xl sm:text-2xl md:text-3xl`.

---

### P2 — Zaino/Astuccio containers

**File**

- `src/app/supporti/components/zaino-view.tsx`
- `src/app/astuccio/components/astuccio-view.tsx`

**Problemi**

- Container `max-w-7xl` + `px-4` ok su desktop, ma troppo ampio per schermi <320px.
- Griglie con `md/lg` solo, senza `sm`.

**Fix suggeriti**

- `px-2 sm:px-4`.
- Introduzione di `sm:grid-cols-1/2`.

---

### P2 — Componenti con larghezze/altezza rigide

**Esempi**

- `src/components/tools/student-summary-editor.tsx` (w-[200px])
- `src/components/education/knowledge-hub/sidebar.tsx` (w-64)
- `src/components/education/knowledge-hub/views/explorer-view.tsx` (w-64)

**Problemi**

- Sidebar/pannelli con larghezze fisse in layout a due colonne.

**Fix suggeriti**

- Classi responsive: `w-full lg:w-64`.
- Drawer o accordion su mobile.

---

### P2 — Tabelle e overflow

**File**

- `src/app/admin/users/users-table.tsx`
- `src/app/admin/tos/components/acceptances-table.tsx`
- `src/app/admin/safety/components/safety-events-table.tsx`

**Problemi**

- Tabelle scrollabili (overflow-x) ma nessuna ottimizzazione touch (sticky header, card view).

**Fix suggeriti**

- Vista “card” sotto `sm`.
- `overflow-x-auto` + `scrollbar-hide`.

---

### P3 — Header e widget affollati

**File**

- `src/app/home-header.tsx`

**Problemi**

- Troppi widget (pomodoro, ambient audio, calculator, notifiche, version) sempre visibili.

**Fix suggeriti**

- Ridurre contenuto su mobile con dropdown (`...`).
- Prioritizzare notifiche e 1 widget principale.

---

## Raccomandazioni generali

- Definire breakpoint mobili chiari (`sm <640`, `md <768`, `lg <1024`).
- Standardizzare padding: `px-2 sm:px-4 md:px-6 lg:px-8`.
- Introdurre `container` responsive per layout di pagina.
- Evitare `fixed` + margini rigidi su mobile.
- Adottare pattern drawer/bottom sheet per sidebar/filtri.

## Quick wins (alto impatto, basso sforzo)

1. Sidebar/header responsive con drawer mobile.
2. MaestroSession `flex-col` su mobile.
3. Tabs scrollabili.
4. Input search e filtri `w-full` + overflow-x.
5. PageHeader con font responsivo.
