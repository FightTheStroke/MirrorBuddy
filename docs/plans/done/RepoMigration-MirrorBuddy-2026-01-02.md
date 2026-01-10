# Repository Migration: MirrorBuddy → MirrorBuddy

**Data**: 2026-01-02
**Issue**: #66
**Branch**: `chore/repo-migration-mirrorbuddy`
**Status**: NOT STARTED

---

## Execution Tracker

| Phase | Status | Completato |
|-------|--------|------------|
| 1. Preparation | [ ] | |
| 2. Automated Rebranding | [ ] | |
| 3. Manual Review | [ ] | |
| 4. Validation | [ ] | |
| 5. Repository Transfer | [ ] | |
| 6. Infrastructure Update | [ ] | |

**Progress**: 0/6 phases complete

---

## Obiettivo

Migrare completamente il repository da MirrorBuddy a MirrorBuddy:
1. Rinominare tutte le occorrenze nel codice e nella documentazione
2. Trasferire ownership a FightTheStroke
3. Aggiornare infrastruttura (Vercel, dominio, etc.)

---

## Analisi Occorrenze

| Pattern | Sostituzione | File | Occorrenze |
|---------|-------------|------|------------|
| `mirrorbuddy` | `mirrorbuddy` | package.json, package-lock.json | ~3 |
| `MirrorBuddy` | `MirrorBuddy` | docs, components, comments | ~150 |
| `MirrorBuddy` | `MirrorBuddy` | UI text, landing | ~15 |
| `MirrorBuddy` | `MirrorBuddy` | UI text, comments | ~30 |
| `convergio` | `mirrorbuddy` | sessionStorage keys, vars | ~20 |
| **Totale** | | **179 files** | **~557** |

### File Critici (priorita alta)

```
package.json                    # name, description, repo URLs
package-lock.json               # name
src/app/layout.tsx              # title metadata
src/app/page.tsx                # logo alt, brand name
src/app/welcome/page.tsx        # welcome text
src/app/landing/page.tsx        # landing page brand
src/app/showcase/*.tsx          # showcase pages
src/components/pwa/ios-install-banner.tsx
CLAUDE.md, README.md, CONTRIBUTING.md, SECURITY.md
```

### SessionStorage Keys (richiede migrazione)

```typescript
// Attuale
'convergio-user-id'

// Nuovo
'mirrorbuddy-user-id'

// File interessati:
// - src/components/tools/tool-panel.tsx
// - src/components/tools/tool-canvas.tsx
// - src/components/education/flashcards-view.tsx
// - src/components/conversation/conversation-flow.tsx
// - src/components/settings/sections/privacy-settings.tsx
```

---

## Piano di Esecuzione

### Phase 1: Preparation (Pre-Migration)

- [ ] **1.1** Backup repository completo
- [ ] **1.2** Creare branch `chore/repo-migration-mirrorbuddy`
- [ ] **1.3** Eseguire script di audit per confermare occorrenze
- [ ] **1.4** Documentare configurazioni esterne (Vercel, Azure, etc.)

### Phase 2: Automated Rebranding

- [ ] **2.1** Eseguire `scripts/migrate-to-mirrorbuddy.sh` (vedi sotto)
- [ ] **2.2** Verificare diff manualmente per casi edge
- [ ] **2.3** Aggiungere migrazione sessionStorage key

### Phase 3: Manual Review

- [ ] **3.1** Verificare package.json/package-lock.json
- [ ] **3.2** Verificare metadata in layout.tsx e manifest
- [ ] **3.3** Verificare URL GitHub nei file
- [ ] **3.4** Verificare testi UI in italiano siano coerenti

### Phase 4: Validation

- [ ] **4.1** `npm run lint`
- [ ] **4.2** `npm run typecheck`
- [ ] **4.3** `npm run build`
- [ ] **4.4** `npm run test`
- [ ] **4.5** Verifica manuale UI critica

### Phase 5: Repository Transfer

- [ ] **5.1** Merge PR su development
- [ ] **5.2** Merge development su main
- [ ] **5.3** Transfer ownership: Settings > Transfer Repository > FightTheStroke
- [ ] **5.4** Rinominare repository in `MirrorBuddy`
- [ ] **5.5** Verificare redirect automatici GitHub

### Phase 6: Infrastructure Update

- [ ] **6.1** Aggiornare progetto Vercel (o creare nuovo)
- [ ] **6.2** Configurare nuovo dominio
- [ ] **6.3** Aggiornare CORS in Azure OpenAI
- [ ] **6.4** Aggiornare environment variables

---

## Script di Migrazione

### `scripts/migrate-to-mirrorbuddy.sh`

