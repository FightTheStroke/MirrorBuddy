# ADR 0027: Bilingual Voice Recognition for Language Teachers

## Status
Accepted

## Date
2026-01-08

## Context

MirrorBuddy includes language teachers (Shakespeare for English, Álex Pina for Spanish) who need to:

1. **Explain concepts in Italian** (the student's native language)
2. **Teach vocabulary and phrases** in the target language
3. **Have conversations** where the student practices speaking the target language
4. **Understand student speech** in both Italian AND the target language

The original voice recognition system was configured with a single fixed language based on user settings, which meant:
- If set to Italian: couldn't recognize English/Spanish spoken by the student
- If set to English/Spanish: couldn't recognize Italian questions from the student

## Decision

### 1. Automatic Language Detection for Language Teachers

For language teachers (subject === 'english' || subject === 'spanish'), we:
- **Don't specify a fixed language** in Whisper transcription config
- Let Whisper **automatically detect** whether the student speaks Italian or the target language
- Both languages are transcribed correctly

### 2. Bilingual Teaching Instructions

Language teachers receive special instructions:

```
# BILINGUAL LANGUAGE TEACHING MODE
You are teaching [ENGLISH/SPANISH] to an Italian student.

BILINGUAL RULES:
- Use ITALIAN for explanations, instructions, and meta-communication
- Use [TARGET LANGUAGE] for:
  * Teaching vocabulary and phrases
  * Pronunciation practice (have student repeat)
  * Conversations and dialogues
  * Example sentences
  * When the student speaks in [target language]
- The STUDENT may speak in EITHER language - understand both!
- Encourage the student to practice speaking [target language]
- Praise attempts: "Great pronunciation!", "¡Muy bien!", "Ottimo!"
- Gently correct mistakes without shaming
```

### 3. Enhanced Transcription Prompts

Combined vocabulary hints for better recognition accuracy:

**English sessions:**
```
[Italian keywords] + [English keywords] + 
pronunciation, repeat after me, say it, how do you say, 
what does mean, grammar, vocabulary, phrase, sentence, 
dialogue, conversation
```

**Spanish sessions:**
```
[Italian keywords] + [Spanish keywords] + 
pronunciación, repite conmigo, cómo se dice, qué significa, 
gramática, vocabulario, frase, oración, diálogo, conversación,
La Casa de Papel, Money Heist, Bella Ciao
```

### 4. Non-Language Teachers Unchanged

All other teachers (Euclide, Feynman, etc.) continue to use:
- Fixed language based on user's language settings
- Strict single-language mode ("SPEAK ONLY IN [language]")

## Implementation

### File Modified

`src/lib/hooks/voice-session/session-config.ts`

### Key Changes

```typescript
// Detect language teacher
const isLanguageTeacher = maestro.subject === 'english' || maestro.subject === 'spanish';
const targetLanguage = maestro.subject === 'english' ? 'en' : 
                       maestro.subject === 'spanish' ? 'es' : null;

// Transcription config
input_audio_transcription: {
  model: 'whisper-1',
  ...(isLanguageTeacher && targetLanguage
    ? {
        // No 'language' field = automatic detection
        prompt: bilingualPrompts[targetLanguage],
      }
    : {
        language: transcriptionLanguages[userLanguage],
        prompt: transcriptionPrompts[userLanguage],
      }
  ),
}
```

## Language Teachers

| Teacher | Subject | Languages Supported |
|---------|---------|---------------------|
| Shakespeare | english | Italian ↔ English |
| Álex Pina | spanish | Italian ↔ Spanish |

## Consequences

### Positive
- Students can practice speaking English/Spanish naturally
- Teachers can explain in Italian when needed
- Full conversations possible in target language
- No manual language switching required
- Better learning experience for language acquisition

### Negative
- Automatic language detection may occasionally misrecognize
- Slightly higher latency for language detection
- Combined prompts are longer (more tokens)

### Mitigations
- Rich vocabulary prompts improve detection accuracy
- Common phrases in both languages included
- Teachers instructed to gently correct transcription errors

## Future Considerations

- Add more language teachers (French, German, etc.)
- Consider user preference to force single language for advanced learners
- Monitor transcription accuracy and adjust prompts as needed

## References
- ADR 0026: Maestro-Agent Communication (Álex Pina creation)
- Azure Whisper documentation on automatic language detection
- `src/data/maestri/alex-pina.ts`: Spanish teacher profile
- `src/data/maestri/shakespeare.ts`: English teacher profile
