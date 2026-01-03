# i18n Step 4: UI Translations

**Prerequisiti**: Step 1-3 completati, app funziona con [locale] routing
**Rischio**: BASSO (modifiche incrementali)
**Tempo stimato**: 2-3 ore

---

## Strategia

1. Creare Language Switcher component
2. Estrarre stringhe UN COMPONENTE ALLA VOLTA
3. Verificare dopo ogni componente
4. Aggiungere traduzioni EN man mano

---

## Checklist

### 4.1 Crea Language Switcher

**File**: `src/components/ui/language-switcher.tsx`

```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { locales, type Locale } from '@/i18n/config';

const localeNames: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex gap-2" data-testid="language-switcher">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          data-testid={`locale-${loc}`}
          className={`px-2 py-1 text-sm rounded ${
            locale === loc
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
}
```
- [ ] File creato

### 4.2 Aggiungi Language Switcher alla UI

Aggiungi il componente dove serve (es. settings, header):

```typescript
import { LanguageSwitcher } from '@/components/ui/language-switcher';
// ...
<LanguageSwitcher />
```
- [ ] Language switcher visibile in UI

### 4.3 Test Language Switcher

1. Vai a una pagina
2. Clicca su "English"
3. URL dovrebbe cambiare a `/en/...`
4. Clicca su "Italiano"
5. URL dovrebbe cambiare a `/it/...`

- [ ] Switch funziona

---

## 4.4 Estrai Stringhe - Settings

### 4.4.1 Crea `src/messages/it/settings.json`

```json
{
  "title": "Impostazioni",
  "appearance": {
    "title": "Aspetto",
    "theme": {
      "label": "Tema",
      "light": "Chiaro",
      "dark": "Scuro",
      "system": "Sistema",
      "current": "Tema corrente: {theme} basato sulle preferenze di sistema"
    },
    "accentColor": {
      "label": "Colore Principale",
      "blue": "Blu",
      "green": "Verde",
      "purple": "Viola",
      "orange": "Arancione",
      "pink": "Rosa"
    },
    "language": {
      "label": "Lingua",
      "description": "Seleziona la lingua dell'interfaccia"
    }
  },
  "audio": {
    "title": "Audio",
    "voice": {
      "label": "Voce",
      "speed": "Velocità",
      "pitch": "Tono"
    },
    "ambientSound": {
      "label": "Suoni Ambientali",
      "enabled": "Attivi",
      "disabled": "Disattivi"
    }
  },
  "accessibility": {
    "title": "Accessibilità",
    "profile": {
      "label": "Profilo",
      "none": "Nessuno",
      "dyslexia": "Dislessia",
      "adhd": "ADHD",
      "visualImpairment": "Ipovisione"
    },
    "fontSize": {
      "label": "Dimensione Testo",
      "small": "Piccolo",
      "medium": "Medio",
      "large": "Grande"
    }
  },
  "notifications": {
    "title": "Notifiche",
    "enabled": "Notifiche attive",
    "sound": "Suono notifiche"
  }
}
```
- [ ] IT settings.json creato

### 4.4.2 Crea `src/messages/en/settings.json`

```json
{
  "title": "Settings",
  "appearance": {
    "title": "Appearance",
    "theme": {
      "label": "Theme",
      "light": "Light",
      "dark": "Dark",
      "system": "System",
      "current": "Current theme: {theme} based on system preferences"
    },
    "accentColor": {
      "label": "Accent Color",
      "blue": "Blue",
      "green": "Green",
      "purple": "Purple",
      "orange": "Orange",
      "pink": "Pink"
    },
    "language": {
      "label": "Language",
      "description": "Select the interface language"
    }
  },
  "audio": {
    "title": "Audio",
    "voice": {
      "label": "Voice",
      "speed": "Speed",
      "pitch": "Pitch"
    },
    "ambientSound": {
      "label": "Ambient Sounds",
      "enabled": "Enabled",
      "disabled": "Disabled"
    }
  },
  "accessibility": {
    "title": "Accessibility",
    "profile": {
      "label": "Profile",
      "none": "None",
      "dyslexia": "Dyslexia",
      "adhd": "ADHD",
      "visualImpairment": "Visual Impairment"
    },
    "fontSize": {
      "label": "Font Size",
      "small": "Small",
      "medium": "Medium",
      "large": "Large"
    }
  },
  "notifications": {
    "title": "Notifications",
    "enabled": "Notifications enabled",
    "sound": "Notification sound"
  }
}
```
- [ ] EN settings.json creato

### 4.4.3 Aggiorna request.ts per caricare settings

```typescript
// In src/i18n/request.ts, aggiorna messages:
messages: {
  ...(await import(`@/messages/${locale}/common.json`)).default,
  settings: (await import(`@/messages/${locale}/settings.json`)).default,
},
```
- [ ] request.ts aggiornato

### 4.4.4 Aggiorna appearance-settings.tsx

```typescript
import { useTranslations } from 'next-intl';

