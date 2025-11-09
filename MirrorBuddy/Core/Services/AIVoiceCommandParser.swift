//
//  AIVoiceCommandParser.swift
//  MirrorBuddy
//
//  AI-powered voice command parser using Anthropic Claude
//  Understands natural language and extracts intent + parameters
//  Adapts to Mario's speaking style
//

import Foundation
import os.log

/// Voice command intent types
enum CommandIntent: String, Codable {
    case startStudy = "start_study"
    case showProgress = "show_progress"
    case addTask = "add_task"
    case startTimer = "start_timer"
    case takeBreak = "take_break"
    case checkSentiment = "check_sentiment"
    case openMaterial = "open_material"
    case reviewFlashcards = "review_flashcards"
    case askQuestion = "ask_question"
    case unknown = "unknown"
}

/// Parsed command with intent and parameters
struct ParsedVoiceCommand: Codable {
    let intent: CommandIntent
    let confidence: Double
    let parameters: [String: String]
    let originalText: String
    let reasoning: String // Why this intent was chosen
}

/// AI-powered voice command parser
@MainActor
final class AIVoiceCommandParser {
    static let shared = AIVoiceCommandParser()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "AIVoiceCommandParser")

    private var apiKey: String {
        ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] ?? ""
    }

    // Cache for faster repeated commands
    private var commandCache: [String: ParsedVoiceCommand] = [:]

    // Learning: adapt to Mario's speaking patterns
    private var userPatterns: [String] = []

    private init() {
        logger.info("AIVoiceCommandParser initialized with Claude integration")
    }

    // MARK: - Public Interface

    /// Parse voice input to extract intent and parameters
    func parse(_ text: String) async throws -> ParsedVoiceCommand {
        let normalized = text.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalized.isEmpty else {
            return ParsedVoiceCommand(
                intent: .unknown,
                confidence: 0.0,
                parameters: [:],
                originalText: text,
                reasoning: "Empty input"
            )
        }

        // Check cache first (for common commands)
        if let cached = commandCache[normalized] {
            logger.debug("Using cached command: \(normalized)")
            return cached
        }

        // Parse with AI
        let parsed = try await parseWithClaude(normalized)

        // Cache if high confidence
        if parsed.confidence > 0.8 {
            commandCache[normalized] = parsed
        }

        // Learn pattern
        userPatterns.append(normalized)
        if userPatterns.count > 100 {
            userPatterns.removeFirst() // Keep last 100
        }

        return parsed
    }

    /// Parse with fallback to keyword matching
    func parseWithFallback(_ text: String) async -> ParsedVoiceCommand {
        do {
            return try await parse(text)
        } catch {
            logger.warning("AI parsing failed, using keyword fallback: \(error)")
            return keywordMatch(text)
        }
    }

    // MARK: - Claude AI Parsing

    private func parseWithClaude(_ text: String) async throws -> ParsedVoiceCommand {
        guard !apiKey.isEmpty else {
            throw ParserError.missingAPIKey
        }

        let prompt = buildParsingPrompt(text)

        // Call Anthropic Claude API
        let request = ClaudeRequest(
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 200,
            messages: [
                ClaudeMessage(role: "user", content: prompt)
            ],
            temperature: 0.0 // Deterministic for commands
        )

        let response = try await callClaudeAPI(request)

        // Parse JSON response
        guard let parsed = try? JSONDecoder().decode(
            ParsedVoiceCommand.self,
            from: response.data(using: .utf8) ?? Data()
        ) else {
            logger.error("Failed to decode Claude response: \(response)")
            throw ParserError.invalidResponse
        }

        logger.info("✅ Parsed command: \(parsed.intent) (confidence: \(parsed.confidence))")
        return parsed
    }

    private func buildParsingPrompt(_ text: String) -> String {
        let recentPatterns = userPatterns.suffix(10).joined(separator: "\n- ")

        return """
        You are a voice command parser for MirrorBuddy, a study app for Mario (teenager with dyslexia).

        Parse this voice command and extract:
        1. Intent (start_study, show_progress, add_task, start_timer, take_break, check_sentiment, open_material, review_flashcards, ask_question, unknown)
        2. Confidence (0.0 - 1.0)
        3. Parameters (subject, title, duration, etc.)
        4. Reasoning (why you chose this intent)

        Recent user patterns (Mario's speaking style):
        - \(recentPatterns)

        Voice command: "\(text)"

        Respond ONLY with valid JSON in this exact format:
        {
          "intent": "start_study",
          "confidence": 0.95,
          "parameters": {
            "subject": "Matematica"
          },
          "originalText": "\(text)",
          "reasoning": "User said 'inizia matematica' which clearly indicates starting to study math"
        }

        JSON response:
        """
    }

    private func callClaudeAPI(_ request: ClaudeRequest) async throws -> String {
        let url = URL(string: "https://api.anthropic.com/v1/messages")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        urlRequest.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(request)

        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ParserError.networkError
        }

        guard httpResponse.statusCode == 200 else {
            logger.error("Claude API error: \(httpResponse.statusCode)")
            throw ParserError.apiError(httpResponse.statusCode)
        }

        let decoded = try JSONDecoder().decode(ClaudeResponse.self, from: data)

        guard let firstContent = decoded.content.first,
              case .text(let text) = firstContent else {
            throw ParserError.invalidResponse
        }

        return text
    }

    // MARK: - Fallback Keyword Matching

    private func keywordMatch(_ text: String) -> ParsedVoiceCommand {
        let lowercased = text.lowercased()

        // Start study
        if lowercased.contains("inizia") || lowercased.contains("studia") {
            let subject = extractSubject(from: lowercased)
            return ParsedVoiceCommand(
                intent: .startStudy,
                confidence: 0.7,
                parameters: ["subject": subject],
                originalText: text,
                reasoning: "Keyword match: 'inizia' or 'studia'"
            )
        }

        // Show progress
        if lowercased.contains("progressi") || lowercased.contains("come va") {
            return ParsedVoiceCommand(
                intent: .showProgress,
                confidence: 0.8,
                parameters: [:],
                originalText: text,
                reasoning: "Keyword match: 'progressi'"
            )
        }

        // Add task
        if lowercased.contains("compito") || lowercased.contains("aggiungi") {
            return ParsedVoiceCommand(
                intent: .addTask,
                confidence: 0.6,
                parameters: ["title": text],
                originalText: text,
                reasoning: "Keyword match: 'compito'"
            )
        }

        // Timer
        if lowercased.contains("timer") || lowercased.contains("focus") {
            return ParsedVoiceCommand(
                intent: .startTimer,
                confidence: 0.8,
                parameters: [:],
                originalText: text,
                reasoning: "Keyword match: 'timer'"
            )
        }

        // Break
        if lowercased.contains("pausa") || lowercased.contains("break") {
            return ParsedVoiceCommand(
                intent: .takeBreak,
                confidence: 0.9,
                parameters: [:],
                originalText: text,
                reasoning: "Keyword match: 'pausa'"
            )
        }

        // Flashcards
        if lowercased.contains("ripasso") || lowercased.contains("flashcard") {
            return ParsedVoiceCommand(
                intent: .reviewFlashcards,
                confidence: 0.8,
                parameters: [:],
                originalText: text,
                reasoning: "Keyword match: 'ripasso'"
            )
        }

        // Unknown
        return ParsedVoiceCommand(
            intent: .unknown,
            confidence: 0.0,
            parameters: [:],
            originalText: text,
            reasoning: "No keyword matches found"
        )
    }

    private func extractSubject(from text: String) -> String {
        if text.contains("matematica") || text.contains("mate") { return "Matematica" }
        if text.contains("italiano") { return "Italiano" }
        if text.contains("inglese") { return "Inglese" }
        if text.contains("storia") { return "Storia" }
        if text.contains("scienze") { return "Scienze" }
        if text.contains("geografia") { return "Geografia" }
        if text.contains("arte") { return "Arte" }
        if text.contains("musica") { return "Musica" }
        return "General"
    }
}

// MARK: - Claude API Models

private struct ClaudeRequest: Codable {
    let model: String
    let maxTokens: Int
    let messages: [ClaudeMessage]
    let temperature: Double

    enum CodingKeys: String, CodingKey {
        case model
        case maxTokens = "max_tokens"
        case messages
        case temperature
    }
}

private struct ClaudeMessage: Codable {
    let role: String
    let content: String
}

private struct ClaudeResponse: Codable {
    let content: [ClaudeContent]
}

private enum ClaudeContent: Codable {
    case text(String)

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        if type == "text" {
            let text = try container.decode(String.self, forKey: .text)
            self = .text(text)
        } else {
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown content type: \(type)"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .text(let text):
            try container.encode("text", forKey: .type)
            try container.encode(text, forKey: .text)
        }
    }

    enum CodingKeys: String, CodingKey {
        case type, text
    }
}

// MARK: - Errors

enum ParserError: Error {
    case missingAPIKey
    case networkError
    case apiError(Int)
    case invalidResponse
}
