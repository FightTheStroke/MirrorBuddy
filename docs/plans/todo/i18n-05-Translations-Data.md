# i18n Step 5: Data Translations

**Prerequisiti**: Step 4 completato
**Rischio**: MEDIO (modifica file dati core)
**Tempo stimato**: 2-3 ore

---

## Strategia

I file dati (`maestri-full.ts`, `buddy-profiles.ts`, etc.) contengono stringhe hardcoded.
Due approcci possibili:

**A) Translation Keys** - I file dati usano chiavi, traduzioni in JSON
**B) Locale-aware Data** - Funzioni che ritornano dati basati su locale

Usiamo **Approccio A** perché:
- Separazione netta dati/traduzioni
- Più facile per traduttori
- Consistent con resto dell'app

---

## Checklist

### 5.1 Subjects

#### 5.1.1 Crea `src/messages/it/subjects.json`

```json
{
  "mathematics": "Matematica",
  "physics": "Fisica",
  "chemistry": "Chimica",
  "biology": "Biologia",
  "italian": "Italiano",
  "history": "Storia",
  "geography": "Geografia",
  "philosophy": "Filosofia",
  "art": "Arte",
  "music": "Musica",
  "latin": "Latino",
  "greek": "Greco",
  "english": "Inglese",
  "french": "Francese",
  "spanish": "Spagnolo",
  "german": "Tedesco",
  "computerScience": "Informatica",
  "economics": "Economia",
  "law": "Diritto",
  "physicalEducation": "Educazione Fisica",
  "religion": "Religione",
  "technology": "Tecnologia"
}
```
- [ ] IT subjects.json creato

#### 5.1.2 Crea `src/messages/en/subjects.json`

```json
{
  "mathematics": "Mathematics",
  "physics": "Physics",
  "chemistry": "Chemistry",
  "biology": "Biology",
  "italian": "Italian",
  "history": "History",
  "geography": "Geography",
  "philosophy": "Philosophy",
  "art": "Art",
  "music": "Music",
  "latin": "Latin",
  "greek": "Greek",
  "english": "English",
  "french": "French",
  "spanish": "Spanish",
  "german": "German",
  "computerScience": "Computer Science",
  "economics": "Economics",
  "law": "Law",
  "physicalEducation": "Physical Education",
  "religion": "Religion",
  "technology": "Technology"
}
```
- [ ] EN subjects.json creato

#### 5.1.3 Crea hook `src/hooks/use-subject-name.ts`

```typescript
'use client';

import { useTranslations } from 'next-intl';
import type { Subject } from '@/types';

export function useSubjectName() {
  const t = useTranslations('subjects');

  return (subject: Subject): string => {
    try {
      return t(subject);
    } catch {
      // Fallback to subject key if translation missing
      return subject;
    }
  };
}
```
- [ ] Hook creato

#### 5.1.4 Aggiorna `src/data/index.ts`

Rimuovi `subjectNames` object e usa il hook dove serve.

```typescript
// PRIMA
export const subjectNames: Record<Subject, string> = {
  mathematics: 'Matematica',
  // ...
};

// DOPO - rimuovi subjectNames, usa hook nei componenti
```
- [ ] Data file aggiornato

---

### 5.2 Maestri

I Maestri hanno:
- `greeting` - saluto iniziale
- `teachingStyle` - descrizione stile
- `voiceInstructions` - per Azure (resta in EN)

#### 5.2.1 Crea `src/messages/it/maestri.json`

