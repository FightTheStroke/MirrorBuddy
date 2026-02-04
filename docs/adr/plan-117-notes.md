# Plan 117: Fix-Webcam-Fullscreen

## W1: Webcam Core

### Decisions & Patterns

- **Decision**: Fullscreen overlay vs modal - chose overlay for better mobile UX
- **Pattern**: Dual-flow tool pattern (with/without maestro selection)
- **Issue**: Card wrapper limiting width → **Fix**: Removed Card, use fixed inset-0
- **Pattern**: Mobile-first camera default (environment facing for documents)

### Key Changes

- Refactored WebcamCapture from Card modal to fullscreen overlay with fixed inset-0
- Redesigned webcam-header with app design system (bg-slate-900, text-white)
- Enhanced webcam-controls with large capture button (w-16 h-16) for better touch targets
- Default to rear camera (environment) on mobile devices for document capture
- Improved webcam-error with clear permission denied messages and instructions
- Simplified MaestroSessionWebcam by removing max-w-lg wrapper
- Added webcam-standalone tool for direct photo capture without maestro selection
- Implemented dual webcam flow in Astuccio (with maestro / standalone)

### Technical Notes

- Fullscreen overlay pattern ensures consistent UX across devices
- Environment-facing camera default improves document capture workflow on mobile
- Dual-flow architecture allows flexibility in tool access patterns

## W2: Accessibility & Internationalization

### Decisions & Patterns

- **Decision**: WCAG 2.1 AA compliance mandatory for all interactive elements
- **Pattern**: Full keyboard navigation support (Tab, Enter, Escape)
- **Pattern**: i18n messages namespace following ADR 0104 wrapper key convention
- **Pattern**: Responsive breakpoints for mobile-first fullscreen experience

### Key Changes

#### Accessibility (WCAG 2.1 AA)

- Added keyboard navigation support for all webcam controls
- Implemented visible focus indicators with focus-visible rings
- Added aria-live regions for dynamic status announcements (capturing, processing)
- Ensured proper focus management (auto-focus capture button, trap focus in modal)
- Added aria-labels for icon-only buttons (close, retry, confirm)
- Tested with screen readers for proper announcement flow

#### Internationalization

- Added webcam messages namespace (`messages/{locale}/webcam.json`)
- Wrapper key convention: `{ "webcam": { ...keys... } }` per ADR 0104
- Translated all UI strings for 5 locales (it, en, fr, de, es)
- i18n check validation passed (100% completion for webcam namespace)

#### Responsive Design

- Added breakpoint-specific layouts (mobile/tablet/desktop)
- Optimized touch targets for mobile devices (min 44x44px)
- Improved fullscreen overlay on small viewports
- Enhanced camera preview sizing for different screen sizes

### Technical Notes

- Focus management prevents focus loss when modal opens/closes
- Aria-live announcements inform users of capture state changes
- i18n keys follow camelCase convention enforced by ESLint
- All accessibility features tested with keyboard-only navigation
