# i18n Step 6: AI Response Language

**Prerequisiti**: Step 5 completato
**Rischio**: BASSO (modifica system prompts)
**Tempo stimato**: 1 ora

---

## Obiettivo

Fare in modo che i Maestri AI rispondano nella lingua dell'utente.

Attualmente: Rispondono sempre in italiano (hardcoded nei system prompts)
Dopo: Rispondono in base al locale dell'utente

---

## Checklist

### 6.1 Trova dove vengono costruiti i system prompts

Cerca file che costruiscono prompts per i Maestri:

```bash
grep -r "system.*prompt" src/ --include="*.ts" --include="*.tsx"
grep -r "systemMessage" src/ --include="*.ts" --include="*.tsx"
grep -r "role.*system" src/ --include="*.ts" --include="*.tsx"
```

File probabili:
- `src/lib/ai/providers.ts`
- `src/lib/ai/maestro-prompt.ts`
- `src/app/api/chat/route.ts`
- `src/components/education/conversation-flow.tsx`

- [ ] File identificati

### 6.2 Passa locale al sistema di chat

Dove si fa la chiamata API chat, aggiungi il locale:

```typescript
// Nel componente
import { useLocale } from 'next-intl';

const locale = useLocale();

// Nella chiamata API
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages,
    maestroId,
    locale, // NUOVO
  }),
});
```
- [ ] Locale passato alla API

### 6.3 Aggiorna system prompt

Nel backend, modifica il system prompt per includere la lingua:

```typescript
// PRIMA
const systemPrompt = `Sei ${maestro.name}, un insegnante storico...`;

// DOPO
const languageInstruction = locale === 'en'
  ? 'Respond in English. Maintain your historical character but speak English.'
  : 'Rispondi in italiano. Mantieni il tuo personaggio storico.';

const systemPrompt = `Sei ${maestro.name}, un insegnante storico...

${languageInstruction}`;
```
- [ ] System prompt aggiornato

### 6.4 Gestisci voiceInstructions

Le `voiceInstructions` per Azure TTS devono rimanere in inglese (sono istruzioni tecniche, non contenuto).

Ma aggiungi istruzione per la lingua del contenuto:

```typescript
const voiceLanguageHint = locale === 'en'
  ? 'Speak in English with appropriate intonation.'
  : 'Parla in italiano con intonazione appropriata.';
```
- [ ] Voice instructions gestite

### 6.5 Test manuale

1. Vai a `/it/education`
2. Seleziona Euclide
3. Scrivi "Ciao, come stai?"
4. Risposta dovrebbe essere in italiano

5. Vai a `/en/education`
6. Seleziona Euclide
7. Scrivi "Hello, how are you?"
8. Risposta dovrebbe essere in inglese

- [ ] IT: Maestro risponde in italiano
- [ ] EN: Maestro risponde in inglese

---

## Verifica

```bash
npm run typecheck
npm run build
```

- [ ] TypeCheck passa
- [ ] Build passa

---

## Nota sulla Voice Session

Se l'app usa Azure Realtime API per voce:
- L'API voice potrebbe avere un parametro `language`
- Verificare che sia impostato correttamente

```typescript
// Esempio
const voiceConfig = {
  voice: 'en-US-JennyNeural', // o it-IT-ElsaNeural
  language: locale === 'en' ? 'en-US' : 'it-IT',
};
```
- [ ] Voice session usa lingua corretta

---

## Commit

```bash
git add .
git commit -m "feat(i18n): AI responds in user's language

- Pass locale to chat API
- Update system prompts with language instructions
- Configure voice session for correct language

Issue #65

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
- [ ] Commit creato

---

## Prossimo Step

Vai a `i18n-07-Tests.md`
