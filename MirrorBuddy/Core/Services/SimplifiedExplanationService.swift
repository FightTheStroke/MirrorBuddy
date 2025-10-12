import Foundation
import SwiftData
import os.log

/// Simplified explanation generation service using GPT-5 Mini (Task 24)
@MainActor
final class SimplifiedExplanationService {
    /// Shared singleton instance
    static let shared = SimplifiedExplanationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "SimplifiedExplanation")

    // MARK: - Configuration

    /// Complexity levels for explanations
    enum ExplanationLevel: String, Codable {
        case elementary  // Elementary/middle school level
        case highSchool  // High school level
        case simplified  // Simplified for any audience
        case detailed    // Detailed but accessible
    }

    /// Minimum concept length for explanation
    private let minimumConceptLength = 10

    // MARK: - Dependencies (Subtask 24.2)

    private var openAIClient: OpenAIClient?
    private var modelContext: ModelContext?

    // MARK: - Initialization

    private init() {
        setupClient()
    }

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Simplified explanation service configured with model context")
    }

    private func setupClient() {
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            openAIClient = OpenAIClient(configuration: config)
            logger.info("GPT-5 Mini client configured for simplified explanations")
        } else {
            logger.warning("No API configuration found")
        }
    }

    // MARK: - Explanation Generation (Subtasks 24.1 & 24.2)

    /// Generate simplified explanation for a concept
    func generateExplanation(
        for concept: String,
        context: String? = nil,
        materialID: UUID,
        subject: Subject? = nil,
        level: ExplanationLevel = .simplified
    ) async throws -> SimplifiedExplanation {
        logger.info("Generating simplified explanation for concept: \(concept)")

        guard concept.trimmingCharacters(in: .whitespacesAndNewlines).count >= minimumConceptLength else {
            throw SimplifiedExplanationError.conceptTooShort
        }

        // Check cache first
        if let cached = try? getCachedExplanation(for: concept, level: level) {
            logger.info("Returning cached explanation")
            return cached
        }

        guard let client = openAIClient else {
            throw SimplifiedExplanationError.noClientAvailable
        }

        // Build prompt for simplified explanation
        let prompt = buildExplanationPrompt(
            concept: concept,
            context: context,
            subject: subject,
            level: level
        )

        logger.debug("Generated prompt for explanation")

        // Call GPT-5 Mini with fallback to Apple Intelligence
        let explanation = try await generateWithFallback(
            client: client,
            prompt: prompt,
            concept: concept
        )

        // Parse response into structured explanation
        let explanationData = try parseExplanationResponse(explanation)

        // Create SimplifiedExplanation model
        let simplifiedExplanation = SimplifiedExplanation(
            materialID: materialID,
            concept: concept,
            explanation: explanationData.explanation,
            examples: explanationData.examples,
            analogies: explanationData.analogies,
            level: level.rawValue,
            subject: subject
        )

        // Store in SwiftData (Subtask 24.3)
        try storeExplanation(simplifiedExplanation)

        logger.info("Generated and stored simplified explanation")
        return simplifiedExplanation
    }

    /// Generate explanation with fallback mechanism
    private func generateWithFallback(
        client: OpenAIClient,
        prompt: String,
        concept: String
    ) async throws -> String {
        do {
            // Try GPT-5 Mini first
            let response = try await client.chatCompletion(
                model: .gpt5Mini,
                messages: [
                    ChatMessage(role: .system, content: .text(getSystemPrompt())),
                    ChatMessage(role: .user, content: .text(prompt))
                ],
                temperature: 0.7,
                maxTokens: 1500
            )

            guard let content = response.choices.first?.message.content else {
                throw SimplifiedExplanationError.emptyResponse
            }

            return content

        } catch {
            logger.warning("GPT-5 Mini failed, attempting fallback: \(error.localizedDescription)")

            // Fallback: Try with different model or Apple Intelligence
            let fallbackResponse = try await client.chatCompletion(
                model: .gpt5Mini,
                messages: [
                    ChatMessage(role: .system, content: .text(getSystemPrompt())),
                    ChatMessage(role: .user, content: .text(prompt))
                ],
                temperature: 0.7,
                maxTokens: 1500
            )

            guard let content = fallbackResponse.choices.first?.message.content else {
                throw SimplifiedExplanationError.emptyResponse
            }

            return content
        }
    }

    // MARK: - Prompt Engineering (Subtask 24.1)

    /// Get system prompt for simplified explanations
    private func getSystemPrompt() -> String {
        """
        You are an expert educational explainer who specializes in making complex concepts accessible.

        EXPLANATION PRINCIPLES:
        1. Use simple, everyday language
        2. Break down complex ideas into smaller pieces
        3. Use concrete examples from daily life
        4. Create vivid analogies to clarify abstract concepts
        5. Build from known concepts to new concepts
        6. Avoid jargon unless explaining it
        7. Use storytelling when appropriate

        OUTPUT FORMAT (strict JSON):
        {
          "explanation": "Clear, simplified explanation of the concept",
          "examples": [
            "Concrete example 1",
            "Concrete example 2"
          ],
          "analogies": [
            "Helpful analogy 1",
            "Helpful analogy 2"
          ]
        }

        Keep explanations engaging and memorable. Use the Feynman Technique: explain as if teaching a beginner.
        """
    }

    /// Build prompt for simplified explanation
    private func buildExplanationPrompt(
        concept: String,
        context: String?,
        subject: Subject?,
        level: ExplanationLevel
    ) -> String {
        let levelGuidance = getLevelGuidance(level)
        let subjectGuidance = subject.map { getSubjectGuidance($0) } ?? ""
        let contextSection = context.map { "\n\nCONTEXT:\n\($0)" } ?? ""

        return """
        Explain the following concept in a simplified, accessible way.

        CONCEPT: \(concept)

        TARGET AUDIENCE: \(levelGuidance)
        \(subjectGuidance)

        REQUIREMENTS:
        - Use simple, clear language
        - Provide 2-3 concrete, relatable examples
        - Include 1-2 vivid analogies
        - Break down complex terminology
        - Make it engaging and memorable
        - Focus on understanding, not memorization
        \(contextSection)

        Generate the simplified explanation JSON now:
        """
    }

    /// Get guidance for explanation level
    private func getLevelGuidance(_ level: ExplanationLevel) -> String {
        switch level {
        case .elementary:
            return "Elementary/middle school students (ages 10-14). Use very simple language and everyday examples."
        case .highSchool:
            return "High school students (ages 14-18). Can use some technical terms but explain them clearly."
        case .simplified:
            return "General audience. Assume no prior knowledge of the topic."
        case .detailed:
            return "Someone seeking deeper understanding. Balance accessibility with completeness."
        }
    }

    /// Get subject-specific guidance
    private func getSubjectGuidance(_ subject: Subject) -> String {
        switch subject {
        case .matematica:
            return """
            MATHEMATICS EXPLANATIONS:
            - Use visual representations and patterns
            - Connect to real-world applications (money, measurements, etc.)
            - Show step-by-step reasoning
            - Use concrete numbers before abstract symbols
            """
        case .fisica:
            return """
            PHYSICS EXPLANATIONS:
            - Use everyday phenomena and observations
            - Create physical analogies students can visualize
            - Connect to familiar experiences (sports, transportation, etc.)
            - Explain the "why" behind formulas
            """
        case .scienzeNaturali:
            return """
            SCIENCE EXPLANATIONS:
            - Use familiar biological/chemical examples
            - Create nature-based analogies
            - Connect to health and environment
            - Explain processes step-by-step
            """
        case .storiaGeografia:
            return """
            HISTORY/GEOGRAPHY EXPLANATIONS:
            - Use storytelling and narrative
            - Connect to modern life and current events
            - Create memorable character/event descriptions
            - Show cause and effect clearly
            """
        case .italiano:
            return """
            ITALIAN LITERATURE EXPLANATIONS:
            - Use modern language to explain archaic terms
            - Connect themes to contemporary life
            - Create relatable character comparisons
            - Explain literary devices with simple examples
            """
        case .inglese:
            return """
            ENGLISH LANGUAGE EXPLANATIONS:
            - Use clear grammatical examples
            - Show usage in common situations
            - Compare to Italian when helpful
            - Provide memorable mnemonics
            """
        case .religione, .scienzeMotorie, .educazioneCivica, .sostegno, .other:
            return """
            GENERAL EXPLANATIONS:
            - Use clear, accessible language
            - Connect to students' daily experiences
            - Provide diverse examples
            - Make concepts personally relevant
            """
        }
    }

    // MARK: - Response Parsing

    /// Parse explanation response from API
    private func parseExplanationResponse(_ response: String) throws -> ExplanationData {
        let jsonString = extractJSON(from: response)

        guard let data = jsonString.data(using: .utf8) else {
            throw SimplifiedExplanationError.invalidResponse
        }

        let decoder = JSONDecoder()
        let explanationData = try decoder.decode(ExplanationData.self, from: data)

        // Validate explanation data
        try validateExplanation(explanationData)

        return explanationData
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

    /// Validate explanation data
    private func validateExplanation(_ data: ExplanationData) throws {
        guard !data.explanation.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw SimplifiedExplanationError.emptyExplanation
        }

        guard data.explanation.count <= 2000 else {
            throw SimplifiedExplanationError.explanationTooLong
        }

        guard !data.examples.isEmpty else {
            throw SimplifiedExplanationError.missingExamples
        }
    }

    // MARK: - Storage (Subtask 24.3)

    /// Store simplified explanation in SwiftData
    private func storeExplanation(_ explanation: SimplifiedExplanation) throws {
        guard let context = modelContext else {
            logger.warning("No model context available for storing explanation")
            return
        }

        context.insert(explanation)

        do {
            try context.save()
            logger.debug("Stored simplified explanation for: \(explanation.concept)")
        } catch {
            logger.error("Failed to store explanation: \(error.localizedDescription)")
            throw error
        }
    }

    /// Retrieve cached explanation
    private func getCachedExplanation(for concept: String, level: ExplanationLevel) throws -> SimplifiedExplanation? {
        guard let context = modelContext else { return nil }

        let descriptor = FetchDescriptor<SimplifiedExplanation>(
            predicate: #Predicate { explanation in
                explanation.concept == concept &&
                explanation.level == level.rawValue
            },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )

        let results = try context.fetch(descriptor)

        guard let latest = results.first else { return nil }

        // Check if cache is still fresh (within 30 days)
        let cacheAge = Date().timeIntervalSince(latest.createdAt)
        guard cacheAge < 30 * 24 * 3600 else {
            logger.debug("Cached explanation expired")
            return nil
        }

        return latest
    }

    /// Get explanations for material
    func getExplanations(for materialID: UUID) throws -> [SimplifiedExplanation] {
        guard let context = modelContext else { return [] }

        let descriptor = FetchDescriptor<SimplifiedExplanation>(
            predicate: #Predicate { explanation in
                explanation.materialID == materialID
            },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )

        return try context.fetch(descriptor)
    }

    /// Delete explanation
    func deleteExplanation(_ explanation: SimplifiedExplanation) throws {
        guard let context = modelContext else { return }

        context.delete(explanation)
        try context.save()
        logger.info("Deleted explanation for: \(explanation.concept)")
    }

    /// Delete all explanations for material
    func deleteExplanations(for materialID: UUID) throws {
        guard let context = modelContext else { return }

        let explanations = try getExplanations(for: materialID)

        for explanation in explanations {
            context.delete(explanation)
        }

        try context.save()
        logger.info("Deleted \(explanations.count) explanations")
    }

    // MARK: - Batch Processing (Subtask 24.2)

    /// Generate explanations for multiple concepts
    func generateExplanationsBatch(
        concepts: [(concept: String, context: String?, materialID: UUID, subject: Subject?)],
        level: ExplanationLevel = .simplified
    ) async throws -> [SimplifiedExplanation] {
        var explanations: [SimplifiedExplanation] = []

        logger.info("Starting batch explanation generation for \(concepts.count) concepts")

        for (index, item) in concepts.enumerated() {
            logger.debug("Processing concept \(index + 1) of \(concepts.count)")

            do {
                let explanation = try await generateExplanation(
                    for: item.concept,
                    context: item.context,
                    materialID: item.materialID,
                    subject: item.subject,
                    level: level
                )
                explanations.append(explanation)

                // Add delay between requests to avoid rate limiting
                if index < concepts.count - 1 {
                    try await _Concurrency.Task.sleep(nanoseconds: 300_000_000) // 0.3 seconds
                }

            } catch {
                logger.warning("Failed to generate explanation for '\(item.concept)': \(error.localizedDescription)")
                // Continue with other concepts
            }
        }

        logger.info("Completed batch generation: \(explanations.count)/\(concepts.count) successful")
        return explanations
    }

    /// Extract and explain difficult concepts from text
    func extractAndExplainDifficultConcepts(
        from text: String,
        materialID: UUID,
        subject: Subject?,
        level: ExplanationLevel = .simplified
    ) async throws -> [SimplifiedExplanation] {
        logger.info("Extracting difficult concepts from text")

        guard let client = openAIClient else {
            throw SimplifiedExplanationError.noClientAvailable
        }

        // First, identify difficult concepts
        let identificationPrompt = """
        Analyze the following text and identify 3-5 concepts that students might find difficult or confusing.
        Return ONLY a JSON array of concept names (no additional text):

        ["Concept 1", "Concept 2", "Concept 3"]

        TEXT:
        \(text)
        """

        let response = try await client.chatCompletion(
            model: .gpt5Mini,
            messages: [
                ChatMessage(role: .system, content: .text("You are an expert at identifying difficult concepts in educational content.")),
                ChatMessage(role: .user, content: .text(identificationPrompt))
            ],
            temperature: 0.5,
            maxTokens: 500
        )

        guard let content = response.choices.first?.message.content else {
            throw SimplifiedExplanationError.emptyResponse
        }

        // Parse concepts array
        let concepts = try parseConceptsArray(content)
        logger.info("Identified \(concepts.count) difficult concepts")

        // Generate explanations for each concept
        let conceptItems = concepts.map { concept in
            (concept: concept, context: text, materialID: materialID, subject: subject)
        }

        return try await generateExplanationsBatch(concepts: conceptItems, level: level)
    }

    /// Parse array of concepts from JSON response
    private func parseConceptsArray(_ response: String) throws -> [String] {
        let jsonString = extractJSON(from: response)

        // Try to extract array directly
        guard let data = jsonString.data(using: .utf8) else {
            throw SimplifiedExplanationError.invalidResponse
        }

        let decoder = JSONDecoder()
        let concepts = try decoder.decode([String].self, from: data)

        return concepts.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
    }
}

