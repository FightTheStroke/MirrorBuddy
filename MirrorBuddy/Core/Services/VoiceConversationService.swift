import Foundation
import SwiftData
import os.log

/// Service for managing voice conversations with SwiftData
@MainActor
final class VoiceConversationService {
    private let modelContext: ModelContext
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VoiceConversation")

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Create

    /// Create a new conversation
    func createConversation(
        title: String = "New Conversation",
        subject: SubjectEntity? = nil,
        material: Material? = nil
    ) throws -> VoiceConversation {
        let conversation = VoiceConversation(
            title: title,
            subject: subject,
            material: material
        )

        modelContext.insert(conversation)
        try modelContext.save()

        logger.info("Created conversation: \(conversation.id)")
        return conversation
    }

    /// Add a message to a conversation
    func addMessage(
        to conversation: VoiceConversation,
        content: String,
        isFromUser: Bool,
        audioData: Data? = nil
    ) throws -> VoiceMessage {
        let message = VoiceMessage(
            content: content,
            isFromUser: isFromUser,
            audioData: audioData
        )

        message.conversation = conversation

        // Ensure messages array exists (CloudKit requires optional relationships)
        if conversation.messages == nil {
            conversation.messages = []
        }
        conversation.messages?.append(message)
        conversation.touch()

        modelContext.insert(message)
        try modelContext.save()

        logger.info("Added message to conversation \(conversation.id)")
        return message
    }

    // MARK: - Read

    /// Fetch all conversations
    func fetchAllConversations() throws -> [VoiceConversation] {
        let descriptor = FetchDescriptor<VoiceConversation>(
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Fetch conversations for a specific subject
    func fetchConversations(for subject: SubjectEntity) throws -> [VoiceConversation] {
        let subjectID = subject.id
        let predicate = #Predicate<VoiceConversation> { conversation in
            conversation.subjectID == subjectID
        }
        let descriptor = FetchDescriptor<VoiceConversation>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Fetch conversations for a specific material
    func fetchConversations(for material: Material) throws -> [VoiceConversation] {
        let materialID = material.id
        let predicate = #Predicate<VoiceConversation> { conversation in
            conversation.materialID == materialID
        }
        let descriptor = FetchDescriptor<VoiceConversation>(
            predicate: predicate,
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Fetch a specific conversation by ID
    func fetchConversation(id: UUID) throws -> VoiceConversation? {
        let predicate = #Predicate<VoiceConversation> { conversation in
            conversation.id == id
        }
        let descriptor = FetchDescriptor<VoiceConversation>(predicate: predicate)
        return try modelContext.fetch(descriptor).first
    }

    /// Search conversations by title
    func searchConversations(query: String) throws -> [VoiceConversation] {
        let descriptor = FetchDescriptor<VoiceConversation>(
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        let all = try modelContext.fetch(descriptor)
        return all.filter { $0.title.localizedCaseInsensitiveContains(query) }
    }

    // MARK: - Update

    /// Update conversation title
    func updateTitle(for conversation: VoiceConversation, title: String) throws {
        conversation.title = title
        conversation.touch()
        try modelContext.save()

        logger.info("Updated title for conversation \(conversation.id)")
    }

    /// Update conversation subject
    func updateSubject(for conversation: VoiceConversation, subject: SubjectEntity?) throws {
        conversation.subject = subject
        conversation.subjectID = subject?.id
        conversation.touch()
        try modelContext.save()

        logger.info("Updated subject for conversation \(conversation.id)")
    }

    /// Update conversation material
    func updateMaterial(for conversation: VoiceConversation, material: Material?) throws {
        conversation.material = material
        conversation.materialID = material?.id
        conversation.touch()
        try modelContext.save()

        logger.info("Updated material for conversation \(conversation.id)")
    }

    /// Generate title from first user message
    func generateTitleFromContent(for conversation: VoiceConversation) throws {
        conversation.generateTitleFromContent()
        try modelContext.save()

        logger.info("Generated title for conversation \(conversation.id): \(conversation.title)")
    }

    // MARK: - Delete

    /// Delete a conversation
    func deleteConversation(_ conversation: VoiceConversation) throws {
        modelContext.delete(conversation)
        try modelContext.save()

        logger.info("Deleted conversation")
    }

    /// Delete multiple conversations
    func deleteConversations(_ conversations: [VoiceConversation]) throws {
        for conversation in conversations {
            modelContext.delete(conversation)
        }
        try modelContext.save()

        logger.info("Deleted \(conversations.count) conversations")
    }

    /// Delete a specific message
    func deleteMessage(_ message: VoiceMessage) throws {
        if let conversation = message.conversation {
            conversation.touch()
        }

        modelContext.delete(message)
        try modelContext.save()

        logger.info("Deleted message")
    }

    // MARK: - Statistics

    /// Get conversation statistics
    func getStatistics() throws -> ConversationStatistics {
        let allConversations = try fetchAllConversations()

        let totalMessages = allConversations.reduce(0) { $0 + $1.messageCount }
        let totalUserMessages = allConversations.reduce(0) { $0 + $1.userMessageCount }
        let totalAIMessages = allConversations.reduce(0) { $0 + $1.aiMessageCount }

        let averageMessagesPerConversation = allConversations.isEmpty ? 0 :
            Double(totalMessages) / Double(allConversations.count)

        return ConversationStatistics(
            totalConversations: allConversations.count,
            totalMessages: totalMessages,
            totalUserMessages: totalUserMessages,
            totalAIMessages: totalAIMessages,
            averageMessagesPerConversation: averageMessagesPerConversation
        )
    }
}

// MARK: - Statistics Model

struct ConversationStatistics {
    let totalConversations: Int
    let totalMessages: Int
    let totalUserMessages: Int
    let totalAIMessages: Int
    let averageMessagesPerConversation: Double
}
