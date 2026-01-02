# Jan3 Master Plan - Consolidato

**Data**: 2026-01-03
**Branch**: `development`
**Status**: DA ESEGUIRE SUBITO
**Regola**: ZERO STOP. Ogni step validato con PROVE. Nessuna scorciatoia. USA I TOOLS.

---

## Execution Tracker

| Wave | Descrizione | Status | Blocco | Chi fa |
|------|-------------|--------|--------|--------|
| 0 | Verification & E2E | [ ] | BLOCKING | Claude |
| 1 | Tool UX Fix | [ ] | BLOCKING | Claude + Roberto |
| 2 | Dashboard Analytics | [ ] | - | Claude |
| 3 | Repo Migration Prep | [ ] | - | Claude prepara, Roberto esegue |
| 4 | Documentation Update | [ ] | - | Claude |

---

## RESPONSABILITA'

| Task | Chi |
|------|-----|
| Codice, fix, test automation | Claude |
| E2E tests, build, lint | Claude |
| Playwright test per verificare UI | Claude |
| Decisioni UX | Roberto |
| Transfer repository GitHub | Roberto |
| Configurazione Vercel/DNS | Roberto |
| Vercel env vars | Roberto |
| Approvazione finale | Roberto |

---

## TOOLS DA USARE PER VERIFICHE

| Verifica | Tool |
|----------|------|
| Layout focus mode | Playwright screenshot + measure |
| Tool navigation scroll | Playwright scroll detection |
| Mindmap hierarchy | Playwright network intercept |
| Voice onboarding | Playwright audio context check |
| Multi-maestro response | Playwright text assertion |
| Memory persistence | Playwright multi-step flow |

**REGOLA**: Se posso automatizzare con Playwright, lo faccio. Zero "ho guardato manualmente".

---

# WAVE 0: VERIFICATION & E2E [BLOCKING]

## 0.1 TypeScript Check

```bash
npm run typecheck
```

- [ ] 0.1.1 - ZERO errori

## 0.2 ESLint Check

```bash
npm run lint
```

- [ ] 0.2.1 - ZERO errori/warning

## 0.3 Build Check

```bash
npm run build
```

- [ ] 0.3.1 - SUCCESS

---

## 0.4 E2E Full Suite

```bash
npx playwright test e2e/full-app-smoke.spec.ts --reporter=list
```

- [ ] 0.4.1 - Chromium: 100% passed
- [ ] 0.4.2 - Firefox: 100% passed
- [ ] 0.4.3 - WebKit: 100% passed

---

## 0.5 E2E Specifici da Creare/Verificare

### 0.5.1 Test Focus Layout (Playwright)

**File**: `e2e/focus-tool-layout.spec.ts`

```typescript
test('focus mode layout has correct proportions', async ({ page }) => {
  await page.goto('/education');
  await page.click('text=Mappe Mentali');
  await page.click('text=Crea con Professore');
  await page.click('text=Euclide');
  await page.click('text=Chat');

  // Wait for layout to load
  await page.waitForSelector('[data-testid="focus-tool-layout"]');

  // Measure proportions
  const toolArea = await page.locator('[data-testid="tool-canvas"]').boundingBox();
  const maestroPanel = await page.locator('[data-testid="maestro-panel"]').boundingBox();
  const viewport = page.viewportSize();

  // Tool area should be ~70%
  const toolPercent = (toolArea.width / viewport.width) * 100;
  expect(toolPercent).toBeGreaterThan(65);
  expect(toolPercent).toBeLessThan(75);

  // Maestro panel should be ~30%
  const maestroPercent = (maestroPanel.width / viewport.width) * 100;
  expect(maestroPercent).toBeGreaterThan(25);
  expect(maestroPercent).toBeLessThan(35);

  // Sidebar should be minimized (< 80px)
  const sidebar = await page.locator('[data-testid="sidebar"]').boundingBox();
  expect(sidebar.width).toBeLessThan(80);
});

test('maestro panel has required elements', async ({ page }) => {
  // ... setup

  // Avatar visible
  await expect(page.locator('[data-testid="maestro-avatar"]')).toBeVisible();

  // Name visible
  await expect(page.locator('[data-testid="maestro-name"]')).toContainText('Euclide');

  // Voice button present
  await expect(page.locator('[data-testid="voice-call-button"]')).toBeVisible();

  // Chat input present
  await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
});
```

