# i18n Step 2: Middleware

**Prerequisiti**: Step 1 completato
**Rischio**: MEDIO (nuovo file, potrebbe interferire con routing)
**Tempo stimato**: 15 min

---

## Checklist

### 2.1 Crea `src/middleware.ts`

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except:
  // - API routes (/api/*)
  // - Static files (_next/*, favicon.ico, etc.)
  // - Public assets (images, fonts, etc.)
  matcher: [
    // Match all pathnames except for
    // - ... if they start with `/api`, `/_next` or contain a dot (files)
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // Match all pathnames within `/` and `/en`, `/it`
    '/',
    '/(it|en)/:path*',
  ],
};
```
- [ ] File creato

### 2.2 Test manuale

1. Avvia dev server: `npm run dev`
2. Vai a `http://localhost:3000/`
3. Controlla che:
   - La pagina carica senza errori
   - L'URL potrebbe avere redirect a `/it/` (dipende dal browser)
   - Nessun errore in console

- [ ] App carica senza crash
- [ ] Console pulita (no errori i18n)

---

## Verifica

```bash
npm run typecheck
npm run build
```

- [ ] TypeCheck passa
- [ ] Build passa

---

## Nota Importante

A questo punto l'app potrebbe comportarsi in modo strano perché:
- Il middleware fa redirect a `/it/` o `/en/`
- Ma non esiste ancora `src/app/[locale]/` directory

**Questo è normale!** L'app mostrerà 404 per le route con prefisso locale.

Il fix viene nel Step 3.

---

## Commit

```bash
git add src/middleware.ts
git commit -m "feat(i18n): add locale detection middleware

- Create middleware.ts with next-intl routing
- Configure matcher to exclude API and static files

Issue #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
- [ ] Commit creato

---

## Prossimo Step

Vai a `i18n-03-AppRestructure.md`
