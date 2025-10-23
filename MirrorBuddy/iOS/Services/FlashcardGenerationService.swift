import Foundation
import os.log
import SwiftData

/// Flashcard generation service using GPT-5 Nano (Task 23)
@MainActor
final class FlashcardGenerationService {
    /// Shared singleton instance
    static let shared = FlashcardGenerationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "FlashcardGeneration")

    // MARK: - Configuration

    /// Target number of flashcards per 1000 words
    private let cardsPerThousandWords = 5

    /// Minimum content length for flashcard generation (words)
    private let minimumContentLength = 50

    // MARK: - Dependencies (Subtask 23.1 & 23.2)

    private var openAIClient: OpenAIClient?
    private var modelContext: ModelContext?

    // MARK: - Initialization

    private init() {
        setupClient()
    }

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Flashcard service configured with model context")
    }

    private func setupClient() {
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            openAIClient = OpenAIClient(configuration: config)
            logger.info("GPT-5 Nano client configured")
        } else {
            logger.warning("No API configuration found")
        }
    }

    // MARK: - Flashcard Generation (Subtask 23.2)

    /// Generate flashcards from study material text
    func generateFlashcards(
        from text: String,
        materialID: UUID,
        subject: Subject? = nil,
        targetCount: Int? = nil,
        forceOffline: Bool = false
    ) async throws -> [Flashcard] {
        logger.info("Generating flashcards for material \(materialID)")

        guard text.split(separator: " ").count >= minimumContentLength else {
            throw FlashcardGenerationError.contentTooShort
        }

        // Check if we should use offline mode
        let isOnline = OfflineManager.shared.isOnline
        let useOfflineMode = forceOffline || !isOnline || openAIClient == nil

        if useOfflineMode {
            logger.info("Using offline flashcard generation")
            return try await generateOfflineFlashcards(from: text, materialID: materialID, subject: subject, targetCount: targetCount)
        }

        // Online mode - use AI generation
        guard let client = openAIClient else {
            throw FlashcardGenerationError.noClientAvailable
        }

        // Calculate target number of flashcards
        let wordCount = text.split(separator: " ").count
        let calculatedTarget = max(5, (wordCount * cardsPerThousandWords) / 1_000)
        let finalTarget = targetCount ?? calculatedTarget

        logger.debug("Target flashcard count: \(finalTarget)")

        // Build prompt for flashcard generation
        let prompt = buildFlashcardPrompt(text: text, count: finalTarget, subject: subject)

        // Call GPT-5 Nano
        let response = try await client.chatCompletion(
            model: .gpt5Nano,
            messages: [
                ChatMessage(role: .system, content: .text(getSystemPrompt(subject: subject))),
                ChatMessage(role: .user, content: .text(prompt))
            ],
            temperature: 0.7,
            maxTokens: 2_000
        )

        guard let content = response.choices.first?.message.content else {
            throw FlashcardGenerationError.emptyResponse
        }

        // Parse response into flashcards
        let flashcardData = try parseFlashcardResponse(content)

        // Create Flashcard models
        let flashcards = flashcardData.map { data in
            Flashcard(
                materialID: materialID,
                question: data.question,
                answer: data.answer,
                explanation: data.explanation
            )
        }

        // Store in SwiftData (Subtask 23.3)
        try storeFlashcards(flashcards)

        logger.info("Generated \(flashcards.count) flashcards")
        return flashcards
    }

    // MARK: - Prompt Engineering

    /// Get system prompt for flashcard generation
    private func getSystemPrompt(subject: Subject?) -> String {
        let basePrompt = """
        You are an expert educational flashcard creator. Your role is to generate effective flashcards for student learning.

        FLASHCARD PRINCIPLES:
        1. Questions should test understanding, not just memorization
        2. Each flashcard focuses on ONE specific concept
        3. Questions are clear and unambiguous
        4. Answers are concise but complete
        5. Include explanations for complex concepts
        6. Vary difficulty levels (easy, medium, hard)
        7. Use active recall techniques

        OUTPUT FORMAT (strict JSON):
        {
          "flashcards": [
            {
              "question": "Clear, specific question here",
              "answer": "Concise but complete answer",
              "explanation": "Optional explanation of the concept",
              "difficulty": "easy|medium|hard"
            }
          ]
        }
        """

        if let subject = subject {
            return basePrompt + "\n\n" + getSubjectSpecificGuidance(subject)
        }

        return basePrompt
    }

    /// Get subject-specific flashcard guidance
    private func getSubjectSpecificGuidance(_ subject: Subject) -> String {
        switch subject {
        case .matematica, .fisica:
            return """
            MATHEMATICS/PHYSICS FLASHCARDS:
            - Include problem-solving questions
            - Ask for formula applications
            - Test conceptual understanding, not just memorization
            - Include step-by-step solution explanations
            - Use concrete numerical examples
            """
        case .scienzeNaturali:
            return """
            SCIENCE FLASHCARDS:
            - Focus on processes and mechanisms
            - Test cause-effect relationships
            - Include experimental design questions
            - Ask about real-world applications
            - Test vocabulary with context
            """
        case .storiaGeografia, .educazioneCivica:
            return """
            HISTORY/GEOGRAPHY FLASHCARDS:
            - Ask about cause-effect in events
            - Test chronological understanding
            - Include significance/impact questions
            - Connect events to broader themes
            - Test key figures and their contributions
            """
        case .italiano:
            return """
            ITALIAN LITERATURE FLASHCARDS:
            - Test themes and motifs
            - Ask about character analysis
            - Include literary device identification
            - Test author context and influences
            - Ask for text interpretation
            """
        case .inglese:
            return """
            ENGLISH LANGUAGE FLASHCARDS:
            - Test grammar rules with examples
            - Include vocabulary in context
            - Ask for sentence construction
            - Test idiomatic expressions
            - Include translation exercises
            """
        case .religione, .scienzeMotorie, .sostegno, .other:
            return """
            GENERAL FLASHCARDS:
            - Focus on key concepts
            - Test understanding with examples
            - Include practical applications
            - Ask open-ended questions
            - Test connections between ideas
            """
        }
    }

    /// Build flashcard generation prompt
    private func buildFlashcardPrompt(text: String, count: Int, subject: Subject?) -> String {
        let subjectContext = subject.map { " for \($0.rawValue)" } ?? ""

        return """
        Generate \(count) high-quality flashcards\(subjectContext) from the following study material.

        REQUIREMENTS:
        - Create exactly \(count) flashcards
        - Balance difficulty: ~40% easy, ~40% medium, ~20% hard
        - Focus on most important concepts
        - Ensure questions are self-contained
        - Vary question types (what, why, how, when, etc.)

        STUDY MATERIAL:
        \(text)

        Generate the flashcards JSON now:
        """
    }

    // MARK: - Response Parsing (Subtask 23.3)

    /// Parse GPT-5 Nano response into flashcard data
    private func parseFlashcardResponse(_ response: String) throws -> [FlashcardData] {
        // Extract JSON from response
        let jsonString = extractJSON(from: response)

        guard let data = jsonString.data(using: .utf8) else {
            throw FlashcardGenerationError.invalidResponse
        }

        let decoder = JSONDecoder()
        let structure = try decoder.decode(FlashcardResponse.self, from: data)

        // Validate flashcards
        try validateFlashcards(structure.flashcards)

        return structure.flashcards
    }

    /// Extract JSON from markdown code blocks
    private func extractJSON(from text: String) -> String {
        let cleaned = text
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if let startIndex = cleaned.firstIndex(of: "{"),
           let endIndex = cleaned.lastIndex(of: "}") {
            return String(cleaned[startIndex...endIndex])
        }

        return cleaned
    }

    /// Validate generated flashcards
    private func validateFlashcards(_ flashcards: [FlashcardData]) throws {
        guard !flashcards.isEmpty else {
            throw FlashcardGenerationError.noFlashcardsGenerated
        }

        for (index, flashcard) in flashcards.enumerated() {
            // Validate question
            guard !flashcard.question.trimmingCharacters(in: .whitespaces).isEmpty else {
                throw FlashcardGenerationError.invalidFlashcard(index, "Empty question")
            }

            // Validate answer
            guard !flashcard.answer.trimmingCharacters(in: .whitespaces).isEmpty else {
                throw FlashcardGenerationError.invalidFlashcard(index, "Empty answer")
            }

            // Check length constraints
            guard flashcard.question.count <= 300 else {
                throw FlashcardGenerationError.invalidFlashcard(index, "Question too long")
            }

            guard flashcard.answer.count <= 500 else {
                throw FlashcardGenerationError.invalidFlashcard(index, "Answer too long")
            }
        }
    }

    // MARK: - Storage (Subtask 23.3)

    /// Store flashcards in SwiftData
    private func storeFlashcards(_ flashcards: [Flashcard]) throws {
        guard let context = modelContext else {
            logger.warning("No model context available for storing flashcards")
            return
        }

        for flashcard in flashcards {
            context.insert(flashcard)
        }

        do {
            try context.save()
            logger.debug("Stored \(flashcards.count) flashcards")
        } catch {
            logger.error("Failed to store flashcards: \(error.localizedDescription)")
            throw error
        }
    }

    /// Retrieve flashcards for material
    func getFlashcards(for materialID: UUID) throws -> [Flashcard] {
        guard let context = modelContext else { return [] }

        let descriptor = FetchDescriptor<Flashcard>(
            predicate: #Predicate { flashcard in
                flashcard.materialID == materialID
            },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )

        return try context.fetch(descriptor)
    }

    /// Get due flashcards for review
    func getDueFlashcards(for materialID: UUID) throws -> [Flashcard] {
        let allFlashcards = try getFlashcards(for: materialID)
        return allFlashcards.filter { $0.isDue }
    }

    /// Delete flashcards for material
    func deleteFlashcards(for materialID: UUID) throws {
        guard let context = modelContext else { return }

        let flashcards = try getFlashcards(for: materialID)

        for flashcard in flashcards {
            context.delete(flashcard)
        }

        try context.save()
        logger.info("Deleted \(flashcards.count) flashcards")
    }

    // MARK: - Batch Processing

    /// Generate flashcards for multiple materials
    func generateFlashcardsBatch(
        materials: [(text: String, materialID: UUID, subject: Subject?)],
        targetCountPerMaterial: Int? = nil
    ) async throws -> [UUID: [Flashcard]] {
        var results: [UUID: [Flashcard]] = [:]

        for (index, material) in materials.enumerated() {
            logger.debug("Processing material \(index + 1) of \(materials.count)")

            do {
                let flashcards = try await generateFlashcards(
                    from: material.text,
                    materialID: material.materialID,
                    subject: material.subject,
                    targetCount: targetCountPerMaterial
                )
                results[material.materialID] = flashcards

                // Add delay between requests
                if index < materials.count - 1 {
                    try await _Concurrency.Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                }
            } catch {
                logger.warning("Failed to generate flashcards for material \(material.materialID): \(error.localizedDescription)")
                // Continue with other materials
            }
        }

        return results
    }

    // MARK: - Statistics

    /// Get flashcard statistics for material
    func getStatistics(for materialID: UUID) throws -> FlashcardStatistics {
        let flashcards = try getFlashcards(for: materialID)

        let total = flashcards.count
        let reviewed = flashcards.filter { $0.lastReviewedAt != nil }.count
        let due = flashcards.filter { $0.isDue }.count
        let mastered = flashcards.filter { $0.repetitions >= 3 && $0.easeFactor >= 2.5 }.count

        let avgEaseFactor = flashcards.isEmpty ? 0 : flashcards.map { $0.easeFactor }.reduce(0, +) / Double(flashcards.count)

        return FlashcardStatistics(
            total: total,
            reviewed: reviewed,
            due: due,
            mastered: mastered,
            averageEaseFactor: avgEaseFactor
        )
    }

    // MARK: - Offline Flashcard Generation (Task 57)

    /// Generate flashcards using rule-based approach when offline
    private func generateOfflineFlashcards(
        from text: String,
        materialID: UUID,
        subject: Subject?,
        targetCount: Int?
    ) async throws -> [Flashcard] {
        logger.info("Generating offline flashcards using rule-based approach")

        // Calculate target number of flashcards
        let wordCount = text.split(separator: " ").count
        let calculatedTarget = max(3, min(10, (wordCount * cardsPerThousandWords) / 1_000))
        let finalTarget = targetCount ?? calculatedTarget

        var flashcards: [Flashcard] = []

        // Split text into sentences
        let sentences = text.components(separatedBy: CharacterSet(charactersIn: ".!?"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && $0.split(separator: " ").count >= 5 }

        // Strategy 1: Extract key sentences and create fill-in-the-blank questions
        let keywordFlashcards = extractKeywordFlashcards(from: sentences, limit: finalTarget / 2)
        flashcards.append(contentsOf: keywordFlashcards.map { data in
            Flashcard(
                materialID: materialID,
                question: data.question,
                answer: data.answer,
                explanation: "Generated from key content in offline mode"
            )
        })

        // Strategy 2: Create definition-style questions from longer sentences
        let definitionFlashcards = extractDefinitionFlashcards(from: sentences, limit: finalTarget - flashcards.count)
        flashcards.append(contentsOf: definitionFlashcards.map { data in
            Flashcard(
                materialID: materialID,
                question: data.question,
                answer: data.answer,
                explanation: "Generated from material content in offline mode"
            )
        })

        // Store in SwiftData
        try storeFlashcards(flashcards)

        logger.info("Generated \(flashcards.count) offline flashcards")
        return flashcards
    }

    /// Extract keyword-based flashcards (fill-in-the-blank style)
    private func extractKeywordFlashcards(from sentences: [String], limit: Int) -> [FlashcardData] {
        var flashcards: [FlashcardData] = []

        for sentence in sentences.prefix(limit * 2) {
            let words = sentence.split(separator: " ")
            guard words.count >= 5 else { continue }

            // Find important words (longer words that might be key terms)
            let importantWords = words.filter { $0.count >= 5 && !commonWords.contains($0.lowercased()) }

            guard let keyword = importantWords.randomElement() else { continue }

            let question = sentence.replacingOccurrences(of: String(keyword), with: "_____")
            let answer = String(keyword)

            flashcards.append(FlashcardData(
                question: "Fill in the blank: \(question)",
                answer: answer,
                explanation: nil,
                difficulty: nil
            ))

            if flashcards.count >= limit {
                break
            }
        }

        return flashcards
    }

    /// Extract definition-style flashcards
    private func extractDefinitionFlashcards(from sentences: [String], limit: Int) -> [FlashcardData] {
        var flashcards: [FlashcardData] = []

        for sentence in sentences.prefix(limit * 2) {
            let words = sentence.split(separator: " ")
            guard words.count >= 8 else { continue }

            // Extract potential topic from beginning of sentence
            let topic = words.prefix(3).joined(separator: " ")

            flashcards.append(FlashcardData(
                question: "What does the material say about \(topic)?",
                answer: sentence,
                explanation: nil,
                difficulty: nil
            ))

            if flashcards.count >= limit {
                break
            }
        }

        return flashcards
    }

    /// Common words to exclude from keyword extraction
    private var commonWords: Set<String> {
        [
            "the", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "must", "can", "this",
            "that", "these", "those", "with", "from", "about", "into",
            "through", "during", "before", "after", "above", "below",
            "between", "under", "over", "again", "further", "then",
            "once", "here", "there", "when", "where", "why", "how",
            "all", "both", "each", "few", "more", "most", "other",
            "some", "such", "only", "own", "same", "than", "too",
            "very", "just", "but", "and", "for", "not", "also"
        ]
    }
}