- [ ] 0.5.1 - Test layout focus creato ed eseguito
- [ ] 0.5.2 - Proporzioni 70/30 verificate automaticamente
- [ ] 0.5.3 - Elementi maestro panel verificati

### 0.5.2 Test Mindmap Hierarchy (Playwright)

**File**: `e2e/mindmap-hierarchy.spec.ts`

```typescript
test('mindmap generates hierarchical structure', async ({ page }) => {
  // Intercept API response
  let mindmapData;
  await page.route('**/api/chat**', async route => {
    const response = await route.fetch();
    const json = await response.json();
    if (json.toolResult?.type === 'mindmap') {
      mindmapData = json.toolResult.data;
    }
    await route.fulfill({ response });
  });

  await page.goto('/education');
  // ... navigate to mindmap creation
  await page.fill('[data-testid="chat-input"]', 'Crea una mappa mentale sulla fotosintesi');
  await page.press('[data-testid="chat-input"]', 'Enter');

  // Wait for response
  await page.waitForResponse('**/api/chat**');

  // Verify structure
  const nodes = mindmapData.nodes;
  const roots = nodes.filter(n => n.parentId === null);
  const children = nodes.filter(n => n.parentId !== null);

  expect(roots.length).toBe(1); // Only 1 root
  expect(children.length).toBeGreaterThan(3); // At least 4 children

  // Check depth
  const getDepth = (nodeId, nodes, depth = 0) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return depth;
    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return depth;
    return getDepth(parent.id, nodes, depth + 1);
  };

  const maxDepth = Math.max(...nodes.map(n => getDepth(n.id, nodes)));
  expect(maxDepth).toBeGreaterThanOrEqual(2); // At least 3 levels
});
```

- [ ] 0.5.4 - Test hierarchy creato ed eseguito
- [ ] 0.5.5 - Struttura gerarchica verificata automaticamente

### 0.5.3 Test Multi-Maestro (Playwright)

**File**: `e2e/multi-maestro-tool.spec.ts`

```typescript
test('Galileo responds to mindmap request, not Melissa', async ({ page }) => {
  await page.goto('/education');
  await page.click('text=Mappe Mentali');
  await page.click('text=Crea con Professore');
  await page.click('text=Galileo');
  await page.click('text=Chat');

  await page.fill('[data-testid="chat-input"]', 'Fammi una mappa del sistema solare');
  await page.press('[data-testid="chat-input"]', 'Enter');

  // Wait for response
  await page.waitForSelector('[data-testid="assistant-message"]');

  // Check who responded
  const responseAvatar = await page.locator('[data-testid="response-avatar"]').getAttribute('alt');
  expect(responseAvatar).toContain('Galileo');
  expect(responseAvatar).not.toContain('Melissa');
});

test('Marie Curie responds to quiz request', async ({ page }) => {
  // Similar test for Marie Curie
});

test('Darwin responds to flashcard request', async ({ page }) => {
  // Similar test for Darwin
});
```

- [ ] 0.5.6 - Test Galileo eseguito, risponde correttamente
- [ ] 0.5.7 - Test Marie Curie eseguito
- [ ] 0.5.8 - Test Darwin eseguito
- [ ] 0.5.9 - NESSUN fallback a Melissa

### 0.5.4 Test Memory Persistence (Playwright)

**File esistente**: `e2e/fix-verification-comprehensive.spec.ts` (verificare)

```typescript
test('Melissa remembers user info across sessions', async ({ page }) => {
  await page.goto('/education');
  await page.click('text=Melissa');

  // Tell info
  await page.fill('[data-testid="chat-input"]', 'Mi chiamo Marco, ho 15 anni');
  await page.press('[data-testid="chat-input"]', 'Enter');
  await page.waitForSelector('[data-testid="assistant-message"]');

  // Close conversation
  await page.click('[data-testid="close-conversation"]');

  // Reopen
  await page.click('text=Melissa');

  // Ask
  await page.fill('[data-testid="chat-input"]', 'Ti ricordi come mi chiamo?');
  await page.press('[data-testid="chat-input"]', 'Enter');

  // Verify response contains name
  const response = await page.locator('[data-testid="assistant-message"]').last();
  await expect(response).toContainText(/Marco/i);
});
```

- [ ] 0.5.10 - Test memory persistence eseguito
- [ ] 0.5.11 - Melissa ricorda nome

