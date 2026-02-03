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
