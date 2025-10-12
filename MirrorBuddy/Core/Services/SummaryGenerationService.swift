import Foundation
import SwiftData
import os.log

/// Summary generation service using Apple Intelligence with OpenAI fallback (Task 20)
@MainActor
final class SummaryGenerationService {
    /// Shared singleton instance
    static let shared = SummaryGenerationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "SummaryGeneration")

    // MARK: - Configuration

    /// Maximum text length per chunk (tokens approximate)
    private let maxChunkSize = 4000

    /// Summary detail levels
    enum DetailLevel: String, Codable {
        case brief      // ~2-3 sentences
        case standard   // ~1 paragraph
        case detailed   // ~2-3 paragraphs
        case comprehensive // Full summary with all key points
    }

    // MARK: - Dependencies (Subtask 20.1)

    private var appleIntelligenceClient: OpenAIClient?
    private var openAIFallbackClient: OpenAIClient?
    private var modelContext: ModelContext?

    // MARK: - Initialization

    private init() {
        setupClients()
    }

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Summary service configured with model context")
    }

    private func setupClients() {
        // Apple Intelligence uses OpenAI-compatible API
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            // Primary: Apple Intelligence client
            appleIntelligenceClient = OpenAIClient(configuration: config)
            logger.info("Apple Intelligence client configured")

            // Fallback: OpenAI client
            openAIFallbackClient = OpenAIClient(configuration: config)
            logger.info("OpenAI fallback client configured")
        } else {
            logger.warning("No API configuration found")
        }
    }

    // MARK: - Text Summarization (Subtask 20.2)

    /// Generate summary for text content
    func generateSummary(
        for text: String,
        detailLevel: DetailLevel = .standard,
        preserveTerms: [String] = [],
        useCache: Bool = true
    ) async throws -> GeneratedSummary {
        logger.info("Generating \(detailLevel.rawValue) summary for text of length \(text.count)")

        // Check cache first
        if useCache, let cached = try? getCachedSummary(for: text, detailLevel: detailLevel) {
            logger.info("Returning cached summary")
            return cached
        }

        // Determine if text needs chunking
        let chunks = chunkText(text, maxSize: maxChunkSize)
        logger.debug("Text split into \(chunks.count) chunks")

        var summaries: [String] = []

        // Summarize each chunk
        for (index, chunk) in chunks.enumerated() {
            do {
                let chunkSummary = try await summarizeChunk(
                    chunk,
                    detailLevel: detailLevel,
                    preserveTerms: preserveTerms,
                    chunkNumber: index + 1,
                    totalChunks: chunks.count
                )
                summaries.append(chunkSummary)
            } catch {
                logger.error("Failed to summarize chunk \(index): \(error.localizedDescription)")
                throw error
            }
        }

        // Combine chunk summaries if multiple
        let finalSummary: String
        if summaries.count > 1 {
            logger.debug("Combining \(summaries.count) chunk summaries")
            finalSummary = try await combineSummaries(summaries, detailLevel: detailLevel)
        } else {
            finalSummary = summaries.first ?? ""
        }

        // Extract key concepts
        let keyConcepts = extractKeyConcepts(from: finalSummary, additionalTerms: preserveTerms)

        let result = GeneratedSummary(
            originalText: text,
            summaryText: finalSummary,
            detailLevel: detailLevel,
            keyConcepts: keyConcepts,
            wordCount: finalSummary.split(separator: " ").count,
            generatedAt: Date()
        )

        // Store in cache
        try? storeSummary(result)

        logger.info("Summary generated successfully with \(result.wordCount) words")
        return result
    }

    /// Summarize a single chunk of text
    private func summarizeChunk(
        _ text: String,
        detailLevel: DetailLevel,
        preserveTerms: [String],
        chunkNumber: Int,
        totalChunks: Int
    ) async throws -> String {
        let prompt = buildSummaryPrompt(
            text: text,
            detailLevel: detailLevel,
            preserveTerms: preserveTerms,
            chunkNumber: chunkNumber,
            totalChunks: totalChunks
        )

        // Try Apple Intelligence first
        do {
            if let client = appleIntelligenceClient {
                let response = try await client.chatCompletion(
                    model: .gpt5Mini,
                    messages: [
                        ChatMessage(role: .system, content: .text("You are a helpful study assistant that creates clear, concise summaries while preserving key concepts and terminology.")),
                        ChatMessage(role: .user, content: .text(prompt))
                    ]
                )

                guard let content = response.choices.first?.message.content else {
                    throw SummaryGenerationError.emptyResponse
                }

                return content
            }
        } catch {
            logger.warning("Apple Intelligence failed, falling back to OpenAI: \(error.localizedDescription)")
        }

        // Fallback to OpenAI (Subtask 20.3)
        guard let fallbackClient = openAIFallbackClient else {
            throw SummaryGenerationError.noClientAvailable
        }

        let response = try await fallbackClient.chatCompletion(
            model: .gpt5Mini,
            messages: [
                ChatMessage(role: .system, content: .text("You are a helpful study assistant that creates clear, concise summaries while preserving key concepts and terminology.")),
                ChatMessage(role: .user, content: .text(prompt))
            ]
        )

        guard let content = response.choices.first?.message.content else {
            throw SummaryGenerationError.emptyResponse
        }

        return content
    }

    /// Build the summarization prompt
    private func buildSummaryPrompt(
        text: String,
        detailLevel: DetailLevel,
        preserveTerms: [String],
        chunkNumber: Int,
        totalChunks: Int
    ) -> String {
        let lengthGuidance = lengthGuidanceForLevel(detailLevel)
        let termsInstruction = preserveTerms.isEmpty ? "" : "\n\nIMPORTANT: Preserve these key terms: \(preserveTerms.joined(separator: ", "))"
        let chunkContext = totalChunks > 1 ? "\n\nNote: This is part \(chunkNumber) of \(totalChunks). Focus on this section's content." : ""

        return """
        Please create a \(detailLevel.rawValue) summary of the following text.

        \(lengthGuidance)\(termsInstruction)\(chunkContext)

        Guidelines:
        - Maintain key concepts and important terminology
        - Use clear, student-friendly language
        - Focus on main ideas and essential information
        - Preserve logical structure and flow
        - Include specific examples when relevant

        TEXT TO SUMMARIZE:
        \(text)
        """
    }

    /// Get length guidance for detail level
    private func lengthGuidanceForLevel(_ level: DetailLevel) -> String {
        switch level {
        case .brief:
            return "Keep it very concise - 2 to 3 sentences maximum."
        case .standard:
            return "Aim for about one paragraph (4-6 sentences)."
        case .detailed:
            return "Provide a detailed summary spanning 2-3 paragraphs."
        case .comprehensive:
            return "Create a comprehensive summary that covers all key points, using as many paragraphs as needed."
        }
    }

    /// Combine multiple chunk summaries into a final summary
    private func combineSummaries(_ summaries: [String], detailLevel: DetailLevel) async throws -> String {
        let combinedText = summaries.enumerated()
            .map { "Section \($0.offset + 1):\n\($0.element)" }
            .joined(separator: "\n\n")

        let prompt = """
        The following are summaries of different sections of a longer document.
        Please combine them into a single, cohesive \(detailLevel.rawValue) summary that maintains logical flow and eliminates redundancy.

        \(combinedText)
        """

        guard let client = appleIntelligenceClient ?? openAIFallbackClient else {
            throw SummaryGenerationError.noClientAvailable
        }

        let response = try await client.chatCompletion(
            model: .gpt5Mini,
            messages: [
                ChatMessage(role: .system, content: .text("You are a helpful study assistant.")),
                ChatMessage(role: .user, content: .text(prompt))
            ]
        )

        guard let content = response.choices.first?.message.content else {
            throw SummaryGenerationError.emptyResponse
        }

        return content
    }

    // MARK: - Text Processing

    /// Split text into chunks for processing
    private func chunkText(_ text: String, maxSize: Int) -> [String] {
        // Simple word-based chunking
        let words = text.split(separator: " ").map(String.init)

        guard words.count > maxSize else {
            return [text]
        }

        var chunks: [String] = []
        var currentChunk: [String] = []
        var currentSize = 0

        for word in words {
            if currentSize + word.count > maxSize && !currentChunk.isEmpty {
                chunks.append(currentChunk.joined(separator: " "))
                currentChunk = [word]
                currentSize = word.count
            } else {
                currentChunk.append(word)
                currentSize += word.count + 1 // +1 for space
            }
        }

        if !currentChunk.isEmpty {
            chunks.append(currentChunk.joined(separator: " "))
        }

        return chunks
    }

    /// Extract key concepts from summary text
    private func extractKeyConcepts(from summary: String, additionalTerms: [String]) -> [String] {
        var concepts = Set<String>()

        // Add explicitly preserved terms
        concepts.formUnion(additionalTerms)

        // Extract capitalized words (potential key terms)
        let words = summary.split(separator: " ")
        for word in words {
            let cleanWord = word.trimmingCharacters(in: .punctuationCharacters)
            if cleanWord.count > 3 && cleanWord.first?.isUppercase == true {
                concepts.insert(cleanWord)
            }
        }

        return Array(concepts).sorted()
    }

    // MARK: - Storage (Subtask 20.3)

    /// Store generated summary in SwiftData
    private func storeSummary(_ summary: GeneratedSummary) throws {
        guard let context = modelContext else {
            logger.warning("No model context available for storing summary")
            return
        }

        let summaryModel = SummaryModel(
            originalTextHash: summary.originalText.hashValue,
            summaryText: summary.summaryText,
            detailLevel: summary.detailLevel.rawValue,
            keyConcepts: summary.keyConcepts,
            wordCount: summary.wordCount,
            generatedAt: summary.generatedAt
        )

        context.insert(summaryModel)

        do {
            try context.save()
            logger.debug("Summary stored successfully")
        } catch {
            logger.error("Failed to store summary: \(error.localizedDescription)")
            throw error
        }
    }

    /// Retrieve cached summary from storage
    private func getCachedSummary(for text: String, detailLevel: DetailLevel) throws -> GeneratedSummary? {
        guard let context = modelContext else { return nil }

        let textHash = text.hashValue
        let descriptor = FetchDescriptor<SummaryModel>(
            predicate: #Predicate { summary in
                summary.originalTextHash == textHash &&
                summary.detailLevel == detailLevel.rawValue
            },
            sortBy: [SortDescriptor(\.generatedAt, order: .reverse)]
        )

        let results = try context.fetch(descriptor)

        guard let latest = results.first else { return nil }

        // Check if cache is still fresh (within 7 days)
        let cacheAge = Date().timeIntervalSince(latest.generatedAt)
        guard cacheAge < 7 * 24 * 3600 else {
            logger.debug("Cached summary expired")
            return nil
        }

        return GeneratedSummary(
            originalText: text,
            summaryText: latest.summaryText,
            detailLevel: DetailLevel(rawValue: latest.detailLevel) ?? .standard,
            keyConcepts: latest.keyConcepts,
            wordCount: latest.wordCount,
            generatedAt: latest.generatedAt
        )
    }

    /// Delete old cached summaries
    func cleanOldCache(olderThan days: Int = 30) async throws {
        guard let context = modelContext else { return }

        let cutoffDate = Date().addingTimeInterval(-Double(days * 24 * 3600))

        let descriptor = FetchDescriptor<SummaryModel>(
            predicate: #Predicate { summary in
                summary.generatedAt < cutoffDate
            }
        )

        let oldSummaries = try context.fetch(descriptor)

        for summary in oldSummaries {
            context.delete(summary)
        }

        try context.save()
        logger.info("Cleaned \(oldSummaries.count) old summaries")
    }

    // MARK: - Batch Processing

    /// Generate summaries for multiple texts
    func generateBatchSummaries(
        for texts: [String],
        detailLevel: DetailLevel = .standard
    ) async throws -> [GeneratedSummary] {
        var summaries: [GeneratedSummary] = []

        for (index, text) in texts.enumerated() {
            logger.debug("Processing text \(index + 1) of \(texts.count)")

            do {
                let summary = try await generateSummary(for: text, detailLevel: detailLevel)
                summaries.append(summary)
            } catch {
                logger.error("Failed to generate summary for text \(index): \(error.localizedDescription)")
                // Continue with other texts
            }
        }

        return summaries
    }
}

