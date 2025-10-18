import Foundation
import SwiftData

/// Voice conversation with AI coach
@Model
final class VoiceConversation {
    var id: UUID = UUID()
    var title: String = ""
    var createdAt: Date = Date()
    var updatedAt: Date = Date()

    // Context associations
    var subjectID: UUID?
    var materialID: UUID?

    // Relationships (CloudKit requires all relationships to be optional)
    @Relationship(deleteRule: .cascade, inverse: \VoiceMessage.conversation)
    var messages: [VoiceMessage]? = []

    // NO inverse for one-side of one-to-many relationships
    @Relationship(deleteRule: .nullify)
    var subject: SubjectEntity?

    @Relationship(deleteRule: .nullify)
    var material: Material?

    init(
        title: String = "New Conversation",
        subject: SubjectEntity? = nil,
        material: Material? = nil
    ) {
        self.id = UUID()
        self.title = title
        self.subject = subject
        self.material = material
        self.subjectID = subject?.id
        self.materialID = material?.id
        self.createdAt = Date()
        self.updatedAt = Date()
        self.messages = []
    }

    /// Update the conversation timestamp
    func touch() {
        updatedAt = Date()
    }

    /// Get message count
    var messageCount: Int {
        messages?.count ?? 0
    }

    /// Get user message count
    var userMessageCount: Int {
        messages?.filter { $0.isFromUser }.count ?? 0
    }

    /// Get AI message count
    var aiMessageCount: Int {
        messages?.filter { !$0.isFromUser }.count ?? 0
    }

    /// Get conversation duration (time between first and last message)
    var duration: TimeInterval? {
        guard let messages = messages,
              let first = messages.first?.timestamp,
              let last = messages.last?.timestamp else {
            return nil
        }
        return last.timeIntervalSince(first)
    }

    /// Generate a title from the first user message
    func generateTitleFromContent() {
        guard let messages = messages,
              let firstUserMessage = messages.first(where: { $0.isFromUser }) else {
            return
        }

        // Take first 50 characters of first user message
        let content = firstUserMessage.content
        if content.count <= 50 {
            title = content
        } else {
            let index = content.index(content.startIndex, offsetBy: 50)
            title = String(content[..<index]) + "..."
        }
    }
}

/// Individual message in a voice conversation
@Model
final class VoiceMessage {
    var id: UUID = UUID()
    var content: String = ""
    var isFromUser: Bool = false
    var timestamp: Date = Date()

    // Optional audio data (for playback)
    @Attribute(.externalStorage)
    var audioData: Data?

    // Relationships (NO inverse for many-side of one-to-many)
    @Relationship(deleteRule: .nullify)
    var conversation: VoiceConversation?

    init(
        content: String,
        isFromUser: Bool,
        timestamp: Date = Date(),
        audioData: Data? = nil
    ) {
        self.id = UUID()
        self.content = content
        self.isFromUser = isFromUser
        self.timestamp = timestamp
        self.audioData = audioData
    }

    /// Get message role for display
    var role: String {
        isFromUser ? "user" : "assistant"
    }

    /// Get formatted timestamp
    var formattedTimestamp: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }

    /// Check if message has audio
    var hasAudio: Bool {
        audioData != nil
    }

    /// Get audio duration estimate (rough estimate based on data size)
    var estimatedAudioDuration: TimeInterval? {
        guard let data = audioData else { return nil }

        // PCM16 24kHz mono = 48000 bytes per second
        let bytesPerSecond = 48000.0
        return Double(data.count) / bytesPerSecond
    }
}
