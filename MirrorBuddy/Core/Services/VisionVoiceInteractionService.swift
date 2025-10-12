import Foundation
import SwiftData
import AVFoundation
import UIKit
import os.log

/// Combined vision and voice interaction service for homework help (Task 37)
@MainActor
final class VisionVoiceInteractionService: NSObject {
    /// Shared singleton instance
    static let shared = VisionVoiceInteractionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VisionVoice")

    // MARK: - Dependencies (Subtask 37.1)

    private let visionAnalysisService = VisionAnalysisService.shared
    private let openAIClient: OpenAIClient?
    private let speechSynthesizer = AVSpeechSynthesizer()
    private let speechRecognizer = SpeechRecognitionService.shared

    private var modelContext: ModelContext?

    // MARK: - State (Subtask 37.3)

    private var currentSession: VisionVoiceSession?
    private var conversationHistory: [ConversationTurn] = []
    private var activeImages: [AnalyzedImage] = []

    // MARK: - Initialization

    private override init() {
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            self.openAIClient = OpenAIClient(configuration: config)
        } else {
            self.openAIClient = nil
        }
        super.init()
        speechSynthesizer.delegate = self
    }

    /// Configure with SwiftData context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Vision-voice interaction service configured")
    }

    // MARK: - Capture Workflow (Subtask 37.1)

    /// Start new vision-voice session with captured image
    func startSession(with image: UIImage, triggerPhrase: String = "What's this?") async throws -> VisionVoiceSession {
        logger.info("Starting new vision-voice session")

        // Analyze image with vision service
        let analysis = try await visionAnalysisService.analyzeHomework(
            image: image,
            analysisType: .general
        )

        // Create analyzed image record
        let analyzedImage = AnalyzedImage(
            image: image,
            analysis: analysis,
            capturedAt: Date()
        )

        activeImages = [analyzedImage]

        // Create session
        let session = VisionVoiceSession(
            id: UUID(),
            startedAt: Date(),
            primaryImage: analyzedImage
        )

        currentSession = session
        conversationHistory = []

        // Start conversation with trigger phrase
        let initialResponse = try await processVoiceCommand(triggerPhrase, context: .initial)

        // Speak response
        speak(initialResponse)

        logger.info("Vision-voice session started")
        return session
    }

    // MARK: - Voice Commands (Subtask 37.2)

    /// Process voice command with current context
    func processVoiceCommand(_ command: String, context: CommandContext = .continuation) async throws -> String {
        logger.debug("Processing voice command: \(command)")

        guard let client = openAIClient else {
            throw VisionVoiceError.noClientAvailable
        }

        guard let session = currentSession else {
            throw VisionVoiceError.noActiveSession
        }

        // Build conversation context
        let messages = buildConversationMessages(command: command, context: context)

        // Get AI response
        let response = try await client.chatCompletion(
            model: .gpt5Mini,
            messages: messages,
            temperature: 0.7,
            maxTokens: 500
        )

        guard let content = response.choices.first?.message.content else {
            throw VisionVoiceError.emptyResponse
        }

        // Add to conversation history
        let turn = ConversationTurn(
            userInput: command,
            aiResponse: content,
            timestamp: Date(),
            context: context
        )

        conversationHistory.append(turn)

        logger.debug("Voice command processed successfully")
        return content
    }

    /// Build conversation messages with image context
    private func buildConversationMessages(command: String, context: CommandContext) -> [ChatMessage] {
        var messages: [ChatMessage] = []

        // System message with role definition
        let systemPrompt = """
        You are a helpful homework tutor assistant. You help students understand their homework by:
        - Analyzing images of homework problems
        - Explaining concepts in simple, clear language
        - Providing step-by-step solutions
        - Encouraging understanding over just giving answers
        - Adapting to the student's level

        Current context: The student has shared an image and is asking about it.
        """

        messages.append(ChatMessage(role: .system, content: .text(systemPrompt)))

        // Add image context for initial or reference commands
        if context == .initial || context == .imageReference {
            if let primaryImage = currentSession?.primaryImage {
                let imageContext = """
                IMAGE ANALYSIS:
                Analysis: \(primaryImage.analysis.rawContent)
                Type: \(primaryImage.analysis.analysisType)
                Detected Text: \(primaryImage.analysis.detectedText)
                Confidence: \(primaryImage.analysis.confidence)
                """

                messages.append(ChatMessage(role: .user, content: .text(imageContext)))
            }
        }

        // Add recent conversation history (last 5 turns)
        let recentHistory = conversationHistory.suffix(5)
        for turn in recentHistory {
            messages.append(ChatMessage(role: .user, content: .text(turn.userInput)))
            messages.append(ChatMessage(role: .assistant, content: .text(turn.aiResponse)))
        }

        // Add current command
        messages.append(ChatMessage(role: .user, content: .text(command)))

        return messages
    }

    // MARK: - Text-to-Speech (Subtask 37.2)

    /// Speak response using TTS
    func speak(_ text: String, language: String = "it-IT") {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language)
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0

        speechSynthesizer.speak(utterance)
        logger.debug("Speaking response")
    }

    /// Stop speaking
    func stopSpeaking() {
        speechSynthesizer.stopSpeaking(at: .immediate)
    }

    // MARK: - Context Switching (Subtask 37.3)

    /// Add new image to current session
    func addImageToSession(_ image: UIImage) async throws {
        logger.info("Adding new image to session")

        guard currentSession != nil else {
            throw VisionVoiceError.noActiveSession
        }

        // Analyze new image
        let analysis = try await visionAnalysisService.analyzeHomework(
            image: image,
            analysisType: .general
        )

        let analyzedImage = AnalyzedImage(
            image: image,
            analysis: analysis,
            capturedAt: Date()
        )

        activeImages.append(analyzedImage)

        // Notify about context change
        let contextMessage = "I've added a new image to our conversation. What would you like to know about it?"
        speak(contextMessage)

        logger.info("Image added to session")
    }

    /// Switch to different image in session
    func switchToImage(at index: Int) throws {
        guard index >= 0 && index < activeImages.count else {
            throw VisionVoiceError.invalidImageIndex
        }

        guard var session = currentSession else {
            throw VisionVoiceError.noActiveSession
        }

        session.primaryImage = activeImages[index]
        currentSession = session

        let message = "Switched to image \(index + 1). What would you like to know?"
        speak(message)

        logger.info("Switched to image at index: \(index)")
    }

    // MARK: - Save Analysis (Subtask 37.4)

    /// Save current session analysis
    func saveCurrentAnalysis(title: String? = nil) throws -> SavedAnalysis {
        guard let session = currentSession else {
            throw VisionVoiceError.noActiveSession
        }

        guard let context = modelContext else {
            throw VisionVoiceError.noModelContext
        }

        // Generate title if not provided
        let analysisTitle = title ?? generateTitle(from: session)

        // Create saved analysis
        let savedAnalysis = SavedAnalysis(
            title: analysisTitle,
            imageData: session.primaryImage.image.jpegData(compressionQuality: 0.8),
            analysisText: session.primaryImage.analysis.rawContent,
            problemType: String(describing: session.primaryImage.analysis.analysisType),
            subject: nil, // Subject can be inferred from identified concepts if needed
            conversationSummary: summarizeConversation(),
            savedAt: Date()
        )

        context.insert(savedAnalysis)
        try context.save()

        logger.info("Analysis saved: \(analysisTitle)")
        return savedAnalysis
    }

    /// Generate title from session
    private func generateTitle(from session: VisionVoiceSession) -> String {
        let analysisType = session.primaryImage.analysis.analysisType

        // Use identified concepts if available
        if let firstConcept = session.primaryImage.analysis.identifiedConcepts.first {
            return "\(firstConcept) - \(analysisType)"
        }

        // Fallback to content preview
        let text = session.primaryImage.analysis.rawContent
        let preview = String(text.prefix(30))
        return preview.isEmpty ? "Analysis" : preview
    }

    /// Summarize conversation
    private func summarizeConversation() -> String {
        conversationHistory.map { turn in
            "Q: \(turn.userInput)\nA: \(turn.aiResponse)"
        }.joined(separator: "\n\n")
    }

    // MARK: - History (Subtask 37.3)

    /// Get saved analyses
    func getSavedAnalyses() throws -> [SavedAnalysis] {
        guard let context = modelContext else {
            throw VisionVoiceError.noModelContext
        }

        let descriptor = FetchDescriptor<SavedAnalysis>(
            sortBy: [SortDescriptor(\.savedAt, order: .reverse)]
        )

        return try context.fetch(descriptor)
    }

    /// Delete saved analysis
    func deleteSavedAnalysis(_ analysis: SavedAnalysis) throws {
        guard let context = modelContext else {
            throw VisionVoiceError.noModelContext
        }

        context.delete(analysis)
        try context.save()

        logger.info("Deleted saved analysis")
    }

    // MARK: - Sharing (Subtask 37.4)

    /// Export analysis for sharing
    func exportAnalysis(_ analysis: SavedAnalysis) -> String {
        var exportText = "# \(analysis.title)\n\n"

        exportText += "**Type:** \(analysis.problemType)\n"

        if let subject = analysis.subject {
            exportText += "**Subject:** \(subject)\n"
        }

        exportText += "\n## Analysis\n\(analysis.analysisText)\n"

        if let summary = analysis.conversationSummary {
            exportText += "\n## Discussion\n\(summary)\n"
        }

        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        exportText += "\n---\n*Analyzed on \(formatter.string(from: analysis.savedAt))*\n"
        exportText += "*Generated with MirrorBuddy*"

        return exportText
    }

    // MARK: - Session Management

    /// End current session
    func endSession() {
        currentSession = nil
        conversationHistory.removeAll()
        activeImages.removeAll()
        stopSpeaking()

        logger.info("Session ended")
    }

    /// Get current session
    func getCurrentSession() -> VisionVoiceSession? {
        currentSession
    }

    /// Get conversation history
    func getConversationHistory() -> [ConversationTurn] {
        conversationHistory
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension VisionVoiceInteractionService: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            logger.debug("Finished speaking")
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        _Concurrency.Task { @MainActor in
            logger.debug("Speech cancelled")
        }
    }
}

