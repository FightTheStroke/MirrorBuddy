//
//  SmartVoiceButton.swift
//  MirrorBuddy
//
//  Task 139.3: Smart voice button with unified command + conversation
//  Replaces separate VoiceCommandButton and PersistentVoiceButton
//

import SwiftUI

/// Smart voice button with unified command and conversation detection
struct SmartVoiceButton: View {
    @StateObject private var voiceManager = UnifiedVoiceManager.shared
    @State private var showConversation = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var conversationText = ""
    @State private var isPressed = false
    @State private var pulseAnimation = false
    @State private var showFirstTimeHint = false

    @AppStorage("hasSeenVoiceHint") private var hasSeenVoiceHint = false

    var body: some View {
        Button {
            handleVoiceButtonTap()
        } label: {
            ZStack {
                // Pulsing ring when listening
                if voiceManager.isListening {
                    Circle()
                        .stroke(Color.blue.opacity(0.3), lineWidth: 4)
                        .scaleEffect(pulseAnimation ? 1.3 : 1.0)
                        .opacity(pulseAnimation ? 0 : 1)
                        .animation(.easeOut(duration: 1).repeatForever(autoreverses: false), value: pulseAnimation)
                }

                // Main button - 80x80pt circle
                Circle()
                    .fill(
                        LinearGradient(
                            colors: voiceManager.isListening ? [.red, .red.opacity(0.8)] : [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                    .shadow(
                        color: (voiceManager.isListening ? Color.red : Color.blue).opacity(0.4),
                        radius: isPressed ? 4 : 8,
                        y: isPressed ? 2 : 4
                    )

                // Icon switches between mic.fill and stop.fill
                Image(systemName: voiceManager.isListening ? "stop.fill" : "mic.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: 88, height: 88) // Extra padding for touch target
        .accessibilityLabel(voiceManager.isListening ? "Ferma ascolto" : "Inizia ascolto")
        .accessibilityHint("Doppio tocco per parlare con MirrorBuddy")
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        .onAppear {
            checkFirstTimeHint()
        }
        .overlay(alignment: .topTrailing) {
            if showFirstTimeHint {
                VoiceButtonHintTooltip {
                    withAnimation {
                        showFirstTimeHint = false
                        hasSeenVoiceHint = true
                    }
                }
                .transition(.scale.combined(with: .opacity))
            }
        }
        .sheet(isPresented: $showConversation) {
            NavigationStack {
                VoiceConversationView()
            }
        }
        .alert("Comando Non Riconosciuto", isPresented: $showError) {
            Button("Annulla", role: .cancel) {
                showError = false
            }
            Button("Continua Conversazione") {
                showError = false
                conversationText = voiceManager.recognizedText
                showConversation = true
            }
        } message: {
            Text(errorMessage)
        }
        .onChange(of: voiceManager.isListening) { _, isListening in
            pulseAnimation = isListening
        }
    }

    // MARK: - Actions

    private func handleVoiceButtonTap() {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        // Visual feedback
        withAnimation(.spring(response: 0.2)) {
            isPressed = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.spring(response: 0.2)) {
                isPressed = false
            }
        }

        // Dismiss hint if showing
        if showFirstTimeHint {
            withAnimation {
                showFirstTimeHint = false
                hasSeenVoiceHint = true
            }
        }

        // Handle listening state
        if voiceManager.isListening {
            voiceManager.stopListening()
        } else {
            startListening()
        }
    }

    private func startListening() {
        voiceManager.startListening { result in
            handleVoiceResult(result)
        }
    }

    private func handleVoiceResult(_ result: VoiceResult) {
        switch result {
        case .command(let commandResult):
            // VoiceCommandFeedbackView automatically shows feedback
            // Command already executed by UnifiedVoiceManager
            handleCommandResult(commandResult)

        case .conversation(let text):
            // Open VoiceConversationView with recognized text
            conversationText = text
            showConversation = true

        case .error(let message):
            // Show error with option to continue as conversation
            errorMessage = message
            showError = true
        }
    }

    private func handleCommandResult(_ result: VoiceCommandResult) {
        switch result {
        case .success:
            // VoiceCommandFeedbackView shows success automatically
            break

        case .failed(let error):
            // Show error
            errorMessage = "Errore: \(error.localizedDescription)"
            showError = true
        }
    }

    private func checkFirstTimeHint() {
        // Show hint only once, after a short delay
        guard !hasSeenVoiceHint else { return }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            withAnimation {
                showFirstTimeHint = true
            }
        }

        // Auto-dismiss after 10 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 11.0) {
            withAnimation {
                showFirstTimeHint = false
                hasSeenVoiceHint = true
            }
        }
    }
}

// MARK: - First-Time Hint Tooltip

struct VoiceButtonHintTooltip: View {
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: "hand.wave.fill")
                    .font(.title2)
                    .foregroundStyle(.yellow)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Tocca per parlare!")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text("Posso aiutarti con i compiti, navigare l'app, e molto altro.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.ultraThinMaterial)
                    .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
            )

            // Arrow pointing to button
            Image(systemName: "arrowtriangle.down.fill")
                .font(.title)
                .foregroundStyle(.blue)
                .offset(x: -40, y: -4)
        }
        .offset(y: -100)
        .padding(.trailing, 8)
    }
}

// MARK: - Preview

#Preview("Smart Voice Button") {
    ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                SmartVoiceButton()
                    .padding()
            }
        }
    }
}

#Preview("Voice Button with Hint") {
    ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                SmartVoiceButton()
                    .padding()
                    .onAppear {
                        // Force show hint for preview
                        UserDefaults.standard.set(false, forKey: "hasSeenVoiceHint")
                    }
            }
        }
    }
}
