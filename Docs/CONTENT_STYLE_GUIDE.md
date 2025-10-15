# MirrorBuddy Content Style Guide

**Last Updated**: 2025-10-15
**Related Task**: Subtask 98.4 - Personalization Features and Empathetic Content Guidelines

## Overview

MirrorBuddy serves children ages 6-10 with DSA needs (dyslexia, discalculia, working memory challenges). Our content must be empathetic, encouraging, and age-appropriate while fostering independence and confidence.

## Core Principles

### 1. Always Be Encouraging
✅ "Ottimo lavoro! Hai fatto progressi!"
❌ "Purtroppo hai sbagliato."

### 2. Focus on Growth, Not Perfection
✅ "Stai imparando! Ogni tentativo ti rende più bravo."
❌ "Devi migliorare prima di continuare."

### 3. Use Simple, Direct Language
✅ "Tocca qui per iniziare"
❌ "Per procedere all'attivazione, selezionare il pulsante sottostante"

### 4. Celebrate Effort, Not Just Results
✅ "Hai provato con impegno! Questo è importante."
❌ "Risposta errata."

### 5. Provide Clear Next Steps
✅ "Prova ancora! Ricorda: i numeri grandi vanno prima."
❌ "Riprova."

## Voice & Tone

### Voice (Consistent Personality)
- **Warm and friendly** - Like a patient coach or supportive friend
- **Encouraging** - Celebrates every step forward
- **Patient** - Never rushed or frustrated
- **Empowering** - "You can do this" attitude
- **Clear and simple** - No jargon or complex words

### Tone (Adapts to Context)

| Context | Tone | Example |
|---------|------|---------|
| **Success** | Celebratory, proud | "Fantastico! Hai capito tutto!" |
| **Challenge** | Supportive, patient | "Va bene così. Proviamo insieme." |
| **Error** | Gentle, constructive | "Quasi! Prova a pensare così..." |
| **Onboarding** | Welcoming, reassuring | "Ciao! Sono qui per aiutarti a studiare." |
| **Achievement** | Enthusiastic, validating | "Incredibile! Guarda quanto sei migliorato!" |

## Language Guidelines

### Age-Appropriate Vocabulary (6-10 years)

✅ **Use These Words**:
- Inizia, Comincia (Start)
- Prova, Tenta (Try)
- Impara (Learn)
- Gioca (Play)
- Aiuta (Help)
- Semplice, Facile (Easy)
- Divertente (Fun)

❌ **Avoid These Words**:
- Procedi, Esegui (too formal)
- Configura, Parametrizza (technical)
- Implementa, Effettua (bureaucratic)
- Erroneamente, Incorrettamente (judgmental)

### Sentence Structure

**Keep It Short**:
✅ "Tocca il pulsante blu. Poi scegli la materia."
❌ "Per procedere con la configurazione, è necessario selezionare il pulsante di colore blu e successivamente indicare la materia di interesse."

**One Idea Per Sentence**:
✅ "Hai fatto bene! Adesso proviamo il prossimo."
❌ "Hai fatto bene e adesso che hai completato questo passaggio puoi provare il prossimo livello."

**Use Active Voice**:
✅ "Apri il libro"
❌ "Il libro deve essere aperto"

### Addressing the User

**Always Use "Tu" (Informal)**:
✅ "Tocca qui per vedere i tuoi compiti"
❌ "Prema qui per visualizzare i suoi compiti"

**Use First Name When Available**:
✅ "Ciao Mario! Pronto per studiare?"
❌ "Ciao utente! Pronto per studiare?"

## Feedback Messages

### Success Messages

**Immediate Success**:
- "Perfetto!"
- "Ottimo lavoro!"
- "Fantastico!"
- "Sei bravissimo!"
- "Continua così!"

**Progress Milestones**:
- "Hai fatto 5 esercizi! Grande!"
- "Wow, stai migliorando ogni giorno!"
- "Guarda quanti progressi hai fatto!"

**Task Completion**:
- "Complimenti! Hai finito tutto!"
- "Missione comple tata! Sei un campione!"
- "Ce l'hai fatta! Sono fiero di te!"

### Encouragement Messages

**When Struggling**:
- "Va bene, succede a tutti. Riprova!"
- "Non ti preoccupare, stai imparando!"
- "Ogni errore è un passo verso il successo!"
- "Ci sei quasi! Prova ancora!"

**When Taking a Break**:
- "Ottima idea riposare un po'!"
- "Torna quando sei pronto. Io ti aspetto!"
- "Bene! Il riposo aiuta a imparare meglio."

**When Returning**:
- "Bentornato! Sono contento di rivederti!"
- "Ciao! Pronto per continuare?"
- "Eccoti! Riprendiamo da dove avevamo lasciato?"

### Error Handling

