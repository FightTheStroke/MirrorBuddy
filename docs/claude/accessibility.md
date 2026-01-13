# Accessibility System - 7 DSA Profiles

Complete accessibility utilities for adapting content to 7 learning difference profiles.

## DSA Profiles (Disturbi Specifici dell'Apprendimento)

| Profile | Italian | Severity Levels | Key Features |
|---------|---------|-----------------|--------------|
| Dyslexia | Dislessia | MILD, MODERATE, SEVERE | OpenDyslexic font, syllabification, cream background, increased spacing |
| Dyscalculia | Discalculia | MILD, MODERATE, SEVERE | Color-coded numbers, place value blocks, visual math, no timers |
| ADHD | DOP/ADHD | MILD, MODERATE, SEVERE | Shorter sessions (10-20 min), limited bullets (3-7), breaks, gamification |
| Cerebral Palsy | Paralisi cerebrale | MILD, MODERATE, SEVERE | Extended timeouts (2x-3x), voice input, frequent breaks |
| Autism | Autismo | MILD, MODERATE, SEVERE | Literal language, clear structure, topic warnings, reduced motion |
| Visual Impairment | Disabilità visiva | boolean | High contrast, TTS, large text, screen reader support |
| Hearing Impairment | Disabilità uditiva | boolean | Visual cues, no audio dependency, captions |

## Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Types | `src/lib/education/accessibility/types.ts` | `AccessibilityProfile`, `Severity`, `InputMethod`, `OutputMethod` |
| Dyslexia | `src/lib/education/accessibility/dyslexia.ts` | Font, spacing, syllabification, colors (DY01-07) |
| Dyscalculia | `src/lib/education/accessibility/dyscalculia.ts` | Number formatting, place values, timers (DC01-06) |
| ADHD | `src/lib/education/accessibility/adhd.ts` | Sessions, bullets, breaks, gamification (AD01-06) |
| Motor/CP | `src/lib/education/accessibility/motor.ts` | Timeouts, voice input, fatigue breaks (CP01-05) |
| Autism | `src/lib/education/accessibility/autism.ts` | Language, structure, transitions (AU01-06) |
| Core | `src/lib/education/accessibility/core.ts` | CSS generation, content adaptation, profile utils |
| Index | `src/lib/education/accessibility/index.ts` | Re-exports all functions |
| Store | `src/lib/accessibility/accessibility-store.ts` | Zustand store for UI settings |
| Tests | `src/lib/education/__tests__/accessibility.test.ts` | 100+ unit tests (vitest) |

## Dyslexia Functions (DY01-07)

| Function | Purpose | Returns |
|----------|---------|---------|
| `a11yGetFont(profile)` | Get dyslexia-friendly font | `'OpenDyslexic', 'Comic Sans MS', ...` or system font |
| `a11yGetLineSpacing(profile)` | Get line height by severity | 1.6 (mild) → 1.8 (mod) → 2.0 (severe) |
| `a11yGetMaxLineWidth(profile)` | Get max chars per line | 70 (mild) → 60 (mod) → 50 (severe) chars |
| `a11yWrapText(text, maxWidth)` | Wrap text to width | Text with `\n` breaks |
| `a11yGetBackgroundColor(profile)` | Get bg color (cream reduces glare) | `#faf8f3` (dyslexia), `#000000` (high contrast) |
| `a11yGetTextColor(profile)` | Get text color | `#2b2b2b` (dyslexia), `#ffff00` (high contrast) |
| `a11yWantsTtsHighlight(profile)` | Check if TTS highlight needed | `boolean` |
| `syllabifyWord(word)` | Add soft hyphens for syllables | `'ca\u00ADsa'` (Italian rules: CV, V-CV, VC-CV) |
| `syllabifyText(text)` | Syllabify entire text | Text with soft hyphens, preserves punctuation |
| `formatForDyslexia(text)` | Apply all dyslexia formatting | Syllabified text |

### Dyslexia Usage Example