### 0.5.5 Test Tool Navigation Scroll (Playwright)

**File**: `e2e/tool-navigation-scroll.spec.ts`

```typescript
test('creating tool in chat does not cause scroll jump', async ({ page }) => {
  await page.goto('/education');
  await page.click('text=Melissa'); // NON focus mode

  // Send some messages to create scroll history
  for (let i = 0; i < 5; i++) {
    await page.fill('[data-testid="chat-input"]', `Messaggio ${i}`);
    await page.press('[data-testid="chat-input"]', 'Enter');
    await page.waitForSelector(`text=Messaggio ${i}`);
  }

  // Get scroll position before
  const scrollBefore = await page.evaluate(() => window.scrollY);

  // Request tool
  await page.fill('[data-testid="chat-input"]', 'Crea una mappa mentale');
  await page.press('[data-testid="chat-input"]', 'Enter');

  // Wait for tool to appear
  await page.waitForSelector('[data-testid="tool-result"]');

  // Check scroll didn't jump dramatically
  const scrollAfter = await page.evaluate(() => window.scrollY);
  const scrollDiff = Math.abs(scrollAfter - scrollBefore);

  // Allow some scroll (max 200px for natural flow), but not a full page jump
  expect(scrollDiff).toBeLessThan(500);
});
```

- [ ] 0.5.12 - Test scroll creato ed eseguito
- [ ] 0.5.13 - Nessun scroll jump anomalo

---

## 0.6 Wave 0 Gate

**TUTTI con output Playwright**:

```bash
# Run all critical tests
npx playwright test e2e/focus-tool-layout.spec.ts --reporter=list
npx playwright test e2e/mindmap-hierarchy.spec.ts --reporter=list
npx playwright test e2e/multi-maestro-tool.spec.ts --reporter=list
npx playwright test e2e/tool-navigation-scroll.spec.ts --reporter=list
```

- [ ] 0.6.1 - typecheck PASS
- [ ] 0.6.2 - lint PASS
- [ ] 0.6.3 - build PASS
- [ ] 0.6.4 - E2E full suite PASS
- [ ] 0.6.5 - Focus layout test PASS
- [ ] 0.6.6 - Hierarchy test PASS
- [ ] 0.6.7 - Multi-maestro test PASS
- [ ] 0.6.8 - Memory test PASS
- [ ] 0.6.9 - Scroll test PASS

---

# WAVE 1: TOOL UX FIX [BLOCKING]

## 1.1 Analisi con Playwright

Prima di fixare, MISURO il problema:

```bash
npx playwright test e2e/tool-navigation-scroll.spec.ts --reporter=list
```

Se il test PASSA, il bug non esiste (o e' gia' fixato).
Se FAIL, procedo con l'analisi.

- [ ] 1.1.1 - Test eseguito, risultato: ____

## 1.2 Root Cause (se test fallisce)

```bash
grep -n "scrollIntoView\|scrollTo" src/components/education/conversation-flow.tsx
grep -n "height\|resize" src/components/tools/tool-result.tsx
```

- [ ] 1.2.1 - Root cause identificata
- [ ] 1.2.2 - File/linea specifica

## 1.3 Discussione Soluzione (ROBERTO DECIDE)

| # | Soluzione | Descrizione |
|---|-----------|-------------|
| A | Tool compatto + expand | Preview inline, click per modal |
| B | Auto-switch fullscreen | Quando tool creato → fullscreen |
| C | Split view | Chat sx, tool dx |
| D | Card collapsed | Tool come card espandibile |

- [ ] 1.3.1 - Roberto sceglie: ____
- [ ] 1.3.2 - Motivazione documentata

## 1.4 Implementazione

- [ ] 1.4.1 - Codice implementato
- [ ] 1.4.2 - Test Playwright scroll: PASS
- [ ] 1.4.3 - Test desktop visivo: OK
- [ ] 1.4.4 - Test tablet visivo: OK

## 1.5 Wave 1 Gate

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/tool-navigation-scroll.spec.ts --reporter=list
```

- [ ] 1.5.1 - typecheck PASS
- [ ] 1.5.2 - lint PASS
- [ ] 1.5.3 - build PASS
- [ ] 1.5.4 - Scroll test PASS
- [ ] 1.5.5 - E2E full suite ancora PASS

---

# WAVE 2: DASHBOARD ANALYTICS

## 2.1 Schema Prisma

**File**: `prisma/schema.prisma`

```prisma
model RateLimitEvent {
  id        String   @id @default(cuid())
  userId    String?
  endpoint  String
  limit     Int
  window    Int
  ipAddress String?
  timestamp DateTime @default(now())
  @@index([userId, timestamp])
  @@index([endpoint, timestamp])
}

