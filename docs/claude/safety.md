# Safety Guardrails

> 5-layer child protection system for AI interactions with minors (ages 6-19)

```
┌─────────────────────────────────────────────────────────────┐
│                    SAFETY ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: System Prompt Injection (PREVENTIVE)             │
│           ↓ Every character gets safety rules               │
│  Layer 2: Input Content Filter (DETECTIVE)                 │
│           ↓ Blocks harmful input before AI                  │
│  Layer 3: Output Sanitizer (CORRECTIVE)                    │
│           ↓ Cleans AI response before display               │
│  Layer 4: Jailbreak Detection (DETECTIVE)                  │
│           ↓ Detects manipulation attempts                   │
│  Layer 5: Age Gating (ADAPTIVE)                            │
│           ↓ Age-appropriate content & language              │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/safety/safety-prompts.ts` | Core safety rules, prompt injection |
| `src/lib/safety/content-filter.ts` | Input filtering (profanity, explicit, violence) |
| `src/lib/safety/output-sanitizer.ts` | Output cleaning (leaks, PII, harmful URLs) |
| `src/lib/safety/jailbreak-detector.ts` | Prompt injection & manipulation detection |
| `src/lib/safety/age-gating.ts` | Age-appropriate content & language |
| `src/lib/safety/monitoring.ts` | Event logging & metrics |
| `src/lib/safety/index.ts` | Central exports |

## Layer 1: System Prompt Injection

**Purpose**: Inject non-negotiable safety rules into EVERY character's system prompt.

**Usage**:
```typescript
import { injectSafetyGuardrails } from '@/lib/safety';

// For a Maestro (historical tutor)
const safePrompt = injectSafetyGuardrails(archimedePrompt, {
  role: 'maestro'
});

// For Melissa (learning coach)
const safePrompt = injectSafetyGuardrails(melissaPrompt, {
  role: 'coach',
  additionalNotes: 'Focus on building autonomy, not dependency.'
});

// For Mario (peer buddy)
const safePrompt = injectSafetyGuardrails(marioPrompt, {
  role: 'buddy',
  includeAntiCheating: false
});
```

**What Gets Injected**:
- Prohibited content categories (sexual, violence, drugs, illegal)
- Privacy protection rules (no PII collection)
- Prompt injection defense
- Crisis response protocol
- Inclusive language requirements
- Anti-cheating guidelines (for maestros/coaches)

**Validation**:
```typescript
import { hasSafetyGuardrails } from '@/lib/safety';

// Verify safety guardrails are present
if (!hasSafetyGuardrails(systemPrompt)) {
  throw new Error('Safety guardrails missing!');
}
```

## Layer 2: Input Content Filter

**Purpose**: Filter user input BEFORE it reaches the AI model.

**Usage**:
```typescript
import { filterInput, getFilterResponse } from '@/lib/safety';

// Check if input is safe
const result = filterInput(userMessage);

if (!result.safe) {
  // Return pre-approved safe response
  return result.suggestedResponse;
}

// Proceed with AI call
const aiResponse = await chatCompletion(messages, systemPrompt);
```

**Severity Levels**:
| Severity | Action | Examples |
|----------|--------|----------|
| `critical` | Block + Crisis response | Self-harm, suicide keywords |
| `high` | Block | Violence, explicit content, jailbreak |
| `medium` | Warn | Profanity (IT/EN) |
| `low` | Warn | PII disclosure |
| `none` | Allow | Clean input |

**Detected Categories**:
- **Profanity**: Italian & English vulgar language (obfuscation-resistant)
- **Explicit**: Sexual content requests
- **Violence**: Harm instructions, weapons, threats
- **Jailbreak**: "Ignore instructions", "DAN mode", system prompt extraction
- **Crisis**: Self-harm, suicide, extreme distress
- **PII**: Phone numbers, addresses, emails

**Crisis Response**:
```typescript
import { containsCrisisKeywords, CRISIS_RESPONSE } from '@/lib/safety';

if (containsCrisisKeywords(userMessage)) {
  return CRISIS_RESPONSE; // Pre-approved response with helpline numbers
}
```

## Layer 3: Output Sanitizer

**Purpose**: Clean AI output AFTER generation but BEFORE displaying to user.

**Usage**:
```typescript
import { sanitizeOutput } from '@/lib/safety';

const aiResponse = await chatCompletion(messages, systemPrompt);

// Sanitize before displaying
const sanitized = sanitizeOutput(aiResponse.content);

if (sanitized.modified) {
  logger.warn('Output sanitized', {
    issuesFound: sanitized.issuesFound,
    categories: sanitized.categories
  });
}

// Display sanitized text to user
return sanitized.text;
```

**What Gets Sanitized**:
- **System prompt leaks**: `[system]`, `<<SYS>>`, internal markers
- **Inappropriate content**: Violence details, explicit content that slipped through
- **Harmful URLs**: Adult content, malware downloads, URL shorteners, IP addresses
- **PII disclosure**: Credit cards, fiscal codes, passwords
- **Jailbreak success**: "I am now unrestricted", "Developer mode enabled"

