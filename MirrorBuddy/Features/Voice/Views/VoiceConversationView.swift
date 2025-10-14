import SwiftUI
@preconcurrency import Combine

/// Voice conversation UI for AI coach interactions
struct VoiceConversationView: View {
    @StateObject private var viewModel = VoiceConversationViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Context banner
                contextBannerView
                    .padding()
                    .background(.ultraThinMaterial)

                // Conversation history
                conversationHistoryView

                // Waveform visualization
                if viewModel.isConversationActive {
                    waveformView
                        .frame(height: 100)
                        .padding(.horizontal)
                }

                Spacer()

                // Controls
                controlsView
                    .padding()
            }
        }
        .navigationTitle("Coach Vocale")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Chiudi") {
                    dismiss()
                }
            }
        }
        .alert("Errore", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
    }

    // MARK: - Context Banner

    private var contextBannerView: some View {
        HStack(spacing: 12) {
            Image(systemName: "book.fill")
                .font(.title3)
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text(viewModel.currentSubject ?? "Nessuna Materia")
                    .font(.headline)

                if let material = viewModel.currentMaterial {
                    Text(material)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if viewModel.isConversationActive {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text("Attivo")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }

    // MARK: - Conversation History

    private var conversationHistoryView: some View {
        ScrollView {
            ScrollViewReader { proxy in
                VStack(spacing: 16) {
                    ForEach(viewModel.conversationHistory) { message in
                        MessageBubbleView(message: message)
                            .id(message.id)
                    }
                }
                .padding()
                .onChange(of: viewModel.conversationHistory.count) { oldValue, newValue in
                    if let lastMessage = viewModel.conversationHistory.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Waveform Visualization

    private var waveformView: some View {
        HStack(spacing: 4) {
            ForEach(0..<20, id: \.self) { index in
                WaveformBarView(
                    amplitude: viewModel.waveformAmplitudes[index],
                    color: viewModel.isUserSpeaking ? .blue : .purple
                )
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
    }

    // MARK: - Controls

    private var controlsView: some View {
        HStack(spacing: 24) {
            // Settings button (left)
            Button {
                viewModel.showSettings()
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.title2)
                    .foregroundStyle(.secondary)
                    .frame(width: 50, height: 50)
            }

            Spacer()

            // Main control button (bottom-right, optimized for thumb)
            mainControlButton
                .accessibilityLabel(viewModel.isConversationActive ? "Ferma conversazione" : "Inizia conversazione")
                .accessibilityHint("Tocca due volte per \(viewModel.isConversationActive ? "fermare" : "iniziare") a parlare con il coach AI")

            Spacer()
                .frame(width: 40)
        }
        .padding(.bottom, 20)
    }

    private var mainControlButton: some View {
        Button {
            viewModel.toggleConversation()
        } label: {
            ZStack {
                // Pulsing ring when active
                if viewModel.isConversationActive {
                    Circle()
                        .stroke(Color.blue.opacity(0.3), lineWidth: 4)
                        .scaleEffect(viewModel.pulseAnimation ? 1.2 : 1.0)
                        .opacity(viewModel.pulseAnimation ? 0 : 1)
                        .animation(
                            Animation.easeInOut(duration: 1.5).repeatForever(autoreverses: false),
                            value: viewModel.pulseAnimation
                        )
                }

                Circle()
                    .fill(
                        viewModel.isConversationActive ?
                        LinearGradient(
                            colors: [.red, .red.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ) :
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                    .shadow(radius: 8)

                VStack(spacing: 4) {
                    Image(systemName: viewModel.isConversationActive ? "stop.fill" : "mic.fill")
                        .font(.system(size: 30))

                    Text(viewModel.isConversationActive ? "Ferma" : "Parla")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .foregroundStyle(.white)
            }
        }
        .sensoryFeedback(.impact(intensity: 0.7), trigger: viewModel.isConversationActive)
    }
}

// MARK: - Message Bubble View

struct MessageBubbleView: View {
    let message: VoiceMessage

    var body: some View {
        HStack {
            if message.isFromUser {
                Spacer()
            }

            VStack(alignment: message.isFromUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .padding(12)
                    .background(
                        message.isFromUser ?
                        Color.blue :
                        Color(.systemGray5)
                    )
                    .foregroundStyle(
                        message.isFromUser ?
                        .white :
                        .primary
                    )
                    .cornerRadius(16)

                Text(message.timestamp, style: .time)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: 280, alignment: message.isFromUser ? .trailing : .leading)

            if !message.isFromUser {
                Spacer()
            }
        }
    }
}

// MARK: - Waveform Bar View

struct WaveformBarView: View {
    let amplitude: CGFloat
    let color: Color

    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(color)
            .frame(width: 4, height: max(4, amplitude * 80))
            .animation(.easeInOut(duration: 0.1), value: amplitude)
    }
}

// MARK: - Voice Message Model

struct VoiceMessage: Identifiable {
    let id = UUID()
    let content: String
    let isFromUser: Bool
    let timestamp: Date
}

// MARK: - Voice Conversation View Model

@MainActor
final class VoiceConversationViewModel: ObservableObject {
    // MARK: - Published State

    @Published var isConversationActive = false
    @Published var conversationHistory: [VoiceMessage] = []
    @Published var waveformAmplitudes: [CGFloat] = Array(repeating: 0.3, count: 20)
    @Published var pulseAnimation = false
    @Published var isUserSpeaking = false
    @Published var currentSubject: String?
    @Published var currentMaterial: String?
    @Published var showError = false
    @Published var errorMessage = ""

    // MARK: - Dependencies

    private let audioPipeline = AudioPipelineManager.shared
    private var realtimeClient: OpenAIRealtimeClient?

    private var waveformTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init() {
        // Initialize OpenAI client if configuration available
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            realtimeClient = OpenAIRealtimeClient(configuration: config)
        }

        setupCallbacks()
        loadContext()
    }

    // MARK: - Setup

    private func setupCallbacks() {
        // Audio pipeline callbacks
        audioPipeline.onAudioLevelChanged = { [weak self] level in
            self?.updateWaveform(with: level)
        }

        audioPipeline.onInterruption = { [weak self] began in
            if began {
                self?.stopConversation()
            }
        }

        audioPipeline.onError = { [weak self] (error: Error) in
            self?.showError(error.localizedDescription)
        }

        // Realtime client callbacks
        realtimeClient?.onMessage = { [weak self] message in
            guard let self else { return }

            switch message {
            case .serverEvent(let event):
                switch event {
                case .responseTextDelta(let textDelta):
                    // Handle incremental text from AI
                    _Concurrency.Task { @MainActor in
                        // TODO: Handle text delta streaming
                        self.addAIMessage(textDelta.delta)
                    }
                case .responseDone:
                    // Response completed
                    break
                default:
                    break
                }
            case .clientEvent:
                break
            }
        }

        realtimeClient?.onError = { [weak self] (error: Error) in
            _Concurrency.Task { @MainActor [weak self] in
                self?.showError(error.localizedDescription)
            }
        }
    }

    private func loadContext() {
        // TODO: Load from user's current subject/material context
        currentSubject = "Matematica"
        currentMaterial = "Equazioni di Secondo Grado - Capitolo 5"
    }

    // MARK: - Conversation Control

    func toggleConversation() {
        if isConversationActive {
            stopConversation()
        } else {
            startConversation()
        }
    }

    private func startConversation() {
        guard let realtimeClient else {
            showError("Chiave API OpenAI non configurata. Aggiungi la tua chiave nelle Impostazioni.")
            return
        }

        _Concurrency.Task {
            do {
                // Start audio pipeline
                try await audioPipeline.start()

                // Connect to OpenAI Realtime API
                try await realtimeClient.connect()

                // Update state
                await MainActor.run {
                    isConversationActive = true
                    pulseAnimation = true
                    startWaveformAnimation()
                }

                // Send initial context in Italian
                if let subject = currentSubject {
                    try await realtimeClient.sendText(
                        "Sei un coach AI che aiuta uno studente con \(subject). " +
                        "Materiale corrente: \(currentMaterial ?? "Argomenti generali"). " +
                        "Sii incoraggiante, chiaro ed educativo. " +
                        "Lo studente ha dislessia, discalculia e poca memoria di lavoro. " +
                        "Usa frasi brevi e semplici. Fai esempi concreti della vita quotidiana. " +
                        "IMPORTANTE: Rispondi SEMPRE in italiano."
                    )
                }
            } catch {
                await MainActor.run {
                    showError(error.localizedDescription)
                }
            }
        }
    }

    private func stopConversation() {
        // Stop audio pipeline
        audioPipeline.stop()

        // Disconnect from realtime API
        if let realtimeClient {
            _Concurrency.Task {
                await realtimeClient.disconnect()
            }
        }

        // Update state
        isConversationActive = false
        pulseAnimation = false
        isUserSpeaking = false
        stopWaveformAnimation()
    }

    // MARK: - Message Handling

    private func addUserMessage(_ content: String) {
        let message = VoiceMessage(
            content: content,
            isFromUser: true,
            timestamp: Date()
        )
        conversationHistory.append(message)
    }

    private func addAIMessage(_ content: String) {
        let message = VoiceMessage(
            content: content,
            isFromUser: false,
            timestamp: Date()
        )
        conversationHistory.append(message)
    }

    private func playAIResponse(_ audioData: Data) {
        do {
            try audioPipeline.play(audioData: audioData)
            isUserSpeaking = false
        } catch {
            showError(error.localizedDescription)
        }
    }

    // MARK: - Waveform Animation

    private func startWaveformAnimation() {
        waveformTimer?.invalidate()
        waveformTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            _Concurrency.Task { @MainActor [weak self] in
                self?.animateWaveform()
            }
        }
    }

    private func stopWaveformAnimation() {
        waveformTimer?.invalidate()
        waveformAmplitudes = Array(repeating: 0.3, count: 20)
    }

    private func animateWaveform() {
        waveformAmplitudes = waveformAmplitudes.map { _ in
            CGFloat.random(in: 0.2...1.0)
        }
    }

    private func updateWaveform(with level: Float) {
        let normalizedLevel = CGFloat(max(0.2, min(1.0, level)))

        // Update waveform with audio level
        for i in 0..<waveformAmplitudes.count {
            waveformAmplitudes[i] = normalizedLevel + CGFloat.random(in: -0.2...0.2)
        }

        // Detect if user is speaking (level above threshold)
        isUserSpeaking = level > 0.3
    }

    // MARK: - Settings

    func showSettings() {
        // TODO: Navigate to voice settings
    }

    // MARK: - Error Handling

    private func showError(_ message: String) {
        errorMessage = message
        showError = true
    }

    // MARK: - Cleanup
    // Note: Cannot access @MainActor properties from nonisolated deinit
    // Cleanup happens automatically through ARC
}

// MARK: - Preview

#Preview {
    NavigationStack {
        VoiceConversationView()
    }
}