model SafetyEvent {
  id              String   @id @default(cuid())
  userId          String?
  type            String
  severity        String
  conversationId  String?
  resolvedBy      String?
  resolvedAt      DateTime?
  resolution      String?
  timestamp       DateTime @default(now())
  @@index([userId, timestamp])
  @@index([severity, timestamp])
}
```

- [ ] 2.1.1 - Schema modificato
- [ ] 2.1.2 - `npx prisma db push` SUCCESS
- [ ] 2.1.3 - `npx prisma generate` SUCCESS

## 2.2 Persistence Layer

- [ ] 2.2.1 - `src/lib/rate-limit.ts` persiste eventi
- [ ] 2.2.2 - `src/lib/safety/monitoring.ts` persiste eventi

## 2.3 API Routes + Test

In `src/app/api/analytics/`:

```bash
# Dopo creazione, test con curl
curl http://localhost:3000/api/analytics/token-usage
curl http://localhost:3000/api/analytics/voice-metrics
curl http://localhost:3000/api/analytics/fsrs-stats
curl http://localhost:3000/api/analytics/rate-limits
curl http://localhost:3000/api/analytics/safety-events
```

- [ ] 2.3.1 - token-usage: risponde JSON
- [ ] 2.3.2 - voice-metrics: risponde JSON
- [ ] 2.3.3 - fsrs-stats: risponde JSON
- [ ] 2.3.4 - rate-limits: risponde JSON
- [ ] 2.3.5 - safety-events: risponde JSON

## 2.4 Voice Instrumentation

- [ ] 2.4.1 - Metriche in `use-voice-session.ts`
- [ ] 2.4.2 - Verificato con telemetry event

## 2.5 Dashboard UI + Test Playwright

**File**: `e2e/dashboard-analytics.spec.ts`

```typescript
test('dashboard shows 5 analytics cards', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.locator('[data-testid="card-cost-metrics"]')).toBeVisible();
  await expect(page.locator('[data-testid="card-voice-quality"]')).toBeVisible();
  await expect(page.locator('[data-testid="card-fsrs-performance"]')).toBeVisible();
  await expect(page.locator('[data-testid="card-rate-limiting"]')).toBeVisible();
  await expect(page.locator('[data-testid="card-safety-summary"]')).toBeVisible();
});
```

- [ ] 2.5.1 - Card Cost Metrics
- [ ] 2.5.2 - Card Voice Quality
- [ ] 2.5.3 - Card FSRS Performance
- [ ] 2.5.4 - Card Rate Limiting (admin)
- [ ] 2.5.5 - Card Safety Summary (admin)
- [ ] 2.5.6 - Test Playwright PASS

## 2.6 Wave 2 Gate

- [ ] 2.6.1 - typecheck PASS
- [ ] 2.6.2 - lint PASS
- [ ] 2.6.3 - build PASS
- [ ] 2.6.4 - E2E PASS
- [ ] 2.6.5 - Dashboard test PASS

---

# WAVE 3: REPO MIGRATION PREP

**NOTA**: Logo gia' aggiornato.

## 3.1 Audit Pre-Migration

```bash
grep -ri "convergio" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" . | grep -v node_modules | grep -v ".next" | wc -l
```

- [ ] 3.1.1 - Audit completato, count: ____

## 3.2 Create Migration Script

- [ ] 3.2.1 - Script creato
- [ ] 3.2.2 - Dry run verificato

## 3.3 Execute Migration

```bash
git checkout -b chore/repo-migration-mirrorbuddy
./scripts/migrate-to-mirrorbuddy.sh
npm install
```

- [ ] 3.3.1 - Branch creato
- [ ] 3.3.2 - Script eseguito
- [ ] 3.3.3 - npm install SUCCESS

## 3.4 SessionStorage Migration

- [ ] 3.4.1 - File creato
- [ ] 3.4.2 - Chiamato in layout.tsx

## 3.5 Post-Migration Validation

```bash
# ZERO occorrenze
grep -ri "convergio" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next" | wc -l