```json
{
  "euclide": {
    "greeting": "Salve, giovane studente! Sono Euclide di Alessandria, il padre della geometria...",
    "teachingStyle": "Metodico, rigoroso, step-by-step con dimostrazioni formali"
  },
  "archimede": {
    "greeting": "Eureka! Sono Archimede di Siracusa, inventore e matematico...",
    "teachingStyle": "Pratico e inventivo, collego teoria e applicazioni reali"
  },
  "galileo": {
    "greeting": "Benvenuto! Sono Galileo Galilei, e insieme osserveremo l'universo...",
    "teachingStyle": "Sperimentale, uso esempi concreti e osservazioni dirette"
  },
  "leonardo": {
    "greeting": "Ciao! Sono Leonardo da Vinci, artista, scienziato, inventore...",
    "teachingStyle": "Multidisciplinare, connetto arte, scienza e ingegneria"
  },
  "newton": {
    "greeting": "Saluti! Sono Isaac Newton, e vi guiderò attraverso le leggi della natura...",
    "teachingStyle": "Analitico, costruisco dalla teoria alla pratica"
  },
  "darwin": {
    "greeting": "Benvenuto! Sono Charles Darwin, e insieme esploreremo la vita...",
    "teachingStyle": "Osservativo, basato su evidenze e ragionamento logico"
  },
  "curie": {
    "greeting": "Bonjour! Sono Marie Curie, e vi parlerò di radioattività...",
    "teachingStyle": "Rigorosa, sperimentale, perseverante"
  },
  "einstein": {
    "greeting": "Ciao! Sono Albert Einstein, e insieme viaggeremo nello spaziotempo...",
    "teachingStyle": "Immaginativo, uso esperimenti mentali e analogie"
  },
  "turing": {
    "greeting": "Salve! Sono Alan Turing, pioniere dell'informatica...",
    "teachingStyle": "Logico, algoritmico, problem-solving"
  },
  "aristotele": {
    "greeting": "Salve! Sono Aristotele di Stagira, filosofo e scienziato...",
    "teachingStyle": "Sistematico, classifico e categorizzo la conoscenza"
  },
  "pitagora": {
    "greeting": "Salve! Sono Pitagora di Samo, matematico e filosofo...",
    "teachingStyle": "Mistico-matematico, numeri come chiave dell'universo"
  },
  "fermi": {
    "greeting": "Ciao! Sono Enrico Fermi, fisico nucleare...",
    "teachingStyle": "Pratico, stime rapide, fisica intuitiva"
  },
  "fibonacci": {
    "greeting": "Salve! Sono Leonardo Fibonacci, matematico...",
    "teachingStyle": "Pattern e sequenze, matematica nella natura"
  },
  "volta": {
    "greeting": "Benvenuto! Sono Alessandro Volta, inventore della pila...",
    "teachingStyle": "Sperimentale, dall'osservazione all'invenzione"
  },
  "marconi": {
    "greeting": "Salve! Sono Guglielmo Marconi, inventore della radio...",
    "teachingStyle": "Innovativo, applicazioni pratiche delle onde"
  },
  "montalcini": {
    "greeting": "Ciao! Sono Rita Levi-Montalcini, neuroscienziata...",
    "teachingStyle": "Curioso, esploro i misteri del cervello"
  },
  "hawking": {
    "greeting": "Salve! Sono Stephen Hawking, e vi parlerò dell'universo...",
    "teachingStyle": "Accessibile, rendo complesso semplice"
  }
}
```
- [ ] IT maestri.json creato

#### 5.2.2 Crea `src/messages/en/maestri.json`

