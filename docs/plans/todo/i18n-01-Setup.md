# i18n Step 1: Setup Infrastructure

**Prerequisiti**: Nessuno
**Rischio**: BASSO (solo file nuovi, nessuna modifica a codice esistente)
**Tempo stimato**: 30 min

---

## Checklist

### 1.1 Crea branch
```bash
git checkout development
git pull origin development
git checkout -b feature/65-i18n
```
- [ ] Branch creato

### 1.2 Installa next-intl
```bash
npm install next-intl
```
- [ ] Installato senza errori

### 1.3 Crea `src/i18n/config.ts`
```typescript
export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'it';

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
```
- [ ] File creato

### 1.4 Crea `src/i18n/request.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as typeof locales[number])) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: {
      ...(await import(`@/messages/${locale}/common.json`)).default,
    },
    // Dev: show missing keys clearly
    onError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[i18n]', error.message);
      }
    },
    getMessageFallback: ({ key, namespace }) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (process.env.NODE_ENV === 'development') {
        return `[MISSING: ${fullKey}]`;
      }
      return fullKey;
    },
  };
});
```
- [ ] File creato

### 1.5 Crea `src/i18n/routing.ts`
```typescript
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // No prefix for default locale
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```
- [ ] File creato

### 1.6 Crea directory messaggi
```bash
mkdir -p src/messages/it
mkdir -p src/messages/en
```
- [ ] Directory create

### 1.7 Crea `src/messages/it/common.json`
```json
{
  "metadata": {
    "title": "MirrorBuddy - La scuola che avremmo voluto",
    "description": "Piattaforma educativa AI con 17 Maestri storici"
  },
  "nav": {
    "home": "Home",
    "education": "Educazione",
    "settings": "Impostazioni",
    "back": "Indietro"
  },
  "actions": {
    "save": "Salva",
    "cancel": "Annulla",
    "confirm": "Conferma",
    "delete": "Elimina",
    "edit": "Modifica",
    "close": "Chiudi",
    "refresh": "Aggiorna",
    "retry": "Riprova",
    "continue": "Continua",
    "start": "Inizia",
    "stop": "Ferma",
    "send": "Invia"
  },
  "status": {
    "loading": "Caricamento...",
    "error": "Si è verificato un errore",
    "success": "Operazione completata",
    "saving": "Salvataggio...",
    "saved": "Salvato"
  },
  "errors": {
    "generic": "Si è verificato un errore",
    "notFound": "Pagina non trovata",
    "unauthorized": "Non autorizzato",
    "networkError": "Errore di rete"
  },
  "language": {
    "label": "Lingua",
    "it": "Italiano",
    "en": "English"
  }
}
```
- [ ] File creato

### 1.8 Crea `src/messages/en/common.json`
```json
{
  "metadata": {
    "title": "MirrorBuddy - The school we wished existed",
    "description": "AI-powered educational platform with 17 historical Maestros"
  },
  "nav": {
    "home": "Home",
    "education": "Education",
    "settings": "Settings",
    "back": "Back"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "refresh": "Refresh",
    "retry": "Retry",
    "continue": "Continue",
    "start": "Start",
    "stop": "Stop",
    "send": "Send"
  },
  "status": {
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Operation completed",
    "saving": "Saving...",
    "saved": "Saved"
  },
  "errors": {
    "generic": "An error occurred",
    "notFound": "Page not found",
    "unauthorized": "Unauthorized",
    "networkError": "Network error"
  },
  "language": {
    "label": "Language",
    "it": "Italiano",
    "en": "English"
  }
}
```
- [ ] File creato

### 1.9 Aggiorna `next.config.ts`
```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import packageJson from './package.json';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: packageJson.version,
  },
  async headers() {
    // ... existing headers (keep unchanged)
  },
};

export default withNextIntl(nextConfig);
```
- [ ] File aggiornato

### 1.10 Aggiungi path alias per messages
In `tsconfig.json`, verifica che esista:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/messages/*": ["./src/messages/*"]
    }
  }
}
```
- [ ] Path alias verificato/aggiunto

---

## Verifica

```bash
npm run typecheck
npm run build
```

**Expected**: Nessun errore. L'app funziona ancora come prima (i18n non ancora wired).

- [ ] TypeCheck passa
- [ ] Build passa
- [ ] App funziona su localhost:3000

---

## Commit

```bash
git add .
git commit -m "feat(i18n): add next-intl infrastructure

- Install next-intl
- Create i18n config, request, routing files
- Create IT and EN common.json translation files
- Update next.config.ts with next-intl plugin

Issue #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
- [ ] Commit creato

---

## Prossimo Step

Vai a `i18n-02-Middleware.md`