```typescript
import {
  a11yGetFont,
  a11yGetLineSpacing,
  a11yGetBackgroundColor,
  syllabifyText,
} from '@/lib/education/accessibility';

const profile: AccessibilityProfile = {
  dyslexia: true,
  dyslexiaSeverity: Severity.MODERATE,
  // ...other fields
};

// Generate CSS
const styles = {
  fontFamily: a11yGetFont(profile),        // 'OpenDyslexic', ...
  lineHeight: a11yGetLineSpacing(profile), // 1.8
  backgroundColor: a11yGetBackgroundColor(profile), // #faf8f3
  letterSpacing: '0.05em',
  wordSpacing: '0.16em',
};

// Process text content
const adapted = syllabifyText('casa bella'); // 'ca­sa bel­la'
```

## Dyscalculia Functions (DC01-06)

| Function | Purpose | Returns |
|----------|---------|---------|
| `formatNumberColored(num, useColors)` | Color-code place values | HTML with colored spans: units=blue, tens=green, hundreds=red |
| `generatePlaceValueBlocks(num)` | Visual blocks for number | HTML with colored blocks (Centinaia, Decine, Unità) |
| `shouldDisableMathTimer(profile)` | Check if timer causes stress | `true` for moderate+ severity |
| `formatMathStep(step)` | Break operation into steps | `string[]` - atomic sub-steps |
| `getAlternativeRepresentation(profile)` | Get math representation | `'visual' \| 'verbal' \| 'both'` |
| `formatFractionVisual(num, denom)` | Show fraction as bar + % | HTML with fraction notation, visual bar, percentage |

### Dyscalculia Usage Example

```typescript
import {
  formatNumberColored,
  generatePlaceValueBlocks,
  shouldDisableMathTimer,
} from '@/lib/education/accessibility';

const profile: AccessibilityProfile = {
  dyscalculia: true,
  dyscalculiaSeverity: Severity.MODERATE,
  // ...other fields
};

// Format numbers with colors
const coloredNum = formatNumberColored(1234, true);
// <span style="color: #3b82f6">4</span>
// <span style="color: #10b981">3</span>
// <span style="color: #ef4444">2</span>
// <span style="color: #f59e0b">1</span>

// Show visual blocks
const blocks = generatePlaceValueBlocks(123);
// HTML with red 100-blocks, green 10-blocks, blue 1-blocks

// Disable timer for quizzes
const noTimer = shouldDisableMathTimer(profile); // true
```

## ADHD Functions (AD01-06)

| Function | Purpose | Returns |
|----------|---------|---------|
| `limitBulletPoints(text, maxBullets)` | Reduce cognitive load | Text with max N bullets + "...e altri X punti" |
| `getSessionDuration(profile)` | Get recommended duration | 600s (severe) → 900s (mod) → 1200s (mild) → 1800s |
| `shouldShowBreakReminder(start, profile)` | Check if break needed | `boolean` based on elapsed time |
| `getMaxBullets(profile)` | Get max bullets by severity | 3 (severe) → 5 (mod) → 7 (mild) → 10 |
| `generateProgressBar(current, total, width)` | Visual progress indicator | `'[████░░░░] 40% (4/10)'` with █/░ chars |
| `getCelebrationMessage(level)` | Positive reinforcement | Italian celebration message (0-4 levels) |
| `shouldEnhanceGamification(profile)` | Check if gamify needed | `true` for moderate+ ADHD |

### ADHD Usage Example

```typescript
import {
  limitBulletPoints,
  getSessionDuration,
  getMaxBullets,
  generateProgressBar,
} from '@/lib/education/accessibility';

const profile: AccessibilityProfile = {
  adhd: true,
  adhdSeverity: Severity.MODERATE,
  adhdType: ADHDType.COMBINED,
  // ...other fields
};

// Limit content bullets
const maxBullets = getMaxBullets(profile); // 5
const content = limitBulletPoints(longList, maxBullets);

// Set session timer
const duration = getSessionDuration(profile); // 900 seconds (15 min)

// Show progress
const progress = generateProgressBar(3, 5, 20);
// [████████████░░░░░░░░] 60% (3/5)
```

