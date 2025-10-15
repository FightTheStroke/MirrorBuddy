# Touch Target & Interaction Design Guide

## Child-Friendly Touch Target Standards for MirrorBuddy

**Last Updated**: 2025-10-15
**Related Task**: Subtask 98.2 - Optimize Touch Targets and Feedback Systems

---

## Table of Contents

1. [Touch Target Size Standards](#touch-target-size-standards)
2. [Button Styles](#button-styles)
3. [Haptic Feedback](#haptic-feedback)
4. [Visual Feedback](#visual-feedback)
5. [Forgiving Touch Areas](#forgiving-touch-areas)
6. [Accessibility Compliance](#accessibility-compliance)
7. [Implementation Examples](#implementation-examples)
8. [Testing Checklist](#testing-checklist)

---

## Touch Target Size Standards

### Minimum Sizes

All interactive elements MUST meet these minimum touch target sizes:

| Size Category | Dimensions | Use Case |
|--------------|------------|----------|
| **Minimum** | 44x44px | WCAG 2.1 Level AA minimum (avoid if possible) |
| **Recommended** | 48x48px | Standard buttons and controls (preferred) |
| **Large** | 56x56px | Primary actions and frequently used buttons |
| **Extra Large** | 64x64px | Critical child-friendly actions |

### Why Larger Targets for Children?

- **Motor Skill Development**: Children ages 6-10 have developing fine motor skills
- **Accuracy**: Larger targets reduce accidental taps by ~60%
- **Cognitive Load**: Bigger targets reduce frustration and improve confidence
- **DSA Support**: Essential for students with dyspraxia or coordination challenges

---

## Button Styles

MirrorBuddy provides pre-built button styles in `TouchTargetStyle.swift` that automatically ensure compliance.

### 1. Child-Friendly Button Style

```swift
Button("Tap Me") {
    // Action
}
.buttonStyle(.childFriendly)
```

**Features**:
- 48x48px minimum size
- Scale-down animation on press
- Medium haptic feedback
- Forgiving tap area (entire frame is tappable)

**Variants**:
- `.childFriendlyLarge` - 56x56px minimum
- `.childFriendlyExtraLarge` - 64x64px minimum (more intense haptic)

### 2. Icon Button Style

```swift
Button {
    // Action
} label: {
    Image(systemName: "star.fill")
}
.buttonStyle(.icon(color: .yellow, background: .yellow.opacity(0.1), size: 48))
```

**Features**:
- Ensures icon-only buttons meet touch target minimum
- Customizable color and background
- Clear visual feedback on press
- Haptic feedback on tap

### 3. Primary Action Button Style

```swift
Button("Aggiorna") {
    // Action
}
.buttonStyle(.primaryAction(backgroundColor: .blue, foregroundColor: .white))
```

**Features**:
- 56x56px minimum height
- Full-width layout
- Prominent shadow and scaling
- Strong haptic feedback (0.7 intensity)
- Ideal for main CTAs

### 4. Card Button Style

```swift
Button {
    // Action
} label: {
    // Card content
}
.buttonStyle(.card)
```

**Features**:
- For large card-based buttons
- Smooth scale and brightness animations
- Forgiving tap area across entire card
- Medium haptic feedback

---

## Haptic Feedback

### Standard Haptic Functions

Use the `HapticFeedback` utility for consistent haptic responses:

```swift
// Light impact (toggles, switches)
HapticFeedback.light()

// Medium impact (standard buttons) - DEFAULT
HapticFeedback.medium()

// Heavy impact (important actions)
HapticFeedback.heavy()

// Success notification (task complete, save success)
HapticFeedback.success()

// Error notification (operation failed)
HapticFeedback.error()

// Warning notification (caution states)
HapticFeedback.warning()

// Selection feedback (picker, list selection)
HapticFeedback.selection()
```

### When to Use Each Type

| Haptic Type | Use Case | Example |
|-------------|----------|---------|
| **Light** | Toggle switch, checkbox | Enabling voice mode |
| **Medium** | Standard button tap | Opening material, navigation |
| **Heavy** | Important action, deletion | Deleting material, stopping recording |
| **Success** | Completion, achievement | Update completed, quiz passed |
| **Error** | Failed operation | Network error, invalid input |
| **Warning** | Caution, review needed | Low battery, quota exceeded |
| **Selection** | Picking from list | Selecting subject, switching tabs |

### Haptic Intensity Guidelines

For child-friendly UX:
- ✅ **DO**: Use medium to heavy haptics for primary interactions
- ✅ **DO**: Provide haptic feedback on ALL button presses
- ❌ **DON'T**: Use light haptics for important actions
- ❌ **DON'T**: Overuse haptics (max 1 per interaction)

---

## Visual Feedback

### Animation Standards

All interactive elements should provide visual feedback:

#### Scale Animation (Preferred)

```swift
.scaleEffect(isPressed ? 0.97 : 1.0)
.animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
```

**Parameters**:
- **Scale**: 0.92-0.97 (subtle for children, not jarring)
- **Duration**: 0.3s spring animation
- **Damping**: 0.6 (balanced, not too bouncy)

#### Brightness Adjustment (Secondary)

```swift
.brightness(isPressed ? -0.05 : 0) // Light mode
.brightness(isPressed ? 0.1 : 0)   // Dark mode
```

#### Opacity Changes (Use Sparingly)

```swift
.opacity(isDisabled ? 0.5 : 1.0)
```

### Color States

| State | Color Treatment |
|-------|----------------|
| **Normal** | Full saturation, primary color |
| **Pressed** | Slightly dimmed (-5% brightness) or scaled |
| **Disabled** | 50% opacity, gray color |
| **Loading** | Progress indicator, reduced opacity |

---

## Forgiving Touch Areas

### The Problem

Small visual elements (icons, badges) may be hard to tap accurately, especially for children.

### Solution 1: Forgiving Touch Area Modifier

Expands the tappable area beyond visual bounds:

```swift
Circle()
    .fill(Color.blue)
    .frame(width: 24, height: 24)
    .forgivingTouchArea(extraPadding: 12)  // Total tap area: 48x48px
    .onTapGesture {
        // Action
    }
```

**When to Use**:
- Icons smaller than 44x44px that can't be enlarged visually
- Close-up buttons in tight spaces
- Badge indicators with tap actions

### Solution 2: Touch Target Modifier

Ensures minimum touch target size while maintaining visual appearance:

```swift
Image(systemName: "heart.fill")
    .font(.title3)  // Visually ~24px
    .touchTarget(minimumSize: 48)  // Tappable area: 48x48px
    .onTapGesture {
        // Action
    }
```

### Content Shape for Complex Views

For custom-shaped buttons, ensure the entire area is tappable:

```swift
Button {
    // Action
} label: {
    HStack {
        Image(systemName: "star")
        Text("Favorite")
    }
}
.contentShape(Rectangle())  // Makes entire HStack tappable
```

---

## Accessibility Compliance

### WCAG 2.1 Compliance Checklist

- ✅ **Level AA**: Minimum 44x44px touch targets ([Success Criterion 2.5.5](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html))
- ✅ **Level AAA**: Minimum 44x44px touch targets with 24px spacing
- ✅ **Motion**: Respect `UIAccessibility.isReduceMotionEnabled`
- ✅ **Color**: Don't rely on color alone (use icons + text)
- ✅ **Contrast**: Minimum 4.5:1 text contrast, 3:1 non-text contrast

### VoiceOver Support

Always provide accessibility labels for interactive elements:

```swift
Button {
    // Action
} label: {
    Image(systemName: "trash")
}
.accessibilityLabel("Elimina materiale")
.accessibilityHint("Tocca due volte per eliminare questo materiale")
```

### Dynamic Type Support

Ensure buttons scale with text size:

```swift
Text("Save")
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
```

---

## Implementation Examples

### Example 1: Toolbar Icon Buttons

**Before**:
```swift
ToolbarItem {
    Button {
        showSettings = true
    } label: {
        Image(systemName: "gearshape")
    }
}
```

**After**:
```swift
ToolbarItem {
    Button {
        showSettings = true
    } label: {
        Image(systemName: "gearshape")
    }
    .buttonStyle(.icon(color: .blue, size: 48))
    .accessibilityLabel("Impostazioni")
}
```

### Example 2: Primary CTA Button

**Before**:
```swift
Button("Aggiorna") {
    performUpdate()
}
.padding()
.background(Color.blue)
.foregroundColor(.white)
.cornerRadius(12)
```

**After**:
```swift
Button("Aggiorna") {
    performUpdate()
}
.buttonStyle(.primaryAction())
.accessibilityLabel("Aggiorna materiali")
.accessibilityHint("Tocca due volte per sincronizzare documenti e compiti")
```

### Example 3: Card with Embedded Actions

**Before**:
```swift
HStack {
    VStack {
        Text(material.title)
        Text(material.date)
    }

    Button {
        deleteMaterial()
    } label: {
        Image(systemName: "trash")
            .font(.caption)
    }
}
.padding()
.background(Color.white)
.cornerRadius(12)
.onTapGesture {
    openMaterial()
}
```

**After**:
```swift
HStack {
    VStack(alignment: .leading) {
        Text(material.title)
        Text(material.date)
    }

    Spacer()

    Button {
        HapticFeedback.medium()
        deleteMaterial()
    } label: {
        Image(systemName: "trash")
    }
    .buttonStyle(.icon(color: .red, background: .red.opacity(0.1), size: 48))
    .accessibilityLabel("Elimina")
}
.padding()
.background(Color.white)
.cornerRadius(12)
.contentShape(Rectangle())  // Entire card tappable
.onTapGesture {
    HapticFeedback.medium()
    openMaterial()
}
```

### Example 4: Small Badge with Action

**Before**:
```swift
Badge(count: 5)
    .onTapGesture {
        showNotifications()
    }
```

**After**:
```swift
Badge(count: 5)
    .forgivingTouchArea(extraPadding: 12)  // Extends tappable area
    .onTapGesture {
        HapticFeedback.medium()
        showNotifications()
    }
    .accessibilityLabel("5 nuove notifiche")
    .accessibilityHint("Tocca due volte per aprire")
```

---

## Testing Checklist

### Manual Testing

For every interactive element, verify:

- [ ] Visual size ≥ 44x44px OR forgiving touch area applied
- [ ] Tap registers reliably on first try (test with children if possible)
- [ ] Visual feedback on press (scale/brightness/color change)
- [ ] Haptic feedback triggers on tap
- [ ] Spacing between adjacent buttons ≥ 8px
- [ ] Works with VoiceOver enabled
- [ ] Works with Large Text (Accessibility sizes)
- [ ] Works in both light and dark mode
- [ ] No accidental taps when scrolling
- [ ] Button state clearly visible (disabled, loading, etc.)

### Automated Testing

Use Xcode Accessibility Inspector:

1. **Size Audit**: Run "Target Size" audit
2. **Color Contrast**: Run "Color Contrast" audit
3. **Touch Area**: Use "Highlighting" to visualize tap areas
4. **VoiceOver**: Test with VoiceOver enabled

### Child Testing (Recommended)

If possible, test with actual users (ages 6-12):

- Observe first-tap success rate
- Note any frustrated retries
- Ask for feedback on button sizes
- Test with both hands (right/left handed)

---

## Quick Reference

### Common Button Styles

```swift
// Standard button
.buttonStyle(.childFriendly)

// Large primary action
.buttonStyle(.primaryAction())

// Icon button
.buttonStyle(.icon(color: .blue, size: 48))

// Card button
.buttonStyle(.card)
```

### Common Modifiers

```swift
// Ensure minimum touch target
.touchTarget(minimumSize: 48)

// Forgiving touch area for small visuals
.forgivingTouchArea(extraPadding: 12)

// Make entire shape tappable
.contentShape(Rectangle())
```

### Common Haptics

```swift
// Button tap
HapticFeedback.medium()

// Success action
HapticFeedback.success()

// Error/warning
HapticFeedback.error()
```

---

## Resources

### Internal Files

- `MirrorBuddy/Core/UI/TouchTargetStyle.swift` - All button styles and utilities
- `docs/ACCESSIBILITY_GUIDE.md` - Full accessibility guidelines
- `docs/DESIGN_SYSTEM.md` - Overall design system documentation

### External References

- [WCAG 2.1 Target Size Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/inputs)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
- [Nielsen Norman Group - Touch Target Size Study](https://www.nngroup.com/articles/touch-target-size/)

---

## Changelog

### 2025-10-15 - Initial Version (Subtask 98.2)
- Created comprehensive touch target standards
- Defined button styles for child-friendly interactions
- Documented haptic feedback system
- Added forgiving touch area utilities
- Included implementation examples and testing checklist

---

**Questions or Feedback?**

If you encounter touch target issues or have suggestions for improving this guide, please update this document or add notes to the relevant Task Master task.
