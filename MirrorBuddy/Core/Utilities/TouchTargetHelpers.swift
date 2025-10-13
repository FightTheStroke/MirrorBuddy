import SwiftUI

// MARK: - Large Touch Targets (Task 77)

/// Minimum touch target size according to Apple HIG
let minTouchTargetSize: CGFloat = 44

// MARK: - Touch Target View Modifier

struct LargeTouchTarget: ViewModifier {
    let minSize: CGFloat

    init(minSize: CGFloat = minTouchTargetSize) {
        self.minSize = minSize
    }

    func body(content: Content) -> some View {
        content
            .frame(minWidth: minSize, minHeight: minSize)
            .contentShape(Rectangle())
    }
}

extension View {
    /// Ensures this view has a minimum touch target size
    func largeTouchTarget(minSize: CGFloat = minTouchTargetSize) -> some View {
        modifier(LargeTouchTarget(minSize: minSize))
    }
}

// MARK: - Touch Feedback

struct TouchFeedback: ViewModifier {
    @State private var isPressed = false

    let scaleEffect: CGFloat
    let hapticStyle: UIImpactFeedbackGenerator.FeedbackStyle

    init(
        scaleEffect: CGFloat = 0.95,
        hapticStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light
    ) {
        self.scaleEffect = scaleEffect
        self.hapticStyle = hapticStyle
    }

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? scaleEffect : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isPressed {
                            isPressed = true
                            generateHapticFeedback()
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                    }
            )
    }

    private func generateHapticFeedback() {
        let generator = UIImpactFeedbackGenerator(style: hapticStyle)
        generator.impactOccurred()
    }
}

extension View {
    /// Adds touch feedback with scale animation and haptics
    func touchFeedback(
        scaleEffect: CGFloat = 0.95,
        hapticStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light
    ) -> some View {
        modifier(TouchFeedback(scaleEffect: scaleEffect, hapticStyle: hapticStyle))
    }
}

// MARK: - Accessible Button

struct AccessibleButton<Label: View>: View {
    let action: () -> Void
    let label: Label
    let minSize: CGFloat
    let hapticStyle: UIImpactFeedbackGenerator.FeedbackStyle

    init(
        minSize: CGFloat = minTouchTargetSize,
        hapticStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light,
        action: @escaping () -> Void,
        @ViewBuilder label: () -> Label
    ) {
        self.action = action
        self.label = label()
        self.minSize = minSize
        self.hapticStyle = hapticStyle
    }

    var body: some View {
        Button(action: action) {
            label
                .frame(minWidth: minSize, minHeight: minSize)
                .contentShape(Rectangle())
        }
        .touchFeedback(hapticStyle: hapticStyle)
    }
}

// MARK: - Touch Target Spacing

struct TouchTargetSpacing: ViewModifier {
    let spacing: CGFloat

    init(spacing: CGFloat = 8) {
        self.spacing = spacing
    }

    func body(content: Content) -> some View {
        content
            .padding(spacing / 2)
    }
}

extension View {
    /// Adds spacing around touch targets to prevent accidental taps
    func touchTargetSpacing(_ spacing: CGFloat = 8) -> some View {
        modifier(TouchTargetSpacing(spacing: spacing))
    }
}

// MARK: - Touch Target Visualization (Development Only)

struct TouchTargetOverlay: ViewModifier {
    @AppStorage("showTouchTargets") private var showTargets = false

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    if showTargets {
                        Rectangle()
                            .stroke(
                                geometry.size.width >= minTouchTargetSize &&
                                geometry.size.height >= minTouchTargetSize ?
                                Color.green : Color.red,
                                lineWidth: 2
                            )
                            .overlay(
                                Text("\(Int(geometry.size.width))×\(Int(geometry.size.height))")
                                    .font(.caption2)
                                    .foregroundStyle(.white)
                                    .padding(2)
                                    .background(Color.black.opacity(0.7))
                                    .cornerRadius(4)
                                    .padding(4),
                                alignment: .topLeading
                            )
                    }
                }
            )
    }
}

extension View {
    /// Shows touch target size overlay for development
    func touchTargetOverlay() -> some View {
        modifier(TouchTargetOverlay())
    }
}

// MARK: - Touch Target Button Styles

