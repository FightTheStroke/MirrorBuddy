# VPAT 2.4 Accessibility Report

**Product**: MirrorBuddy - AI-Powered Educational Platform
**Date**: January 2026
**Standards**: WCAG 2.1 Level AA, Section 508, EN 301 549

---

## Executive Summary

MirrorBuddy is an educational AI platform designed specifically for students with learning differences. This report documents our accessibility conformance against WCAG 2.1 Level AA, Section 508 criteria, and European Standard EN 301 549.

**Conformance Level**: WCAG 2.1 Level AA (Partially Supports for advanced features)

### Key Features

- **7 Accessibility Profiles**: Dyslexia, ADHD, Visual Impairment, Motor Impairment, Autism, Auditory Impairment, Cerebral Palsy
- **Instant Access Button**: Floating accessibility panel for rapid profile activation
- **Keyboard Navigation**: Full keyboard accessibility across all primary workflows
- **Responsive Design**: Mobile-first approach supporting WCAG 2.5.5 touch targets (44px minimum)

---

## WCAG 2.1 Level AA Conformance Summary

| Pillar             | Status   | Coverage                                                                           |
| ------------------ | -------- | ---------------------------------------------------------------------------------- |
| **Perceivable**    | Supports | Images have alt text, captions on video content, high contrast support             |
| **Operable**       | Supports | Full keyboard navigation, skip links, focus indicators, no keyboard traps          |
| **Understandable** | Supports | Clear language, predictable navigation, consistent labeling, error prevention      |
| **Robust**         | Supports | Semantic HTML, ARIA labels, validated against axe-core, tested with screen readers |

---

## 7 DSA Accessibility Profiles

### 1. Dyslexia Profile

- OpenDyslexic font family with serifs aligned for letter tracking
- Increased letter spacing (1.5x) and line height (2x)
- Reduced visual density with larger margins
- **Conformance**: Supports (WCAG 2.4.3 Focus Visible)

### 2. ADHD Profile

- Pomodoro timer (15 min work / 5 min break cycles)
- Distraction-free mode hiding non-essential UI
- Break reminders with visual/audio cues
- **Conformance**: Supports (WCAG 2.5.5 Target Size)

### 3. Visual Impairment Profile

- High contrast mode (7:1 contrast ratio, exceeds AA requirement of 4.5:1)
- Scalable typography (up to 200% zoom supported)
- Text-to-speech integration for all content
- **Conformance**: Supports (WCAG 1.4.11 Non-Text Contrast)

### 4. Motor Impairment Profile

- Full keyboard navigation without mouse requirement
- Large click targets (minimum 44×44px, exceeds WCAG 2.5.5 requirement)
- Dwell-click support for input methods
- **Conformance**: Supports (WCAG 2.1.1 Keyboard, 2.5.5 Target Size)

### 5. Autism Profile

- Reduced motion respecting `prefers-reduced-motion`
- Predictable, consistent navigation patterns
- Clear information hierarchy with visual structure
- **Conformance**: Supports (WCAG 2.3.3 Animation from Interactions)

### 6. Auditory Impairment Profile

- Visual captions on all voice/audio content
- Transcripts of maestro voice interactions
- Visual indicators for notifications
- **Conformance**: Supports (WCAG 1.2.2 Captions)

### 7. Cerebral Palsy Profile

- Combined motor + cognitive adaptations
- Simplified interfaces with reduced cognitive load
- Customizable interaction timing (no time-limited actions)
- **Conformance**: Supports (WCAG 2.2.1 Timing Adjustable)

---

## Detailed WCAG 2.1 Criteria Mapping

### Perceivable

| Criterion                     | Level | Conformance | Remarks                                                                  |
| ----------------------------- | ----- | ----------- | ------------------------------------------------------------------------ |
| 1.1.1 Non-text Content        | A     | Supports    | All images have alt text; maestri avatars describe character and subject |
| 1.2.1 Audio-only / Video-only | A     | Supports    | Voice content transcribed; video captions embedded                       |
| 1.2.2 Captions (Prerecorded)  | A     | Supports    | All AI voice responses captioned; maestro greetings transcribed          |
| 1.3.1 Info and Relationships  | A     | Supports    | Semantic HTML; ARIA landmarks for main, nav, complementary               |
| 1.3.2 Meaningful Sequence     | A     | Supports    | Tab order follows visual flow; skip links to main content                |
| 1.3.3 Sensory Characteristics | A     | Supports    | Instructions not color-only; icons labeled with text                     |
| 1.4.1 Use of Color            | A     | Supports    | Color not sole means of information conveyance                           |
| 1.4.2 Audio Control           | A     | Supports    | Voice audio can be muted; no autoplay                                    |
| 1.4.3 Contrast (Minimum)      | AA    | Supports    | 4.5:1 text contrast; 3:1 large text; tested with Lighthouse              |
| 1.4.4 Resize Text             | AA    | Supports    | Supports 200% zoom without loss of functionality                         |
| 1.4.5 Images of Text          | AA    | Supports    | Text rendered as HTML, not image-based; equation images have alt text    |
| 1.4.10 Reflow                 | AA    | Supports    | Single column on mobile; no horizontal scrolling at 320px width          |
| 1.4.11 Non-text Contrast      | AA    | Supports    | UI components 3:1; graphical elements 3:1 ratio                          |
| 1.4.12 Text Spacing           | AA    | Supports    | Line height 1.5x, letter spacing 0.12em supported                        |
| 1.4.13 Content on Hover       | AA    | Supports    | Dismissible overlays; no content loss on hover                           |

