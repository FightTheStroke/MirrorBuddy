import AVFoundation
import SwiftUI

/// TTS settings view for voice selection and configuration (Task 73.2)
struct TTSSettingsView: View {
    @ObservedObject var ttsService = TextToSpeechService.shared
    @Environment(\.dismiss) private var dismiss

    @AppStorage("ttsVoiceIdentifier") private var savedVoiceIdentifier: String = ""
    @AppStorage("ttsRate") private var savedRate = Double(AVSpeechUtteranceDefaultSpeechRate)
    @AppStorage("ttsPitch") private var savedPitch: Double = 1.0
    @AppStorage("ttsVolume") private var savedVolume: Double = 1.0

    @State private var selectedVoice: AVSpeechSynthesisVoice?
    @State private var rate: Float = AVSpeechUtteranceDefaultSpeechRate
    @State private var pitch: Float = 1.0
    @State private var volume: Float = 1.0

    @State private var isPlayingPreview = false
    @State private var languageFilter: String?

    let previewText = "Questa è un'anteprima della voce selezionata. Il testo verrà letto con le impostazioni scelte."

    var body: some View {
        NavigationStack {
            Form {
                // Voice selection section
                Section {
                    voicePickerSection
                } header: {
                    Text("Selezione Voce")
                } footer: {
                    Text("Seleziona una voce dal tuo dispositivo. Le voci possono essere scaricate dalle Impostazioni di sistema.")
                }

                // Speech parameters section
                Section {
                    // Rate slider
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Velocità")
                            Spacer()
                            Text("\(Int(rate * 100))%")
                                .foregroundStyle(.secondary)
                        }

                        HStack {
                            Image(systemName: "tortoise.fill")
                                .foregroundStyle(.secondary)
                            Slider(value: $rate, in: AVSpeechUtteranceMinimumSpeechRate...AVSpeechUtteranceMaximumSpeechRate)
                            Image(systemName: "hare.fill")
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Pitch slider
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Tonalità")
                            Spacer()
                            Text("\(String(format: "%.1f", pitch))")
                                .foregroundStyle(.secondary)
                        }

                        HStack {
                            Image(systemName: "arrow.down")
                                .foregroundStyle(.secondary)
                            Slider(value: $pitch, in: 0.5...2.0)
                            Image(systemName: "arrow.up")
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Volume slider
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Volume")
                            Spacer()
                            Text("\(Int(volume * 100))%")
                                .foregroundStyle(.secondary)
                        }

                        HStack {
                            Image(systemName: "speaker.fill")
                                .foregroundStyle(.secondary)
                            Slider(value: $volume, in: 0.0...1.0)
                            Image(systemName: "speaker.wave.3.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Text("Parametri Vocali")
                }

                // Preview section
                Section {
                    Button {
                        playPreview()
                    } label: {
                        HStack {
                            Image(systemName: isPlayingPreview ? "stop.circle.fill" : "play.circle.fill")
                            Text(isPlayingPreview ? "Interrompi Anteprima" : "Ascolta Anteprima")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(selectedVoice == nil)
                } header: {
                    Text("Anteprima")
                } footer: {
                    Text("Ascolta come suonerà la voce con le impostazioni correnti.")
                }

                // Reset section
                Section {
                    Button(role: .destructive) {
                        resetToDefaults()
                    } label: {
                        HStack {
                            Image(systemName: "arrow.counterclockwise")
                            Text("Ripristina Predefiniti")
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle("Impostazioni Voce")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Salva") {
                        saveSettings()
                        dismiss()
                    }
                }
            }
            .onAppear {
                loadSettings()
            }
        }
    }

    // MARK: - Voice Picker Section

    @ViewBuilder
    private var voicePickerSection: some View {
        // Language filter
        Picker("Lingua", selection: $languageFilter) {
            Text("Tutte le lingue").tag(String?.none)
            Text("Italiano").tag(String?.some("it"))
            Text("English").tag(String?.some("en"))
            Text("Español").tag(String?.some("es"))
            Text("Français").tag(String?.some("fr"))
            Text("Deutsch").tag(String?.some("de"))
        }

        // Voice list
        let availableVoices = getFilteredVoices()
        ForEach(availableVoices, id: \.identifier) { voice in
            Button {
                selectedVoice = voice
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(voice.name)
                            .font(.body)
                            .foregroundStyle(.primary)

                        Text(voiceLanguageName(voice.language))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if selectedVoice?.identifier == voice.identifier {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.blue)
                    }
                }
            }
        }

        if availableVoices.isEmpty {
            Text("Nessuna voce disponibile per questa lingua")
                .foregroundStyle(.secondary)
                .italic()
        }
    }

    // MARK: - Actions

    private func getFilteredVoices() -> [AVSpeechSynthesisVoice] {
        let allVoices = AVSpeechSynthesisVoice.speechVoices()

        if let filter = languageFilter {
            return allVoices.filter { $0.language.hasPrefix(filter) }
        }

        return allVoices
    }

    private func voiceLanguageName(_ code: String) -> String {
        let locale = Locale(identifier: code)
        return locale.localizedString(forLanguageCode: code) ?? code
    }

    private func loadSettings() {
        // Load saved voice
        if !savedVoiceIdentifier.isEmpty {
            selectedVoice = AVSpeechSynthesisVoice(identifier: savedVoiceIdentifier)
        } else {
            // Default to Italian voice
            selectedVoice = AVSpeechSynthesisVoice(language: "it-IT")
        }

        // Load parameters
        rate = Float(savedRate)
        pitch = Float(savedPitch)
        volume = Float(savedVolume)
    }

    private func saveSettings() {
        // Save voice
        if let voice = selectedVoice {
            savedVoiceIdentifier = voice.identifier
            ttsService.selectedVoice = voice
        }

        // Save parameters
        savedRate = Double(rate)
        savedPitch = Double(pitch)
        savedVolume = Double(volume)

        ttsService.rate = rate
        ttsService.pitch = pitch
        ttsService.volume = volume
    }

    private func resetToDefaults() {
        selectedVoice = AVSpeechSynthesisVoice(language: "it-IT")
        rate = AVSpeechUtteranceDefaultSpeechRate
        pitch = 1.0
        volume = 1.0
    }

    private func playPreview() {
        if isPlayingPreview {
            ttsService.stop()
            isPlayingPreview = false
        } else {
            // Apply current settings temporarily
            let originalVoice = ttsService.selectedVoice
            let originalRate = ttsService.rate
            let originalPitch = ttsService.pitch
            let originalVolume = ttsService.volume

            ttsService.selectedVoice = selectedVoice
            ttsService.rate = rate
            ttsService.pitch = pitch
            ttsService.volume = volume

            isPlayingPreview = true

            // Set up completion callback
            ttsService.onSpeechFinished = { [weak ttsService] in
                // Restore original settings
                ttsService?.selectedVoice = originalVoice
                ttsService?.rate = originalRate
                ttsService?.pitch = originalPitch
                ttsService?.volume = originalVolume

                isPlayingPreview = false
            }

            ttsService.speak(previewText)
        }
    }
}

#Preview {
    TTSSettingsView()
}
