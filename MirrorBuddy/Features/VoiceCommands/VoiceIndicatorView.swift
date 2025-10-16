import SwiftUI

// MARK: - Voice Indicator View (Task 102.5)

/// Visual indicator for voice conversation states shown in navigation bar
struct VoiceIndicatorView: View {
    @ObservedObject var audioPipeline = AudioPipelineManager.shared

    enum VoiceState {
        case idle
        case listening
        case speaking
        case processing

        var color: Color {
            switch self {
            case .idle: return .gray
            case .listening: return .blue
            case .speaking: return .purple
            case .processing: return .orange
            }
        }

        var icon: String {
            switch self {
            case .idle: return "mic.slash.fill"
            case .listening: return "mic.fill"
            case .speaking: return "speaker.wave.3.fill"
            case .processing: return "waveform"
            }
        }

        var text: String {
            switch self {
            case .idle: return "Inattivo"
            case .listening: return "In ascolto"
            case .speaking: return "Parlando"
            case .processing: return "Elaborazione"
            }
        }

        var accessibilityLabel: String {
            switch self {
            case .idle: return "Coach vocale inattivo"
            case .listening: return "Coach vocale in ascolto"
            case .speaking: return "Coach vocale sta parlando"
            case .processing: return "Coach vocale in elaborazione"
            }
        }
    }

    let state: VoiceState
    let showText: Bool

    init(state: VoiceState = .idle, showText: Bool = false) {
        self.state = state
        self.showText = showText
    }

    var body: some View {
        HStack(spacing: 6) {
            // Animated indicator
            ZStack {
                // Pulsing background
                if state != .idle {
                    Circle()
                        .fill(state.color.opacity(0.2))
                        .frame(width: 28, height: 28)
                        .scaleEffect(state == .listening || state == .processing ? 1.3 : 1.0)
                        .opacity(state == .listening || state == .processing ? 0.3 : 0.6)
                        .animation(
                            state == .listening || state == .processing ?
                                Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true) :
                                .default,
                            value: state
                        )
                }

                // Icon
                Image(systemName: state.icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(state.color)
                    .frame(width: 20, height: 20)
            }

            // Optional text label
            if showText {
                Text(state.text)
                    .font(.caption)
                    .foregroundStyle(state.color)
                    .transition(.opacity.combined(with: .scale(scale: 0.8)))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(state.color.opacity(0.1))
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(state.accessibilityLabel)
        .animation(.easeInOut(duration: 0.3), value: state)
    }
}

// MARK: - Compact Voice Indicator

/// Compact version for toolbar/navigation bar
struct CompactVoiceIndicatorView: View {
    let state: VoiceIndicatorView.VoiceState

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(state.color)
                .frame(width: 8, height: 8)
                .overlay {
                    if state == .listening || state == .processing {
                        Circle()
                            .stroke(state.color, lineWidth: 2)
                            .scaleEffect(1.5)
                            .opacity(0)
                            .animation(
                                Animation.easeOut(duration: 1.0).repeatForever(autoreverses: false),
                                value: state
                            )
                    }
                }

            Image(systemName: state.icon)
                .font(.caption2)
                .foregroundStyle(state.color)
        }
        .accessibilityLabel(state.accessibilityLabel)
    }
}

// MARK: - Voice Status Bar

/// Full-width status bar for voice conversation state
struct VoiceStatusBar: View {
    let state: VoiceIndicatorView.VoiceState
    let message: String?
    let onDismiss: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            VoiceIndicatorView(state: state, showText: false)

            VStack(alignment: .leading, spacing: 2) {
                Text(state.text)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(state.color)

                if let message = message {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let onDismiss = onDismiss {
                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                        .font(.title3)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .overlay(
            Rectangle()
                .fill(state.color)
                .frame(height: 2),
            alignment: .bottom
        )
    }
}

// MARK: - View Extension for Easy Integration

extension View {
    /// Adds a voice indicator to the navigation bar
    func voiceIndicator(state: VoiceIndicatorView.VoiceState) -> some View {
        toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                CompactVoiceIndicatorView(state: state)
            }
        }
    }

    /// Adds a voice status bar at the top of the view
    func voiceStatusBar(
        state: VoiceIndicatorView.VoiceState,
        message: String? = nil,
        onDismiss: (() -> Void)? = nil
    ) -> some View {
        VStack(spacing: 0) {
            VoiceStatusBar(state: state, message: message, onDismiss: onDismiss)

            self
        }
    }
}

// MARK: - Preview

#Preview("All States") {
    VStack(spacing: 20) {
        VoiceIndicatorView(state: .idle, showText: true)
        VoiceIndicatorView(state: .listening, showText: true)
        VoiceIndicatorView(state: .speaking, showText: true)
        VoiceIndicatorView(state: .processing, showText: true)
    }
    .padding()
}

#Preview("Compact") {
    HStack(spacing: 16) {
        CompactVoiceIndicatorView(state: .idle)
        CompactVoiceIndicatorView(state: .listening)
        CompactVoiceIndicatorView(state: .speaking)
        CompactVoiceIndicatorView(state: .processing)
    }
    .padding()
}

#Preview("Status Bar") {
    VoiceStatusBar(
        state: .listening,
        message: "Pronuncia il tuo comando",
        onDismiss: {}
    )
}

#Preview("In Navigation") {
    NavigationStack {
        List {
            ForEach(0..<10) { i in
                Text("Item \(i)")
            }
        }
        .navigationTitle("Test View")
        .voiceIndicator(state: .listening)
    }
}
