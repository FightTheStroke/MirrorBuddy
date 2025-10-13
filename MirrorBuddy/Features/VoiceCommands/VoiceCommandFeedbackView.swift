import SwiftUI
import AVFoundation

// MARK: - Voice Command Feedback View (Task 29.3)

/// Visual feedback for voice command system
struct VoiceCommandFeedbackView: View {
    @ObservedObject var recognitionService = VoiceCommandRecognitionService.shared
    @ObservedObject var registry = VoiceCommandRegistry.shared

    @State private var showFeedback = false
    @State private var feedbackMessage: String?
    @State private var feedbackType: FeedbackType = .listening

    enum FeedbackType {
        case listening
        case processing
        case success
        case error

        var color: Color {
            switch self {
            case .listening: return .blue
            case .processing: return .orange
            case .success: return .green
            case .error: return .red
            }
        }

        var icon: String {
            switch self {
            case .listening: return "mic.fill"
            case .processing: return "waveform"
            case .success: return "checkmark.circle.fill"
            case .error: return "exclamationmark.triangle.fill"
            }
        }
    }

    var body: some View {
        ZStack {
            if showFeedback {
                VStack(spacing: 12) {
                    // Icon with animation
                    Image(systemName: feedbackType.icon)
                        .font(.system(size: 40))
                        .foregroundStyle(feedbackType.color)
                        .scaleEffect(feedbackType == .listening ? 1.2 : 1.0)
                        .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: feedbackType == .listening)

                    // Status text
                    if let message = feedbackMessage {
                        Text(message)
                            .font(.headline)
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.center)
                    }

                    // Recognized text
                    if !recognitionService.recognizedText.isEmpty {
                        Text("\"\(recognitionService.recognizedText)\"")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .italic()
                            .lineLimit(3)
                    }
                }
                .padding(20)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(.ultraThinMaterial)
                        .shadow(radius: 8)
                )
                .padding()
                .transition(.scale.combined(with: .opacity))
            }
        }
        .onChange(of: recognitionService.isListening) { _, isListening in
            if isListening {
                showListeningFeedback()
            }
        }
    }

    // MARK: - Feedback Methods

    func showListeningFeedback() {
        feedbackType = .listening
        feedbackMessage = "In ascolto..."
        withAnimation {
            showFeedback = true
        }
    }

    func showProcessingFeedback() {
        feedbackType = .processing
        feedbackMessage = "Elaborazione..."
        withAnimation {
            showFeedback = true
        }
        playFeedbackSound(.processing)
    }

    func showSuccessFeedback(command: String) {
        feedbackType = .success
        feedbackMessage = "Comando eseguito"
        withAnimation {
            showFeedback = true
        }
        playFeedbackSound(.success)

        // Auto-hide after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showFeedback = false
            }
        }
    }

    func showErrorFeedback(message: String) {
        feedbackType = .error
        feedbackMessage = message
        withAnimation {
            showFeedback = true
        }
        playFeedbackSound(.error)

        // Auto-hide after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation {
                showFeedback = false
            }
        }
    }

    // MARK: - Audio Feedback

    private func playFeedbackSound(_ type: FeedbackType) {
        let soundID: SystemSoundID

        switch type {
        case .success:
            soundID = 1054 // Tock
        case .error:
            soundID = 1053 // Tink
        case .processing:
            soundID = 1105 // Begin recording
        case .listening:
            soundID = 1106 // End recording
        }

        AudioServicesPlaySystemSound(soundID)
    }
}

// MARK: - Voice Command Button (Task 29.3)

/// Floating button to activate voice commands
struct VoiceCommandButton: View {
    @ObservedObject var service = VoiceCommandRecognitionService.shared
    @State private var showHelp = false

    var body: some View {
        VStack(spacing: 16) {
            Button {
                service.toggleListening()
            } label: {
                ZStack {
                    Circle()
                        .fill(service.isListening ? Color.red : Color.blue)
                        .frame(width: 60, height: 60)
                        .shadow(radius: 8)

                    if service.isListening {
                        Circle()
                            .stroke(Color.red.opacity(0.5), lineWidth: 4)
                            .frame(width: 70, height: 70)
                            .scaleEffect(1.5)
                            .opacity(0)
                            .animation(.easeOut(duration: 1).repeatForever(autoreverses: false), value: service.isListening)
                    }

                    Image(systemName: service.isListening ? "mic.fill" : "mic")
                        .font(.title)
                        .foregroundStyle(.white)
                }
            }
            .accessibilityLabel(service.isListening ? "Stop listening" : "Start listening")

            // Help button
            Button {
                showHelp = true
            } label: {
                Image(systemName: "questionmark.circle")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
            .accessibilityLabel("Show voice commands help")
        }
        .sheet(isPresented: $showHelp) {
            VoiceCommandHelpView()
        }
    }
}

// MARK: - Voice Command Help View (Task 29.3)

/// Help view showing available voice commands
struct VoiceCommandHelpView: View {
    @ObservedObject var registry = VoiceCommandRegistry.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Pronuncia uno dei comandi seguenti per navigare nell'app senza toccare lo schermo.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                ForEach(Array(groupedCommands.keys), id: \.self) { context in
                    Section(contextName(context)) {
                        ForEach(groupedCommands[context] ?? []) { command in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(command.name)
                                    .font(.headline)

                                Text(command.description)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)

                                // Show some example triggers
                                HStack {
                                    ForEach(command.triggers.prefix(3), id: \.self) { trigger in
                                        Text("\"\(trigger)\"")
                                            .font(.caption)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color.blue.opacity(0.1))
                                            .foregroundStyle(.blue)
                                            .cornerRadius(8)
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .navigationTitle("Comandi Vocali")
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

    private var groupedCommands: [VoiceCommandContext: [VoiceCommand]] {
        Dictionary(grouping: registry.availableCommands()) { $0.context }
    }

    private func contextName(_ context: VoiceCommandContext) -> String {
        switch context {
        case .global: return "Comandi Globali"
        case .materialDetail: return "Vista Materiale"
        case .studySession: return "Sessione Studio"
        case .settings: return "Impostazioni"
        case .dashboard: return "Dashboard"
        }
    }
}

// MARK: - Error Message View (Task 29.3)

/// View for displaying voice command errors
struct VoiceCommandErrorView: View {
    let message: String
    let suggestion: String?
    let onRetry: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundStyle(.orange)

            VStack(spacing: 8) {
                Text("Comando Non Riconosciuto")
                    .font(.headline)

                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                if let suggestion = suggestion {
                    Text("Suggerimento: \(suggestion)")
                        .font(.caption)
                        .foregroundStyle(.blue)
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                }
            }

            HStack(spacing: 16) {
                Button {
                    onDismiss()
                } label: {
                    Text("Annulla")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                Button {
                    onRetry()
                } label: {
                    Text("Riprova")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
        )
        .padding()
    }
}

// MARK: - Preview

#Preview("Feedback View") {
    VoiceCommandFeedbackView()
}

#Preview("Command Button") {
    VoiceCommandButton()
        .padding()
}

#Preview("Help View") {
    VoiceCommandHelpView()
}

#Preview("Error View") {
    VoiceCommandErrorView(
        message: "Non ho capito il comando 'vai alla luna'",
        suggestion: "Prova con 'vai alla home' o 'apri materiali'",
        onRetry: {},
        onDismiss: {}
    )
}