npm run typecheck && npm run lint && npm run build
npx playwright test --reporter=list
```

- [ ] 3.5.1 - Zero "convergio" (count: ____)
- [ ] 3.5.2 - typecheck PASS
- [ ] 3.5.3 - lint PASS
- [ ] 3.5.4 - build PASS
- [ ] 3.5.5 - E2E PASS

## 3.6 UI Verification (Playwright)

```typescript
test('app title is MirrorBuddy', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MirrorBuddy/);
});

test('no Convergio text visible', async ({ page }) => {
  await page.goto('/');
  const body = await page.textContent('body');
  expect(body).not.toContain('Convergio');
});
```

- [ ] 3.6.1 - Title test PASS
- [ ] 3.6.2 - No Convergio test PASS

## 3.7 PR Ready

- [ ] 3.7.1 - Commit creato
- [ ] 3.7.2 - PR creata
- [ ] 3.7.3 - PR pronta per review Roberto

## 3.8 AZIONI ROBERTO

- [ ] 3.8.1 - Merge PR
- [ ] 3.8.2 - GitHub transfer
- [ ] 3.8.3 - Vercel setup
- [ ] 3.8.4 - DNS
- [ ] 3.8.5 - Deploy test

---

# WAVE 4: DOCUMENTATION UPDATE

## 4.1 README.md

- [ ] 4.1.1 - Nome progetto aggiornato
- [ ] 4.1.2 - Descrizione aggiornata
- [ ] 4.1.3 - URL repo aggiornato
- [ ] 4.1.4 - Setup instructions verificate

## 4.2 CHANGELOG.md

- [ ] 4.2.1 - Entry rebrand
- [ ] 4.2.2 - Entry Wave 2 features

## 4.3 CLAUDE.md

- [ ] 4.3.1 - Riferimenti aggiornati

## 4.4 CONTRIBUTING.md

- [ ] 4.4.1 - URL aggiornato

## 4.5 SECURITY.md

- [ ] 4.5.1 - Contatti aggiornati

## 4.6 package.json

- [ ] 4.6.1 - name: "mirrorbuddy"
- [ ] 4.6.2 - repository.url corretto
- [ ] 4.6.3 - bugs.url corretto

## 4.7 Docs Cleanup

- [ ] 4.7.1 - Piani completati in done/
- [ ] 4.7.2 - Nessun file obsoleto

## 4.8 Wave 4 Gate

```bash
grep -ri "convergio" docs/ README.md CONTRIBUTING.md SECURITY.md | wc -l
# Expected: 0
```

- [ ] 4.8.1 - Zero refs in docs principali

---

# FINAL VALIDATION GATE

**TUTTI [x] con output verificabile**:

```bash
# Validation suite
npm run typecheck
npm run lint
npm run build
npx playwright test --reporter=list
grep -ri "convergio" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next" | wc -l
```

```
WAVE 0: [ ] Complete
WAVE 1: [ ] Complete
WAVE 2: [ ] Complete
WAVE 3: [ ] Complete (parte Claude)
WAVE 4: [ ] Complete

GLOBAL:
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors/warnings
- [ ] Build SUCCESS
- [ ] E2E 100% pass
- [ ] Zero "convergio" in code
- [ ] All Playwright tests PASS
- [ ] Docs updated
- [ ] PR ready for Roberto
```

---

# SESSION RECOVERY

```bash
cat docs/plans/todo/Jan3MasterPlan.md | grep "\[ \]" | head -1
```

---

# TOOLS USAGE REFERENCE

| Task | Tool | Comando |
|------|------|---------|
| Type check | npm | `npm run typecheck` |
| Lint | npm | `npm run lint` |
| Build | npm | `npm run build` |
| E2E | Playwright | `npx playwright test` |
| Layout verify | Playwright | `boundingBox()` + assertions |
| Scroll verify | Playwright | `page.evaluate(() => window.scrollY)` |
| API verify | curl | `curl localhost:3000/api/...` |
| Text search | grep | `grep -ri "pattern"` |
| Network intercept | Playwright | `page.route()` |

**NIENTE "ho guardato" senza output verificabile.**

---

**Creato**: 2026-01-03
**Autore**: Claude Opus 4.5
**Principio**: ZERO tolerance. Playwright per verifiche. Output come prova. Fix alla radice.
