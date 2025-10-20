import Foundation
import SwiftData

/// Processing status for materials
enum ProcessingStatus: String, Codable {
    case pending
    case processing
    case completed
    case failed
}

/// Learning material (PDF, text, or imported from Google Drive)
@Model
final class Material: @unchecked Sendable {
    var id = UUID()
    var title: String = ""
    var createdAt = Date()
    var lastAccessedAt: Date?

    // Content storage
    var pdfURL: URL?
    var textContent: String?
    var summary: String?
    var extractedText: String = "" // OCR extracted text from images

    // Google Drive integration
    var googleDriveFileID: String?

    // Processing state
    var processingStatus = ProcessingStatus.pending

    // Relationships (NO inverse for one-to-many "one" side)
    @Relationship(deleteRule: .nullify)
    var subject: SubjectEntity?

    @Relationship(deleteRule: .cascade, inverse: \MindMap.material)
    var mindMap: MindMap?

    @Relationship(deleteRule: .cascade, inverse: \Flashcard.material)
    var flashcards: [Flashcard]?

    @Relationship(deleteRule: .nullify, inverse: \Task.material)
    var tasks: [Task]?

    @Relationship(deleteRule: .cascade)
    var transcript: Transcript?

    @Relationship(deleteRule: .nullify, inverse: \VoiceConversation.material)
    var voiceConversations: [VoiceConversation]?

    init(
        title: String,
        subject: SubjectEntity? = nil,
        googleDriveFileID: String? = nil
    ) {
        self.id = UUID()
        self.title = title
        self.subject = subject
        self.createdAt = Date()
        self.googleDriveFileID = googleDriveFileID
        self.processingStatus = .pending
    }

    /// Update last accessed timestamp
    func markAccessed() {
        lastAccessedAt = Date()
    }

    /// Check if material needs re-processing
    var needsReprocessing: Bool {
        processingStatus == .failed || processingStatus == .pending
    }
}
