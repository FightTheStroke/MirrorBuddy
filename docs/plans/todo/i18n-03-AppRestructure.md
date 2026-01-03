# i18n Step 3: App Directory Restructure

**Prerequisiti**: Step 1 e 2 completati
**Rischio**: ALTO - questa operazione sposta 20+ file
**Tempo stimato**: 45 min

---

## ATTENZIONE

Questo step modifica la struttura dell'app. Se qualcosa va storto:

```bash
# Rollback completo
git checkout -- src/app/
git clean -fd src/app/
```

---

## Checklist

### 3.1 Crea directory [locale]

```bash
mkdir -p src/app/\[locale\]
```
- [ ] Directory creata

### 3.2 Crea `src/app/[locale]/layout.tsx`

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as typeof locales[number])) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for this locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```
- [ ] File creato

### 3.3 Aggiorna `src/app/layout.tsx` (root)

Il root layout rimane, ma diventa più semplice:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MirrorBuddy - The school we wished existed',
  description: 'AI-powered educational platform with 17 historical Maestros, voice tutoring, and personalized learning for students with learning differences.',
  keywords: ['education', 'AI', 'tutoring', 'voice', 'learning', 'DSA', 'ADHD', 'MirrorBuddy'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'MirrorBuddy',
    description: 'The school we wished existed. Now it does.',
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'MirrorBuddy',
    description: 'The school we wished existed. Now it does.',
    images: ['/icon-256.png'],
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <html lang={locale || 'it'} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <main id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
```
- [ ] File aggiornato

### 3.4 Sposta le pagine

**IMPORTANTE**: Esegui questi comandi uno alla volta e verifica dopo ognuno.

```bash
# Home page
mv src/app/page.tsx src/app/[locale]/page.tsx

# Welcome
mkdir -p src/app/[locale]/welcome
mv src/app/welcome/page.tsx src/app/[locale]/welcome/
rmdir src/app/welcome 2>/dev/null || true

# Conversazioni
mkdir -p src/app/[locale]/conversazioni
mv src/app/conversazioni/page.tsx src/app/[locale]/conversazioni/
rmdir src/app/conversazioni 2>/dev/null || true

# Materiali
mkdir -p src/app/[locale]/materiali
mv src/app/materiali/page.tsx src/app/[locale]/materiali/
rmdir src/app/materiali 2>/dev/null || true

# Genitori
mkdir -p src/app/[locale]/genitori
mv src/app/genitori/page.tsx src/app/[locale]/genitori/
rmdir src/app/genitori 2>/dev/null || true

# Parent Dashboard
mkdir -p src/app/[locale]/parent-dashboard
mv src/app/parent-dashboard/page.tsx src/app/[locale]/parent-dashboard/
rmdir src/app/parent-dashboard 2>/dev/null || true

# Study Kit
mkdir -p src/app/[locale]/study-kit
mv src/app/study-kit/page.tsx src/app/[locale]/study-kit/
rmdir src/app/study-kit 2>/dev/null || true

# Landing
mkdir -p src/app/[locale]/landing
mv src/app/landing/page.tsx src/app/[locale]/landing/
rmdir src/app/landing 2>/dev/null || true

# Archivio
mkdir -p src/app/[locale]/archivio
mv src/app/archivio/page.tsx src/app/[locale]/archivio/
rmdir src/app/archivio 2>/dev/null || true

# Admin Analytics
mkdir -p src/app/[locale]/admin/analytics
mv src/app/admin/analytics/page.tsx src/app/[locale]/admin/analytics/
rmdir src/app/admin/analytics 2>/dev/null || true
rmdir src/app/admin 2>/dev/null || true

# Test Voice
mkdir -p src/app/[locale]/test-voice
mv src/app/test-voice/page.tsx src/app/[locale]/test-voice/
rmdir src/app/test-voice 2>/dev/null || true

# Test Audio
mkdir -p src/app/[locale]/test-audio
mv src/app/test-audio/page.tsx src/app/[locale]/test-audio/
rmdir src/app/test-audio 2>/dev/null || true

# Showcase (ha layout + multiple pages)
mkdir -p src/app/[locale]/showcase
mv src/app/showcase/layout.tsx src/app/[locale]/showcase/
mv src/app/showcase/page.tsx src/app/[locale]/showcase/

# Showcase subpages
mv src/app/showcase/accessibility src/app/[locale]/showcase/
mv src/app/showcase/flashcards src/app/[locale]/showcase/
mv src/app/showcase/maestri src/app/[locale]/showcase/
mv src/app/showcase/quiz src/app/[locale]/showcase/
mv src/app/showcase/solar-system src/app/[locale]/showcase/
mv src/app/showcase/mindmaps src/app/[locale]/showcase/
mv src/app/showcase/chat src/app/[locale]/showcase/

# Cleanup empty showcase dir
rmdir src/app/showcase 2>/dev/null || true
```
- [ ] Tutte le pagine spostate

### 3.5 Verifica struttura

```bash
ls -la src/app/
# Dovrebbe mostrare:
# - [locale]/
# - api/
# - globals.css
# - layout.tsx

ls -la src/app/[locale]/
# Dovrebbe mostrare tutte le pagine spostate
```
- [ ] Struttura corretta

### 3.6 Cerca education directory

```bash
ls src/app/ | grep education
```

Se esiste `education/`, spostala:
```bash
mv src/app/education src/app/[locale]/
```
- [ ] Education verificata/spostata (se esiste)

### 3.7 Cerca settings directory

```bash
ls src/app/ | grep settings
```

Se esiste `settings/`, spostala:
```bash
mv src/app/settings src/app/[locale]/
```
- [ ] Settings verificata/spostata (se esiste)

---

## Verifica

```bash
npm run typecheck
npm run build
```

- [ ] TypeCheck passa
- [ ] Build passa

### Test manuale

1. `npm run dev`
2. Vai a `http://localhost:3000/`
3. Dovresti essere redirected a `/it/` o `/en/` (basato sul browser)
4. Naviga tra le pagine

- [ ] Home carica
- [ ] Navigazione funziona
- [ ] Nessun errore console

---

## Troubleshooting

### Errore: "Cannot find module"
Controlla che tutti gli import relativi siano ancora corretti. Se un componente usa `../`, potrebbe essere rotto.

### Errore: "Page not found"
Verifica che la pagina sia stata spostata correttamente in `[locale]/`

### Errore: "Locale not valid"
Verifica che il middleware stia usando le route corrette.

---

## Commit

```bash
git add .
git commit -m "feat(i18n): restructure app for locale routing

- Create [locale] directory with layout
- Move all 20+ pages under [locale]/
- Update root layout for dynamic locale
- Keep API routes at original location

Issue #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
- [ ] Commit creato

---

## Prossimo Step

Vai a `i18n-04-Translations-UI.md`