## Cerebral Palsy Functions (CP01-05)

| Function | Purpose | Returns |
|----------|---------|---------|
| `getTimeoutMultiplier(profile)` | Get input timeout multiplier | 1.0 → 2.0 (mild) → 2.5 (mod) → 3.0 (severe) |
| `getAdjustedTimeout(profile, baseTimeout)` | Apply multiplier to timeout | `baseTimeout * multiplier` |
| `shouldUseVoiceInput(profile)` | Check if voice input needed | `true` for moderate+ or voice preference |
| `shouldSuggestBreak(profile, minutes)` | Check for fatigue break | `true` after 10-30 min based on severity |
| `getRecommendedInputMethod(profile)` | Get best input method | `KEYBOARD \| VOICE \| BOTH \| TOUCH \| SWITCH \| EYE_TRACKING` |

### Motor Support Usage Example

```typescript
import {
  getAdjustedTimeout,
  shouldUseVoiceInput,
  shouldSuggestBreak,
} from '@/lib/education/accessibility';

const profile: AccessibilityProfile = {
  cerebralPalsy: true,
  cerebralPalsySeverity: Severity.MODERATE,
  preferredInput: InputMethod.BOTH,
  // ...other fields
};

// Extend input timeouts
const timeout = getAdjustedTimeout(profile, 5000); // 12500ms (2.5x)

// Enable voice input
const useVoice = shouldUseVoiceInput(profile); // true

// Check for break
const minutesElapsed = 16;
const needsBreak = shouldSuggestBreak(profile, minutesElapsed); // true (>15 min)
```

## Autism Functions (AU01-06)

| Function | Purpose | Returns |
|----------|---------|---------|
| `shouldAvoidMetaphors(profile)` | Check literal language need | `true` for moderate+ autism |
| `containsMetaphors(text)` | Detect metaphorical language | `boolean` - checks English & Italian patterns |
| `getStructurePrefix(sectionType)` | Get clear section marker | `'📖 Introduzione:' \| '💡 Spiegazione:' \| ...` |
| `getTopicChangeWarning(oldTopic, newTopic)` | Generate transition warning | `'⚠️ Cambio di argomento: ...'` |
| `shouldAvoidSocialPressure(profile)` | Check if competition harmful | `true` for moderate+ autism |
| `shouldReduceMotion(profile)` | Check motion sensitivity | `true` for autism or `reduceMotion` flag |

### Autism Usage Example

```typescript
import {
  shouldAvoidMetaphors,
  getStructurePrefix,
  getTopicChangeWarning,
} from '@/lib/education/accessibility';

const profile: AccessibilityProfile = {
  autism: true,
  autismSeverity: Severity.MODERATE,
  reduceMotion: true,
  // ...other fields
};

// Check for metaphors
if (shouldAvoidMetaphors(profile)) {
  // Rewrite "piece of cake" → "easy to do"
  // Rewrite "in bocca al lupo" → "buona fortuna"
}

// Add clear structure
const intro = getStructurePrefix('introduction');  // '📖 Introduzione:'
const example = getStructurePrefix('example');     // '✏️ Esempio:'

// Warn before topic changes
const warning = getTopicChangeWarning('matematica', 'storia');
// '⚠️ Cambio di argomento: Ora passiamo da "matematica" a "storia".'
```

## Core Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `adaptContent(content, profile)` | Apply all relevant adaptations | Adapted text (syllabified, wrapped, bullets limited) |
| `getAccessibilityCSS(profile)` | Generate CSS properties | `CSSProperties` object with all styles |
| `getAdaptationsSummary(profile)` | Get human-readable summary | `string[]` - list of active adaptations |
| `createDefaultProfile()` | Create blank profile | `AccessibilityProfile` with all false/NONE |
| `mergeWithAccessibilitySettings(profile, settings)` | Merge store settings into profile | `AccessibilityProfile` |

### Core Usage Example

