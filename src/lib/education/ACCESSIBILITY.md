# Education Accessibility Library

TypeScript implementation of accessibility runtime adaptations for the MirrorBuddycation Pack.

## Reference

Based on the C implementation in `/Users/roberdan/GitHub/MirrorBuddyCLI/include/nous/education.h` (lines 549-590: a11y_* functions)

## Features

### Supported Conditions

1. **Dyslexia (DY01-07)**
   - OpenDyslexic font
   - Increased line spacing
   - Letter and word spacing
   - Text syllabification (Italian rules)
   - Cream/beige background (reduced glare)
   - TTS highlighting

2. **Dyscalculia (DC01-06)**
   - Color-coded digits (units=blue, tens=green, hundreds=red)
   - Visual place value blocks
   - Math timer disabled
   - Step-by-step math breakdown
   - Visual fraction representations

3. **ADHD (AD01-06)**
   - Shorter session durations (10-20 min)
   - Limited bullet points (3-5 max)
   - Frequent break reminders
   - Progress bars for motivation
   - Celebration messages
   - Enhanced gamification

4. **Cerebral Palsy (CP01-05)**
   - Extended timeouts (2x-3x)
   - Voice input preference
   - More frequent break suggestions
   - Reduced motor demands

5. **Autism (AU01-06)**
   - Literal language (avoid metaphors)
   - Clear section structure
   - Topic change warnings
   - Reduced motion
   - No social pressure

## Installation

```typescript
import { useEducationAccessibility } from '@/lib/education';
```

## Usage

### Basic Hook

```typescript
import { useEducationAccessibility } from '@/lib/education';

function MyComponent() {
  const {
    profile,
    adaptContent,
    getCSS,
    formatNumber,
    getAdaptationsSummary
  } = useEducationAccessibility();

  const text = "Questo è un testo che verrà adattato";
  const adaptedText = adaptContent(text);

  return (
    <div style={getCSS()}>
      <p>{adaptedText}</p>
      <p>Numero: <span dangerouslySetInnerHTML={{ __html: formatNumber(12345) }} /></p>
      <ul>
        {getAdaptationsSummary().map((adaptation, i) => (
          <li key={i}>{adaptation}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Dyslexia Support

```typescript
import { useDyslexiaFormatting } from '@/lib/education';

function DyslexiaText({ children }: { children: string }) {
  const { enabled, shouldSyllabify, syllabifyText } = useDyslexiaFormatting();

  const text = shouldSyllabify ? syllabifyText(children) : children;

  return (
    <p className={enabled ? 'dyslexia-text' : ''}>
      {text}
    </p>
  );
}
```

### Math with Dyscalculia Support

```typescript
import { useMathAccessibility } from '@/lib/education';

function MathProblem({ number }: { number: number }) {
  const { formatNumber, shouldDisableTimer, useColorCoding } = useMathAccessibility();

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: formatNumber(number, useColorCoding) }} />
      {shouldDisableTimer && <p>Prenditi tutto il tempo che ti serve!</p>}
    </div>
  );
}
```

### ADHD Session Management

```typescript
import { useADHDSession } from '@/lib/education';

