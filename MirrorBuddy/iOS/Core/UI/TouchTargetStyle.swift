//
//  TouchTargetStyle.swift
//  MirrorBuddy
//
//  Ensures all interactive elements meet child-friendly touch target standards
//  Subtask 98.2: Touch target optimization with minimum 44x44px and feedback
//

import SwiftUI

// MARK: - Touch Target Constants

/// Touch target size constants following WCAG 2.1 Level AAA and child-friendly design
enum TouchTargetSize {
    /// Minimum touch target size (44x44px per WCAG 2.1 Level AA)
    static let minimum: CGFloat = 44

    /// Recommended touch target size for children (48x48px for better accuracy)
    static let recommended: CGFloat = 48

    /// Large touch target for primary actions (56x56px)
    static let large: CGFloat = 56

    /// Extra large for critical child-friendly buttons (64x64px)
    static let extraLarge: CGFloat = 64
}

// MARK: - Child-Friendly Button Style

/// Button style that ensures minimum touch target size with visual and haptic feedback
struct ChildFriendlyButtonStyle: ButtonStyle {
    var minimumSize: CGFloat = TouchTargetSize.recommended
    var hapticIntensity: Double = 0.5
    var scaleEffect: CGFloat = 0.95

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(minWidth: minimumSize, minHeight: minimumSize)
            .contentShape(Rectangle()) // Ensure entire frame is tappable
            .scaleEffect(configuration.isPressed ? scaleEffect : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
            .sensoryFeedback(.impact(intensity: hapticIntensity), trigger: configuration.isPressed)
    }
}

// MARK: - Icon Button Style

/// Icon-only button style with forgiving touch area and clear feedback
struct IconButtonStyle: ButtonStyle {
    var size: CGFloat = TouchTargetSize.recommended
    var foregroundColor: Color = .blue
    var backgroundColor: Color = .clear
    var cornerRadius: CGFloat = 12

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.title2)
            .foregroundStyle(foregroundColor)
            .frame(width: size, height: size)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(backgroundColor)
                    .opacity(configuration.isPressed ? 0.5 : 1.0)
            )
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
            .contentShape(Rectangle())
            .sensoryFeedback(.impact(intensity: 0.5), trigger: configuration.isPressed)
    }
}

// MARK: - Primary Action Button Style

/// Large, prominent button style for primary actions
struct PrimaryActionButtonStyle: ButtonStyle {
    var backgroundColor: Color = .blue
    var foregroundColor: Color = .white

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(foregroundColor)
            .frame(minHeight: TouchTargetSize.large)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 20)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(backgroundColor)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .brightness(configuration.isPressed ? -0.1 : 0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
            .contentShape(Rectangle())
            .sensoryFeedback(.impact(intensity: 0.7), trigger: configuration.isPressed)
            .shadow(
                color: backgroundColor.opacity(0.3),
                radius: configuration.isPressed ? 4 : 8,
                x: 0,
                y: configuration.isPressed ? 2 : 4
            )
    }
}

// MARK: - Card Button Style

/// Card-style button with forgiving touch area and smooth animations
struct CardButtonStyle: ButtonStyle {
    var cornerRadius: CGFloat = 16

    @Environment(\.colorScheme) private var colorScheme

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .brightness(configuration.isPressed ? (colorScheme == .dark ? 0.1 : -0.05) : 0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
            .contentShape(Rectangle())
            .sensoryFeedback(.impact(intensity: 0.5), trigger: configuration.isPressed)
    }
}

// MARK: - Button Style Extensions

extension ButtonStyle where Self == ChildFriendlyButtonStyle {
    /// Standard child-friendly button (48x48px minimum)
    static var childFriendly: ChildFriendlyButtonStyle {
        ChildFriendlyButtonStyle()
    }

    /// Large child-friendly button (56x56px minimum)
    static var childFriendlyLarge: ChildFriendlyButtonStyle {
        ChildFriendlyButtonStyle(minimumSize: TouchTargetSize.large, hapticIntensity: 0.7)
    }

    /// Extra large button for critical actions (64x64px minimum)
    static var childFriendlyExtraLarge: ChildFriendlyButtonStyle {
        ChildFriendlyButtonStyle(minimumSize: TouchTargetSize.extraLarge, hapticIntensity: 0.8)
    }
}

extension ButtonStyle where Self == IconButtonStyle {
    /// Icon button with recommended touch target (48x48px)
    static func icon(
        color: Color = .blue,
        background: Color = .clear,
        size: CGFloat = TouchTargetSize.recommended
    ) -> IconButtonStyle {
        IconButtonStyle(
            size: size,
            foregroundColor: color,
            backgroundColor: background
        )
    }
}

extension ButtonStyle where Self == PrimaryActionButtonStyle {
    /// Primary action button with large touch target
    static func primaryAction(
        backgroundColor: Color = .blue,
        foregroundColor: Color = .white
    ) -> PrimaryActionButtonStyle {
        PrimaryActionButtonStyle(
            backgroundColor: backgroundColor,
            foregroundColor: foregroundColor
        )
    }
}