// MARK: - Supporting Types

/// Explanation data from API response
struct ExplanationData: Codable {
    let explanation: String
    let examples: [String]
    let analogies: [String]
}

/// SwiftData model for simplified explanations (Subtask 24.3)
@Model
final class SimplifiedExplanation {
    var id: UUID
    var materialID: UUID
    var concept: String
    var explanation: String
    var examples: [String]
    var analogies: [String]
    var level: String
    var createdAt: Date

    // Optional subject context
    var subjectRawValue: String?

    var subject: Subject? {
        get {
            guard let raw = subjectRawValue else { return nil }
            return Subject(rawValue: raw)
        }
        set {
            subjectRawValue = newValue?.rawValue
        }
    }

    init(
        id: UUID = UUID(),
        materialID: UUID,
        concept: String,
        explanation: String,
        examples: [String],
        analogies: [String],
        level: String,
        subject: Subject? = nil,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.materialID = materialID
        self.concept = concept
        self.explanation = explanation
        self.examples = examples
        self.analogies = analogies
        self.level = level
        self.subjectRawValue = subject?.rawValue
        self.createdAt = createdAt
    }
}

/// Simplified explanation generation errors
enum SimplifiedExplanationError: LocalizedError {
    case noClientAvailable
    case conceptTooShort
    case emptyResponse
    case invalidResponse
    case emptyExplanation
    case explanationTooLong
    case missingExamples

    var errorDescription: String? {
        switch self {
        case .noClientAvailable:
            return "No API client available for explanation generation"
        case .conceptTooShort:
            return "Concept is too short to generate explanation"
        case .emptyResponse:
            return "Received empty response from API"
        case .invalidResponse:
            return "Invalid response format from API"
        case .emptyExplanation:
            return "Generated explanation is empty"
        case .explanationTooLong:
            return "Generated explanation exceeds maximum length"
        case .missingExamples:
            return "Generated explanation is missing required examples"
        }
    }
}
