# Things To Be Done Today - 3 Gennaio 2026

**Owner**: Roberto
**Ambiente**: localhost:3000
**PR**: https://github.com/Roberdan/ConvergioEdu/pull/105

---

## RECAP: COSA HA FATTO CLAUDE

### Wave 0-4: Completate

| Wave | Cosa | File Principali |
|------|------|-----------------|
| 0 | Verification & E2E | 213 test passed |
| 1 | Tool UX Fix (auto-switch fullscreen) | `conversation-flow.tsx` |
| 2 | Dashboard Analytics (5 API + UI) | `src/app/api/dashboard/*`, `src/app/admin/analytics/` |
| 3 | Repo Migration (convergio → mirrorbuddy) | 188 file modificati |
| 4 | Documentation | CHANGELOG.md aggiornato |

### Wave 4.5: Post-Review Fixes

| Fix | Descrizione |
|-----|-------------|
| Codex P1 | Auth aggiunta a tutti i 5 dashboard API routes |
| SessionStorage | Migration code ora chiamato in `Providers.tsx` |
| E2E Test | Aggiornato per gestire 401 |
| PR Comment | Risposto al commento Codex |

### Verifiche Passate
```
TypeScript: PASS
ESLint: PASS
Build: SUCCESS
E2E admin-analytics: 35 passed
```

### Commits su PR #105
```
77b5e3c docs: add Wave 4.5 post-review fixes to plan
9be6493 fix: wire up sessionStorage migration on app init
3214e7c chore: move completed plans to done folder
6e90277 fix: add authentication to dashboard APIs (Codex P1)
d18ce9b docs: update Jan3MasterPlan with clear status markers
2354a87 docs: update changelog and move completed plans
9ec0f63 chore: rebrand ConvergioEdu to MirrorBuddy
```

---

# AZIONI ROBERTO

## 1. MERGE PR #105

```bash
# Review
gh pr view 105

# Merge (dopo i test)
gh pr merge 105 --merge
```

---

## 2. TEST CRITICI (Blocking)

### TEST 1: Tools in Full Screen Mode

**Procedura**:
1. Vai su `/education` → Mappe Mentali
2. Click "Crea con Professore"
3. Seleziona maestro (es. Euclide)
4. Seleziona modalità (Chat o Voce)

**Verifica**:
- [ ] Layout con sidebar minimizzata a sinistra
- [ ] Tool area ~70% schermo
- [ ] Maestro panel ~30% a destra
- [ ] Avatar maestro con ring colorato
- [ ] Pulsante voce funzionante
- [ ] Chat input funzionante
- [ ] Tool viene creato quando richiesto

**Status**: ⬜

---

### TEST 2: Mindmap Hierarchical Structure

**Procedura**:
1. In focus mode, scrivi: "Crea una mappa mentale sulla fotosintesi"
2. Apri DevTools → Network tab
3. Ispeziona il JSON della mappa

**Verifica**:
- [ ] Nodi con `parentId: null` (root nodes)
- [ ] Nodi con `parentId: "1"`, `"2"` etc. (child nodes)
- [ ] ALMENO 3 livelli di profondità
- [ ] NON tutti i nodi hanno `parentId: null` (se sì = BUG)
- [ ] Visivamente: rami che si espandono dal centro

**Status**: ⬜

---

### TEST 3: Layout Specification

**Verifica**:
- [ ] Sidebar minimizzata presente (NON rimossa)
- [ ] Sidebar si espande on hover
- [ ] Proporzioni 70/30 rispettate
- [ ] Maestro panel contiene: avatar, nome, voice button, chat input
- [ ] Colori coerenti con maestro selezionato

**Status**: ⬜

---

### TEST 4: Voice Onboarding

**Procedura**:
1. Apri `/welcome` in incognito
2. Click "Inizia con voce"
3. Completa tutti gli step

**Verifica**:
- [ ] Voce inizia come Melissa (Azure, naturale)
- [ ] Voce rimane Melissa per TUTTO l'onboarding
- [ ] NON switch a voce robotica Web Speech

**Status**: ⬜

---

### TEST 5: E2E Smoke Test

```bash
npx playwright test e2e/full-app-smoke.spec.ts --reporter=list
```

**Verifica**:
- [ ] >95% test passati
- [ ] Nessun errore telemetry ERR_ABORTED
- [ ] Nessun errore Voice API su Firefox
- [ ] Nessun errore font download
- [ ] Nessun errore Debug API CORS

**Status**: ⬜

---

## 3. TEST FUNZIONALI (Post-Merge)

### Tool Creation con 3 Maestri

1. **Galileo**: "Fammi una mappa mentale del sistema solare"
   - [ ] Mappa creata da Galileo (non Melissa)

2. **Marie Curie**: "Fammi un quiz sulla tavola periodica"
   - [ ] Quiz creato da Marie Curie

3. **Darwin**: "Fammi delle flashcard sull'evoluzione"
   - [ ] Flashcard create da Darwin

---

### Memory Persistence

1. Conversazione con Melissa: "Mi chiamo Marco, ho 15 anni"
2. Chiudi sessione
3. Riapri conversazione con Melissa
4. Chiedi: "Ti ricordi come mi chiamo?"

- [ ] Melissa ricorda il nome
- [ ] Melissa ricorda l'età

---

### Demo Interattiva

1. Conversazione con Galileo
2. Chiedi: "Crea una demo interattiva sul sistema solare"

- [ ] Demo generata senza errori
- [ ] Demo è interattiva (non statica)
- [ ] Galileo è il creatore

---

### Voice Mode

- [ ] Connessione stabile
- [ ] Riconoscimento vocale accurato
- [ ] Risposta vocale fluida
- [ ] UI controls funzionanti (Mute, End Call)

---

### Admin Dashboard

1. Vai su `/admin/analytics`

- [ ] Pagina si carica
- [ ] Token Usage card visibile
- [ ] Voice Metrics card visibile
- [ ] FSRS Stats card visibile
- [ ] Rate Limits card visibile
- [ ] Safety Events card visibile
- [ ] Refresh button funziona

---

## 4. DEPLOY (Dopo Test)

### GitHub Transfer (opzionale)
- [ ] Settings → Transfer repository → FightTheStroke
- [ ] Nuovo nome: `MirrorBuddy`

### Vercel Setup
- [ ] Collegare nuovo repo
- [ ] Configurare env vars
- [ ] Deploy preview verificato

### DNS (se nuovo dominio)
- [ ] Configurare dominio
- [ ] SSL verificato

### Final Verification
- [ ] Produzione funzionante
- [ ] Voice session funziona
- [ ] Dashboard `/admin/analytics` accessibile

---

## RIEPILOGO CHECKLIST

| Fase | Status |
|------|--------|
| Test 1: Full Screen Mode | ⬜ |
| Test 2: Mindmap Hierarchy | ⬜ |
| Test 3: Layout Spec | ⬜ |
| Test 4: Voice Onboarding | ⬜ |
| Test 5: E2E Smoke | ⬜ |
| Merge PR #105 | ⬜ |
| Tool Creation 3 Maestri | ⬜ |
| Memory Persistence | ⬜ |
| Demo Interattiva | ⬜ |
| Voice Mode | ⬜ |
| Admin Dashboard | ⬜ |
| Deploy | ⬜ |

---

**Quando tutto è ✅**: Il rebrand MirrorBuddy è completo.

---

*Creato: 3 Gennaio 2026*
*Autore: Claude Opus 4.5*