export function AppearanceSettings() {
  const t = useTranslations('settings.appearance');

  return (
    <div>
      <h2>{t('title')}</h2>
      <Label>{t('theme.label')}</Label>
      {/* ... */}
    </div>
  );
}
```
- [ ] Componente aggiornato
- [ ] Funziona in IT
- [ ] Funziona in EN

---

## 4.5 Estrai Stringhe - Scheduler

### 4.5.1 Crea `src/messages/it/scheduler.json`

```json
{
  "title": "Calendario Studio",
  "days": {
    "monday": "Lunedì",
    "tuesday": "Martedì",
    "wednesday": "Mercoledì",
    "thursday": "Giovedì",
    "friday": "Venerdì",
    "saturday": "Sabato",
    "sunday": "Domenica"
  },
  "duration": {
    "15min": "15 min",
    "30min": "30 min",
    "45min": "45 min",
    "1hour": "1 ora",
    "1hour30": "1h 30m",
    "2hours": "2 ore"
  },
  "subjects": {
    "mathematics": "Matematica",
    "italian": "Italiano",
    "history": "Storia",
    "science": "Scienze",
    "geography": "Geografia",
    "english": "Inglese",
    "art": "Arte",
    "music": "Musica",
    "philosophy": "Filosofia",
    "latin": "Latino",
    "other": "Altro"
  }
}
```
- [ ] IT scheduler.json creato

### 4.5.2 Crea `src/messages/en/scheduler.json`

```json
{
  "title": "Study Calendar",
  "days": {
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    "sunday": "Sunday"
  },
  "duration": {
    "15min": "15 min",
    "30min": "30 min",
    "45min": "45 min",
    "1hour": "1 hour",
    "1hour30": "1h 30m",
    "2hours": "2 hours"
  },
  "subjects": {
    "mathematics": "Mathematics",
    "italian": "Italian",
    "history": "History",
    "science": "Science",
    "geography": "Geography",
    "english": "English",
    "art": "Art",
    "music": "Music",
    "philosophy": "Philosophy",
    "latin": "Latin",
    "other": "Other"
  }
}
```
- [ ] EN scheduler.json creato
- [ ] Componenti scheduler aggiornati
- [ ] Funziona in entrambe le lingue

---

## 4.6 Estrai Stringhe - Education

### 4.6.1 Crea `src/messages/it/education.json`

```json
{
  "title": "Educazione",
  "selectMaestro": "Scegli un Maestro",
  "selectTool": "Scegli uno Strumento",
  "tools": {
    "mindmap": "Mappa Mentale",
    "quiz": "Quiz",
    "flashcards": "Flashcard",
    "demo": "Demo Interattiva"
  },
  "modes": {
    "chat": "Chat",
    "voice": "Voce"
  },
  "chat": {
    "placeholder": "Scrivi un messaggio...",
    "send": "Invia"
  },
  "voice": {
    "start": "Inizia conversazione",
    "stop": "Termina",
    "mute": "Muto",
    "unmute": "Attiva audio"
  }
}
```
- [ ] IT education.json creato

### 4.6.2 Crea EN version e aggiorna componenti

- [ ] EN education.json creato
- [ ] Componenti education aggiornati
- [ ] Funziona in entrambe le lingue

---

## 4.7 Estrai Stringhe - Onboarding

- [ ] IT onboarding.json creato
- [ ] EN onboarding.json creato
- [ ] Componenti aggiornati
- [ ] Funziona in entrambe le lingue

---

## Verifica Finale Step 4

```bash
npm run typecheck
npm run build
npm run dev
```

Test manuale:
1. Vai a `/it/settings` - tutto in italiano
2. Vai a `/en/settings` - tutto in inglese
3. Switch lingua - UI cambia
4. Naviga tra le pagine - lingua persiste

- [ ] TypeCheck passa
- [ ] Build passa
- [ ] Test manuale passa

---

## Commit

```bash
git add .
git commit -m "feat(i18n): extract UI strings to translation files

- Add Language Switcher component
- Create settings, scheduler, education, onboarding translations
- Update all UI components to use useTranslations

Issue #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
- [ ] Commit creato

---

## Prossimo Step

Vai a `i18n-05-Translations-Data.md`