function StudySession() {
  const { isActive, timeRemaining, sessionDuration, start, stop, shouldShowBreak } = useADHDSession();
  const [startTime] = useState(new Date());

  return (
    <div>
      {!isActive ? (
        <button onClick={start}>Inizia sessione ({sessionDuration / 60} minuti)</button>
      ) : (
        <>
          <p>Tempo rimanente: {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</p>
          <button onClick={stop}>Stop</button>
          {shouldShowBreak(startTime) && (
            <div className="break-reminder">
              È ora di fare una pausa! 🎉
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### Motor Impairment Adaptations

```typescript
import { useMotorAccessibility } from '@/lib/education';

function TimedInput() {
  const { getAdjustedTimeout, shouldUseVoice } = useMotorAccessibility();

  const timeout = getAdjustedTimeout(5000); // Base timeout: 5 seconds

  return (
    <div>
      <input
        type="text"
        placeholder="Risposta..."
        data-timeout={timeout}
      />
      {shouldUseVoice && (
        <button>🎤 Usa voce</button>
      )}
    </div>
  );
}
```

### Content Adaptation

```typescript
import { useEducationAccessibility } from '@/lib/education';

function LessonContent({ content }: { content: string }) {
  const { adaptContent, getCSS } = useEducationAccessibility();

  const adapted = adaptContent(content);

  return (
    <div style={getCSS()} className="lesson-content">
      <p>{adapted}</p>
    </div>
  );
}
```

## API Reference

### Main Hook: `useEducationAccessibility()`

Returns:
- `profile: AccessibilityProfile` - Current accessibility settings
- `adaptContent(text: string): string` - Adapt text for all conditions
- `getCSS(): CSSProperties` - Get CSS properties for current profile
- `formatNumber(num: number, useColors?: boolean): string` - Format number with color coding
- `getAdaptationsSummary(): string[]` - Get list of active adaptations

### Specialized Hooks

#### `useDyslexiaFormatting()`
- `enabled: boolean`
- `severity: Severity`
- `syllabifyText(text: string): string`
- `formatForDyslexia(text: string): string`
- `shouldSyllabify: boolean`

#### `useMathAccessibility()`
- `enabled: boolean`
- `severity: Severity`
- `formatNumber(num: number, useColors?: boolean): string`
- `shouldDisableTimer: boolean`
- `useColorCoding: boolean`

#### `useADHDSession()`
- `isActive: boolean`
- `timeRemaining: number`
- `sessionDuration: number`
- `start(): void`
- `stop(): void`
- `shouldShowBreak(startTime: Date): boolean`

#### `useMotorAccessibility()`
- `enabled: boolean`
- `severity: Severity`
- `timeoutMultiplier: number`
- `getAdjustedTimeout(base: number): number`
- `shouldUseVoice: boolean`

## Direct Functions

### Dyslexia

```typescript
import {
  a11yGetFont,
  a11yGetLineSpacing,
  a11yGetMaxLineWidth,
  a11yWrapText,
  a11yGetBackgroundColor,
  a11yGetTextColor,
  syllabifyText,
  formatForDyslexia
} from '@/lib/education';

const profile: AccessibilityProfile = { /* ... */ };

const font = a11yGetFont(profile);               // Get dyslexia-friendly font
const lineSpacing = a11yGetLineSpacing(profile);  // Get line spacing (1.5-2.0)
const maxWidth = a11yGetMaxLineWidth(profile);    // Get max line width (50-80 chars)
const wrapped = a11yWrapText(text, maxWidth);     // Wrap text to max width
const bgColor = a11yGetBackgroundColor(profile);  // Get background color
const textColor = a11yGetTextColor(profile);      // Get text color
const syllabified = syllabifyText(text);          // Add soft hyphens
```

### Dyscalculia

```typescript
import {
  formatNumberColored,
  generatePlaceValueBlocks,
  shouldDisableMathTimer,
  formatMathStep,
  formatFractionVisual
} from '@/lib/education';

const coloredNum = formatNumberColored(12345, true);      // <span> tags with colors
const blocks = generatePlaceValueBlocks(123);             // Visual blocks HTML
const noTimer = shouldDisableMathTimer(profile);          // true/false
const steps = formatMathStep("2 + 3 × 4");                // Array of steps
const fractionHTML = formatFractionVisual(3, 4);          // 3/4 as visual
```

### ADHD

```typescript
import {
  limitBulletPoints,
  getSessionDuration,
  shouldShowBreakReminder,
  getMaxBullets,
  generateProgressBar,
  getCelebrationMessage
} from '@/lib/education';

const limited = limitBulletPoints(text, 5);                    // Max 5 bullets
const duration = getSessionDuration(profile);                  // Seconds
const needsBreak = shouldShowBreakReminder(startDate, profile); // true/false
const maxBullets = getMaxBullets(profile);                     // 3-10
const progressBar = generateProgressBar(7, 10, 20);            // [███████░░░] 70%
const celebration = getCelebrationMessage(3);                  // "Eccellente!"
```

### Cerebral Palsy

```typescript
import {
  getTimeoutMultiplier,
  getAdjustedTimeout,
  shouldUseVoiceInput,
  shouldSuggestBreak,
  getRecommendedInputMethod
} from '@/lib/education';

const multiplier = getTimeoutMultiplier(profile);         // 1.0-3.0x
const timeout = getAdjustedTimeout(profile, 5000);        // Adjusted ms
const useVoice = shouldUseVoiceInput(profile);            // true/false
const suggestBreak = shouldSuggestBreak(profile, 15);     // true/false
const inputMethod = getRecommendedInputMethod(profile);   // InputMethod enum
```

### Autism

```typescript
import {
  shouldAvoidMetaphors,
  containsMetaphors,
  getStructurePrefix,
  getTopicChangeWarning,
  shouldAvoidSocialPressure,
  shouldReduceMotion
} from '@/lib/education';

const avoidMetaphors = shouldAvoidMetaphors(profile);                // true/false
const hasMetaphors = containsMetaphors("piece of cake");             // true/false
const prefix = getStructurePrefix("introduction");                   // "📖 Introduzione:"
const warning = getTopicChangeWarning("Math", "Science");            // "⚠️ Cambio..."
const noSocial = shouldAvoidSocialPressure(profile);                 // true/false
const reduceMotion = shouldReduceMotion(profile);                    // true/false
```

## TypeScript Types

### AccessibilityProfile

```typescript
interface AccessibilityProfile {
  dyslexia: boolean;
  dyslexiaSeverity: Severity;
  dyscalculia: boolean;
  dyscalculiaSeverity: Severity;
  cerebralPalsy: boolean;
  cerebralPalsySeverity: Severity;
  adhd: boolean;
  adhdType: ADHDType;
  adhdSeverity: Severity;
  autism: boolean;
  autismSeverity: Severity;
  visualImpairment: boolean;
  hearingImpairment: boolean;
  preferredInput: InputMethod;
  preferredOutput: OutputMethod;
  ttsEnabled: boolean;
  ttsSpeed: number;        // 0.5 - 2.0
  ttsPitch: number;        // -1.0 to 1.0
  ttsVoice?: string;
  highContrast: boolean;
  reduceMotion: boolean;
  fontSize: 'normal' | 'large' | 'x-large';
}
```

### Enums

```typescript
enum Severity {
  NONE = 0,
  MILD = 1,
  MODERATE = 2,
  SEVERE = 3
}

enum ADHDType {
  NONE = 0,
  INATTENTIVE = 1,
  HYPERACTIVE = 2,
  COMBINED = 3
}

enum InputMethod {
  KEYBOARD = 0,
  VOICE = 1,
  BOTH = 2,
  TOUCH = 3,
  SWITCH = 4,
  EYE_TRACKING = 5
}

enum OutputMethod {
  TEXT = 0,
  TTS = 1,
  BOTH = 2,
  VISUAL = 3,
  AUDIO = 4,
  BRAILLE = 5,
  HAPTIC = 6
}
```

## CSS Integration

The library generates CSS properties via `getAccessibilityCSS()`. Apply these to your content containers:

```typescript
const { getCSS } = useEducationAccessibility();

<div style={getCSS()}>
  {/* Your content */}
</div>
```

Recommended global CSS classes:

```css
/* Dyslexia support */
.dyslexia-font {
  font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif;
}

.dyslexia-spacing {
  letter-spacing: 0.05em;
  word-spacing: 0.16em;
}

.dyslexia-line-height {
  line-height: 1.8;
}

/* High contrast */
.high-contrast {
  filter: contrast(1.2);
}

/* Large text */
.large-text {
  font-size: 1.2rem;
}

/* Reduced motion */
.reduced-motion * {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}

/* Place value blocks (dyscalculia) */
.place-value-group {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 8px;
}

.place-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}
```

## Integration with Existing AccessibilityProvider

The hooks automatically integrate with the existing `AccessibilityProvider` from `@/components/accessibility`. The profile is derived from the global accessibility store.

Current mappings:
- `settings.dyslexiaFont` → `profile.dyslexia`
- `settings.adhdMode` → `profile.adhd`
- `settings.ttsEnabled` → `profile.ttsEnabled`
- `settings.highContrast` → `profile.highContrast`
- `settings.reducedMotion` → `profile.reduceMotion`

To add full condition support, extend `AccessibilitySettings` in the store:

```typescript
// In accessibility-store.ts
export interface AccessibilitySettings {
  // ... existing settings

  // Education-specific
  dyscalculia: boolean;
  dyscalculiaSeverity: Severity;
  cerebralPalsy: boolean;
  cerebralPalsySeverity: Severity;
  autism: boolean;
  autismSeverity: Severity;
}
```

## Complete Example

```typescript
import { useEducationAccessibility, useDyslexiaFormatting, useMathAccessibility } from '@/lib/education';

function LessonComponent() {
  const { profile, getCSS, getAdaptationsSummary } = useEducationAccessibility();
  const { syllabifyText, shouldSyllabify } = useDyslexiaFormatting();
  const { formatNumber, shouldDisableTimer } = useMathAccessibility();

  const lessonText = "La matematica è importante per la vita quotidiana.";
  const displayText = shouldSyllabify ? syllabifyText(lessonText) : lessonText;

  return (
    <div style={getCSS()} className="lesson-container">
      <h2>Lezione di Matematica</h2>

      {/* Show active adaptations */}
      <div className="adaptations-info">
        <h3>Adattamenti attivi:</h3>
        <ul>
          {getAdaptationsSummary().map((adaptation, i) => (
            <li key={i}>{adaptation}</li>
          ))}
        </ul>
      </div>

      {/* Lesson content */}
      <div className="lesson-content">
        <p>{displayText}</p>

        {/* Math problem with colored numbers */}
        <div className="math-problem">
          <h4>Problema:</h4>
          <p>Quanto fa <span dangerouslySetInnerHTML={{ __html: formatNumber(123) }} /> + <span dangerouslySetInnerHTML={{ __html: formatNumber(456) }} />?</p>
          {shouldDisableTimer && (
            <p className="timer-info">⏱️ Nessun limite di tempo - prenditi tutto il tempo che ti serve!</p>
          )}
        </div>
      </div>

      {/* Profile debug info */}
      <details className="profile-debug">
        <summary>Profilo accessibilità</summary>
        <pre>{JSON.stringify(profile, null, 2)}</pre>
      </details>
    </div>
  );
}
```

## Italian Syllabification Rules

The `syllabifyText()` function implements Italian syllabification rules:

1. **CV** (consonant + vowel): `pa-ne`, `ca-sa`
2. **V-CV**: `a-mi-co`, `u-ni-re`
3. **VC-CV**: `par-te`, `al-to`
4. **V-CCV**: `a-stra`, `i-scri-ve-re`

Soft hyphens (`\u00AD`) are inserted at syllable breaks. These are invisible until the word needs to wrap.

## Testing

To test accessibility adaptations:

```typescript
import { createDefaultProfile, Severity, adaptContent } from '@/lib/education';

// Create test profile
const testProfile = createDefaultProfile();
testProfile.dyslexia = true;
testProfile.dyslexiaSeverity = Severity.MODERATE;
testProfile.adhd = true;
testProfile.adhdSeverity = Severity.MILD;

// Test adaptations
const original = "Questa è una lunga lista di cose da fare...";
const adapted = adaptContent(original, testProfile);

console.log('Original:', original);
console.log('Adapted:', adapted);
```

## References

- C Implementation: `/Users/roberdan/GitHub/MirrorBuddyCLI/include/nous/education.h` (lines 549-590)
- C Implementation: `/Users/roberdan/GitHub/MirrorBuddyCLI/src/education/accessibility.c`
- ADR: `/Users/roberdan/GitHub/MirrorBuddyCLI/docs/adr/015-education-pack.md`

## License

MIT License - Copyright (c) 2025 MirrorBuddy.io