```bash
#!/bin/bash
set -e

echo "=== MirrorBuddy → MirrorBuddy Migration ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Dry run mode
DRY_RUN=${DRY_RUN:-false}

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# Directories to process
DIRS="src docs prisma public e2e scripts .claude .github"
EXTENSIONS="ts,tsx,js,jsx,json,md,yml,yaml,sh,prisma,css"

# Function to run sed (cross-platform)
run_sed() {
    local pattern=$1
    local file=$2
    if [ "$DRY_RUN" = "true" ]; then
        grep -l "$pattern" "$file" 2>/dev/null && echo "  Would update: $file"
    else
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "$pattern" "$file"
        else
            sed -i "$pattern" "$file"
        fi
    fi
}

echo "Phase 1: Package files"
echo "----------------------"

# package.json - name field
if [ "$DRY_RUN" != "true" ]; then
    sed -i '' 's/"name": "mirrorbuddy"/"name": "mirrorbuddy"/g' package.json
    sed -i '' 's/MirrorBuddy/MirrorBuddy/g' package.json
    sed -i '' 's|Roberdan/MirrorBuddy|FightTheStroke/MirrorBuddy|g' package.json
    echo -e "${GREEN}Updated: package.json${NC}"
fi

# Regenerate package-lock.json (don't manually edit)
echo -e "${YELLOW}Note: Run 'npm install' after to update package-lock.json${NC}"

echo ""
echo "Phase 2: Source code (.ts, .tsx)"
echo "---------------------------------"

# Find and replace in source files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    if grep -q -E "convergio|MirrorBuddy|MirrorBuddy" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            # Order matters: most specific first
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/mirrorbuddy/mirrorbuddy/g' "$file"
            sed -i '' 's/convergio-user-id/mirrorbuddy-user-id/g' "$file"
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' "s/'convergio'/'mirrorbuddy'/g" "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 3: Documentation (.md)"
echo "----------------------------"

find . -name "*.md" -not -path "./node_modules/*" | while read file; do
    if grep -q -E "convergio|MirrorBuddy|MirrorBuddy" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/mirrorbuddy/mirrorbuddy/g' "$file"
            sed -i '' 's|Roberdan/MirrorBuddy|FightTheStroke/MirrorBuddy|g' "$file"
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 4: Config files"
echo "---------------------"

# tsconfig.json
if grep -q "MirrorBuddy" tsconfig.json 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/MirrorBuddy-Memory/MirrorBuddy-Memory/g' tsconfig.json
        echo -e "${GREEN}Updated: tsconfig.json${NC}"
    else
        echo "  Would update: tsconfig.json"
    fi
fi

# .env.example
if grep -q -i "convergio" .env.example 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/convergio/mirrorbuddy/gi' .env.example
        echo -e "${GREEN}Updated: .env.example${NC}"
    else
        echo "  Would update: .env.example"
    fi
fi

# public/sw.js
if [ -f "public/sw.js" ] && grep -q -i "convergio" public/sw.js 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/convergio/mirrorbuddy/gi' public/sw.js
        echo -e "${GREEN}Updated: public/sw.js${NC}"
    else
        echo "  Would update: public/sw.js"
    fi
fi

echo ""
echo "Phase 5: E2E tests"
echo "------------------"

find e2e -type f -name "*.ts" 2>/dev/null | while read file; do
    if grep -q -E "convergio|MirrorBuddy|MirrorBuddy" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 6: Scripts"
echo "----------------"

find scripts -type f \( -name "*.sh" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null | while read file; do
    if grep -q -E "convergio|MirrorBuddy|MirrorBuddy" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 7: Prisma schema"
echo "----------------------"

if grep -q -i "convergio" prisma/schema.prisma 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/convergio/mirrorbuddy/gi' prisma/schema.prisma
        echo -e "${GREEN}Updated: prisma/schema.prisma${NC}"
    else
        echo "  Would update: prisma/schema.prisma"
    fi
fi

echo ""
echo "Phase 8: Claude config"
echo "----------------------"

find .claude -type f -name "*.md" 2>/dev/null | while read file; do
    if grep -q -E "convergio|MirrorBuddy|MirrorBuddy" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/MirrorBuddy/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "=========================================="
echo -e "${GREEN}Migration script completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run lint"
echo "3. Run: npm run typecheck"
echo "4. Run: npm run build"
echo "5. Run: npm run test"
echo "6. Review changes: git diff"
echo "7. Commit: git add -A && git commit -m 'chore: rebrand MirrorBuddy to MirrorBuddy'"
echo ""
```

### Script di Audit (pre-migration)