// MARK: - Supporting Types

/// Flashcard response from API
struct FlashcardResponse: Codable {
    let flashcards: [FlashcardData]
}

/// Individual flashcard data from API
struct FlashcardData: Codable {
    let question: String
    let answer: String
    let explanation: String?
    let difficulty: String?
}

/// Flashcard statistics
struct FlashcardStatistics {
    let total: Int
    let reviewed: Int
    let due: Int
    let mastered: Int
    let averageEaseFactor: Double

    var reviewProgress: Double {
        guard total > 0 else { return 0 }
        return Double(reviewed) / Double(total)
    }

    var masteryProgress: Double {
        guard total > 0 else { return 0 }
        return Double(mastered) / Double(total)
    }
}

/// Flashcard generation errors
enum FlashcardGenerationError: LocalizedError {
    case noClientAvailable
    case contentTooShort
    case emptyResponse
    case invalidResponse
    case noFlashcardsGenerated
    case invalidFlashcard(Int, String)

    var errorDescription: String? {
        switch self {
        case .noClientAvailable:
            return "No API client available for flashcard generation"
        case .contentTooShort:
            return "Content too short to generate meaningful flashcards"
        case .emptyResponse:
            return "Received empty response from API"
        case .invalidResponse:
            return "Invalid response format from API"
        case .noFlashcardsGenerated:
            return "No flashcards were generated"
        case let .invalidFlashcard(index, reason):
            return "Invalid flashcard at index \(index): \(reason)"
        }
    }
}
