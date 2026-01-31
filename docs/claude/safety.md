# Safety Guardrails

> 5-layer child protection system for AI characters (ages 6-19)

## Quick Reference

| Key       | Value                                                                           |
| --------- | ------------------------------------------------------------------------------- |
| Path      | `src/lib/safety/`                                                               |
| Core      | `safety-core.ts`, `safety-prompts-core.ts`                                      |
| Layers    | 5 (prompt injection, input filter, output sanitizer, jailbreak detector, audit) |
| ADR       | 0004, 0034                                                                      |
| Standards | OWASP LLM 2025, OpenAI Teen Safety, UN Disability Language                      |

## 5-Layer Architecture

| Layer | Component          | Purpose                                  | File                         |
| ----- | ------------------ | ---------------------------------------- | ---------------------------- |
| 1     | Prompt Injection   | Preventive safety in system prompts      | `safety-prompts-core.ts`     |
| 2     | Input Filter       | Detect harmful content before processing | `content-filter-core.ts`     |
| 3     | Output Sanitizer   | Clean AI responses                       | `output-sanitizer-core.ts`   |
| 4     | Jailbreak Detector | Detect manipulation attempts             | `jailbreak-detector-core.ts` |
| 5     | Audit              | Log all safety events                    | `monitoring/`                |

## Core Safety Injection

**MANDATORY** for all AI characters:

```typescript
import { injectSafetyGuardrails } from "@/lib/safety";

const safePrompt = injectSafetyGuardrails(characterPrompt, {
  role: "maestro", // or "coach" or "buddy"
  includeAntiCheating: true, // false for buddies
  characterId: "socrate", // for formality auto-detection
});
```

## Prohibited Content

| Category   | Examples                                                    |
| ---------- | ----------------------------------------------------------- |
| Sexual     | Any content inappropriate for minors                        |
| Violence   | Explicit descriptions, self-harm, suicide                   |
| Substances | Drugs, alcohol (except health education context)            |
| Illegal    | Hacking, fraud, law-breaking instructions                   |
| Privacy    | Never ask for: full name, address, phone, passwords, photos |

## Crisis Response

**Triggers**: "voglio farmi male", "non ce la faccio più", "nessuno mi capisce"
**Response**: "Mi preoccupo per te. Parla con un adulto di fiducia. Se sei in crisi, chiedi aiuto."
**Escalation**: `src/lib/safety/escalation/` (human handoff)

## Inclusive Language

| DO                         | DON'T                       |
| -------------------------- | --------------------------- |
| student with dyslexia      | dyslexic student            |
| person with autism         | autistic (unless preferred) |
| uses a wheelchair          | wheelchair-bound            |
| accessibility requirements | special needs               |
| they/their (singular)      | he or she                   |

## Anti-Cheating (Maieutic Method)

**For maestri and coaches only**:

```
Student: "Solve 2x + 5 = 15 for me"

Teacher: "Let's work through this together!
What do you think we should do first to find x?
Hint: What operation would help us get x alone?"
```

## Key Files

| File                         | Purpose                         |
| ---------------------------- | ------------------------------- |
| `safety-core.ts`             | Main safety prompt (Italian)    |
| `safety-prompts-core.ts`     | Injection function + validation |
| `content-filter-core.ts`     | Input filtering                 |
| `output-sanitizer-core.ts`   | Output cleaning                 |
| `jailbreak-detector-core.ts` | Prompt injection defense        |
| `monitoring/index.ts`        | Event logging                   |
| `escalation/`                | Human handoff (server-only)     |

## See Also

- `src/data/maestri/safety-guidelines.ts` - Combined guidelines
- ADR 0004 - Safety Guardrails for Child Protection
- ADR 0034 - Bias Detection and Inclusive Language
- OWASP LLM Security Top 10 2025
