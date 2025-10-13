import SwiftUI
import Combine

// MARK: - One-Handed Optimization (Task 76)

/// Manager for one-handed UI optimization settings
@MainActor
final class OneHandedManager: ObservableObject {
    static let shared = OneHandedManager()

    @Published var isEnabled: Bool {
        didSet {
            UserDefaults.standard.set(isEnabled, forKey: "oneHandedMode")
        }
    }

    @Published var handPreference: HandPreference {
        didSet {
            UserDefaults.standard.set(handPreference.rawValue, forKey: "handPreference")
        }
    }

    @Published var reachabilityMode: Bool {
        didSet {
            UserDefaults.standard.set(reachabilityMode, forKey: "reachabilityMode")
        }
    }

    enum HandPreference: String, CaseIterable, Identifiable {
        case right = "right"
        case left = "left"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .right: return "Destra"
            case .left: return "Sinistra"
            }
        }

        var icon: String {
            switch self {
            case .right: return "hand.point.right.fill"
            case .left: return "hand.point.left.fill"
            }
        }
    }

    private init() {
        self.isEnabled = UserDefaults.standard.bool(forKey: "oneHandedMode")

        if let savedPreference = UserDefaults.standard.string(forKey: "handPreference"),
           let preference = HandPreference(rawValue: savedPreference) {
            self.handPreference = preference
        } else {
            self.handPreference = .right
        }

        self.reachabilityMode = UserDefaults.standard.bool(forKey: "reachabilityMode")
    }
}

// MARK: - One-Handed View Modifier

struct OneHandedOptimized: ViewModifier {
    @ObservedObject var manager = OneHandedManager.shared

    let alignment: Alignment
    let spacing: CGFloat

    init(alignment: Alignment = .bottomTrailing, spacing: CGFloat = 16) {
        self.alignment = alignment
        self.spacing = spacing
    }

    func body(content: Content) -> some View {
        if manager.isEnabled {
            ZStack(alignment: alignment) {
                content
                    .padding(.bottom, manager.reachabilityMode ? 80 : 0)
            }
        } else {
            content
        }
    }
}

extension View {
    func oneHandedOptimized(alignment: Alignment = .bottomTrailing, spacing: CGFloat = 16) -> some View {
        modifier(OneHandedOptimized(alignment: alignment, spacing: spacing))
    }
}

// MARK: - Floating Action Button

struct FloatingActionButton: View {
    let icon: String
    let action: () -> Void
    let color: Color

    @ObservedObject var manager = OneHandedManager.shared

    init(icon: String, color: Color = .blue, action: @escaping () -> Void) {
        self.icon = icon
        self.color = color
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(color)
                .clipShape(Circle())
                .shadow(color: color.opacity(0.3), radius: 8, x: 0, y: 4)
        }
        .offset(x: offsetX, y: offsetY)
    }

    private var offsetX: CGFloat {
        guard manager.isEnabled else { return 0 }
        return manager.handPreference == .right ? -20 : 20
    }

    private var offsetY: CGFloat {
        guard manager.isEnabled else { return 0 }
        return manager.reachabilityMode ? -100 : -20
    }
}

// MARK: - Thumb-Friendly Navigation

struct ThumbFriendlyNavigation<Content: View>: View {
    @ObservedObject var manager = OneHandedManager.shared
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(spacing: 0) {
            if manager.isEnabled && manager.reachabilityMode {
                // Top spacer to push content down
                Spacer()
                    .frame(height: 120)
            }

            content

            if manager.isEnabled {
                // Bottom padding for thumb reach
                Spacer()
                    .frame(height: 80)
            }
        }
    }
}

// MARK: - Swipe Gesture Helper

struct SwipeGestureModifier: ViewModifier {
    let onSwipeLeft: (() -> Void)?
    let onSwipeRight: (() -> Void)?
    let onSwipeUp: (() -> Void)?
    let onSwipeDown: (() -> Void)?

    @State private var dragOffset: CGSize = .zero

    func body(content: Content) -> some View {
        content
            .gesture(
                DragGesture(minimumDistance: 30)
                    .onChanged { value in
                        dragOffset = value.translation
                    }
                    .onEnded { value in
                        let horizontalAmount = value.translation.width
                        let verticalAmount = value.translation.height

                        if abs(horizontalAmount) > abs(verticalAmount) {
                            // Horizontal swipe
                            if horizontalAmount < 0 {
                                onSwipeLeft?()
                            } else {
                                onSwipeRight?()
                            }
                        } else {
                            // Vertical swipe
                            if verticalAmount < 0 {
                                onSwipeUp?()
                            } else {
                                onSwipeDown?()
                            }
                        }

                        dragOffset = .zero
                    }
            )
    }
}

extension View {
    func onSwipe(
        left: (() -> Void)? = nil,
        right: (() -> Void)? = nil,
        up: (() -> Void)? = nil,
        down: (() -> Void)? = nil
    ) -> some View {
        modifier(SwipeGestureModifier(
            onSwipeLeft: left,
            onSwipeRight: right,
            onSwipeUp: up,
            onSwipeDown: down
        ))
    }
}

// MARK: - Reachability Indicator

struct ReachabilityIndicator: View {
    @ObservedObject var manager = OneHandedManager.shared

