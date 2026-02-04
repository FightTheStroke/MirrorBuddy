# ADR 0118: Webcam Fullscreen Architecture

## Status

Accepted

## Date

2026-02-03

## Context

The webcam capture component had UX issues on mobile and desktop:

1. **Card modal width constraint**: Initial implementation used a Card wrapper with max-width, causing poor mobile UX and constrained camera preview
2. **Modal vs overlay pattern**: Traditional modals don't provide full-screen immersion needed for camera capture
3. **Tool access patterns**: Users needed both maestro-guided capture (ask for help first) and direct standalone capture (quick photo)
4. **Mobile camera defaults**: Front camera default resulted in poor document/homework capture on phones

## Decision

### Fullscreen Overlay Pattern

Replace Card modal with fixed fullscreen overlay (`fixed inset-0`) providing:

- Full viewport camera preview on all devices
- Immersive capture experience without UI chrome
- Consistent behavior across mobile and desktop
- Better touch target sizing for mobile users

### Dual-Flow Tool Architecture

Implement two parallel webcam access patterns:

1. **Maestro-guided flow**: User selects maestro → camera opens with context
2. **Standalone flow**: Direct camera access from Astuccio → ask maestro after capture

Both flows use the same `WebcamCapture` component with different entry points.

### Mobile-First Camera Defaults

Default to environment-facing (rear) camera on mobile devices:

```typescript
const preferredFacingMode = isMobileDevice() ? "environment" : "user";
```

Rationale: Most student captures are documents, homework, or textbooks requiring rear camera.

## Implementation

### Key Components

- `src/components/tools/webcam/webcam-capture.tsx` — Core fullscreen overlay component
- `src/components/tools/webcam/webcam-standalone.tsx` — Direct capture tool
- `src/components/chat/maestro-session-webcam.tsx` — Maestro-guided capture
- `src/components/tools/astuccio.tsx` — Dual-flow entry point

### Design System Integration

- Header: `bg-slate-900 text-white` (consistent with app theme)
- Controls: Large capture button (`w-16 h-16`) for touch targets
- Error states: Clear permission instructions with retry flow
- Focus management: Proper keyboard navigation and focus trap

### Accessibility (WCAG 2.1 AA)

- Keyboard navigation: Tab, Enter, Escape
- Focus indicators: Visible focus rings on all controls
- Aria-live announcements: Status changes announced to screen readers
- Screen reader support: Proper aria-labels on icon-only buttons

### Internationalization

- Dedicated `webcam` namespace in i18n messages
- 5 locales supported (it, en, fr, de, es)
- Wrapper key convention: `{ "webcam": { ...keys... } }` per ADR 0104

## Consequences

**Positive:**

- Improved mobile UX with full-screen camera preview
- Flexible tool access patterns (maestro-guided or standalone)
- Better document capture with rear camera default on mobile
- WCAG 2.1 AA compliance for all users
- Consistent UX across devices and locales

**Negative:**

- Fullscreen overlay blocks all other UI (by design)
- Dual-flow pattern requires maintaining two entry points
- Mobile device detection needed for camera facing mode

## Alternatives Considered

1. **Card modal with max-width**: Original approach, rejected due to poor mobile UX
2. **Single maestro-only flow**: Rejected, users need quick capture without maestro selection
3. **Front camera default**: Rejected, rear camera better for document capture on mobile

## References

- Plan 117: Fix-Webcam-Fullscreen
- ADR 0104: i18n Wrapper Key Convention
- `docs/adr/plan-117-notes.md` — Implementation notes
- WCAG 2.1 AA guidelines

## Related Patterns

- Tool architecture: See `src/types/index.ts` for ToolType definitions
- Fullscreen overlays: Consider this pattern for other immersive tools (document scanner, whiteboard)
- Mobile-first defaults: Apply similar device detection for other camera-based features