```bash
#!/bin/bash
# scripts/audit-convergio-refs.sh

echo "=== Audit: MirrorBuddy References ==="
echo ""

echo "By pattern:"
echo "-----------"
echo -n "mirrorbuddy: "
grep -r "mirrorbuddy" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l

echo -n "MirrorBuddy: "
grep -r "MirrorBuddy" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l

echo -n "MirrorBuddy: "
grep -r "MirrorBuddy" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l

echo -n "MirrorBuddy (standalone): "
grep -rw "MirrorBuddy" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v MirrorBuddy | wc -l

echo -n "convergio-user-id: "
grep -r "convergio-user-id" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l

echo ""
echo "By file type:"
echo "-------------"
echo -n ".tsx files: "
grep -rl "convergio\|MirrorBuddy" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l

echo -n ".ts files: "
grep -rl "convergio\|MirrorBuddy" --include="*.ts" . 2>/dev/null | grep -v node_modules | wc -l

echo -n ".md files: "
grep -rl "convergio\|MirrorBuddy" --include="*.md" . 2>/dev/null | grep -v node_modules | wc -l

echo -n ".json files: "
grep -rl "convergio\|MirrorBuddy" --include="*.json" . 2>/dev/null | grep -v node_modules | wc -l

echo ""
echo "Critical files:"
echo "---------------"
for file in package.json src/app/layout.tsx src/app/page.tsx CLAUDE.md README.md; do
    if grep -q -i "convergio" "$file" 2>/dev/null; then
        count=$(grep -c -i "convergio" "$file" 2>/dev/null)
        echo "  $file: $count occurrences"
    fi
done
```

---

## SessionStorage Migration

Aggiungere questo codice per migrare gli utenti esistenti:

```typescript
// src/lib/storage/migrate-session-key.ts

export function migrateSessionStorageKey() {
  if (typeof window === 'undefined') return;

  const oldKey = 'convergio-user-id';
  const newKey = 'mirrorbuddy-user-id';

  const oldValue = sessionStorage.getItem(oldKey);
  if (oldValue && !sessionStorage.getItem(newKey)) {
    sessionStorage.setItem(newKey, oldValue);
    sessionStorage.removeItem(oldKey);
    console.log('[Migration] Session key migrated to mirrorbuddy-user-id');
  }
}

// Chiamare in src/app/layout.tsx o in un useEffect globale
```

---

## GitHub URL Updates

```
# Migrato a:
https://github.com/FightTheStroke/MirrorBuddy
```

File da aggiornare:
- package.json (repository, homepage, bugs)
- README.md
- CONTRIBUTING.md
- SECURITY.md
- .github/workflows/*.yml (se presenti)

---

## Vercel Migration Checklist

- [ ] Creare nuovo progetto "mirrorbuddy" su Vercel
- [ ] Collegare al nuovo repository FightTheStroke/MirrorBuddy
- [ ] Copiare environment variables:
  - `AZURE_OPENAI_API_KEY`
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_DEPLOYMENT`
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET`
  - ... (verificare tutte)
- [ ] Configurare dominio mirrorbuddy.org (o altro)
- [ ] Abilitare Preview Deployments
- [ ] Configurare branch protection

---

## Rollback Plan

Se qualcosa va storto:

```bash
# Reset to pre-migration state
git checkout main
git branch -D chore/repo-migration-mirrorbuddy

# If already transferred, request transfer back
# GitHub: Settings > Transfer Repository
```

---

## Success Criteria

- [ ] Zero occorrenze di "convergio" nel codebase (case insensitive)
- [ ] `npm run lint` passa
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa
- [ ] `npm run test` passa (o test skippati documentati)
- [ ] Repository trasferito a FightTheStroke
- [ ] Deploy funzionante su nuovo dominio
- [ ] Redirect da vecchio URL funziona

---

## Note per Roberto

**Transfer ownership**: Si, basta andare su:
- Repository Settings > Danger Zone > Transfer Repository
- Inserire "FightTheStroke" come destinazione
- GitHub crea automaticamente redirect per 1 anno

**Pre-requisiti**:
1. Devi avere accesso admin a FightTheStroke org
2. Il nome "MirrorBuddy" deve essere disponibile nell'org
3. Issues, PRs, wiki, stars vengono trasferiti

**Tempistica consigliata**:
1. Merge questa PR su development
2. Merge development su main
3. Solo DOPO il merge, trasferire ownership

---

## Quick Checkpoint (copia-incolla per aggiornare)

```
## Execution Tracker

| Phase | Status | Completato |
|-------|--------|------------|
| 1. Preparation | [x] | 2026-01-XX |
| 2. Automated Rebranding | [x] | 2026-01-XX |
| 3. Manual Review | [x] | 2026-01-XX |
| 4. Validation | [x] | 2026-01-XX |
| 5. Repository Transfer | [ ] | |
| 6. Infrastructure Update | [ ] | |

**Progress**: 4/6 phases complete
```