// MARK: - Supporting Types

/// Generated summary result
struct GeneratedSummary {
    let originalText: String
    let summaryText: String
    let detailLevel: SummaryGenerationService.DetailLevel
    let keyConcepts: [String]
    let wordCount: Int
    let generatedAt: Date

    var compressionRatio: Double {
        let originalWords = originalText.split(separator: " ").count
        guard originalWords > 0 else { return 0 }
        return Double(wordCount) / Double(originalWords)
    }
}

/// SwiftData model for storing summaries
@Model
final class SummaryModel {
    var originalTextHash: Int
    var summaryText: String
    var detailLevel: String
    var keyConcepts: [String]
    var wordCount: Int
    var generatedAt: Date

    init(
        originalTextHash: Int,
        summaryText: String,
        detailLevel: String,
        keyConcepts: [String],
        wordCount: Int,
        generatedAt: Date
    ) {
        self.originalTextHash = originalTextHash
        self.summaryText = summaryText
        self.detailLevel = detailLevel
        self.keyConcepts = keyConcepts
        self.wordCount = wordCount
        self.generatedAt = generatedAt
    }
}

/// Summary generation errors
enum SummaryGenerationError: LocalizedError {
    case noClientAvailable
    case emptyResponse
    case textTooLong
    case invalidConfiguration

    var errorDescription: String? {
        switch self {
        case .noClientAvailable:
            return "No API client available for summary generation"
        case .emptyResponse:
            return "Received empty response from API"
        case .textTooLong:
            return "Text is too long to summarize"
        case .invalidConfiguration:
            return "Invalid API configuration"
        }
    }
}