struct LargeTouchButtonStyle: ButtonStyle {
    let backgroundColor: Color
    let foregroundColor: Color

    init(
        backgroundColor: Color = .blue,
        foregroundColor: Color = .white
    ) {
        self.backgroundColor = backgroundColor
        self.foregroundColor = foregroundColor
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.bold())
            .foregroundStyle(foregroundColor)
            .frame(minWidth: minTouchTargetSize, minHeight: minTouchTargetSize)
            .padding(.horizontal, 16)
            .background(backgroundColor)
            .cornerRadius(12)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

struct LargeIconButtonStyle: ButtonStyle {
    let size: CGFloat

    init(size: CGFloat = minTouchTargetSize) {
        self.size = size
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.title2)
            .frame(width: size, height: size)
            .background(.ultraThinMaterial)
            .clipShape(Circle())
            .scaleEffect(configuration.isPressed ? 0.9 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// MARK: - Touch Target Developer View

struct TouchTargetDeveloperView: View {
    @AppStorage("showTouchTargets") private var showTargets = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Mostra Dimensioni Touch Target", isOn: $showTargets)
                } header: {
                    Text("Visualizzazione")
                } footer: {
                    Text("Visualizza le dimensioni dei touch target nell'app. Verde = ≥44pt, Rosso = <44pt")
                }

                Section {
                    Text("Touch Target Minimi")
                        .font(.headline)

                    VStack(alignment: .leading, spacing: 12) {
                        TouchTargetExample(
                            size: 44,
                            label: "Minimo Apple HIG",
                            description: "44×44pt - dimensione minima raccomandata"
                        )

                        TouchTargetExample(
                            size: 48,
                            label: "Raccomandato",
                            description: "48×48pt - dimensione ottimale per accessibilità"
                        )

                        TouchTargetExample(
                            size: 56,
                            label: "Grande",
                            description: "56×56pt - per azioni primarie importanti"
                        )
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Esempi")
                }

                Section {
                    VStack(spacing: 16) {
                        // Small target (bad)
                        HStack {
                            Text("Troppo Piccolo")
                                .font(.caption)
                                .foregroundStyle(.red)

                            Spacer()

                            Button("Tap") {}
                                .font(.caption)
                                .padding(4)
                                .background(Color.red.opacity(0.2))
                                .cornerRadius(4)
                                .touchTargetOverlay()
                        }

                        // Correct target (good)
                        HStack {
                            Text("Dimensione Corretta")
                                .font(.caption)
                                .foregroundStyle(.green)

                            Spacer()

                            Button("Tap") {}
                                .largeTouchTarget()
                                .background(Color.green.opacity(0.2))
                                .cornerRadius(8)
                                .touchTargetOverlay()
                        }

                        // Large target (best)
                        HStack {
                            Text("Dimensione Grande")
                                .font(.caption)
                                .foregroundStyle(.blue)

                            Spacer()

                            Button("Tap") {}
                                .largeTouchTarget(minSize: 56)
                                .background(Color.blue.opacity(0.2))
                                .cornerRadius(12)
                                .touchTargetOverlay()
                        }
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Test Live")
                }

                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        GuidelineRow(
                            icon: "hand.tap.fill",
                            text: "Usa largeTouchTarget() per elementi interattivi"
                        )

                        GuidelineRow(
                            icon: "arrow.up.and.down.and.arrow.left.and.right",
                            text: "Minimo 44×44pt per tutti i controlli"
                        )

                        GuidelineRow(
                            icon: "square.split.2x2",
                            text: "Aggiungi spaziatura tra target adiacenti"
                        )

                        GuidelineRow(
                            icon: "hand.point.up.left.fill",
                            text: "Usa touchFeedback() per feedback visivo e aptico"
                        )
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Linee Guida")
                }
            }
            .navigationTitle("Touch Target Developer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Chiudi") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct TouchTargetExample: View {
    let size: CGFloat
    let label: String
    let description: String

    var body: some View {
        HStack(spacing: 16) {
            Rectangle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: size, height: size)
                .overlay(
                    Text("\(Int(size))pt")
                        .font(.caption2)
                        .foregroundStyle(.blue)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.subheadline.bold())

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct GuidelineRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.blue)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)
        }
    }
}

// MARK: - Preview

#Preview {
    TouchTargetDeveloperView()
}
