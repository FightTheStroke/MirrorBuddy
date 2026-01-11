# Accessibility Rules - MirrorBuddy

## 7 DSA Profiles

MirrorBuddy supports 7 accessibility profiles in `src/lib/accessibility/`:

| Profile | Key Settings |
|---------|-------------|
| **Dyslexia** | OpenDyslexic font, extra letter spacing, increased line height |
| **ADHD** | Pomodoro sessions (15min work/5min break), distraction-free mode, break reminders |
| **Visual Impairment** | High contrast, large text, TTS enabled |
| **Motor Impairment** | Keyboard navigation, large click targets |
| **Autism** | Reduced motion, predictable layouts, clear structure |
| **Auditory Impairment** | Visual cues, captions, no audio-only content |
| **Cerebral Palsy** | Combined motor + cognitive adaptations |

## Store Pattern

```typescript
// Use Zustand store - NO localStorage for user data (ADR 0015)
import { useAccessibilityStore } from '@/lib/accessibility';

// Apply profile preset
const { applyDyslexiaProfile, applyADHDProfile } = useAccessibilityStore();

// Get current settings
const settings = useAccessibilityStore(state => state.settings);
```

## WCAG 2.1 AA Requirements

- **Contrast**: 4.5:1 minimum for normal text, 3:1 for large text
- **Focus**: Visible focus indicators on all interactive elements
- **Keyboard**: All functionality accessible via keyboard
- **Motion**: Respect `prefers-reduced-motion`
- **Text**: Support 200% zoom without horizontal scroll

## Implementation Checklist

When adding UI components:
- [ ] Test with each accessibility profile enabled
- [ ] Verify keyboard navigation (Tab, Enter, Escape)
- [ ] Check color contrast with high contrast mode
- [ ] Ensure TTS reads content correctly
- [ ] Test with reduced motion enabled
