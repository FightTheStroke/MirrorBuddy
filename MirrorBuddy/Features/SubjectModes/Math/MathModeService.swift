import Foundation
import os.log

/// Main orchestrator for Math Mode specialized features
/// Coordinates all math-specific functionality including problem solving, graph rendering, and practice generation
@MainActor
final class MathModeService {
    /// Shared singleton instance
    static let shared = MathModeService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MathMode")

    // Sub-services
    let problemSolver: MathProblemSolver
    let graphRenderer: MathGraphRenderer
    let formulaLibrary: FormulaLibrary
    let practiceGenerator: MathPracticeGenerator
    let prompts: MathPrompts
    let mindMapTemplate: MathMindMapTemplateGenerator

    // Current session state
    private(set) var currentTopic: MathTopic?
    private(set) var sessionProblems: [SolvedProblem] = []
    private(set) var difficultyLevel: DifficultyLevel = .intermediate

    // MARK: - Initialization

    private init() {
        self.problemSolver = MathProblemSolver()
        self.graphRenderer = MathGraphRenderer()
        self.formulaLibrary = FormulaLibrary()
        self.practiceGenerator = MathPracticeGenerator()
        self.prompts = MathPrompts()
        self.mindMapTemplate = MathMindMapTemplateGenerator()

        logger.info("MathModeService initialized")
    }

    // MARK: - Session Management

    /// Start a new math session with a specific topic
    func startSession(topic: MathTopic, difficulty: DifficultyLevel = .intermediate) {
        self.currentTopic = topic
        self.difficultyLevel = difficulty
        self.sessionProblems = []

        logger.info("Started math session: \(topic.name) at \(difficulty.rawValue) level")
    }

    /// Record a solved problem in the current session
    func recordSolvedProblem(_ problem: SolvedProblem) {
        sessionProblems.append(problem)

        // Adapt difficulty based on success rate
        if sessionProblems.count >= 3 {
            let recentProblems = sessionProblems.suffix(3)
            let successRate = Double(recentProblems.filter { $0.wasCorrect }.count) / 3.0

            if successRate >= 0.8 && self.difficultyLevel != .advanced {
                self.difficultyLevel = self.difficultyLevel == .beginner ? .intermediate : .advanced
                logger.info("Difficulty increased to \(self.difficultyLevel.rawValue)")
            } else if successRate < 0.4 && self.difficultyLevel != .beginner {
                self.difficultyLevel = self.difficultyLevel == .advanced ? .intermediate : .beginner
                logger.info("Difficulty decreased to \(self.difficultyLevel.rawValue)")
            }
        }
    }

    /// Get session statistics
    func getSessionStats() -> MathSessionStats {
        let totalProblems = sessionProblems.count
        let correctProblems = sessionProblems.filter { $0.wasCorrect }.count
        let averageSteps = sessionProblems.isEmpty ? 0 : sessionProblems.map { $0.steps.count }.reduce(0, +) / sessionProblems.count

        return MathSessionStats(
            topic: currentTopic,
            totalProblems: totalProblems,
            correctProblems: correctProblems,
            averageSteps: averageSteps,
            currentDifficulty: difficultyLevel
        )
    }

    /// End the current session
    func endSession() {
        logger.info("Ended math session: \(self.sessionProblems.count) problems completed")
        currentTopic = nil
        sessionProblems = []
    }

    // MARK: - Quick Access Methods

    /// Get AI prompt for current topic
    func getCurrentTopicPrompt() -> String? {
        guard let topic = currentTopic else { return nil }
        return prompts.getTopicPrompt(for: topic, difficulty: difficultyLevel)
    }

    /// Get formulas relevant to current topic
    func getCurrentTopicFormulas() -> [Formula] {
        guard let topic = currentTopic else { return [] }
        return formulaLibrary.getFormulas(for: topic)
    }

    /// Generate practice problems for current topic
    func generatePracticeProblems(count: Int = 5) async throws -> [MathProblem] {
        guard let topic = currentTopic else {
            throw MathModeError.noActiveSession
        }

        return try await practiceGenerator.generateProblems(
            topic: topic,
            difficulty: difficultyLevel,
            count: count
        )
    }
}

// MARK: - Supporting Types

enum MathTopic: String, CaseIterable, Codable {
    case algebra = "Algebra"
    case geometry = "Geometry"
    case trigonometry = "Trigonometry"
    case calculus = "Calculus"
    case statistics = "Statistics"
    case probability = "Probability"
    case linearAlgebra = "Linear Algebra"
    case discreteMath = "Discrete Math"

    nonisolated var name: String { rawValue }

    nonisolated var subtopics: [String] {
        switch self {
        case .algebra:
            return ["Linear Equations", "Quadratic Equations", "Polynomials", "Factoring", "Systems of Equations"]
        case .geometry:
            return ["Angles", "Triangles", "Circles", "Area & Perimeter", "Volume", "Coordinate Geometry"]
        case .trigonometry:
            return ["Sin/Cos/Tan", "Unit Circle", "Trigonometric Identities", "Solving Triangles", "Graphs"]
        case .calculus:
            return ["Limits", "Derivatives", "Integrals", "Chain Rule", "Optimization"]
        case .statistics:
            return ["Mean/Median/Mode", "Standard Deviation", "Distributions", "Hypothesis Testing", "Regression"]
        case .probability:
            return ["Basic Probability", "Conditional Probability", "Combinations & Permutations", "Expected Value"]
        case .linearAlgebra:
            return ["Vectors", "Matrices", "Determinants", "Eigenvalues", "Linear Transformations"]
        case .discreteMath:
            return ["Sets", "Logic", "Graph Theory", "Combinatorics", "Number Theory"]
        }
    }
}

struct SolvedProblem: Codable {
    let problem: MathProblem
    let steps: [ProblemStep]
    let wasCorrect: Bool
    let timeSpent: TimeInterval
    let timestamp: Date
}

struct MathSessionStats {
    let topic: MathTopic?
    let totalProblems: Int
    let correctProblems: Int
    let averageSteps: Int
    let currentDifficulty: DifficultyLevel

    var successRate: Double {
        guard totalProblems > 0 else { return 0 }
        return Double(correctProblems) / Double(totalProblems)
    }
}

enum MathModeError: LocalizedError {
    case noActiveSession
    case invalidProblem
    case graphRenderingFailed
    case calculationError(String)

    var errorDescription: String? {
        switch self {
        case .noActiveSession:
            return "No active math session. Start a session first."
        case .invalidProblem:
            return "Invalid math problem provided."
        case .graphRenderingFailed:
            return "Failed to render graph."
        case .calculationError(let message):
            return "Calculation error: \(message)"
        }
    }
}
