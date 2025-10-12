import Foundation
import SwiftData

/// Service for managing subjects
final class SubjectService {
    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    /// Initialize default subjects for Mario if none exist
    func initializeDefaultSubjects() throws {
        let descriptor = FetchDescriptor<SubjectEntity>()
        let existingSubjects = try modelContext.fetch(descriptor)

        // Only seed if no subjects exist
        guard existingSubjects.isEmpty else { return }

        // Mario's 10 subjects + Other
        let defaultSubjects = [
            DefaultSubjectData(localizationKey: "subject.educazioneCivica", iconName: "building.columns", colorName: "purple", sortOrder: 0),
            DefaultSubjectData(localizationKey: "subject.fisica", iconName: "atom", colorName: "blue", sortOrder: 1),
            DefaultSubjectData(localizationKey: "subject.inglese", iconName: "book.closed", colorName: "red", sortOrder: 2),
            DefaultSubjectData(localizationKey: "subject.italiano", iconName: "text.book.closed", colorName: "green", sortOrder: 3),
            DefaultSubjectData(localizationKey: "subject.matematica", iconName: "function", colorName: "orange", sortOrder: 4),
            DefaultSubjectData(localizationKey: "subject.religione", iconName: "star.circle", colorName: "yellow", sortOrder: 5),
            DefaultSubjectData(localizationKey: "subject.scienzeMotorie", iconName: "figure.run", colorName: "cyan", sortOrder: 6),
            DefaultSubjectData(localizationKey: "subject.scienzeNaturali", iconName: "leaf", colorName: "mint", sortOrder: 7),
            DefaultSubjectData(localizationKey: "subject.sostegno", iconName: "heart.circle.fill", colorName: "pink", sortOrder: 8),
            DefaultSubjectData(localizationKey: "subject.storiaGeografia", iconName: "globe.europe.africa", colorName: "brown", sortOrder: 9),
            DefaultSubjectData(localizationKey: "subject.other", iconName: "folder", colorName: "gray", sortOrder: 10)
        ]

        for item in defaultSubjects {
            let subject = SubjectEntity(
                localizationKey: item.localizationKey,
                iconName: item.iconName,
                colorName: item.colorName,
                sortOrder: item.sortOrder,
                isActive: true,
                isCustom: false
            )
            modelContext.insert(subject)
        }

        try modelContext.save()
    }

    /// Get all subjects ordered by sortOrder
    func getAllSubjects() throws -> [SubjectEntity] {
        let descriptor = FetchDescriptor<SubjectEntity>(
            sortBy: [SortDescriptor(\.sortOrder)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Get only active subjects
    func getActiveSubjects() throws -> [SubjectEntity] {
        let descriptor = FetchDescriptor<SubjectEntity>(
            predicate: #Predicate { $0.isActive },
            sortBy: [SortDescriptor(\.sortOrder)]
        )
        return try modelContext.fetch(descriptor)
    }

    /// Create a new custom subject
    func createCustomSubject(
        name: String,
        iconName: String,
        colorName: String
    ) throws -> SubjectEntity {
        let subjects = try getAllSubjects()
        let maxOrder = subjects.map(\.sortOrder).max() ?? 0

        let subject = SubjectEntity(
            localizationKey: name, // For custom subjects, this IS the name
            iconName: iconName,
            colorName: colorName,
            sortOrder: maxOrder + 1,
            isActive: true,
            isCustom: true
        )

        modelContext.insert(subject)
        try modelContext.save()

        return subject
    }

    /// Update a subject
    func updateSubject(
        _ subject: SubjectEntity,
        name: String? = nil,
        iconName: String? = nil,
        colorName: String? = nil,
        isActive: Bool? = nil
    ) throws {
        if let name, subject.isCustom {
            subject.localizationKey = name
        }
        if let iconName {
            subject.iconName = iconName
        }
        if let colorName {
            subject.colorName = colorName
        }
        if let isActive {
            subject.isActive = isActive
        }

        try modelContext.save()
    }

    /// Delete a subject (only if custom and has no materials/tasks)
    func deleteSubject(_ subject: SubjectEntity) throws {
        guard subject.isCustom else {
            throw SubjectError.cannotDeleteDefault
        }

        guard subject.materials.isEmpty && subject.tasks.isEmpty else {
            throw SubjectError.hasAssociatedContent
        }

        modelContext.delete(subject)
        try modelContext.save()
    }

    /// Reorder subjects
    func reorderSubjects(_ subjects: [SubjectEntity]) throws {
        for (index, subject) in subjects.enumerated() {
            subject.sortOrder = index
        }
        try modelContext.save()
    }

    /// Toggle subject active state
    func toggleActive(_ subject: SubjectEntity) throws {
        subject.isActive.toggle()
        try modelContext.save()
    }
}

// MARK: - Default Subject Data
private struct DefaultSubjectData {
    let localizationKey: String
    let iconName: String
    let colorName: String
    let sortOrder: Int
}

// MARK: - Errors
enum SubjectError: LocalizedError {
    case cannotDeleteDefault
    case hasAssociatedContent

    var errorDescription: String? {
        switch self {
        case .cannotDeleteDefault:
            return String(localized: "error.subject.cannotDeleteDefault")
        case .hasAssociatedContent:
            return String(localized: "error.subject.hasAssociatedContent")
        }
    }
}