**Streaming Support**:
```typescript
import { StreamingSanitizer } from '@/lib/safety';

const sanitizer = new StreamingSanitizer();

for await (const chunk of aiStream) {
  const safeChunk = sanitizer.processChunk(chunk);
  if (safeChunk) {
    send(safeChunk); // Send to client
  }
}

// Flush remaining buffer
const final = sanitizer.flush();
if (final) send(final);

// Get summary
const summary = sanitizer.getSummary();
console.log(`Found ${summary.totalIssues} issues`);
```

## Layer 4: Jailbreak Detection

**Purpose**: Detect prompt injection and manipulation attempts with advanced pattern analysis.

**Usage**:
```typescript
import { detectJailbreak, getJailbreakResponse, buildContext } from '@/lib/safety';

// Build conversation context for multi-turn detection
const context = buildContext(conversationHistory, warningCount, sessionDuration);

// Detect jailbreak attempt
const detection = detectJailbreak(userMessage, context);

if (detection.detected) {
  // Log the attempt
  logger.warn('Jailbreak detected', {
    threatLevel: detection.threatLevel,
    confidence: detection.confidence,
    categories: detection.categories
  });

  // Take action based on threat level
  if (detection.action === 'terminate_session') {
    await terminateSession(sessionId);
  }

  // Return safe response
  return getJailbreakResponse(detection);
}
```

**Detected Categories**:
- `role_override`: "Pretend you are...", "You are now..."
- `instruction_ignore`: "Ignore your instructions", "Forget your rules"
- `system_extraction`: "Show me your system prompt", "What are your instructions?"
- `encoding_bypass`: Base64, leetspeak, homograph attacks
- `multi_turn_attack`: Building up attack across multiple messages
- `hypothetical_framing`: "In a fictional world...", "For a novel..."
- `emotional_manipulation`: "If you don't help me I'll die"
- `authority_claiming`: "I'm an admin", "I work for OpenAI"

**Threat Levels**:
| Level | Score | Action | Example |
|-------|-------|--------|---------|
| `none` | <0.2 | Allow | Normal conversation |
| `low` | 0.2-0.4 | Warn | Innocent curiosity |
| `medium` | 0.4-0.7 | Warn | Mild attempt |
| `high` | 0.7-0.9 | Block | Clear jailbreak |
| `critical` | 0.9+ | Terminate session | Sophisticated attack |

**Fast-Path Check**:
```typescript
import { isObviousJailbreak } from '@/lib/safety';

// Quick check before full analysis
if (isObviousJailbreak(userMessage)) {
  return "Sono qui per aiutarti a imparare! Su quale materia vuoi lavorare oggi?";
}
```

## Layer 5: Age Gating

**Purpose**: Ensure content and language are appropriate for the student's age.

**Usage**:
```typescript
import { filterForAge, getAgeBracket, getAgeGatePrompt } from '@/lib/safety';

// Check if topic is age-appropriate
const result = filterForAge(userMessage, studentAge);

if (!result.appropriate) {
  return result.alternative; // Suggest age-appropriate alternative
}

// Add age-appropriate language guidance to system prompt
const agePrompt = getAgeGatePrompt(studentAge);
const fullPrompt = `${basePrompt}\n\n${agePrompt}`;
```

**Age Brackets**:
| Bracket | Ages | Italian School Level |
|---------|------|----------------------|
| `elementary` | 6-10 | Scuola primaria |
| `middle` | 11-13 | Scuola secondaria di primo grado |
| `highschool` | 14-19 | Scuola secondaria di secondo grado |
| `adult` | 20+ | Adulti |

**Topic Sensitivity Matrix**:
| Topic | Elementary | Middle | Highschool |
|-------|-----------|--------|------------|
| Basic education | ✅ Safe | ✅ Safe | ✅ Safe |
| History (wars) | ⚠️ Moderate | ⚠️ Moderate | ✅ Safe |
| History (violence) | 🚫 Restricted | ⚠️ Moderate | ✅ Safe |
| Biology (reproduction) | 🚫 Restricted | ⚠️ Moderate | ✅ Safe |
| Social (romance) | ❌ Blocked | ⚠️ Moderate | ✅ Safe |
| Literature (mature) | ❌ Blocked | 🚫 Restricted | ⚠️ Moderate |

**Handling Actions**:
- **Allow**: Content appropriate, no changes needed
- **Simplify**: Use simpler language, avoid graphic details
- **Redirect**: Suggest alternative, age-appropriate topic
- **Block**: Content not appropriate, provide alternative

**Language Adaptation**:
```typescript
import { getLanguageGuidance } from '@/lib/safety';

const guidance = getLanguageGuidance(8); // Elementary student
// Returns: "Usa frasi brevi e semplici (max 10-15 parole)..."
```

