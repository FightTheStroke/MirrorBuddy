//
//  QuizGenerationService.swift
//  MirrorBuddy
//
//  Task 96: Review assistant and quiz generation
//  Generates quizzes and extracts concepts from lesson content
//

import Foundation
import os.log

/// Service for generating quizzes and extracting concepts from lessons
@MainActor
final class QuizGenerationService {
    static let shared = QuizGenerationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "QuizGeneration")
    private var openAIClient: OpenAIClient?

    private init() {
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            openAIClient = OpenAIClient(configuration: config)
        }
    }

    // MARK: - Concept Extraction

    /// Extract key concepts from lesson content
    func extractConcepts(from text: String, limit: Int = 10) async throws -> [String] {
        guard let client = openAIClient else {
            throw QuizError.noClientAvailable
        }

        let prompt = """
        Extract the \(limit) most important concepts from this lesson.
        Return only a numbered list of concepts, one per line.

        Lesson content:
        \(text)

        Concepts:
        """

        let response = try await client.chatCompletion(
            model: .gpt5,
            messages: [
                ChatMessage(role: .system, content: .text("You are a helpful teaching assistant that extracts key concepts from lessons.")),
                ChatMessage(role: .user, content: .text(prompt))
            ],
            temperature: 0.3,
            maxTokens: 500
        )

        guard let content = response.choices.first?.message.content else {
            throw QuizError.emptyResponse
        }

        // Parse numbered list
        let concepts = content
            .components(separatedBy: CharacterSet.newlines)
            .compactMap { line in
                let trimmed = line.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
                // Remove numbering like "1. " or "1) "
                if let range = trimmed.range(of: #"^\d+[\.\)]\s*"#, options: .regularExpression) {
                    return String(trimmed[range.upperBound...])
                }
                return trimmed.isEmpty ? nil : trimmed
            }

        logger.info("Extracted \(concepts.count) concepts")
        return Array(concepts.prefix(limit))
    }

    // MARK: - Quiz Generation

    /// Generate quiz questions from lesson content
    func generateQuiz(
        from text: String,
        questionCount: Int = 5,
        subject: Subject? = nil,
        language: StudyCoachPersonality.Language = .italian
    ) async throws -> Quiz {
        guard let client = openAIClient else {
            throw QuizError.noClientAvailable
        }

        let subjectContext = subject.map { " about \($0.rawValue)" } ?? ""
        let languageCode = language == .italian ? "Italian" : "English"

        let prompt = """
        Generate a quiz with \(questionCount) multiple-choice questions\(subjectContext).
        Use the following lesson content as the source material.
        Each question should have 4 options with exactly one correct answer.
        Format each question as JSON with this structure:
        {
          "question": "The question text",
          "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
          "correctAnswer": "A",
          "explanation": "Why this answer is correct"
        }

        Return a JSON array of questions in \(languageCode).

        Lesson content:
        \(text)
        """

        let response = try await client.chatCompletion(
            model: .gpt5,
            messages: [
                ChatMessage(role: .system, content: .text("You are a helpful teaching assistant that creates educational quizzes. Always respond with valid JSON.")),
                ChatMessage(role: .user, content: .text(prompt))
            ],
            temperature: 0.7,
            maxTokens: 2_000
        )

        guard let content = response.choices.first?.message.content else {
            throw QuizError.emptyResponse
        }

        // Parse JSON response
        let questions = try parseQuizResponse(content)

        logger.info("Generated quiz with \(questions.count) questions")

        return Quiz(
            id: UUID(),
            title: "Quiz" + (subject.map { " - \($0.localizedName)" } ?? ""),
            questions: questions,
            subject: subject,
            createdAt: Date()
        )
    }

    /// Generate quick review questions
    func generateReviewQuestions(from text: String, count: Int = 3) async throws -> [ReviewQuestion] {
        guard let client = openAIClient else {
            throw QuizError.noClientAvailable
        }

        let prompt = """
        Create \(count) simple review questions based on this lesson.
        Questions should help students recall what they learned.
        Return as a JSON array: [{"question": "...", "key_points": ["point1", "point2"]}]

        Lesson:
        \(text)
        """

        let response = try await client.chatCompletion(
            model: .gpt5,
            messages: [
                ChatMessage(role: .user, content: .text(prompt))
            ],
            temperature: 0.5,
            maxTokens: 800
        )

        guard let content = response.choices.first?.message.content else {
            throw QuizError.emptyResponse
        }

        return try parseReviewQuestions(content)
    }

    // MARK: - Parsing

    private func parseQuizResponse(_ response: String) throws -> [QuizQuestion] {
        // Extract JSON from response (might have markdown code blocks)
        let jsonString = extractJSON(from: response)

        guard let data = jsonString.data(using: .utf8) else {
            throw QuizError.invalidResponse
        }

        let decoder = JSONDecoder()
        return try decoder.decode([QuizQuestion].self, from: data)
    }

    private func parseReviewQuestions(_ response: String) throws -> [ReviewQuestion] {
        let jsonString = extractJSON(from: response)

        guard let data = jsonString.data(using: .utf8) else {
            throw QuizError.invalidResponse
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode([ReviewQuestion].self, from: data)
    }

    private func extractJSON(from text: String) -> String {
        // Remove markdown code blocks
        let cleaned = text
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        // Find first [ and last ]
        if let startIndex = cleaned.firstIndex(of: "["),
           let endIndex = cleaned.lastIndex(of: "]") {
            return String(cleaned[startIndex...endIndex])
        }

        return cleaned
    }
}

// MARK: - Data Models

struct Quiz: Codable {
    let id: UUID
    let title: String
    let questions: [QuizQuestion]
    let subject: Subject?
    let createdAt: Date
}

struct QuizQuestion: Codable {
    let question: String
    let options: [String]
    let correctAnswer: String
    let explanation: String
}

struct ReviewQuestion: Codable {
    let question: String
    let keyPoints: [String]
}

// MARK: - Errors

enum QuizError: LocalizedError {
    case noClientAvailable
    case emptyResponse
    case invalidResponse
    case parsingFailed

    var errorDescription: String? {
        switch self {
        case .noClientAvailable:
            return "No OpenAI client available"
        case .emptyResponse:
            return "Empty response from API"
        case .invalidResponse:
            return "Invalid response format"
        case .parsingFailed:
            return "Failed to parse quiz data"
        }
    }
}