// MARK: - Models

/// Vision-voice session
struct VisionVoiceSession {
    let id: UUID
    let startedAt: Date
    var primaryImage: AnalyzedImage
    var endedAt: Date?
}

/// Analyzed image with context
struct AnalyzedImage {
    let image: UIImage
    let analysis: AnalysisResult
    let capturedAt: Date
}

/// Conversation turn
struct ConversationTurn {
    let userInput: String
    let aiResponse: String
    let timestamp: Date
    let context: CommandContext
}

/// Command context type
enum CommandContext {
    case initial        // First command after image capture
    case continuation   // Continuing conversation
    case imageReference // Referencing the image
    case clarification  // Asking for clarification
}

/// Saved analysis model
@Model
final class SavedAnalysis {
    var id: UUID
    var title: String
    var imageData: Data?
    var analysisText: String
    var problemType: String
    var subject: String?
    var conversationSummary: String?
    var savedAt: Date

    init(
        title: String,
        imageData: Data?,
        analysisText: String,
        problemType: String,
        subject: String?,
        conversationSummary: String?,
        savedAt: Date
    ) {
        self.id = UUID()
        self.title = title
        self.imageData = imageData
        self.analysisText = analysisText
        self.problemType = problemType
        self.subject = subject
        self.conversationSummary = conversationSummary
        self.savedAt = savedAt
    }

    /// Reconstruct image from data
    var image: UIImage? {
        guard let data = imageData else { return nil }
        return UIImage(data: data)
    }
}

// MARK: - Errors

enum VisionVoiceError: LocalizedError {
    case noClientAvailable
    case noActiveSession
    case noModelContext
    case emptyResponse
    case invalidImageIndex

    var errorDescription: String? {
        switch self {
        case .noClientAvailable:
            return "OpenAI client not available"
        case .noActiveSession:
            return "No active vision-voice session"
        case .noModelContext:
            return "Model context not configured"
        case .emptyResponse:
            return "Received empty response from AI"
        case .invalidImageIndex:
            return "Invalid image index"
        }
    }
}

// MARK: - Speech Recognition Service Placeholder

final class SpeechRecognitionService {
    static let shared = SpeechRecognitionService()
    private init() {}
}
