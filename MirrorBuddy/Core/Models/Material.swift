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
final class Material {
    var id: UUID
    var title: String
    var subject: Subject
    var createdAt: Date
    var lastAccessedAt: Date?

    // Content storage
    var pdfURL: URL?
    var textContent: String?
    var summary: String?

    // Google Drive integration
    var googleDriveFileID: String?

    // Processing state
    var processingStatus: ProcessingStatus

    // Relationships
    @Relationship(deleteRule: .cascade)
    var mindMap: MindMap?

    @Relationship(deleteRule: .cascade)
    var flashcards: [Flashcard] = []

    @Relationship(deleteRule: .nullify)
    var tasks: [Task] = []

    init(
        title: String,
        subject: Subject,
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