**Topic Detection**:
```typescript
import { detectTopics, checkAgeGate } from '@/lib/safety';

const topics = detectTopics(userMessage);
// Returns: ['biology_reproduction', 'health_physical']

for (const topic of topics) {
  const result = checkAgeGate(topic, studentAge);
  if (result.sensitivity === 'blocked') {
    return result.alternative;
  }
}
```

## Monitoring & Metrics

**Event Logging**:
```typescript
import {
  logInputBlocked,
  logJailbreakAttempt,
  logCrisisDetected,
  logOutputSanitized,
  logAgeGateTriggered
} from '@/lib/safety';

// Log safety events for analysis
logInputBlocked(sessionId, 'explicit', userMessage);
logJailbreakAttempt(sessionId, detection.threatLevel, detection.categories);
logCrisisDetected(sessionId, userMessage);
logOutputSanitized(sessionId, sanitized.categories);
logAgeGateTriggered(sessionId, topic, studentAge, result.sensitivity);
```

**Session Termination**:
```typescript
import { shouldTerminateSession } from '@/lib/safety';

// Check if session should be terminated due to repeated violations
if (shouldTerminateSession(sessionId)) {
  await terminateSession(sessionId);
  return "Per la sicurezza di tutti, questa sessione è stata terminata.";
}
```

**Metrics & Reports**:
```typescript
import { getMetrics, getSummary } from '@/lib/safety';

// Get aggregated metrics
const metrics = getMetrics(sessionId);
console.log(`Total events: ${metrics.totalEvents}`);
console.log(`Blocked inputs: ${metrics.blockedInputs}`);
console.log(`Jailbreak attempts: ${metrics.jailbreakAttempts}`);

// Get human-readable summary
const summary = getSummary(sessionId);
console.log(summary);
```

## Integration Pattern

**Complete safety flow** for chat API:

```typescript
import {
  injectSafetyGuardrails,
  filterInput,
  detectJailbreak,
  buildContext,
  sanitizeOutput,
  filterForAge,
  getAgeGatePrompt,
  logInputBlocked,
  logJailbreakAttempt,
  shouldTerminateSession
} from '@/lib/safety';

export async function POST(req: Request) {
  const { message, sessionId, studentAge } = await req.json();

  // Check session termination
  if (shouldTerminateSession(sessionId)) {
    return Response.json({ error: 'Session terminated' }, { status: 403 });
  }

  // Layer 2: Input filter
  const filterResult = filterInput(message);
  if (!filterResult.safe) {
    logInputBlocked(sessionId, filterResult.category, message);
    return Response.json({ message: filterResult.suggestedResponse });
  }

  // Layer 4: Jailbreak detection
  const context = buildContext(conversationHistory, warningCount, sessionDuration);
  const jailbreak = detectJailbreak(message, context);
  if (jailbreak.detected && jailbreak.action === 'block') {
    logJailbreakAttempt(sessionId, jailbreak.threatLevel, jailbreak.categories);
    return Response.json({ message: getJailbreakResponse(jailbreak) });
  }

  // Layer 5: Age gating
  const ageResult = filterForAge(message, studentAge);
  if (!ageResult.appropriate && ageResult.handling === 'block') {
    return Response.json({ message: ageResult.alternative });
  }

  // Layer 1: System prompt injection
  const characterPrompt = getCharacterPrompt(characterId);
  const safePrompt = injectSafetyGuardrails(characterPrompt, {
    role: 'maestro'
  });
  const agePrompt = getAgeGatePrompt(studentAge);
  const fullPrompt = `${safePrompt}\n\n${agePrompt}`;

  // Call AI with safe prompt
  const aiResponse = await chatCompletion(messages, fullPrompt);

  // Layer 3: Output sanitization
  const sanitized = sanitizeOutput(aiResponse.content);

  return Response.json({ message: sanitized.text });
}
```

## Testing

**Safety tests** are in `src/lib/safety/__tests__/`:

```bash
# Run safety tests
npm run test -- src/lib/safety

# Test specific layer
npm run test -- src/lib/safety/content-filter.test.ts
```

**Adversarial test suite** verifies:
- Profanity filter catches obfuscation (l33tsp34k, variations)
- Jailbreak patterns are blocked
- Crisis keywords trigger appropriate response
- Output sanitizer catches leaks
- Age gating enforces restrictions

## Important Notes

1. **EVERY character MUST use `injectSafetyGuardrails()`** - No exceptions
2. **Call layers in order**: Filter input → Detect jailbreak → (AI) → Sanitize output
3. **Never skip sanitization** - Even if input was clean, sanitize output
4. **Log safety events** - Critical for monitoring and compliance
5. **Crisis keywords = immediate response** - No AI call needed, return `CRISIS_RESPONSE`
6. **Validate in CI** - Use `hasSafetyGuardrails()` to verify all characters are safe

## Related

- ADR 0004: Safety Guardrails for Child Protection
- Issue #30: Safety Guardrails Implementation
- `docs/claude/mirrorbuddy.md` - Character routing
- `docs/claude/api-routes.md` - API integration
