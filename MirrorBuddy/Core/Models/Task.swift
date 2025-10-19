import Foundation
import SwiftData

/// Source of task creation
enum TaskSource: String, Codable {
    case manual
    case googleCalendar
    case googleClassroom
    case canvas
    case aiSuggested
}

/// Study or assignment task with Google Calendar integration
@Model
final class Task {
    var id = UUID()
    var title: String = ""
    var taskDescription: String?

    var dueDate: Date?
    var completedAt: Date?
    var isCompleted: Bool = false

    // LMS integration
    var googleCalendarEventID: String?
    var lmsAssignmentID: String? // Canvas assignment ID or Google Classroom coursework ID
    var lmsCourseID: String? // Course identifier from LMS
    var source = TaskSource.manual

    var createdAt = Date()
    var priority: Int = 3 // 1 (low) to 5 (high)

    // Relationships (NO inverse for one-to-many "one" side)
    @Relationship(deleteRule: .nullify)
    var subject: SubjectEntity?

    @Relationship(deleteRule: .nullify)
    var material: Material?

    init(
        title: String,
        description: String? = nil,
        subject: SubjectEntity? = nil,
        material: Material? = nil,
        dueDate: Date? = nil,
        source: TaskSource = .manual,
        priority: Int = 3
    ) {
        self.id = UUID()
        self.title = title
        self.taskDescription = description
        self.subject = subject
        self.material = material
        self.dueDate = dueDate
        self.isCompleted = false
        self.source = source
        self.createdAt = Date()
        self.priority = min(max(priority, 1), 5)
    }

    /// Mark task as completed
    func complete() {
        isCompleted = true
        completedAt = Date()
    }

    /// Mark task as incomplete
    func uncomplete() {
        isCompleted = false
        completedAt = nil
    }

    /// Check if task is overdue
    var isOverdue: Bool {
        guard let dueDate, !isCompleted else { return false }
        return dueDate < Date()
    }

    /// Check if task is due soon (within 24 hours)
    var isDueSoon: Bool {
        guard let dueDate, !isCompleted else { return false }
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
        return dueDate >= Date() && dueDate <= tomorrow
    }
}
