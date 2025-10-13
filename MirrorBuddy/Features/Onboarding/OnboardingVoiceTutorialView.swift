import SwiftUI

// MARK: - Voice Tutorial View (Task 55.1)

/// Interactive voice command tutorial
struct OnboardingVoiceTutorialView: View {
    @ObservedObject var state: OnboardingState
    @ObservedObject private var voiceService = VoiceCommandRecognitionService.shared
    @ObservedObject private var registry = VoiceCommandRegistry.shared

    @State private var currentCommandIndex = 0
    @State private var showCommandsList = false
    @State private var isListening = false

    private let tutorialCommands = [
        "vai alla home",
        "apri materiali",
        "aumenta font"
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color.orange.opacity(0.2))
                            .frame(width: 100, height: 100)

                        Image(systemName: "mic.fill")
                            .font(.system(size: 50))
                            .foregroundStyle(.orange)
                            .scaleEffect(isListening ? 1.2 : 1.0)
                            .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isListening)
                    }

                    Text("Tutorial Comandi Vocali")
                        .font(.title.bold())

                    Text("Impara a usare i comandi vocali per navigare MirrorBuddy senza toccare lo schermo")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
                .padding(.top, 32)

                // Tutorial progress
                if !state.hasCompletedVoiceTutorial {
                    VStack(spacing: 24) {
                        // Current command to try
                        VStack(spacing: 12) {
                            Text("Prova a dire:")
                                .font(.headline)
                                .foregroundStyle(.secondary)

                            Text("\"\(tutorialCommands[currentCommandIndex])\"")
                                .font(.title2.bold())
                                .foregroundStyle(.orange)
                                .padding()
                                .background(Color.orange.opacity(0.1))
                                .cornerRadius(12)
                        }

                        // Voice recognition feedback
                        if !voiceService.recognizedText.isEmpty {
                            VStack(spacing: 8) {
                                Text("Hai detto:")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)

                                Text("\"\(voiceService.recognizedText)\"")
                                    .font(.subheadline)
                                    .foregroundStyle(.blue)
                            }
                        }

                        // Listening button
                        Button {
                            toggleListening()
                        } label: {
                            HStack {
                                Image(systemName: voiceService.isListening ? "mic.fill" : "mic")
                                Text(voiceService.isListening ? "In ascolto..." : "Tocca per parlare")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(voiceService.isListening ? Color.red : Color.orange)
                            .foregroundStyle(.white)
                            .cornerRadius(12)
                        }

                        // Progress through commands
                        HStack {
                            ForEach(0..<tutorialCommands.count, id: \.self) { index in
                                Circle()
                                    .fill(index <= currentCommandIndex ? Color.orange : Color.gray.opacity(0.3))
                                    .frame(width: 10, height: 10)
                            }
                        }

                        // Next/Complete button
                        if currentCommandIndex < tutorialCommands.count {
                            Button {
                                if currentCommandIndex < tutorialCommands.count - 1 {
                                    currentCommandIndex += 1
                                } else {
                                    state.hasCompletedVoiceTutorial = true
                                }
                            } label: {
                                Text("Prossimo comando")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(.horizontal, 32)
                } else {
                    // Completed state
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 60))
                            .foregroundStyle(.green)

                        Text("Tutorial Completato!")
                            .font(.title2.bold())

                        Text("Hai imparato i comandi vocali base")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 32)
                }

                // Common commands reference
                VStack(alignment: .leading, spacing: 16) {
                    Text("Comandi Comuni")
                        .font(.headline)

                    VStack(spacing: 12) {
                        CommandExample(trigger: "vai alla home", description: "Torna alla schermata principale")
                        CommandExample(trigger: "apri materiali", description: "Vai ai materiali di studio")
                        CommandExample(trigger: "aumenta font", description: "Aumenta dimensione testo")
                        CommandExample(trigger: "leggi", description: "Avvia lettura del testo")
                        CommandExample(trigger: "aiuto", description: "Mostra tutti i comandi")
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .shadow(color: .black.opacity(0.05), radius: 8)
                .padding(.horizontal, 32)

                // View all commands button
                Button {
                    showCommandsList = true
                } label: {
                    HStack {
                        Image(systemName: "list.bullet")
                        Text("Vedi tutti i comandi")
                    }
                }
                .buttonStyle(.bordered)
                .padding(.horizontal, 32)

                Spacer(minLength: 32)
            }
        }
        .sheet(isPresented: $showCommandsList) {
            VoiceCommandHelpView()
        }
    }

    private func toggleListening() {
        if voiceService.isListening {
            voiceService.stopListening()
            isListening = false
        } else {
            do {
                try voiceService.startListening()
                isListening = true
            } catch {
                print("Failed to start listening: \(error)")
            }
        }
    }
}

// MARK: - Command Example

private struct CommandExample: View {
    let trigger: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "quote.bubble.fill")
                .foregroundStyle(.orange)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("\"\(trigger)\"")
                    .font(.subheadline.bold())

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
    }
}

// MARK: - Preview

#Preview("Tutorial") {
    OnboardingVoiceTutorialView(state: OnboardingState())
}

#Preview("Completed") {
    OnboardingVoiceTutorialView(state: {
        let state = OnboardingState()
        state.hasCompletedVoiceTutorial = true
        return state
    }())
}