### Operable

| Criterion                     | Level | Conformance        | Remarks                                                              |
| ----------------------------- | ----- | ------------------ | -------------------------------------------------------------------- |
| 2.1.1 Keyboard                | A     | Supports           | All features accessible via keyboard; no keyboard trap detected      |
| 2.1.2 No Keyboard Trap        | A     | Supports           | Focus can move away from components using standard keys              |
| 2.1.3 Keyboard (No Exception) | AAA   | Partially Supports | Real-time voice input requires pointer; fallback text input provided |
| 2.1.4 Character Key Shortcuts | A     | N/A                | No character-key shortcuts implemented                               |
| 2.2.1 Timing Adjustable       | A     | Supports           | No time-limited actions; ADHD profile provides customizable timers   |
| 2.2.2 Pause, Stop, Hide       | A     | Supports           | Animations can be paused; autoplay prevented                         |
| 2.2.3 No Timing               | AAA   | Partially Supports | Session timeout at 24 hours; educational content no hard deadline    |
| 2.2.4 Interruptions           | AAA   | Partially Supports | Notifications can be disabled; critical alerts cannot be dismissed   |
| 2.3.1 Three Flashes or Below  | A     | Supports           | No content flashes more than 3x/second                               |
| 2.3.2 Three Flashes           | AAA   | Supports           | Exceeds threshold with distraction-free mode                         |
| 2.4.1 Bypass Blocks           | A     | Supports           | Skip to main content link; keyboard navigation                       |
| 2.4.2 Page Titled             | A     | Supports           | All pages have descriptive titles; locale included                   |
| 2.4.3 Focus Order             | A     | Supports           | Focus order matches visual order; tested with keyboard navigation    |
| 2.4.4 Link Purpose            | A     | Supports           | Link text indicates purpose; context provided                        |
| 2.4.5 Multiple Ways           | AA    | Supports           | Search, navigation menus, site map available                         |
| 2.4.6 Headings and Labels     | AA    | Supports           | Clear heading hierarchy; form labels associated with inputs          |
| 2.4.7 Focus Visible           | AA    | Supports           | Focus indicator 2px outline; 4.5:1 contrast ratio                    |
| 2.5.1 Pointer Gestures        | A     | Supports           | No multi-pointer gestures required; alternatives provided            |
| 2.5.2 Pointer Cancellation    | A     | Supports           | Single click activation; no drag-drop required                       |
| 2.5.3 Label in Name           | A     | Supports           | Visible text matches accessible name                                 |
| 2.5.4 Motion Actuation        | A     | Supports           | Motion controls optional; Autism profile disables animations         |
| 2.5.5 Target Size             | AAA   | Supports           | All touch targets 44×44px minimum; exceeds AA requirement            |

### Understandable

| Criterion                       | Level | Conformance        | Remarks                                                                 |
| ------------------------------- | ----- | ------------------ | ----------------------------------------------------------------------- |
| 3.1.1 Language of Page          | A     | Supports           | `<html lang="it">` with locale detection; 5 languages supported         |
| 3.1.2 Language of Parts         | AA    | Supports           | Code-switching detected; foreign language properly marked               |
| 3.1.3 Unusual Words             | AAA   | Partially Supports | Glossary for technical terms; some subject-specific vocabulary deferred |
| 3.1.4 Abbreviations             | AAA   | Partially Supports | First use expanded; tooltip on hover                                    |
| 3.1.5 Reading Level             | AAA   | Partially Supports | Readability optimized for Grade 4-5; advanced vocabulary available      |
| 3.1.6 Pronunciation             | AAA   | Not Applicable     | Pronunciation included in voice output                                  |
| 3.2.1 On Focus                  | A     | Supports           | Focus does not trigger navigation                                       |
| 3.2.2 On Input                  | A     | Supports           | Form submission requires explicit action                                |
| 3.2.3 Consistent Navigation     | AA    | Supports           | Navigation consistent across pages                                      |
| 3.2.4 Consistent Identification | AA    | Supports           | Icons and buttons consistent; labeled predictably                       |
| 3.3.1 Error Identification      | A     | Supports           | Errors identified in text and color; suggestions provided               |
| 3.3.2 Labels or Instructions    | A     | Supports           | Form fields labeled; instructions before input                          |
| 3.3.3 Error Suggestion          | AA    | Supports           | Error messages suggest corrections                                      |
| 3.3.4 Error Prevention          | AA    | Supports           | Confirmation for significant actions; undo available                    |
| 3.3.5 Help                      | AAA   | Partially Supports | Context-sensitive help available; escalation to coach available         |