**Input Errors**:
✅ "Ops! Prova a scrivere solo numeri."
❌ "Errore: input non valido."

**System Errors**:
✅ "Qualcosa non ha funzionato. Riprovo per te!"
❌ "Errore di sistema. Codice: 500."

**Network Errors**:
✅ "Non riesco a connettermi. Controlla internet?"
❌ "Errore di connessione al server remoto."

## UI Copy Standards

### Button Labels

**Use Action Verbs**:
✅ "Inizia", "Prova", "Continua", "Salva"
❌ "OK", "Procedi", "Conferma"

**Be Specific**:
✅ "Aggiungi Compito"
❌ "Aggiungi"

**Keep Under 3 Words**:
✅ "Apri Materiale"
❌ "Apri questo materiale per studiare"

### Empty States

**Be Helpful, Not Blaming**:
✅ "Nessun materiale ancora. Importiamone uno insieme!"
❌ "Non hai materiali."

**Provide Clear Action**:
✅ "Tocca + per aggiungere il tuo primo compito"
❌ "Nessun compito trovato"

### Loading States

**Keep It Light**:
✅ "Un momento... sto preparando tutto!"
❌ "Caricamento in corso..."

**Add Personality**:
✅ "Cerco i tuoi documenti... 🔍"
❌ "Elaborazione richiesta..."

## Accessibility Considerations

### VoiceOver Text

**Be Descriptive**:
✅ "Pulsante: Aggiungi nuovo materiale"
❌ "Pulsante: +"

**Provide Context**:
✅ "Matematica, 5 materiali disponibili"
❌ "Matematica, 5"

**Include Hints**:
✅ "Tocca due volte per aprire i dettagli del materiale"
❌ No hint provided

### Text Alternatives

**Icons Need Labels**:
✅ `Image(systemName: "trash").accessibilityLabel("Elimina")`
❌ `Image(systemName: "trash")` alone

**Status Indicators**:
✅ "Sincronizzazione completata con successo"
❌ Green checkmark only

## Personalization

### User Preferences

**Respect Choices**:
- Allow font size adjustments
- Support dark mode preference
- Remember subject preferences
- Let users set study reminders

**Adapt to Context**:
- Time of day: "Buongiorno!" vs "Buonasera!"
- Recent activity: "Continuiamo con matematica?"
- Progress: "Hai quasi finito questa sezione!"

### Customization Options

**Avatar/Theme** (Future):
- Let children choose friendly mascots
- Offer color theme preferences
- Allow name customization

**Study Preferences**:
- Preferred study duration
- Break frequency
- Reminder times
- Favorite subjects

## Content Templates

### Welcome Message
```
Ciao [Nome]! 👋

Sono MirrorBuddy, il tuo assistente personale per lo studio.

Sono qui per aiutarti con:
• Matematica, italiano, e altre materie
• Compiti e verifiche
• Mappe mentali e flashcard

Cosa vuoi fare oggi?
```

### Daily Greeting
```
[Morning] Buongiorno [Nome]! Pronto per una giornata di scoperte?
[Afternoon] Ciao [Nome]! Come sta andando la giornata?
[Evening] Buonasera [Nome]! Hai ancora energia per studiare un po'?
```

### Achievement Unlocked
```
🎉 Fantastico, [Nome]!

Hai completato [X] esercizi di [Materia]!

Continua così e diventerai un esperto!

[Pulsante: Continua a Studiare]
```

### Encouragement After Struggle
```
So che è difficile, ma guarda quanto stai migliorando!

📈 Oggi: [X] esercizi completati
💪 Questa settimana: [Y] ore di studio

Ogni sforzo conta. Sono fiero di te!

[Pulsante: Facciamo una Pausa] [Pulsante: Provo Ancora]
```

## Writing Checklist

Before publishing any content, verify:

- [ ] Language is simple and direct (6-10 year reading level)
- [ ] Tone is encouraging and supportive
- [ ] No judgmental or discouraging words
- [ ] Clear next steps provided
- [ ] Accessible to screen readers
- [ ] Tested with children (if possible)
- [ ] Italian grammar and spelling correct
- [ ] Respects user's personalization preferences

## Resources

### Recommended Reading
- "Don't Make Me Think" - Steve Krug
- "Voice and Tone Guide" - Mailchimp
- "Dyslexia Style Guide" - British Dyslexia Association

### Tools
- Hemingway Editor (readability)
- Grammarly (Italian grammar)
- NVDA/VoiceOver (screen reader testing)

### Internal References
- `Core/Services/EncouragementService.swift` - Encouragement message system
- `Localizable.strings` - All UI text strings
- `ACCESSIBILITY_GUIDE.md` - Accessibility requirements

---

**Questions or Suggestions?**
Update this guide or add notes to Task Master subtask 98.4.

Remember: Our goal is to make every child feel capable, supported, and excited to learn! 🌟
