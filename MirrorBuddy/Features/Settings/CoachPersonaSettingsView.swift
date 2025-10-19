import SwiftUI

/// Settings view for configuring coach persona and tone
struct CoachPersonaSettingsView: View {

    @StateObject private var persona = CoachPersona.shared
    @State private var selectedPersona: CoachPersona.PersonaType
    @State private var showingPreview = false

    init() {
        let currentPersona = CoachPersona.shared.currentPersona
        _selectedPersona = State(initialValue: currentPersona)
    }

    var body: some View {
        List {
            // MARK: - Persona Selection
            Section {
                ForEach(CoachPersona.PersonaType.allCases) { personaType in
                    PersonaOptionRow(
                        personaType: personaType,
                        isSelected: selectedPersona == personaType
                    ) {
                        selectedPersona = personaType
                        persona.setPersona(personaType)
                        showingPreview = true
                    }
                }
            } header: {
                Text("Coach Personality")
            } footer: {
                Text("Choose the personality style that works best for you. You can change this anytime.")
            }

            // MARK: - Current Configuration
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: selectedPersona.icon)
                            .font(.title2)
                            .foregroundStyle(.blue)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(selectedPersona.name)
                                .font(.headline)
                            Text(selectedPersona.description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        DetailRow(
                            label: "Speech Rate",
                            value: String(format: "%.0f%%", selectedPersona.speechRate * 100)
                        )
                        DetailRow(
                            label: "Energy Level",
                            value: energyLevelDescription(for: selectedPersona)
                        )
                        DetailRow(
                            label: "Formality",
                            value: formalityDescription(for: selectedPersona)
                        )
                    }
                }
                .padding(.vertical, 8)
            } header: {
                Text("Current Configuration")
            }

            // MARK: - Preview
            Section {
                Button {
                    showingPreview = true
                } label: {
                    HStack {
                        Image(systemName: "play.circle.fill")
                        Text("Preview Personality")
                        Spacer()
                    }
                }
            } header: {
                Text("Test")
            } footer: {
                Text("Hear an example of how your coach will sound with this personality.")
            }

            // MARK: - Examples
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    ExampleResponseView(
                        title: "Correct Answer",
                        response: persona.getEncouragementMessage(for: .correctAnswer)
                    )
                    Divider()
                    ExampleResponseView(
                        title: "When Confused",
                        response: persona.getConfusionResponse()
                    )
                    Divider()
                    ExampleResponseView(
                        title: "When Frustrated",
                        response: persona.getFrustrationResponse()
                    )
                }
                .padding(.vertical, 8)
            } header: {
                Text("Example Responses")
            }
        }
        .navigationTitle("Coach Personality")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingPreview) {
            PersonaPreviewView(personaType: selectedPersona)
        }
    }

    // MARK: - Helper Functions

    private func energyLevelDescription(for personaType: CoachPersona.PersonaType) -> String {
        switch personaType {
        case .playful: return "Upbeat"
        case .calm: return "Relaxed"
        case .professional: return "Moderate"
        case .enthusiastic: return "High"
        }
    }

    private func formalityDescription(for personaType: CoachPersona.PersonaType) -> String {
        switch personaType {
        case .playful: return "Casual"
        case .calm: return "Gentle"
        case .professional: return "Formal"
        case .enthusiastic: return "Friendly"
        }
    }
}

// MARK: - Supporting Views

struct PersonaOptionRow: View {
    let personaType: CoachPersona.PersonaType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // Icon
                ZStack {
                    Circle()
                        .fill(isSelected ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1))
                        .frame(width: 50, height: 50)

                    Image(systemName: personaType.icon)
                        .font(.title2)
                        .foregroundStyle(isSelected ? .blue : .secondary)
                }

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(personaType.name)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    Text(personaType.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Spacer()

                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.blue)
                }
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }
}

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
        .font(.subheadline)
    }
}

struct ExampleResponseView: View {
    let title: String
    let response: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            Text("\"\(response)\"")
                .font(.body)
                .italic()
                .foregroundStyle(.primary)
        }
    }
}

// MARK: - Preview Sheet

struct PersonaPreviewView: View {
    let personaType: CoachPersona.PersonaType
    @Environment(\.dismiss) private var dismiss
    @State private var isPlaying = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Icon
                Image(systemName: personaType.icon)
                    .font(.system(size: 80))
                    .foregroundStyle(.blue)
                    .padding(.top, 40)

                // Name and description
                VStack(spacing: 8) {
                    Text(personaType.name)
                        .font(.title)
                        .fontWeight(.bold)

                    Text(personaType.description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal)

                // Play button
                Button {
                    playPreview()
                } label: {
                    HStack {
                        Image(systemName: isPlaying ? "stop.circle.fill" : "play.circle.fill")
                            .font(.title2)
                        Text(isPlaying ? "Playing..." : "Play Sample")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal)
                .disabled(isPlaying)

                // Sample text
                VStack(alignment: .leading, spacing: 12) {
                    Text("Sample Response:")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)

                    Text(getSampleResponse())
                        .font(.body)
                        .italic()
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("Preview")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func getSampleResponse() -> String {
        CoachPersona.shared.getEncouragementMessage(for: .goodProgress)
    }

    private func playPreview() {
        isPlaying = true

        // Use AVSpeechSynthesizer to speak the sample
        let voiceConfig = CoachPersona.shared.getVoiceConfiguration()
        let utterance = AVSpeechUtterance(string: getSampleResponse())
        utterance.voice = AVSpeechSynthesisVoice(language: voiceConfig.language)
        utterance.rate = voiceConfig.rate
        utterance.pitchMultiplier = voiceConfig.pitch
        utterance.volume = voiceConfig.volume

        let synthesizer = AVSpeechSynthesizer()
        synthesizer.speak(utterance)

        // Reset after estimated duration
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            isPlaying = false
        }
    }
}

import AVFoundation

// MARK: - Preview

#Preview {
    NavigationStack {
        CoachPersonaSettingsView()
    }
}
