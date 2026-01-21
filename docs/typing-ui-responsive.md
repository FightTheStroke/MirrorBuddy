# UI Responsive Design - Implementation Notes

## Breakpoints

- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md)
- Desktop: > 1024px (lg)

## Responsive Components

### VirtualKeyboard
- Mobile: Show only current row or use horizontal scroll
- Tablet: Show all rows with smaller keys
- Desktop: Show all rows with normal keys

### LessonSelector
- Mobile: Single column cards
- Tablet: 2 columns
- Desktop: 3-4 columns

### Games
- Mobile: Simplified UI, larger touch targets (44x44px min)
- Tablet: Medium UI
- Desktop: Full UI

### Accessibility Panels
- Mobile: Bottom sheet or full-screen modal
- Tablet/ Desktop: Sidebar or panel

## Touch Optimization

- Minimum touch target: 44x44px (WCAG 2.1)
- Swipe gestures for navigation (optional)
- Haptic feedback on mobile

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Performance Optimization

- Virtual keyboard renders only visible keys
- Debounce input handling (16ms target)
- Web Workers for WPM calculations
- Lazy load game components
