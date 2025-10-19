import Foundation
import os.log

/// Digest generation service for creating empathetic summaries (Task 132.2)
/// Generates both text and audio versions of weekly digests
@MainActor
final class DigestGenerationService {
    static let shared = DigestGenerationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "DigestGeneration")

    // MARK: - Dependencies

    private let textToSpeechService = TextToSpeechService.shared

    // MARK: - Initialization

    private init() {}

    // MARK: - Subtask 132.2: Generate Empathetic Copy & Audio

    /// Generate digest content from weekly metrics
    /// - Parameters:
    ///   - metrics: Weekly metrics to summarize
    ///   - studentName: Student's name for personalization
    ///   - recipientType: Whether this is for parent or teacher
    /// - Returns: Generated digest content
    func generateDigest(
        from metrics: WeeklyMetrics,
        studentName: String,
        recipientType: RecipientType
    ) async throws -> DigestContent {
        logger.info("Generating digest for \(studentName) (recipient: \(recipientType.rawValue))")

        // Generate text summary
        let textSummary = generateTextSummary(
            metrics: metrics,
            studentName: studentName,
            recipientType: recipientType
        )

        logger.info("Generated digest: \(textSummary.sections.count) sections")
        return DigestContent(
            textSummary: textSummary,
            generatedAt: Date(),
            recipientType: recipientType
        )
    }

    /// Generate audio version of digest
    /// - Parameters:
    ///   - content: Digest content to convert to audio
    ///   - voiceSettings: Voice settings for TTS
    /// - Returns: Audio data (optional, as it may be disabled)
    func generateAudio(
        from content: DigestContent,
        voiceSettings: VoiceSettings = .default
    ) async throws -> Data? {
        logger.info("Generating audio digest")

        // Combine all sections into a single narrative
        let narrative = buildAudioNarrative(from: content.textSummary)

        // Generate audio using TTS
        let audioData = try await textToSpeechService.synthesizeSpeech(
            text: narrative,
            voice: voiceSettings.voiceIdentifier,
            rate: voiceSettings.rate
        )

        logger.info("Audio digest generated: \(audioData.count) bytes")
        return audioData
    }

    // MARK: - Private: Text Generation

    /// Generate text summary using templates
    private func generateTextSummary(
        metrics: WeeklyMetrics,
        studentName: String,
        recipientType: RecipientType
    ) -> TextSummary {
        var sections: [DigestSection] = []

        // Opening/Greeting
        sections.append(generateGreetingSection(
            studentName: studentName,
            recipientType: recipientType
        ))

        // Progress Overview
        sections.append(generateProgressSection(metrics: metrics, studentName: studentName))

        // Subject Performance
        if !metrics.subjectPerformance.isEmpty {
            sections.append(generateSubjectSection(
                performance: metrics.subjectPerformance,
                studentName: studentName
            ))
        }

        // Achievements & Wins
        sections.append(generateAchievementsSection(metrics: metrics, studentName: studentName))

        // Areas for Support (if any)
        if !metrics.sentiment.concernSignals.isEmpty {
            sections.append(generateSupportSection(
                sentiment: metrics.sentiment,
                studentName: studentName,
                recipientType: recipientType
            ))
        }

        // Suggested Follow-ups
        sections.append(generateFollowUpSection(
            metrics: metrics,
            recipientType: recipientType
        ))

        // Closing
        sections.append(generateClosingSection(recipientType: recipientType))

        return TextSummary(
            title: generateTitle(metrics: metrics, studentName: studentName),
            sections: sections,
            weekPeriod: formatWeekPeriod(start: metrics.startDate, end: metrics.endDate)
        )
    }

    /// Generate greeting section
    private func generateGreetingSection(
        studentName: String,
        recipientType: RecipientType
    ) -> DigestSection {
        let greeting = recipientType == .parent
            ? "Hello! Here's how \(studentName) did this week with MirrorBuddy."
            : "Weekly student progress report for \(studentName)."

        return DigestSection(
            title: "Weekly Summary",
            content: greeting,
            tone: .warm
        )
    }

    /// Generate progress overview section
    private func generateProgressSection(
        metrics: WeeklyMetrics,
        studentName: String
    ) -> DigestSection {
        var content = ""

        // XP and leveling
        if metrics.xpGained > 0 {
            content += "\(studentName) earned \(metrics.xpGained) XP this week"
            if metrics.levelUps > 0 {
                content += " and leveled up \(metrics.levelUps) time\(metrics.levelUps > 1 ? "s" : "")! "
            } else {
                content += ". "
            }
        }

        // Study time
        if metrics.studyMinutes > 0 {
            let hours = metrics.studyMinutes / 60
            let minutes = metrics.studyMinutes % 60

            if hours > 0 {
                content += "Total study time: \(hours)h \(minutes)m. "
            } else {
                content += "Total study time: \(minutes) minutes. "
            }
        }

        // Streak
        switch metrics.streakStatus {
        case .strong:
            content += "Amazing \(metrics.currentStreak)-day study streak! "
        case .building:
            content += "Building a solid \(metrics.currentStreak)-day streak. "
        case .starting:
            content += "Started a new study routine. "
        case .broken:
            content += "Ready to build a new streak. "
        }

        return DigestSection(
            title: "Progress This Week",
            content: content,
            tone: .encouraging
        )
    }

    /// Generate subject performance section
    private func generateSubjectSection(
        performance: [SubjectPerformance],
        studentName: String
    ) -> DigestSection {
        var content = ""

        // Highlight strongest subject
        if let strongest = performance.first(where: { $0.performanceLevel == .excelling }) {
            content += "\(studentName) is excelling in \(strongest.subjectName). "
        }

        // List subjects studied
        let subjects = performance.prefix(3).map { $0.subjectName }
        if !subjects.isEmpty {
            content += "Active subjects this week: \(subjects.joined(separator: ", ")). "
        }

        // Mention any struggling areas
        let struggling = performance.filter { $0.performanceLevel == .struggling }
        if !struggling.isEmpty {
            let names = struggling.map { $0.subjectName }
            content += "Spending extra time on \(names.joined(separator: " and ")). "
        }

        return DigestSection(
            title: "Subject Focus",
            content: content,
            tone: .informative
        )
    }

    /// Generate achievements section
    private func generateAchievementsSection(
        metrics: WeeklyMetrics,
        studentName: String
    ) -> DigestSection {
        var highlights: [String] = []

        // Achievements
        if !metrics.achievementsUnlocked.isEmpty {
            let achievementNames = metrics.achievementsUnlocked.map { $0.localizedTitle }
            highlights.append("Unlocked: \(achievementNames.joined(separator: ", "))")
        }

        // Materials created
        if metrics.materialsCreated > 0 {
            highlights.append("Created \(metrics.materialsCreated) new study material\(metrics.materialsCreated > 1 ? "s" : "")")
        }

        // Flashcards reviewed
        if metrics.flashcardsReviewed > 0 {
            highlights.append("Reviewed \(metrics.flashcardsReviewed) flashcard\(metrics.flashcardsReviewed > 1 ? "s" : "")")
        }

        // Mind maps
        if metrics.mindMapsGenerated > 0 {
            highlights.append("Generated \(metrics.mindMapsGenerated) mind map\(metrics.mindMapsGenerated > 1 ? "s" : "")")
        }

        let content = highlights.isEmpty
            ? "\(studentName) is building study habits week by week."
            : "This week's wins: \(highlights.joined(separator: ", "))."

        return DigestSection(
            title: "Achievements & Highlights",
            content: content,
            tone: .celebratory
        )
    }

    /// Generate support section
    private func generateSupportSection(
        sentiment: WeeklySentiment,
        studentName: String,
        recipientType: RecipientType
    ) -> DigestSection {
        var content = ""

        if sentiment.overall == .struggling {
            content += recipientType == .parent
                ? "\(studentName) is working hard but may benefit from some extra support. "
                : "Student may need additional assistance. "
        }

        // List concern areas tactfully
        if !sentiment.concernSignals.isEmpty {
            let concerns = sentiment.concernSignals.prefix(2)
            content += "Areas to watch: \(concerns.joined(separator: "; ")). "
        }

        // Always end with encouragement
        content += "Every challenge is an opportunity to grow."

        return DigestSection(
            title: "Areas for Support",
            content: content,
            tone: .supportive
        )
    }

    /// Generate follow-up suggestions
    private func generateFollowUpSection(
        metrics: WeeklyMetrics,
        recipientType: RecipientType
    ) -> DigestSection {
        var suggestions: [String] = []

        // Streak-based suggestions
        if metrics.currentStreak >= 7 {
            suggestions.append("Keep the study momentum going!")
        } else if metrics.currentStreak < 3 {
            suggestions.append("Try establishing a consistent daily study routine")
        }

        // Subject-based suggestions
        let struggling = metrics.subjectPerformance.filter { $0.performanceLevel == .struggling }
        if !struggling.isEmpty {
            suggestions.append("Consider extra practice in \(struggling.first!.subjectName)")
        }

        // Study time suggestions
        if metrics.studyMinutes < 60 {
            suggestions.append("Aim for at least 10-15 minutes of focused study daily")
        }

        let content = suggestions.isEmpty
            ? "Continue the great work!"
            : "Suggested next steps: \(suggestions.joined(separator: "; "))."

        return DigestSection(
            title: "Suggested Follow-ups",
            content: content,
            tone: .encouraging
        )
    }

    /// Generate closing section
    private func generateClosingSection(recipientType: RecipientType) -> DigestSection {
        let closing = recipientType == .parent
            ? "Thank you for supporting your child's learning journey with MirrorBuddy. Questions? We're here to help!"
            : "For detailed analytics, please check the MirrorBuddy dashboard."

        return DigestSection(
            title: "",
            content: closing,
            tone: .warm
        )
    }

    /// Generate digest title
    private func generateTitle(metrics: WeeklyMetrics, studentName: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"

        return "\(studentName)'s Weekly Progress - \(formatter.string(from: metrics.startDate))"
    }

    /// Format week period
    private func formatWeekPeriod(start: Date, end: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"

        return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
    }

    // MARK: - Private: Audio Generation

    /// Build audio narrative from text summary
    private func buildAudioNarrative(from summary: TextSummary) -> String {
        var narrative = ""

        for section in summary.sections {
            // Add section title if present
            if !section.title.isEmpty {
                narrative += "\(section.title). "
            }

            // Add section content
            narrative += "\(section.content) "

            // Add pause between sections
            narrative += "\n\n"
        }

        return narrative.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Models (Subtask 132.2)

/// Recipient type for digest
enum RecipientType: String, Codable {
    case parent = "parent"
    case teacher = "teacher"
}

/// Digest content structure
struct DigestContent: Codable {
    let textSummary: TextSummary
    let generatedAt: Date
    let recipientType: RecipientType
}

/// Text summary structure
struct TextSummary: Codable {
    let title: String
    let sections: [DigestSection]
    let weekPeriod: String
}

/// Individual digest section
struct DigestSection: Codable {
    let title: String
    let content: String
    let tone: SectionTone
}

/// Section tone for formatting
enum SectionTone: String, Codable {
    case warm = "warm"
    case encouraging = "encouraging"
    case informative = "informative"
    case celebratory = "celebratory"
    case supportive = "supportive"
}

/// Voice settings for audio generation
struct VoiceSettings {
    let voiceIdentifier: String
    let rate: Float

    static let `default` = VoiceSettings(
        voiceIdentifier: "com.apple.ttsbundle.Samantha-compact",
        rate: 0.5
    )
}