```typescript
import {
  adaptContent,
  getAccessibilityCSS,
  getAdaptationsSummary,
  createDefaultProfile,
} from '@/lib/education/accessibility';

// Create profile
const profile = createDefaultProfile();
profile.dyslexia = true;
profile.dyslexiaSeverity = Severity.MODERATE;
profile.adhd = true;
profile.adhdSeverity = Severity.MILD;

// Adapt all content
const adapted = adaptContent(originalText, profile);
// - Syllabified (dyslexia)
// - Wrapped to 60 chars (dyslexia)
// - Bullets limited to 7 (ADHD)

// Generate CSS
const styles = getAccessibilityCSS(profile);
// {
//   fontFamily: "'OpenDyslexic', ...",
//   lineHeight: 1.8,
//   backgroundColor: '#faf8f3',
//   color: '#2b2b2b',
//   letterSpacing: '0.05em',
//   wordSpacing: '0.16em',
// }

// Show active adaptations to user
const summary = getAdaptationsSummary(profile);
// [
//   'Dislessia (MODERATE): Font speciale, spaziatura aumentata, sillabazione',
//   'ADHD (MILD): Sessioni brevi (20 min), punti elenco limitati, pause frequenti'
// ]
```

## Accessibility Profile Structure

```typescript
interface AccessibilityProfile {
  // Conditions with severity
  dyslexia: boolean;
  dyslexiaSeverity: Severity;        // NONE, MILD, MODERATE, SEVERE
  dyscalculia: boolean;
  dyscalculiaSeverity: Severity;
  cerebralPalsy: boolean;
  cerebralPalsySeverity: Severity;
  adhd: boolean;
  adhdType: ADHDType;                // NONE, INATTENTIVE, HYPERACTIVE, COMBINED
  adhdSeverity: Severity;
  autism: boolean;
  autismSeverity: Severity;
  visualImpairment: boolean;         // boolean only
  hearingImpairment: boolean;        // boolean only

  // Preferences
  preferredInput: InputMethod;       // KEYBOARD, VOICE, BOTH, TOUCH, SWITCH, EYE_TRACKING
  preferredOutput: OutputMethod;     // TEXT, TTS, BOTH, VISUAL, AUDIO, BRAILLE, HAPTIC
  ttsEnabled: boolean;
  ttsSpeed: number;                  // 0.5 - 2.0
  ttsPitch: number;                  // -1.0 to 1.0
  ttsVoice?: string;
  highContrast: boolean;
  reduceMotion: boolean;

  // Text settings
  fontSize: 'normal' | 'large' | 'x-large';
}
```

## Enums

```typescript
enum Severity {
  NONE = 0,
  MILD = 1,
  MODERATE = 2,
  SEVERE = 3,
}

enum ADHDType {
  NONE = 0,
  INATTENTIVE = 1,
  HYPERACTIVE = 2,
  COMBINED = 3,
}

enum InputMethod {
  KEYBOARD = 0,
  VOICE = 1,
  BOTH = 2,
  TOUCH = 3,
  SWITCH = 4,
  EYE_TRACKING = 5,
}

enum OutputMethod {
  TEXT = 0,
  TTS = 1,
  BOTH = 2,
  VISUAL = 3,
  AUDIO = 4,
  BRAILLE = 5,
  HAPTIC = 6,
}
```

## Integration Points

### 1. Database (Prisma)

User profiles stored in `users` table with `accessibilityProfile` JSON field:

```prisma
model User {
  accessibilityProfile Json? // Stores full AccessibilityProfile
  // ...other fields
}
```

### 2. Zustand Store

UI-level settings in `src/lib/accessibility/accessibility-store.ts`:

```typescript
import { useAccessibilityStore } from '@/lib/accessibility';

// Apply profile presets
const { applyDyslexiaProfile, applyADHDProfile } = useAccessibilityStore();
applyDyslexiaProfile(); // Sets dyslexiaFont, extraLetterSpacing, etc.

// Get active settings
const settings = useAccessibilityStore(state => state.settings);
```

### 3. React Hook

Custom hook for profile + settings: `src/lib/education/useEducationAccessibility.ts`