### Robust

| Criterion               | Level | Conformance | Remarks                                                  |
| ----------------------- | ----- | ----------- | -------------------------------------------------------- |
| 4.1.1 Parsing           | A     | Supports    | Valid HTML5; no duplicate IDs; proper nesting            |
| 4.1.2 Name, Role, Value | A     | Supports    | All interactive elements have accessible name/role/value |
| 4.1.3 Status Messages   | AA    | Supports    | ARIA live regions for notifications; role="status"       |

---

## Section 508 Conformance (US Federal Standard)

MirrorBuddy meets the following Section 508 technical standards:

| Requirement                              | Status   | Notes                                        |
| ---------------------------------------- | -------- | -------------------------------------------- |
| 1194.22(a) - Text equivalents for images | Conforms | Alt text provided                            |
| 1194.22(b) - Multimedia alternatives     | Conforms | Captions, transcripts available              |
| 1194.22(c) - Color conveying information | Conforms | Color not sole indicator                     |
| 1194.22(d) - Documents accessibility     | Conforms | PDFs include OCR; accessible formats offered |
| 1194.22(e) - Tables                      | Conforms | Header cells marked; summary provided        |
| 1194.22(f) - Form labels                 | Conforms | All inputs labeled; errors identified        |
| 1194.22(g) - Scripts                     | Conforms | Keyboard accessible; no JavaScript traps     |
| 1194.22(h) - Flicker                     | Conforms | No content flashes >3/sec                    |
| 1194.22(i) - Frames                      | Conforms | Frames titled; avoided in responsive design  |
| 1194.22(j) - Text-only alternative       | Supports | Transcripts for audio content                |

---

## EN 301 549 European Standard Conformance

| Standard                                    | Conformance | Notes                                       |
| ------------------------------------------- | ----------- | ------------------------------------------- |
| 9.1 - Perceivable                           | Supports    | Information available to all users          |
| 9.2 - Operable                              | Supports    | Full keyboard navigation; no keyboard traps |
| 9.3 - Understandable                        | Supports    | Clear language; consistent UI patterns      |
| 9.4 - Robust                                | Supports    | Compatible with AT; semantic markup         |
| 9.6 - ICT functional performance statements | Supports    | Documented in this report                   |

---

## Testing Methodology

### Automated Testing

- **Lighthouse CI**: Accessibility audits on every build (target: 90+)
- **axe-core**: WCAG violations checked in E2E tests
- **PA11y**: Command-line accessibility testing

### Manual Testing

- **Screen Reader Testing**: NVDA (Windows), JAWS (enterprise), VoiceOver (macOS/iOS)
- **Keyboard Navigation**: Tab order, focus indicators, no traps
- **Contrast Verification**: WCAG 2.1 AA standard (4.5:1 normal, 3:1 large)
- **Mobile Testing**: iPhone SE (375px), Pixel 7 (412px), iPad (768px)

### User Testing

- DSA profile users validate accessibility configurations
- Quarterly accessibility audits with external consultants

---

## Known Limitations & Remediation Timeline

| Issue                                        | Severity | Timeline | Workaround                           |
| -------------------------------------------- | -------- | -------- | ------------------------------------ |
| Real-time voice input requires pointer (AAA) | Medium   | Q2 2026  | Text input fallback provided         |
| Session timeout not customizable (AAA)       | Low      | Q3 2026  | Session extends on activity          |
| Some glossary terms incomplete (AAA)         | Low      | Ongoing  | Hover tooltips, search available     |
| Advanced animations cannot be disabled (AAA) | Low      | Q2 2026  | Reduced motion mode hides animations |

---

## Accessibility Support

For accessibility issues or requests:

- **Email**: accessibility@mirrorbuddy.example
- **Report Bug**: https://github.com/fightthestroke/mirrorbuddy/issues/new?labels=a11y
- **Feedback Form**: /accessibility/feedback (authenticated users)

---

## Approval & Review

| Role               | Name             | Date         | Signature |
| ------------------ | ---------------- | ------------ | --------- |
| Compliance Officer | [To be assigned] | January 2026 |           |
| Product Manager    | [To be assigned] | January 2026 |           |
| QA Lead            | [To be assigned] | January 2026 |           |

---

**Last Updated**: January 2026
**Next Review**: July 2026
**Report Version**: 2.4 Rev A
