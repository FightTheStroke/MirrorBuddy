import SwiftUI

// MARK: - Persistent Voice Activation Button (Task 102.2)

/// A persistent 80x80pt voice activation button that floats in the bottom-right corner
/// Optimized for one-handed thumb use with proper touch target size and feedback
struct PersistentVoiceButton: View {
    @Binding var isPresented: Bool
    @State private var isPressed = false
    @State private var pulseAnimation = false

    var body: some View {
        Button {
            // Provide haptic feedback
            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
            impactFeedback.impactOccurred()

            // Toggle voice conversation
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                isPresented.toggle()
            }
        } label: {
            ZStack {
                // Pulsing ring when active
                if isPresented {
                    Circle()
                        .stroke(Color.blue.opacity(0.3), lineWidth: 4)
                        .scaleEffect(pulseAnimation ? 1.3 : 1.0)
                        .opacity(pulseAnimation ? 0 : 1)
                }

                // Main button background
                Circle()
                    .fill(
                        LinearGradient(
                            colors: isPresented ?
                                [.red, .red.opacity(0.8)] :
                                [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                    .shadow(
                        color: (isPresented ? Color.red : Color.blue).opacity(0.4),
                        radius: isPressed ? 4 : 8,
                        y: isPressed ? 2 : 4
                    )
                    .scaleEffect(isPressed ? 0.95 : 1.0)

                // Icon
                Image(systemName: isPresented ? "stop.fill" : "mic.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white)
                    .scaleEffect(isPressed ? 0.9 : 1.0)
            }
        }
        .buttonStyle(VoiceButtonStyle(isPressed: $isPressed))
        .frame(width: 88, height: 88) // Extra padding for touch target
        .accessibilityLabel(isPresented ? "Ferma conversazione vocale" : "Inizia conversazione vocale")
        .accessibilityHint("Tocca due volte per \(isPresented ? "fermare" : "iniziare") la conversazione con il coach AI")
        .accessibilityAddTraits(.isButton)
        .onAppear {
            if isPresented {
                startPulseAnimation()
            }
        }
        .onChange(of: isPresented) { _, newValue in
            if newValue {
                startPulseAnimation()
            } else {
                pulseAnimation = false
            }
        }
    }

    private func startPulseAnimation() {
        withAnimation(
            Animation
                .easeInOut(duration: 1.5)
                .repeatForever(autoreverses: false)
        ) {
            pulseAnimation = true
        }
    }
}

// MARK: - Voice Button Style

private struct VoiceButtonStyle: ButtonStyle {
    @Binding var isPressed: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .onChange(of: configuration.isPressed) { _, newValue in
                withAnimation(.easeInOut(duration: 0.1)) {
                    isPressed = newValue
                }
            }
    }
}

// MARK: - Persistent Voice Button Container

/// Container view that positions the voice button in the bottom-right corner
/// and overlays it on top of existing content
struct PersistentVoiceButtonContainer<Content: View>: View {
    @Binding var showVoiceConversation: Bool
    let content: Content

    init(
        showVoiceConversation: Binding<Bool>,
        @ViewBuilder content: () -> Content
    ) {
        self._showVoiceConversation = showVoiceConversation
        self.content = content()
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            content

            // Persistent floating button
            PersistentVoiceButton(isPresented: $showVoiceConversation)
                .padding(.trailing, 16)
                .padding(.bottom, 20)
        }
        .sheet(isPresented: $showVoiceConversation) {
            VoiceConversationView()
        }
    }
}

// MARK: - View Extension for Easy Integration

extension View {
    /// Adds a persistent voice activation button to any view
    /// - Parameter showVoiceConversation: Binding to control voice conversation presentation
    /// - Returns: View with persistent voice button overlay
    func persistentVoiceButton(showVoiceConversation: Binding<Bool>) -> some View {
        PersistentVoiceButtonContainer(
            showVoiceConversation: showVoiceConversation
        ) {
            self
        }
    }
}

// MARK: - Preview

#Preview("Voice Button - Inactive") {
    ZStack {
        Color.gray.opacity(0.1)
            .ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                PersistentVoiceButton(isPresented: .constant(false))
                    .padding()
            }
        }
    }
}

#Preview("Voice Button - Active") {
    ZStack {
        Color.gray.opacity(0.1)
            .ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                PersistentVoiceButton(isPresented: .constant(true))
                    .padding()
            }
        }
    }
}

#Preview("With Container") {
    PersistentVoiceButtonContainer(
        showVoiceConversation: .constant(false)
    ) {
        ScrollView {
            VStack(spacing: 20) {
                ForEach(0..<10) { i in
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.blue.opacity(0.2))
                        .frame(height: 100)
                        .overlay {
                            Text("Content Item \(i)")
                        }
                }
            }
            .padding()
        }
    }
}