```typescript
import { useEducationAccessibility } from '@/lib/education/useEducationAccessibility';

function MyComponent() {
  const { profile, adaptedCSS, adaptText } = useEducationAccessibility();

  const content = adaptText(originalText);

  return <div style={adaptedCSS}>{content}</div>;
}
```

### 4. PDF Generator

PDFs use similar adaptations in `src/lib/pdf-generator/profiles/index.ts`:

- Dyslexia profile: Large font (18pt), 1.8x line height, cream background
- ADHD profile: Distraction-free, clear sections, progress indicators
- See `@docs/claude/pdf-generator.md` for full details

### 5. AI Maestros

Maestros receive profile info in system prompt to adapt teaching style:

```typescript
// In maestro prompt:
if (shouldAvoidMetaphors(profile)) {
  prompt += '\nUse literal language only. Avoid idioms and metaphors.';
}
if (profile.adhd) {
  prompt += `\nKeep responses concise (max ${getMaxBullets(profile)} bullet points).`;
}
```

### 6. Voice Panel

Voice input respects motor preferences:

```typescript
import { shouldUseVoiceInput } from '@/lib/education/accessibility';

if (shouldUseVoiceInput(userProfile)) {
  // Auto-enable voice input
  // Show larger microphone button
  // Extend voice timeout
}
```

## Testing

Run 100+ unit tests:

```bash
# Run all accessibility tests
npx vitest run src/lib/education/__tests__/accessibility.test.ts

# Test breakdown:
# - Dyslexia: 10 functions × ~3 tests each = 30 tests
# - Dyscalculia: 6 functions × ~4 tests each = 24 tests
# - ADHD: 7 functions × ~4 tests each = 28 tests
# - Cerebral Palsy: 5 functions × ~3 tests each = 15 tests
# - Autism: 6 functions × ~3 tests each = 18 tests
# - Core: 3 functions × ~5 tests each = 15 tests
# Total: 130+ tests with 100% coverage
```

## WCAG 2.1 AA Compliance

All utilities follow WCAG 2.1 AA standards:

- **Contrast**: 4.5:1 minimum (high contrast mode: 7:1)
- **Text Resize**: Up to 200% without loss of function
- **Keyboard Navigation**: Full keyboard support (no mouse required)
- **Focus Indicators**: Visible focus states
- **Motion**: Respects `prefers-reduced-motion`
- **Timing**: Extended timeouts, no time limits on reading
- **Language**: Clear, literal language options

## Performance Considerations

- **Syllabification**: O(n) single pass with regex
- **Line Wrapping**: O(n) word-by-word greedy algorithm
- **CSS Generation**: Memoize with `useMemo()` to avoid recalculation
- **Content Adaptation**: Run on server-side when possible

## Future Enhancements

Prepared for but not yet implemented:

- Custom font loading (OpenDyslexic TTF in `public/fonts/`)
- Braille output device support
- Eye tracking input (Tobii integration)
- Sign language video overlays
- Real-time speech-to-text captions

## Related Documentation

- **PDF Generator**: `@docs/claude/pdf-generator.md` - Accessible PDF export
- **Voice API**: `@docs/claude/voice-api.md` - Speech input/output
- **Tools**: `@docs/claude/tools.md` - Educational tool adaptations
- **Database**: `@docs/claude/database.md` - Profile storage

## Source Files

- Types: `src/lib/education/accessibility/types.ts`
- Dyslexia: `src/lib/education/accessibility/dyslexia.ts`
- Dyscalculia: `src/lib/education/accessibility/dyscalculia.ts`
- ADHD: `src/lib/education/accessibility/adhd.ts`
- Motor/CP: `src/lib/education/accessibility/motor.ts`
- Autism: `src/lib/education/accessibility/autism.ts`
- Core: `src/lib/education/accessibility/core.ts`
- Index: `src/lib/education/accessibility/index.ts`
- Store: `src/lib/accessibility/accessibility-store.ts`
- Tests: `src/lib/education/__tests__/accessibility.test.ts`