```json
{
  "euclide": {
    "greeting": "Greetings, young student! I am Euclid of Alexandria, the father of geometry...",
    "teachingStyle": "Methodical, rigorous, step-by-step with formal proofs"
  },
  "archimede": {
    "greeting": "Eureka! I am Archimedes of Syracuse, inventor and mathematician...",
    "teachingStyle": "Practical and inventive, connecting theory to real applications"
  },
  "galileo": {
    "greeting": "Welcome! I am Galileo Galilei, and together we shall observe the universe...",
    "teachingStyle": "Experimental, using concrete examples and direct observations"
  },
  "leonardo": {
    "greeting": "Hello! I am Leonardo da Vinci, artist, scientist, inventor...",
    "teachingStyle": "Multidisciplinary, connecting art, science and engineering"
  },
  "newton": {
    "greeting": "Greetings! I am Isaac Newton, and I shall guide you through nature's laws...",
    "teachingStyle": "Analytical, building from theory to practice"
  },
  "darwin": {
    "greeting": "Welcome! I am Charles Darwin, and together we shall explore life...",
    "teachingStyle": "Observational, based on evidence and logical reasoning"
  },
  "curie": {
    "greeting": "Bonjour! I am Marie Curie, and I shall tell you about radioactivity...",
    "teachingStyle": "Rigorous, experimental, perseverant"
  },
  "einstein": {
    "greeting": "Hello! I am Albert Einstein, and together we shall travel through spacetime...",
    "teachingStyle": "Imaginative, using thought experiments and analogies"
  },
  "turing": {
    "greeting": "Greetings! I am Alan Turing, pioneer of computer science...",
    "teachingStyle": "Logical, algorithmic, problem-solving"
  },
  "aristotele": {
    "greeting": "Greetings! I am Aristotle of Stagira, philosopher and scientist...",
    "teachingStyle": "Systematic, classifying and categorizing knowledge"
  },
  "pitagora": {
    "greeting": "Greetings! I am Pythagoras of Samos, mathematician and philosopher...",
    "teachingStyle": "Mystical-mathematical, numbers as the key to the universe"
  },
  "fermi": {
    "greeting": "Hello! I am Enrico Fermi, nuclear physicist...",
    "teachingStyle": "Practical, quick estimates, intuitive physics"
  },
  "fibonacci": {
    "greeting": "Greetings! I am Leonardo Fibonacci, mathematician...",
    "teachingStyle": "Patterns and sequences, mathematics in nature"
  },
  "volta": {
    "greeting": "Welcome! I am Alessandro Volta, inventor of the battery...",
    "teachingStyle": "Experimental, from observation to invention"
  },
  "marconi": {
    "greeting": "Greetings! I am Guglielmo Marconi, inventor of radio...",
    "teachingStyle": "Innovative, practical applications of waves"
  },
  "montalcini": {
    "greeting": "Hello! I am Rita Levi-Montalcini, neuroscientist...",
    "teachingStyle": "Curious, exploring the mysteries of the brain"
  },
  "hawking": {
    "greeting": "Greetings! I am Stephen Hawking, and I shall tell you about the universe...",
    "teachingStyle": "Accessible, making the complex simple"
  }
}
```
- [ ] EN maestri.json creato

#### 5.2.3 Crea hook `src/hooks/use-maestro-translation.ts`

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function useMaestroTranslation() {
  const t = useTranslations('maestri');

  return {
    getGreeting: (maestroId: string): string => {
      try {
        return t(`${maestroId}.greeting`);
      } catch {
        return '';
      }
    },
    getTeachingStyle: (maestroId: string): string => {
      try {
        return t(`${maestroId}.teachingStyle`);
      } catch {
        return '';
      }
    },
  };
}
```
- [ ] Hook creato

#### 5.2.4 Aggiorna componenti che mostrano Maestri

Dove si usa `maestro.greeting`, ora si usa `useMaestroTranslation().getGreeting(maestro.id)`.

- [ ] Componenti aggiornati

---

### 5.3 Buddy Profiles

- [ ] IT buddies.json creato
- [ ] EN buddies.json creato
- [ ] Hook creato
- [ ] Componenti aggiornati

---

### 5.4 Aggiorna request.ts

Aggiungi tutti i nuovi namespace:

```typescript
messages: {
  ...(await import(`@/messages/${locale}/common.json`)).default,
  settings: (await import(`@/messages/${locale}/settings.json`)).default,
  scheduler: (await import(`@/messages/${locale}/scheduler.json`)).default,
  education: (await import(`@/messages/${locale}/education.json`)).default,
  subjects: (await import(`@/messages/${locale}/subjects.json`)).default,
  maestri: (await import(`@/messages/${locale}/maestri.json`)).default,
  buddies: (await import(`@/messages/${locale}/buddies.json`)).default,
},
```
- [ ] request.ts aggiornato

---

## Verifica

```bash
npm run typecheck
npm run build
npm run dev
```

Test manuale:
1. Vai a `/it/education` - seleziona un Maestro
2. Greeting in italiano
3. Vai a `/en/education` - seleziona stesso Maestro
4. Greeting in inglese

- [ ] TypeCheck passa
- [ ] Build passa
- [ ] Maestri traducono correttamente

---

## Commit

```bash
git add .
git commit -m "feat(i18n): localize data files (subjects, maestri, buddies)

- Create translation files for subjects, maestri, buddies
- Add useSubjectName and useMaestroTranslation hooks
- Update components to use localized data

Issue #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
- [ ] Commit creato

---

## Prossimo Step

Vai a `i18n-06-AI-Language.md`
