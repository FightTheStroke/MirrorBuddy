import Foundation

/// Parses natural language task descriptions into structured task data
struct NaturalLanguageTaskParser {
    // MARK: - Types

    struct ParsedTask {
        let title: String
        let subject: String?
        let dueDate: Date?
        let priority: TaskPriority
        let notes: String?

        enum TaskPriority: String, CaseIterable, Codable {
            case high = "High"
            case medium = "Medium"
            case low = "Low"

            var displayName: String {
                TaskCaptureStrings.Priority.name(for: self)
            }
        }
    }

    // MARK: - Parsing

    func parse(_ text: String, currentContext: TaskContext? = nil, availableSubjects: [SubjectEntity] = []) -> ParsedTask {
        let normalizedText = text.lowercased().trimmingCharacters(in: .whitespaces)

        let title = extractTitle(from: normalizedText)
        let subject = extractSubject(from: normalizedText, context: currentContext, availableSubjects: availableSubjects)
        let dueDate = extractDueDate(from: normalizedText)
        let priority = extractPriority(from: normalizedText)
        let notes = extractNotes(from: normalizedText)

        return ParsedTask(
            title: title,
            subject: subject,
            dueDate: dueDate,
            priority: priority,
            notes: notes
        )
    }

    // MARK: - Title Extraction

    private func extractTitle(from text: String) -> String {
        var titleText = text

        // Remove reminder prefixes
        let reminderPrefixes = [
            "ricordami di ",
            "ricordami che devo ",
            "ricordami ",
            "devo ",
            "dobbiamo ",
            "aggiungi task ",
            "aggiungi compito ",
            "nuovo task ",
            "nuovo compito "
        ]

        for prefix in reminderPrefixes where titleText.hasPrefix(prefix) {
            titleText.removeFirst(prefix.count)
            break
        }

        // Remove time/date suffixes
        let timePatterns = [
            " per domani",
            " per oggi",
            " per dopodomani",
            " per lunedì",
            " per martedì",
            " per mercoledì",
            " per giovedì",
            " per venerdì",
            " per sabato",
            " per domenica",
            " per la prossima settimana",
            " questa settimana",
            " urgente",
            " importante",
            " priorità alta",
            " priorità bassa"
        ]

        for pattern in timePatterns {
            if let range = titleText.range(of: pattern, options: .caseInsensitive) {
                titleText.removeSubrange(range)
            }
        }

        // Capitalize first letter
        return titleText.prefix(1).uppercased() + titleText.dropFirst()
    }

    // MARK: - Subject Extraction

    private func extractSubject(from text: String, context: TaskContext?, availableSubjects: [SubjectEntity]) -> String? {
        // Common keyword mappings for subject detection
        let commonKeywords: [String: [String]] = [
            "matematica": ["matematica", "mate", "algebra", "geometria", "calcolo"],
            "italiano": ["italiano", "ita", "grammatica", "letteratura"],
            "storia": ["storia", "storia antica", "storia moderna"],
            "fisica": ["fisica", "fisico"],
            "chimica": ["chimica", "chimico"],
            "biologia": ["biologia", "biologico"],
            "scienze": ["scienze", "scienza"],
            "inglese": ["inglese", "english"],
            "francese": ["francese", "french"],
            "spagnolo": ["spagnolo", "spanish"],
            "tedesco": ["tedesco", "german"]
        ]

        // Try to match against available subjects
        for subject in availableSubjects where subject.isActive {
            let subjectNameLower = subject.displayName.lowercased()
            let localizationKeyLower = subject.localizationKey.lowercased()

            // Direct match on display name or localization key
            if text.contains(subjectNameLower) || text.contains(localizationKeyLower) {
                return subject.displayName
            }

            // Check common keyword mappings
            if let keywords = commonKeywords[localizationKeyLower] {
                for keyword in keywords where text.contains(keyword) {
                    return subject.displayName
                }
            }
        }

        // Fall back to current context if available
        return context?.currentSubject
    }

    // MARK: - Due Date Extraction

    private func extractDueDate(from text: String) -> Date? {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        // Check for relative dates
        if text.contains("domani") {
            return calendar.date(byAdding: .day, value: 1, to: today)
        }

        if text.contains("oggi") {
            return today
        }

        if text.contains("dopodomani") {
            return calendar.date(byAdding: .day, value: 2, to: today)
        }

        if text.contains("questa settimana") || text.contains("settimana") {
            // Default to Friday of current week
            let weekday = calendar.component(.weekday, from: Date())
            let daysUntilFriday = (6 - weekday + 7) % 7
            return calendar.date(byAdding: .day, value: daysUntilFriday, to: today)
        }

        if text.contains("prossima settimana") || text.contains("settimana prossima") {
            return calendar.date(byAdding: .weekOfYear, value: 1, to: today)
        }

        // Check for specific weekdays
        let weekdays = [
            ("lunedì", 2),
            ("martedì", 3),
            ("mercoledì", 4),
            ("giovedì", 5),
            ("venerdì", 6),
            ("sabato", 7),
            ("domenica", 1)
        ]

        for (dayName, targetWeekday) in weekdays where text.contains(dayName) {
            return nextDate(for: targetWeekday, from: today)
        }

        // Default to tomorrow if no explicit date
        return calendar.date(byAdding: .day, value: 1, to: today)
    }

    private func nextDate(for targetWeekday: Int, from date: Date) -> Date? {
        let calendar = Calendar.current
        let currentWeekday = calendar.component(.weekday, from: date)

        var daysToAdd = targetWeekday - currentWeekday
        if daysToAdd <= 0 {
            daysToAdd += 7 // Next week
        }

        return calendar.date(byAdding: .day, value: daysToAdd, to: date)
    }

    // MARK: - Priority Extraction

    private func extractPriority(from text: String) -> ParsedTask.TaskPriority {
        // High priority keywords
        let highPriorityKeywords = [
            "urgente",
            "importante",
            "priorità alta",
            "subito",
            "immediatamente",
            "critico"
        ]

        for keyword in highPriorityKeywords where text.contains(keyword) {
            return .high
        }

        // Low priority keywords
        let lowPriorityKeywords = [
            "quando posso",
            "quando hai tempo",
            "non urgente",
            "priorità bassa",
            "prima o poi"
        ]

        for keyword in lowPriorityKeywords where text.contains(keyword) {
            return .low
        }

        // Default to medium priority
        return .medium
    }

    // MARK: - Notes Extraction

    private func extractNotes(from text: String) -> String? {
        // Extract any additional context or notes
        // This is a placeholder - could be enhanced with more sophisticated parsing
        nil
    }
}

// MARK: - Task Context

struct TaskContext {
    let currentSubject: String?
    let recentTasks: [String]
    let studySchedule: [String: [Date]]
}
