import AVFoundation
import Combine
import SwiftUI

// MARK: - Voice Settings View (Task 102.4)

/// Settings panel for voice conversation preferences
struct VoiceSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var settings = VoiceSettings.shared

    var body: some View {
        NavigationStack {
            Form {
                // MARK: - Microphone Settings
                Section {
                    Picker("Microfono", selection: $settings.selectedMicrophoneID) {
                        Text("Predefinito").tag(nil as String?)

                        ForEach(Array(settings.availableMicrophones.enumerated()), id: \.offset) { _, device in
                            Text(device.portName).tag(device.uid as String?)
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Sensibilità Microfono")
                            .font(.subheadline)

                        HStack {
                            Image(systemName: "mic.fill")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Slider(
                                value: $settings.microphoneSensitivity,
                                in: 0.0...1.0,
                                step: 0.1
                            )

                            Text("\(Int(settings.microphoneSensitivity * 100))%")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.secondary)
                                .frame(width: 40, alignment: .trailing)
                        }

                        Text("Regola la sensibilità del microfono per ridurre i rumori di fondo")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Label("Audio Input", systemImage: "mic.fill")
                } footer: {
                    Text("Seleziona il microfono da utilizzare per le conversazioni vocali")
                }

                // MARK: - Voice Response Settings
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Velocità Voce")
                            .font(.subheadline)

                        HStack {
                            Text("0.8×")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Slider(
                                value: $settings.voiceSpeed,
                                in: 0.8...1.5,
                                step: 0.1
                            )

                            Text("1.5×")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Text("\(String(format: "%.1f", settings.voiceSpeed))×")
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(.blue)
                                .frame(width: 45, alignment: .trailing)
                        }

                        // Preview button
                        Button {
                            settings.playVoicePreview()
                        } label: {
                            HStack {
                                Image(systemName: "play.circle.fill")
                                Text("Anteprima")
                            }
                            .font(.caption)
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.vertical, 4)

                    Picker("Qualità Audio", selection: $settings.audioQuality) {
                        Text("Bassa (risparmio dati)").tag(AudioQuality.low)
                        Text("Media").tag(AudioQuality.medium)
                        Text("Alta (consigliata)").tag(AudioQuality.high)
                    }
                } header: {
                    Label("Risposta Vocale", systemImage: "speaker.wave.3.fill")
                } footer: {
                    Text("Regola la velocità e la qualità della voce del coach AI")
                }

                // MARK: - Conversation Behavior
                Section {
                    Toggle("Conferma Comandi Vocali", isOn: $settings.confirmVoiceCommands)

                    Toggle("Feedback Aptici", isOn: $settings.enableHaptics)

                    Toggle("Suoni di Sistema", isOn: $settings.enableSystemSounds)

                    Picker("Pausa Automatica Dopo", selection: $settings.autoPauseDuration) {
                        Text("Mai").tag(nil as TimeInterval?)
                        Text("30 secondi").tag(30.0 as TimeInterval?)
                        Text("1 minuto").tag(60.0 as TimeInterval?)
                        Text("2 minuti").tag(120.0 as TimeInterval?)
                        Text("5 minuti").tag(300.0 as TimeInterval?)
                    }
                } header: {
                    Label("Comportamento", systemImage: "gearshape.fill")
                } footer: {
                    Text("Personalizza il comportamento delle conversazioni vocali")
                }

                // MARK: - Accessibility
                Section {
                    Toggle("Riduzione Trasparenze", isOn: $settings.reduceTransparency)

                    Toggle("Aumenta Contrasto", isOn: $settings.increaseContrast)

                    Picker("Dimensione Testo", selection: $settings.textSizeMultiplier) {
                        Text("Normale").tag(1.0)
                        Text("Grande").tag(1.2)
                        Text("Molto Grande").tag(1.4)
                        Text("Extra Grande").tag(1.6)
                    }
                } header: {
                    Label("Accessibilità", systemImage: "accessibility")
                } footer: {
                    Text("Regolazioni per migliorare l'accessibilità")
                }

                // MARK: - Advanced
                Section {
                    Toggle("Modalità Debug", isOn: $settings.debugMode)

                    if settings.debugMode {
                        Button("Mostra Log Audio") {
                            settings.showAudioLogs()
                        }

                        Button("Test Connessione OpenAI") {
                            settings.testOpenAIConnection()
                        }
                    }
                } header: {
                    Label("Avanzate", systemImage: "wrench.and.screwdriver.fill")
                }

                // MARK: - Reset
                Section {
                    Button(role: .destructive) {
                        settings.resetToDefaults()
                    } label: {
                        HStack {
                            Spacer()
                            Text("Ripristina Impostazioni Predefinite")
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Impostazioni Voce")
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

// MARK: - Audio Quality Enum

enum AudioQuality: String, CaseIterable, Identifiable {
    case low = "low"
    case medium = "medium"
    case high = "high"

    var id: String { rawValue }

    var sampleRate: Double {
        switch self {
        case .low: return 16_000
        case .medium: return 24_000
        case .high: return 48_000
        }
    }
}

// MARK: - Voice Settings Manager (Task 102.4)

@MainActor
final class VoiceSettings: ObservableObject {
    static let shared = VoiceSettings()

    // MARK: - Published Settings

    @Published var selectedMicrophoneID: String? {
        didSet { UserDefaults.standard.set(selectedMicrophoneID, forKey: "voiceSettings.microphoneID") }
    }

    @Published var microphoneSensitivity: Double = 0.7 {
        didSet { UserDefaults.standard.set(microphoneSensitivity, forKey: "voiceSettings.sensitivity") }
    }

    @Published var voiceSpeed: Double = 1.0 {
        didSet { UserDefaults.standard.set(voiceSpeed, forKey: "voiceSettings.speed") }
    }

    @Published var audioQuality: AudioQuality = .high {
        didSet { UserDefaults.standard.set(audioQuality.rawValue, forKey: "voiceSettings.quality") }
    }

    @Published var confirmVoiceCommands: Bool = true {
        didSet { UserDefaults.standard.set(confirmVoiceCommands, forKey: "voiceSettings.confirmCommands") }
    }

    @Published var enableHaptics: Bool = true {
        didSet { UserDefaults.standard.set(enableHaptics, forKey: "voiceSettings.haptics") }
    }

    @Published var enableSystemSounds: Bool = true {
        didSet { UserDefaults.standard.set(enableSystemSounds, forKey: "voiceSettings.systemSounds") }
    }

    @Published var autoPauseDuration: TimeInterval? = 120.0 {
        didSet {
            if let duration = autoPauseDuration {
                UserDefaults.standard.set(duration, forKey: "voiceSettings.autoPauseDuration")
            } else {
                UserDefaults.standard.removeObject(forKey: "voiceSettings.autoPauseDuration")
            }
        }
    }

    @Published var reduceTransparency: Bool = false {
        didSet { UserDefaults.standard.set(reduceTransparency, forKey: "voiceSettings.reduceTransparency") }
    }

    @Published var increaseContrast: Bool = false {
        didSet { UserDefaults.standard.set(increaseContrast, forKey: "voiceSettings.increaseContrast") }
    }

    @Published var textSizeMultiplier: Double = 1.0 {
        didSet { UserDefaults.standard.set(textSizeMultiplier, forKey: "voiceSettings.textSize") }
    }

    @Published var debugMode: Bool = false {
        didSet { UserDefaults.standard.set(debugMode, forKey: "voiceSettings.debugMode") }
    }

    // MARK: - Available Microphones

    @Published var availableMicrophones: [AVAudioSessionPortDescription] = []

    // MARK: - Initialization

    private init() {
        loadSettings()
        loadAvailableMicrophones()

        // Listen for audio route changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(audioRouteChanged),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }

    // MARK: - Load Settings

    private func loadSettings() {
        let defaults = UserDefaults.standard

        selectedMicrophoneID = defaults.string(forKey: "voiceSettings.microphoneID")
        microphoneSensitivity = defaults.object(forKey: "voiceSettings.sensitivity") as? Double ?? 0.7
        voiceSpeed = defaults.object(forKey: "voiceSettings.speed") as? Double ?? 1.0

        if let qualityRaw = defaults.string(forKey: "voiceSettings.quality"),
           let quality = AudioQuality(rawValue: qualityRaw) {
            audioQuality = quality
        }

        confirmVoiceCommands = defaults.object(forKey: "voiceSettings.confirmCommands") as? Bool ?? true
        enableHaptics = defaults.object(forKey: "voiceSettings.haptics") as? Bool ?? true
        enableSystemSounds = defaults.object(forKey: "voiceSettings.systemSounds") as? Bool ?? true

        if defaults.object(forKey: "voiceSettings.autoPauseDuration") != nil {
            autoPauseDuration = defaults.double(forKey: "voiceSettings.autoPauseDuration")
        }

        reduceTransparency = defaults.bool(forKey: "voiceSettings.reduceTransparency")
        increaseContrast = defaults.bool(forKey: "voiceSettings.increaseContrast")
        textSizeMultiplier = defaults.object(forKey: "voiceSettings.textSize") as? Double ?? 1.0
        debugMode = defaults.bool(forKey: "voiceSettings.debugMode")
    }

    // MARK: - Audio Device Management

    private func loadAvailableMicrophones() {
        let audioSession = AVAudioSession.sharedInstance()

        // Get all available inputs
        availableMicrophones = audioSession.availableInputs ?? []
    }

    @objc private func audioRouteChanged(notification: Notification) {
        loadAvailableMicrophones()
    }

    func setMicrophone(uid: String?) {
        guard let uid = uid else {
            // Use default microphone
            selectedMicrophoneID = nil
            return
        }

        let audioSession = AVAudioSession.sharedInstance()

        // Find the port with matching UID
        if let input = audioSession.availableInputs?.first(where: { $0.uid == uid }) {
            do {
                try audioSession.setPreferredInput(input)
                selectedMicrophoneID = uid
            } catch {
                print("Failed to set preferred input: \(error)")
            }
        }
    }

    // MARK: - Preview & Testing

    func playVoicePreview() {
        // TODO: Play a sample voice response with current settings
        let synthesizer = AVSpeechSynthesizer()
        let utterance = AVSpeechUtterance(string: "Ciao! Questa è un'anteprima della velocità della voce.")
        utterance.rate = Float(voiceSpeed - 0.5) // AVSpeechUtterance uses 0.0-1.0 scale
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")

        synthesizer.speak(utterance)
    }

    func showAudioLogs() {
        // TODO: Show audio debug logs
        print("Debug: Audio logs requested")
    }

    func testOpenAIConnection() {
        // TODO: Test OpenAI Realtime API connection
        print("Debug: Testing OpenAI connection...")
    }

    // MARK: - Reset

    func resetToDefaults() {
        selectedMicrophoneID = nil
        microphoneSensitivity = 0.7
        voiceSpeed = 1.0
        audioQuality = .high
        confirmVoiceCommands = true
        enableHaptics = true
        enableSystemSounds = true
        autoPauseDuration = 120.0
        reduceTransparency = false
        increaseContrast = false
        textSizeMultiplier = 1.0
        debugMode = false
    }
}

// MARK: - Preview

#Preview {
    VoiceSettingsView()
}