extension ButtonStyle where Self == CardButtonStyle {
    /// Card-style button
    static var card: CardButtonStyle {
        CardButtonStyle()
    }
}

// MARK: - Touch Target Modifier

/// View modifier to ensure minimum touch target size
struct TouchTargetModifier: ViewModifier {
    let minimumSize: CGFloat

    func body(content: Content) -> some View {
        content
            .frame(minWidth: minimumSize, minHeight: minimumSize)
            .contentShape(Rectangle())
    }
}

extension View {
    /// Ensures view meets minimum touch target size
    func touchTarget(minimumSize: CGFloat = TouchTargetSize.recommended) -> some View {
        modifier(TouchTargetModifier(minimumSize: minimumSize))
    }
}

// MARK: - Forgiving Touch Area Modifier

/// Expands the tappable area beyond visual bounds for easier interaction
struct ForgivingTouchAreaModifier: ViewModifier {
    let extraPadding: CGFloat

    func body(content: Content) -> some View {
        content
            .contentShape(
                Rectangle()
                    .inset(by: -extraPadding)
            )
    }
}

extension View {
    /// Adds extra tappable area around the view for forgiving touch interaction
    /// Useful for small visual elements that need larger tap targets
    func forgivingTouchArea(extraPadding: CGFloat = 8) -> some View {
        modifier(ForgivingTouchAreaModifier(extraPadding: extraPadding))
    }
}

// MARK: - Haptic Feedback Utilities

/// Standardized haptic feedback for different interaction types
enum HapticFeedback {
    /// Light impact for small interactions (toggles, switches)
    static func light() {
        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
    }

    /// Medium impact for standard button presses
    static func medium() {
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
    }

    /// Heavy impact for important actions
    static func heavy() {
        let impact = UIImpactFeedbackGenerator(style: .heavy)
        impact.impactOccurred()
    }

    /// Success feedback for completed actions
    static func success() {
        let notification = UINotificationFeedbackGenerator()
        notification.notificationOccurred(.success)
    }

    /// Error feedback for failed actions
    static func error() {
        let notification = UINotificationFeedbackGenerator()
        notification.notificationOccurred(.error)
    }

    /// Warning feedback for caution states
    static func warning() {
        let notification = UINotificationFeedbackGenerator()
        notification.notificationOccurred(.warning)
    }

    /// Selection feedback for picking items
    static func selection() {
        let selection = UISelectionFeedbackGenerator()
        selection.selectionChanged()
    }
}

// MARK: - Preview

#Preview("Button Styles") {
    VStack(spacing: 32) {
        // Child-friendly buttons
        Button("Standard") {
            print("Tapped")
        }
        .buttonStyle(.childFriendly)

        Button("Large") {
            print("Tapped")
        }
        .buttonStyle(.childFriendlyLarge)

        Button("Extra Large") {
            print("Tapped")
        }
        .buttonStyle(.childFriendlyExtraLarge)

        // Icon buttons
        Button {
            print("Tapped")
        } label: {
            Image(systemName: "heart.fill")
        }
        .buttonStyle(.icon(color: .red, background: .red.opacity(0.1)))

        // Primary action
        Button("Primary Action") {
            print("Tapped")
        }
        .buttonStyle(.primaryAction())

        // Card button
        Button {
            print("Tapped")
        } label: {
            VStack {
                Image(systemName: "star.fill")
                    .font(.largeTitle)
                Text("Card Button")
                    .font(.headline)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(radius: 4)
        }
        .buttonStyle(.card)
    }
    .padding()
}

#Preview("Touch Target Compliance") {
    VStack(spacing: 24) {
        Text("Touch Target Compliance Demo")
            .font(.title2)
            .fontWeight(.bold)

        // Small visual element with forgiving touch area
        HStack(spacing: 16) {
            // Without forgiving touch area
            VStack {
                Circle()
                    .fill(Color.blue)
                    .frame(width: 24, height: 24)
                    .onTapGesture {
                        print("Tapped small circle")
                    }
                Text("24px (hard to tap)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // With forgiving touch area
            VStack {
                Circle()
                    .fill(Color.green)
                    .frame(width: 24, height: 24)
                    .forgivingTouchArea(extraPadding: 12)
                    .onTapGesture {
                        HapticFeedback.medium()
                        print("Tapped with forgiving area")
                    }
                Text("24px + forgiving area")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // With touch target modifier
            VStack {
                Circle()
                    .fill(Color.purple)
                    .frame(width: 24, height: 24)
                    .touchTarget()
                    .onTapGesture {
                        HapticFeedback.medium()
                        print("Tapped with touch target")
                    }
                Text("24px + touch target (48px)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }

        Divider()

        Text("All three circles are visually 24px, but tappable areas differ:")
            .font(.caption)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .padding(.horizontal)

        VStack(alignment: .leading, spacing: 8) {
            Label("Blue: 24px tap area (too small)", systemImage: "xmark.circle.fill")
                .foregroundStyle(.red)
            Label("Green: 48px tap area (forgiving)", systemImage: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Label("Purple: 48px tap area (standard)", systemImage: "checkmark.circle.fill")
                .foregroundStyle(.green)
        }
        .font(.caption)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    .padding()
}