    var body: some View {
        if manager.isEnabled && manager.reachabilityMode {
            VStack {
                HStack {
                    if manager.handPreference == .right {
                        Spacer()
                    }

                    VStack(spacing: 4) {
                        Image(systemName: manager.handPreference.icon)
                            .font(.caption)

                        Text("Modalità una mano")
                            .font(.caption2)
                    }
                    .padding(8)
                    .background(.ultraThinMaterial)
                    .cornerRadius(8)
                    .shadow(radius: 2)

                    if manager.handPreference == .left {
                        Spacer()
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)

                Spacer()
            }
        }
    }
}

// MARK: - Thumb Zone Overlay (for development/testing)

struct ThumbZoneOverlay: View {
    @ObservedObject var manager = OneHandedManager.shared
    @State private var showOverlay = false

    var body: some View {
        if showOverlay {
            GeometryReader { geometry in
                ZStack {
                    // Easy reach zone (green)
                    Path { path in
                        let width = geometry.size.width
                        let height = geometry.size.height

                        if manager.handPreference == .right {
                            path.move(to: CGPoint(x: width * 0.5, y: height))
                            path.addLine(to: CGPoint(x: width, y: height))
                            path.addLine(to: CGPoint(x: width, y: height * 0.4))
                            path.addLine(to: CGPoint(x: width * 0.7, y: height * 0.6))
                            path.closeSubpath()
                        } else {
                            path.move(to: CGPoint(x: width * 0.5, y: height))
                            path.addLine(to: CGPoint(x: 0, y: height))
                            path.addLine(to: CGPoint(x: 0, y: height * 0.4))
                            path.addLine(to: CGPoint(x: width * 0.3, y: height * 0.6))
                            path.closeSubpath()
                        }
                    }
                    .fill(Color.green.opacity(0.2))

                    // Medium reach zone (yellow)
                    Path { path in
                        let width = geometry.size.width
                        let height = geometry.size.height

                        if manager.handPreference == .right {
                            path.move(to: CGPoint(x: width * 0.3, y: height))
                            path.addLine(to: CGPoint(x: width * 0.5, y: height))
                            path.addLine(to: CGPoint(x: width * 0.7, y: height * 0.6))
                            path.addLine(to: CGPoint(x: width * 0.5, y: height * 0.3))
                            path.closeSubpath()
                        } else {
                            path.move(to: CGPoint(x: width * 0.7, y: height))
                            path.addLine(to: CGPoint(x: width * 0.5, y: height))
                            path.addLine(to: CGPoint(x: width * 0.3, y: height * 0.6))
                            path.addLine(to: CGPoint(x: width * 0.5, y: height * 0.3))
                            path.closeSubpath()
                        }
                    }
                    .fill(Color.yellow.opacity(0.2))

                    // Hard to reach zone (red)
                    Rectangle()
                        .fill(Color.red.opacity(0.1))
                        .frame(height: geometry.size.height * 0.3)
                        .frame(maxHeight: .infinity, alignment: .top)
                }
            }
            .allowsHitTesting(false)
        }
    }
}

// MARK: - One-Handed Settings View

struct OneHandedSettingsView: View {
    @ObservedObject var manager = OneHandedManager.shared
    @Environment(\.dismiss) private var dismiss

    @State private var showThumbZone = false

    var body: some View {
        NavigationStack {
            ZStack {
                Form {
                    Section {
                        Toggle("Abilita Modalità Una Mano", isOn: $manager.isEnabled)
                    } footer: {
                        Text("Ottimizza l'interfaccia per l'uso con una sola mano")
                    }

                    if manager.isEnabled {
                        Section {
                            Picker("Mano Preferita", selection: $manager.handPreference) {
                                ForEach(OneHandedManager.HandPreference.allCases) { preference in
                                    HStack {
                                        Image(systemName: preference.icon)
                                        Text(preference.displayName)
                                    }
                                    .tag(preference)
                                }
                            }
                            .pickerStyle(.inline)
                        } header: {
                            Text("Preferenza Mano")
                        }

                        Section {
                            Toggle("Modalità Raggiungibilità", isOn: $manager.reachabilityMode)
                        } header: {
                            Text("Raggiungibilità")
                        } footer: {
                            Text("Sposta i controlli nella zona facilmente raggiungibile dal pollice")
                        }

                        Section {
                            Toggle("Mostra Zone Pollice", isOn: $showThumbZone)
                        } header: {
                            Text("Sviluppo")
                        } footer: {
                            Text("Visualizza overlay delle zone di raggiungibilità del pollice")
                        }
                    }

                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            OneHandedFeatureRow(
                                icon: "hand.tap.fill",
                                title: "Gesti di Scorrimento",
                                description: "Scorri per navigare rapidamente"
                            )

                            OneHandedFeatureRow(
                                icon: "arrow.up.circle.fill",
                                title: "Pulsanti Flottanti",
                                description: "Azioni rapide sempre a portata di mano"
                            )

                            OneHandedFeatureRow(
                                icon: "arrow.down.to.line",
                                title: "Controlli in Basso",
                                description: "Elementi importanti nella zona del pollice"
                            )
                        }
                        .padding(.vertical, 8)
                    } header: {
                        Text("Funzionalità")
                    }
                }

                if showThumbZone {
                    ThumbZoneOverlay()
                }
            }
            .navigationTitle("Uso con Una Mano")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fine") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct OneHandedFeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    OneHandedSettingsView()
}
