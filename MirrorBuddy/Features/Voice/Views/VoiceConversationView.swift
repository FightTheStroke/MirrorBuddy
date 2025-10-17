import SwiftUI
import SwiftData
@preconcurrency import Combine
import os.log

/// Voice conversation UI for AI coach interactions
struct VoiceConversationView: View {
    @StateObject private var viewModel: VoiceConversationViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    @Query(sort: \VoiceConversation.updatedAt, order: .reverse)
    private var allConversations: [VoiceConversation]

    @State private var showingConversationList = false

    // Optional conversation ID to load existing conversation
    let conversationID: UUID?

    init(conversationID: UUID? = nil) {
        self.conversationID = conversationID
        // Note: We can't access @Environment in init, so we'll configure in onAppear
        _viewModel = StateObject(wrappedValue: VoiceConversationViewModel())
    }

    var body: some View {
        // Task 107: Adaptive layout for iPad (two-column) vs iPhone (single-column)
        Group {
            if horizontalSizeClass == .regular && verticalSizeClass == .regular {
                // iPad layout: Two columns
                adaptiveLayoutForIPad
            } else {
                // iPhone layout: Single column
                adaptiveLayoutForIPhone
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
        .sheet(isPresented: $viewModel.showSettings) {
            // Task 102.4: Voice Settings Panel
            VoiceSettingsView()
        }
        .onAppear {
            // Configure ViewModel with modelContext
            viewModel.configure(modelContext: modelContext)

            // Load existing conversation if ID provided
            if let conversationID = conversationID {
                viewModel.loadConversation(id: conversationID)
            }
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
                        .fill(viewModel.isOfflineMode ? Color.orange : Color.green)
                        .frame(width: 8, height: 8)
                    Text(viewModel.isOfflineMode ? "Offline" : "Attivo")
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
            // Settings button (left) - Task 102.4
            Button {
                viewModel.toggleSettings()
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

    // MARK: - Adaptive Layouts (Task 107)

    /// iPad two-column layout
    private var adaptiveLayoutForIPad: some View {
        HStack(spacing: 0) {
            // Left column: Conversation list (30%)
            compactConversationList
                .frame(maxWidth: .infinity)
                .frame(minWidth: 250, maxWidth: 350)

            Divider()

            // Right column: Active conversation (70%)
            conversationMainContent
                .frame(maxWidth: .infinity)
        }
        .sheet(isPresented: $viewModel.showSettings) {
            VoiceSettingsView()
        }
        .alert("Errore", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .onAppear {
            viewModel.configure(modelContext: modelContext)
            if let conversationID = conversationID {
                viewModel.loadConversation(id: conversationID)
            }
        }
    }

    /// iPhone single-column layout
    private var adaptiveLayoutForIPhone: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            if showingConversationList {
                // Show conversation list
                compactConversationList
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Nuova") {
                                // Create new conversation
                                showingConversationList = false
                            }
                        }
                    }
            } else {
                // Show active conversation
                conversationMainContent
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button {
                                showingConversationList = true
                            } label: {
                                Image(systemName: "list.bullet")
                            }
                        }
                    }
            }
        }
        .sheet(isPresented: $viewModel.showSettings) {
            VoiceSettingsView()
        }
        .alert("Errore", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage)
        }
        .onAppear {
            viewModel.configure(modelContext: modelContext)
            if let conversationID = conversationID {
                viewModel.loadConversation(id: conversationID)
            }
        }
    }

    /// Main conversation content (shared between layouts)
    private var conversationMainContent: some View {
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

    /// Compact conversation list for iPad sidebar and iPhone modal
    private var compactConversationList: some View {
        List {
            if allConversations.isEmpty {
                ContentUnavailableView(
                    "Nessuna Conversazione",
                    systemImage: "bubble.left.and.bubble.right",
                    description: Text("Inizia una nuova conversazione per vedere la cronologia")
                )
            } else {
                ForEach(allConversations) { conversation in
                    Button {
                        viewModel.loadConversation(id: conversation.id)
                        if horizontalSizeClass != .regular || verticalSizeClass != .regular {
                            // Close list on iPhone
                            showingConversationList = false
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(conversation.title)
                                .font(.headline)
                                .foregroundStyle(.primary)

                            if let subject = conversation.subject {
                                Text(subject.displayName)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            HStack {
                                Text(conversation.updatedAt, style: .relative)
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)

                                Spacer()

                                if conversation.messages.count > 0 {
                                    Text("\(conversation.messages.count) messaggi")
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                    .buttonStyle(.plain)
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        let conversation = allConversations[index]
                        modelContext.delete(conversation)
                    }
                    try? modelContext.save()
                }
            }
        }
        .navigationTitle("Conversazioni")
    }
}

// MARK: - Message Bubble View

struct MessageBubbleView: View {
    let message: MessageBubbleModel

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

// MARK: - Message Bubble View Model (temporary UI model)

struct MessageBubbleModel: Identifiable {
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
    @Published var conversationHistory: [MessageBubbleModel] = []
    @Published var waveformAmplitudes: [CGFloat] = Array(repeating: 0.3, count: 20)
    @Published var pulseAnimation = false
    @Published var isUserSpeaking = false
    @Published var currentSubject: String?
    @Published var currentMaterial: String?
    @Published var showError = false
    @Published var errorMessage = ""
    @Published var showSettings = false // Task 102.4
    @Published var isOfflineMode = false // Task 101: Fallback to Apple Speech

    // MARK: - Dependencies

    private let audioPipeline = AudioPipelineManager.shared
    private let coachPersonality = StudyCoachPersonality.shared // Task 101
    private var realtimeClient: OpenAIRealtimeClient?
    private var conversationService: VoiceConversationService?

    // Task 101: Fallback services for offline mode
    private let localSpeechRecognition = VoiceCommandRecognitionService.shared
    private let localTextToSpeech = TextToSpeechService.shared
    private var openAIClient: OpenAIClient? // For text-based fallback

    private var waveformTimer: Timer?
    private var cancellables = Set<AnyCancellable>()
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VoiceConversation")

    // MARK: - Persistence

    /// Current active conversation
    private var currentConversation: VoiceConversation?

    /// Subject for current conversation
    private var currentSubjectEntity: SubjectEntity?

    /// Material for current conversation
    private var currentMaterialEntity: Material?

    /// ModelContext for accessing SwiftData (Task 101)
    private var modelContext: ModelContext?

    // MARK: - Audio Buffering

    /// Audio buffer for accumulating chunks before sending
    private var audioBuffer = Data()

    /// Buffer size threshold (100ms at 24kHz PCM16 mono = 4800 bytes)
    private let bufferSizeThreshold = 4800

    /// Timer for periodic audio buffer commits
    private var audioCommitTimer: Timer?

    /// Time since last audio activity (for auto-commit)
    private var lastAudioTime = Date()

    /// Accumulated AI response text for streaming
    private var currentAIResponseText = ""

    // MARK: - Initialization

    init(modelContext: ModelContext? = nil) {
        // Initialize OpenAI client if configuration available
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            realtimeClient = OpenAIRealtimeClient(configuration: config)
        }

        // Initialize conversation service if modelContext provided
        if let context = modelContext {
            conversationService = VoiceConversationService(modelContext: context)
        }

        setupCallbacks()
        loadContext()
    }

    // MARK: - Setup

    private func setupCallbacks() {
        // Audio pipeline callbacks (wrap in MainActor to avoid crashes)
        audioPipeline.onAudioLevelChanged = { [weak self] level in
            _Concurrency.Task { @MainActor in
                self?.updateWaveform(with: level)
            }
        }

        audioPipeline.onAudioData = { [weak self] audioData in
            _Concurrency.Task { @MainActor in
                await self?.bufferAndSendAudio(audioData)
            }
        }

        audioPipeline.onInterruption = { [weak self] began in
            _Concurrency.Task { @MainActor in
                if began {
                    self?.stopConversation()
                }
            }
        }

        audioPipeline.onError = { [weak self] (error: Error) in
            _Concurrency.Task { @MainActor in
                self?.showError(error.localizedDescription)
            }
        }

        // Realtime client callbacks
        realtimeClient?.onMessage = { [weak self] message in
            guard let self else { return }

            switch message {
            case .serverEvent(let event):
                switch event {
                case .sessionCreated(let session):
                    // Session initialized successfully
                    break

                case .responseCreated(let response):
                    // New response started
                    break

                case .responseTextDelta(let textDelta):
                    // Handle incremental text from AI
                    _Concurrency.Task { @MainActor in
                        self.handleTextDelta(textDelta.delta)
                    }

                case .responseAudioDelta:
                    // Audio handled via onAudioData callback
                    break

                case .responseDone(let responseDone):
                    // Response completed - finalize AI message
                    _Concurrency.Task { @MainActor in
                        self.finalizeAIResponse()
                    }

                case .error(let error):
                    // Error events handled via onError callback
                    _Concurrency.Task { @MainActor in
                        self.showError(error.message)
                    }

                case .inputAudioBufferSpeechStarted:
                    // User started speaking
                    _Concurrency.Task { @MainActor in
                        self.isUserSpeaking = true
                    }

                case .inputAudioBufferSpeechStopped:
                    // User stopped speaking
                    _Concurrency.Task { @MainActor in
                        self.isUserSpeaking = false
                    }

                case .rateLimitsUpdated(let rateLimits):
                    // Could log rate limit info for debugging
                    break

                case .inputAudioBufferCommitted:
                    // Audio buffer committed, transcription will follow
                    break

                case .conversationItemCreated(let item):
                    // Handle user transcription from conversation item
                    _Concurrency.Task { @MainActor in
                        self.handleConversationItemCreated(item)
                    }

                default:
                    // Handle other events as needed
                    break
                }
            case .clientEvent:
                break
            }
        }

        realtimeClient?.onAudioData = { [weak self] audioData in
            _Concurrency.Task { @MainActor in
                self?.playAIResponse(audioData)
            }
        }

        realtimeClient?.onTextDelta = { [weak self] textDelta in
            _Concurrency.Task { @MainActor in
                self?.handleTextDelta(textDelta)
            }
        }

        realtimeClient?.onError = { [weak self] (error: Error) in
            _Concurrency.Task { @MainActor [weak self] in
                self?.showError(error.localizedDescription)
            }
        }
    }

    // Task 101: Load current subject/material context from SwiftData
    private func loadContext() {
        guard let modelContext = modelContext else {
            // Fallback to placeholder if no context available
            currentSubject = "Matematica"
            currentMaterial = "Argomenti Generali"
            return
        }

        do {
            // Try to load the most recently accessed material
            let descriptor = FetchDescriptor<Material>(
                sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
            )
            let materials = try modelContext.fetch(descriptor)

            if let latestMaterial = materials.first {
                currentMaterialEntity = latestMaterial
                currentMaterial = latestMaterial.title
                currentSubjectEntity = latestMaterial.subject
                currentSubject = latestMaterial.subject?.displayName ?? "Materia Sconosciuta"
            } else {
                // No materials yet - try to load any subject
                let subjectDescriptor = FetchDescriptor<SubjectEntity>()
                let subjects = try modelContext.fetch(subjectDescriptor)

                if let firstSubject = subjects.first {
                    currentSubjectEntity = firstSubject
                    currentSubject = firstSubject.displayName
                    currentMaterial = "Argomenti Generali"
                } else {
                    // Complete fallback
                    currentSubject = "Studio"
                    currentMaterial = "Argomenti Generali"
                }
            }

            // Update StudyCoachPersonality context
            if let subject = currentSubject, let material = currentMaterial {
                let context = ConversationContext(
                    subject: subject,
                    material: material,
                    topicsCovered: [],
                    strugglingConcepts: [],
                    currentDifficultyLevel: .intermediate,
                    sessionStartTime: Date(),
                    totalQuestionsAsked: 0,
                    correctAnswers: 0
                )
                coachPersonality.updateContext(context)
            }
        } catch {
            logger.error("Failed to load context: \(error.localizedDescription)")
            // Fallback
            currentSubject = "Studio"
            currentMaterial = "Argomenti Generali"
        }
    }

    // MARK: - Configuration

    /// Configure the ViewModel with a ModelContext (called from view's onAppear)
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext // Task 101: Save for loadContext

        if conversationService == nil {
            conversationService = VoiceConversationService(modelContext: modelContext)
        }

        // Load context after modelContext is set
        loadContext()
    }

    /// Load an existing conversation by ID
    func loadConversation(id: UUID) {
        guard let service = conversationService else {
            showError("Servizio conversazioni non disponibile")
            return
        }

        do {
            guard let conversation = try service.fetchConversation(id: id) else {
                showError("Conversazione non trovata")
                return
            }

            currentConversation = conversation
            currentSubjectEntity = conversation.subject
            currentMaterialEntity = conversation.material

            // Update UI with conversation context
            currentSubject = conversation.subject?.displayName ?? "Nessuna Materia"
            if let material = conversation.material {
                currentMaterial = material.title
            }

            // Load conversation history
            conversationHistory = conversation.messages
                .sorted { $0.timestamp < $1.timestamp }
                .map { message in
                    MessageBubbleModel(
                        content: message.content,
                        isFromUser: message.isFromUser,
                        timestamp: message.timestamp
                    )
                }
        } catch {
            showError("Errore caricamento conversazione: \(error.localizedDescription)")
        }
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
        // Task 101: Try OpenAI first, fallback to local Apple Speech if it fails
        guard let realtimeClient else {
            // No API key configured, use offline mode directly
            startOfflineConversation()
            return
        }

        _Concurrency.Task {
            do {
                // Create a new conversation in the database
                if let service = conversationService {
                    let title = currentSubject ?? "New Conversation"
                    currentConversation = try service.createConversation(
                        title: title,
                        subject: currentSubjectEntity,
                        material: currentMaterialEntity
                    )
                }

                // Start audio pipeline
                try await audioPipeline.start()

                // Try to connect to OpenAI Realtime API
                try await realtimeClient.connect()

                // Update state
                await MainActor.run {
                    isConversationActive = true
                    isOfflineMode = false
                    pulseAnimation = true
                    startWaveformAnimation()
                    startAudioCommitTimer()
                }

                // Task 101: Send context-aware system prompt from StudyCoachPersonality
                let systemPrompt = await coachPersonality.generateSystemPrompt(
                    for: currentSubject,
                    material: currentMaterial
                )
                try await realtimeClient.sendSystemPrompt(systemPrompt)
            } catch {
                // Task 101: Connection failed, fallback to offline mode
                logger.warning("OpenAI connection failed, falling back to local Apple Speech: \(error.localizedDescription)")
                await MainActor.run {
                    startOfflineConversation()
                }
            }
        }
    }

    /// Task 101: Fallback to local Apple Speech when OpenAI is unavailable
    private func startOfflineConversation() {
        _Concurrency.Task {
            do {
                // Create conversation in database
                if let service = conversationService {
                    let title = currentSubject ?? "New Conversation"
                    currentConversation = try service.createConversation(
                        title: title,
                        subject: currentSubjectEntity,
                        material: currentMaterialEntity
                    )
                }

                // Request speech recognition permission
                let authorized = await localSpeechRecognition.requestAuthorization()
                guard authorized else {
                    await MainActor.run {
                        showError("Permesso riconoscimento vocale richiesto per modalità offline")
                    }
                    return
                }

                // Configure speech recognition callbacks
                localSpeechRecognition.onCommandRecognized = { [weak self] recognizedText in
                    _Concurrency.Task { @MainActor [weak self] in
                        guard let self = self else { return }
                        // Add user message to UI
                        self.addUserMessage(recognizedText)
                        // Generate AI response using text-based OpenAI
                        try await self.generateOfflineResponse(for: recognizedText)
                    }
                }

                // Start listening
                try localSpeechRecognition.startListening()

                await MainActor.run {
                    isConversationActive = true
                    isOfflineMode = true
                    pulseAnimation = true
                    startWaveformAnimation()

                    // Show offline mode message
                    let offlineMessage = "Modalità offline attiva. Usando Apple Speech per riconoscimento vocale."
                    addAIMessage(offlineMessage)
                    localTextToSpeech.speak(offlineMessage, language: "it-IT")
                }

                logger.info("Offline conversation mode started successfully")
            } catch {
                await MainActor.run {
                    showError("Errore avvio modalità offline: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Task 101: Generate AI response using text-based API in offline mode
    private func generateOfflineResponse(for userMessage: String) async throws {
        // Initialize OpenAI client for text-based chat if needed
        if openAIClient == nil {
            if let config = OpenAIConfiguration.loadFromEnvironment() {
                self.openAIClient = OpenAIClient(configuration: config)
            } else {
                throw NSError(domain: "VoiceConversation", code: -1,
                             userInfo: [NSLocalizedDescriptionKey: "OpenAI client not configured"])
            }
        }

        guard let client = openAIClient else {
            throw NSError(domain: "VoiceConversation", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "OpenAI client not configured"])
        }

        // Generate response using GPT-5
        let systemPrompt = await coachPersonality.generateSystemPrompt(
            for: currentSubject,
            material: currentMaterial
        )

        let response = try await client.chatCompletion(
            model: .gpt5,
            messages: [
                ChatMessage(role: .system, content: .text(systemPrompt)),
                ChatMessage(role: .user, content: .text(userMessage))
            ],
            temperature: 0.7,
            maxTokens: 500
        )

        guard let aiResponse = response.choices.first?.message.content else {
            throw NSError(domain: "VoiceConversation", code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Empty AI response"])
        }

        // Add AI response to UI and speak it
        await MainActor.run {
            addAIMessage(aiResponse)
            localTextToSpeech.speak(aiResponse, language: "it-IT")
        }
    }

    private func stopConversation() {
        // Stop audio pipeline
        audioPipeline.stop()

        // Stop audio commit timer and clear buffer
        stopAudioCommitTimer()

        // Task 101: Stop offline mode services if active
        if isOfflineMode {
            do {
                try localSpeechRecognition.stopListening()
            } catch {
                logger.error("Error stopping speech recognition: \(error.localizedDescription)")
            }
            localTextToSpeech.stop()
        } else {
            // Disconnect from realtime API
            if let realtimeClient {
                _Concurrency.Task {
                    await realtimeClient.disconnect()
                }
            }
        }

        // Update state
        isConversationActive = false
        isOfflineMode = false
        pulseAnimation = false
        isUserSpeaking = false
        stopWaveformAnimation()
    }

    // MARK: - Audio Buffering and Forwarding

    /// Buffer audio chunks and send to OpenAI when threshold is reached
    private func bufferAndSendAudio(_ audioData: Data) async {
        guard let realtimeClient, isConversationActive else { return }

        // Add to buffer
        audioBuffer.append(audioData)
        lastAudioTime = Date()

        // Send when buffer reaches threshold
        if audioBuffer.count >= bufferSizeThreshold {
            await sendBufferedAudio()
        }
    }

    /// Send buffered audio to OpenAI Realtime API
    private func sendBufferedAudio() async {
        guard let realtimeClient, !audioBuffer.isEmpty else { return }

        do {
            try await realtimeClient.sendAudioData(audioBuffer)
            audioBuffer.removeAll(keepingCapacity: true)
        } catch {
            showError("Errore invio audio: \(error.localizedDescription)")
        }
    }

    /// Commit audio buffer and trigger AI response (called periodically)
    private func commitAudioBuffer() async {
        guard let realtimeClient, isConversationActive else { return }

        // Send any remaining buffered audio first
        if !audioBuffer.isEmpty {
            await sendBufferedAudio()
        }

        // Check if user has been speaking (audio activity in last 500ms)
        let timeSinceLastAudio = Date().timeIntervalSince(lastAudioTime)
        guard timeSinceLastAudio < 0.5 else { return }

        // Commit the audio buffer to trigger AI response
        do {
            try await realtimeClient.commitAudioBuffer()
        } catch {
            showError("Errore commit audio: \(error.localizedDescription)")
        }
    }

    /// Start periodic audio buffer commits
    private func startAudioCommitTimer() {
        audioCommitTimer?.invalidate()
        audioCommitTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            _Concurrency.Task { @MainActor in
                await self?.commitAudioBuffer()
            }
        }
    }

    /// Stop audio buffer commit timer
    private func stopAudioCommitTimer() {
        audioCommitTimer?.invalidate()
        audioCommitTimer = nil
        audioBuffer.removeAll()
        lastAudioTime = Date()
    }

    // MARK: - Message Handling

    private func addUserMessage(_ content: String) {
        // Add to UI immediately
        let bubbleMessage = MessageBubbleModel(
            content: content,
            isFromUser: true,
            timestamp: Date()
        )
        conversationHistory.append(bubbleMessage)

        // Persist to database
        if let conversation = currentConversation,
           let service = conversationService {
            do {
                try service.addMessage(
                    to: conversation,
                    content: content,
                    isFromUser: true
                )
            } catch {
                showError("Errore salvataggio messaggio: \(error.localizedDescription)")
            }
        }
    }

    private func addAIMessage(_ content: String) {
        // Add to UI immediately
        let bubbleMessage = MessageBubbleModel(
            content: content,
            isFromUser: false,
            timestamp: Date()
        )
        conversationHistory.append(bubbleMessage)

        // Persist to database
        if let conversation = currentConversation,
           let service = conversationService {
            do {
                try service.addMessage(
                    to: conversation,
                    content: content,
                    isFromUser: false
                )

                // Generate title from first user message if needed
                if conversation.title == "New Conversation" || conversation.title.isEmpty {
                    try service.generateTitleFromContent(for: conversation)
                }
            } catch {
                showError("Errore salvataggio messaggio: \(error.localizedDescription)")
            }
        }
    }

    /// Handle streaming text delta from AI response
    private func handleTextDelta(_ delta: String) {
        currentAIResponseText += delta

        // Update last message in UI only (don't persist every delta)
        if let lastMessage = conversationHistory.last, !lastMessage.isFromUser {
            conversationHistory.removeLast()
        }

        // Add to UI without persisting
        let bubbleMessage = MessageBubbleModel(
            content: currentAIResponseText,
            isFromUser: false,
            timestamp: Date()
        )
        conversationHistory.append(bubbleMessage)
    }

    /// Finalize AI response when complete
    private func finalizeAIResponse() {
        if !currentAIResponseText.isEmpty {
            // Persist the complete message to database
            if let conversation = currentConversation,
               let service = conversationService {
                do {
                    try service.addMessage(
                        to: conversation,
                        content: currentAIResponseText,
                        isFromUser: false
                    )

                    // Generate title from first messages if needed
                    if conversation.title == "New Conversation" || conversation.title.isEmpty {
                        _Concurrency.Task {
                            try service.generateTitleFromContent(for: conversation)
                        }
                    }
                } catch {
                    showError("Errore salvataggio messaggio: \(error.localizedDescription)")
                }
            }

            currentAIResponseText = ""
        }
    }

    /// Handle conversation item created event (contains user transcription)
    private func handleConversationItemCreated(_ item: ConversationItemCreated) {
        // Only process user messages (role = "user")
        guard item.item.role == "user" else { return }

        // Extract transcript from content
        if let content = item.item.content,
           let firstContent = content.first {
            // Try to get transcript or text
            let userMessage = firstContent.transcript ?? firstContent.text

            if let message = userMessage, !message.isEmpty {
                // Task 103: Check if message is a voice command before proceeding
                let commandRegistry = VoiceCommandRegistry.shared
                let commandHandler = AppVoiceCommandHandler.shared

                // Try to process as voice command
                commandRegistry.processCommand(message, handler: commandHandler)

                // Check if command was recognized
                if let result = commandHandler.lastCommandResult {
                    switch result {
                    case .success(let feedback):
                        // Command executed successfully - show feedback instead of adding to conversation
                        addAIMessage("✓ \(feedback)")
                        return
                    case .unrecognized:
                        // Not a command - proceed with normal conversation
                        break
                    case .failure(let error):
                        // Command failed - show error and continue
                        addAIMessage("⚠️ \(error)")
                        return
                    }
                }

                // Normal conversation message - add to history
                addUserMessage(message)
            }
        }
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

    func toggleSettings() {
        showSettings.toggle()
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
