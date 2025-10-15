# MirrorBuddy Color System Guide

**Last Updated**: 2025-10-15
**Related Task**: Subtask 98.3 - Child-Friendly Color System and Accessibility

## Overview

MirrorBuddy uses a vibrant, child-friendly color palette designed for ages 6-10 with DSA needs. All colors meet WCAG 2.1 Level AA contrast requirements for accessibility.

## Primary Colors

```swift
Color.mbPrimary    // #007AFF - Primary actions, navigation
Color.mbSecondary  // #AF52DE - Secondary actions, AI features
Color.mbSuccess    // #34C759 - Success states, achievements
Color.mbWarning    // #FF9500 - Warnings, time-sensitive items
Color.mbError      // #FF3B30 - Errors, destructive actions
```

## Subject Colors (Vibrant & Distinct)

```swift
Color.mbMath       // #0A84FF - Mathematics (bright blue)
Color.mbScience    // #BF5AF2 - Science/Physics (electric purple)
Color.mbLanguage   // #FF9F0A - Language/Literature (warm orange)
Color.mbHistory    // #FF9500 - History (earthy orange)
Color.mbArt        // #FF2D55 - Art/Creative (pink/magenta)
Color.mbMusic      // #32ADE6 - Music (teal/cyan)
Color.mbPE         // #30D158 - Physical Education (energetic green)
Color.mbGeneral    // #5856D6 - General/Other (indigo)
```

## Text & Neutral Colors

```swift
Color.mbTextPrimary    // #1C1C1E - Primary text (15:1 contrast on white)
Color.mbTextSecondary  // #3A3A3C - Secondary text (10:1 contrast)
Color.mbTextTertiary   // #8E8E93 - Tertiary text/disabled (4.5:1 contrast)
Color.mbBackgroundLight // #F2F2F7 - Off-white background
Color.mbBackgroundCard // #FFFFFF - Card background
Color.mbBorder         // #C6C6C8 - Borders/dividers
```

## Accessibility Features

### Contrast Ratio Utilities

```swift
// Check contrast ratio between colors
let ratio = foregroundColor.contrastRatio(with: backgroundColor)

// Verify WCAG compliance
let meetsAA = color.meetsContrastRequirement(on: .white, level: .AA, largeText: false)

// Get accessible text color for background
let textColor = backgroundColor.accessibleTextColor
```

### WCAG Requirements

- **Normal Text**: Minimum 4.5:1 (AA), 7:1 (AAA)
- **Large Text** (18pt+ or 14pt+ bold): Minimum 3:1 (AA), 4.5:1 (AAA)
- **Graphics/UI Components**: Minimum 3:1

### Color Blind Safe Palette

```swift
Color.mbColorBlindSafeBlue    // #0077BB - Deuteranopia/Protanopia safe
Color.mbColorBlindSafeOrange  // #EE7733 - Deuteranopia/Protanopia safe
Color.mbColorBlindSafePurple  // #AA3377 - Tritanopia safe
Color.mbColorBlindSafeCyan    // #33BBEE - Tritanopia safe
```

Use blue-orange pairs for critical distinctions (most universally distinguishable).

## UI State Colors

```swift
Color.mbSelectedBackground  // Primary color at 15% opacity
Color.mbHoverBackground     // Primary color at 8% opacity
Color.mbPressedBackground   // Primary color at 25% opacity
Color.mbDisabledBackground  // Light gray background
Color.mbDisabledForeground  // Tertiary text at 50% opacity
```

## Gradients

```swift
Color.mbGradientBlue    // [#007AFF, #0051D5]
Color.mbGradientPurple  // [#AF52DE, #8E24AA]
Color.mbGradientGreen   // [#34C759, #2B9B47]
Color.mbGradientSunny   // [#FF9500, #FF6B00]
```

## Best Practices

1. **Always use semantic colors** (`.mbPrimary`) instead of raw hex values
2. **Test contrast** before using custom combinations
3. **Don't rely on color alone** - use icons + text for critical info
4. **Use subject colors consistently** for material categorization
5. **Test with color blind simulators** for important distinctions

## Testing

### Automated Testing
```swift
// In unit tests
func testColorContrast() {
    let ratio = Color.mbPrimary.contrastRatio(with: .white)
    XCTAssertGreaterThanOrEqual(ratio, 4.5, "Primary color must meet AA contrast")
}
```

### Manual Testing Tools
- Xcode Accessibility Inspector
- Sim Daltonism (color blind simulator)
- Color Oracle (free color blind simulator)
- WebAIM Contrast Checker

## Quick Reference

| Use Case | Color | Hex |
|---------|--------|-----|
| Primary CTA | `.mbPrimary` | #007AFF |
| Success feedback | `.mbSuccess` | #34C759 |
| Error message | `.mbError` | #FF3B30 |
| Warning banner | `.mbWarning` | #FF9500 |
| Math subject | `.mbMath` | #0A84FF |
| Primary text | `.mbTextPrimary` | #1C1C1E |

## Resources

- `MirrorBuddy/Core/UI/ColorSystem.swift` - Full color system implementation
- [WCAG 2.1 Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Color Blind Awareness](http://www.colourblindawareness.org/)

---

**Questions?** Update this guide or add notes to Task Master subtask 98.3.
