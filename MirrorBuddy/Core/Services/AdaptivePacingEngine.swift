import Foundation
import os.log

/// Engine that adapts coaching pace and complexity based on sentiment and performance
@MainActor
final class AdaptivePacingEngine: ObservableObject {
    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "AdaptivePacing")

    // MARK: - Dependencies

    private let sentimentAnalyzer: SentimentAnalyzer
    private let coachPersona: CoachPersona

    // MARK: - State

    @Published private(set) var currentPace: PacingLevel = .normal
    @Published private(set) var currentComplexity: ComplexityLevel = .medium
    @Published private(set) var adaptationHistory: [PacingAdaptation] = []

    // MARK: - Configuration

    private let performanceWindow = 5 // Look at last 5 interactions
    private let adaptationThreshold = 0.6 // Confidence threshold for adaptation

    // MARK: - Pacing Levels

    enum PacingLevel: String, Codable {
        case verySlow
        case slow
        case normal
        case fast
        case veryFast

        var speedMultiplier: Double {
            switch self {
            case .verySlow: return 0.7
            case .slow: return 0.85
            case .normal: return 1.0
            case .fast: return 1.15
            case .veryFast: return 1.3
            }
        }

        var description: String {
            switch self {
            case .verySlow: return "Taking extra time with each concept"
            case .slow: return "Moving at a gentle pace"
            case .normal: return "Standard learning pace"
            case .fast: return "Moving along efficiently"
            case .veryFast: return "Quick progression"
            }
        }

        func adjusted(by delta: Int) -> PacingLevel {
            let levels: [PacingLevel] = [.verySlow, .slow, .normal, .fast, .veryFast]
            guard let currentIndex = levels.firstIndex(of: self) else { return .normal }
            let newIndex = max(0, min(levels.count - 1, currentIndex + delta))
            return levels[newIndex]
        }
    }

    // MARK: - Complexity Levels

    enum ComplexityLevel: String, Codable {
        case verySimple
        case simple
        case medium
        case complex
        case veryComplex

        var description: String {
            switch self {
            case .verySimple: return "Basic fundamentals"
            case .simple: return "Simple concepts"
            case .medium: return "Moderate complexity"
            case .complex: return "Advanced concepts"
            case .veryComplex: return "Expert level"
            }
        }

        var promptModifier: String {
            switch self {
            case .verySimple:
                return "Use extremely simple language. Explain as if to a young child. Use basic vocabulary only."
            case .simple:
                return "Use simple, clear language. Avoid jargon. Use everyday examples."
            case .medium:
                return "Use clear language with some technical terms when needed. Explain new concepts."
            case .complex:
                return "Use appropriate technical terminology. Assume foundational knowledge."
            case .veryComplex:
                return "Use advanced terminology. Explore nuanced connections between concepts."
            }
        }

        func adjusted(by delta: Int) -> ComplexityLevel {
            let levels: [ComplexityLevel] = [.verySimple, .simple, .medium, .complex, .veryComplex]
            guard let currentIndex = levels.firstIndex(of: self) else { return .medium }
            let newIndex = max(0, min(levels.count - 1, currentIndex + delta))
            return levels[newIndex]
        }
    }

    // MARK: - Adaptation Record

    struct PacingAdaptation: Identifiable {
        let id = UUID()
        let timestamp: Date
        let triggerSentiment: SentimentAnalyzer.Sentiment
        let previousPace: PacingLevel
        let newPace: PacingLevel
        let previousComplexity: ComplexityLevel
        let newComplexity: ComplexityLevel
        let reason: String
    }

    // MARK: - Performance Tracking

    private struct PerformanceMetrics {
        var correctAnswers: Int = 0
        var totalAnswers: Int = 0
        var averageResponseTime: TimeInterval = 0
        var recentSentiments: [SentimentAnalyzer.Sentiment] = []

        var successRate: Double {
            guard totalAnswers > 0 else { return 0.5 }
            return Double(correctAnswers) / Double(totalAnswers)
        }

        var needsSlowerPace: Bool {
            successRate < 0.5 || recentSentiments.filter { $0.needsSlowerPacing }.count >= 2
        }

        var canHandleFasterPace: Bool {
            successRate > 0.8 && recentSentiments.filter { $0.canHandleFasterPacing }.count >= 3
        }
    }

    private var metrics = PerformanceMetrics()

    // MARK: - Initialization

    init(
        sentimentAnalyzer: SentimentAnalyzer = SentimentAnalyzer(),
        coachPersona: CoachPersona = .shared
    ) {
        self.sentimentAnalyzer = sentimentAnalyzer
        self.coachPersona = coachPersona
    }

    // MARK: - Adaptation Logic

    /// Evaluate and adapt pacing based on current sentiment and performance
    func evaluateAndAdapt(
        currentSentiment: SentimentAnalyzer.Sentiment,
        wasAnswerCorrect: Bool? = nil
    ) {
        // Update metrics
        if let correct = wasAnswerCorrect {
            metrics.totalAnswers += 1
            if correct {
                metrics.correctAnswers += 1
            }
        }

        metrics.recentSentiments.append(currentSentiment)
        if metrics.recentSentiments.count > performanceWindow {
            metrics.recentSentiments.removeFirst()
        }

        // Determine adaptations
        let previousPace = currentPace
        let previousComplexity = currentComplexity
        var reasons: [String] = []

        // Sentiment-based adaptation
        switch currentSentiment {
        case .frustrated, .confused:
            // Slow down and simplify
            if currentPace != .verySlow {
                currentPace = currentPace.adjusted(by: -1)
                reasons.append("Detected \(currentSentiment.rawValue) - slowing pace")
            }
            if currentComplexity != .verySimple {
                currentComplexity = currentComplexity.adjusted(by: -1)
                reasons.append("Simplifying concepts due to \(currentSentiment.rawValue)")
            }

        case .uncertain:
            // Moderate slowdown
            if currentPace.speedMultiplier > PacingLevel.slow.speedMultiplier {
                currentPace = currentPace.adjusted(by: -1)
                reasons.append("Student uncertain - reducing pace")
            }

        case .confident, .excited:
            // Can potentially speed up if performance supports it
            if metrics.canHandleFasterPace && currentPace != .veryFast {
                currentPace = currentPace.adjusted(by: 1)
                reasons.append("Student \(currentSentiment.rawValue) and performing well - increasing pace")
            }
            if metrics.successRate > 0.85 && currentComplexity != .veryComplex {
                currentComplexity = currentComplexity.adjusted(by: 1)
                reasons.append("Strong performance - introducing more complexity")
            }

        case .neutral:
            // Use performance metrics to guide
            if metrics.needsSlowerPace && currentPace != .verySlow {
                currentPace = currentPace.adjusted(by: -1)
                reasons.append("Performance suggests slower pace needed")
            } else if metrics.canHandleFasterPace && currentPace != .veryFast {
                currentPace = currentPace.adjusted(by: 1)
                reasons.append("Performance supports faster pace")
            }
        }

        // Sentiment trend analysis
        let trend = sentimentAnalyzer.getSentimentTrend()
        if trend.requiresIntervention {
            if currentComplexity != .verySimple {
                currentComplexity = currentComplexity.adjusted(by: -1)
                reasons.append("Declining sentiment trend - simplifying")
            }
        }

        // Record adaptation if changes were made
        if previousPace != currentPace || previousComplexity != currentComplexity {
            let adaptation = PacingAdaptation(
                timestamp: Date(),
                triggerSentiment: currentSentiment,
                previousPace: previousPace,
                newPace: currentPace,
                previousComplexity: previousComplexity,
                newComplexity: currentComplexity,
                reason: reasons.joined(separator: "; ")
            )
            adaptationHistory.append(adaptation)

            logger.info("""
                Pacing adapted: \(previousPace.rawValue) → \(currentPace.rawValue), \
                Complexity: \(previousComplexity.rawValue) → \(currentComplexity.rawValue). \
                Reason: \(adaptation.reason)
                """)
        }
    }

    // MARK: - Prompt Generation

    /// Generate system prompt instructions for current pacing and complexity
    func generatePacingInstructions() -> String {
        """
        PACING LEVEL: \(currentPace.description)
        - Speed multiplier: \(String(format: "%.2f", currentPace.speedMultiplier))x
        - Adjust explanation depth and detail accordingly

        COMPLEXITY LEVEL: \(currentComplexity.description)
        - \(currentComplexity.promptModifier)

        PACING GUIDELINES:
        \(getPacingGuidelines())
        """
    }

    private func getPacingGuidelines() -> String {
        switch currentPace {
        case .verySlow, .slow:
            return """
            - Break concepts into very small steps
            - Check understanding after each point
            - Use multiple examples for each concept
            - Allow more time for processing
            - Repeat key points
            """
        case .normal:
            return """
            - Use standard teaching pace
            - Check understanding periodically
            - Provide examples as needed
            - Balance detail with efficiency
            """
        case .fast, .veryFast:
            return """
            - Move through concepts efficiently
            - Assume quicker comprehension
            - Focus on key points
            - Reduce repetition
            - Challenge with advanced connections
            """
        }
    }

    /// Get complete prompt modifier combining persona, sentiment, and pacing
    func generateCompletePromptModifier(
        currentSentiment: SentimentAnalyzer.Sentiment
    ) -> String {
        let personaModifier = coachPersona.generateResponseStyle(for: currentSentiment)
        let pacingInstructions = generatePacingInstructions()

        return """
        \(personaModifier)

        \(pacingInstructions)
        """
    }

    // MARK: - Response Timing

    /// Get recommended pause duration before responding (in seconds)
    func getRecommendedPauseDuration() -> TimeInterval {
        switch currentPace {
        case .verySlow: return 1.5
        case .slow: return 1.0
        case .normal: return 0.5
        case .fast: return 0.3
        case .veryFast: return 0.1
        }
    }

    /// Get recommended maximum response length (in words)
    func getRecommendedResponseLength() -> Int {
        switch currentPace {
        case .verySlow: return 30
        case .slow: return 50
        case .normal: return 75
        case .fast: return 100
        case .veryFast: return 150
        }
    }

    // MARK: - Manual Adjustments

    func increasePace() {
        let previous = currentPace
        currentPace = currentPace.adjusted(by: 1)
        if previous != currentPace {
            logger.info("Pace manually increased to: \(currentPace.rawValue)")
        }
    }

    func decreasePace() {
        let previous = currentPace
        currentPace = currentPace.adjusted(by: -1)
        if previous != currentPace {
            logger.info("Pace manually decreased to: \(currentPace.rawValue)")
        }
    }

    func increaseComplexity() {
        let previous = currentComplexity
        currentComplexity = currentComplexity.adjusted(by: 1)
        if previous != currentComplexity {
            logger.info("Complexity manually increased to: \(currentComplexity.rawValue)")
        }
    }

    func decreaseComplexity() {
        let previous = currentComplexity
        currentComplexity = currentComplexity.adjusted(by: -1)
        if previous != currentComplexity {
            logger.info("Complexity manually decreased to: \(currentComplexity.rawValue)")
        }
    }

    func resetToDefaults() {
        currentPace = .normal
        currentComplexity = .medium
        metrics = PerformanceMetrics()
        logger.info("Pacing reset to defaults")
    }

    // MARK: - Metrics Access

    func getCurrentMetrics() -> (successRate: Double, pace: PacingLevel, complexity: ComplexityLevel) {
        (metrics.successRate, currentPace, currentComplexity)
    }

    func getAdaptationSummary() -> String {
        guard !adaptationHistory.isEmpty else {
            return "No adaptations yet"
        }

        let recent = adaptationHistory.suffix(3)
        let summary = recent.map { adaptation in
            "\(adaptation.timestamp.formatted(date: .omitted, time: .shortened)): \(adaptation.reason)"
        }.joined(separator: "\n")

        return """
        Recent Adaptations:
        \(summary)

        Current State:
        - Pace: \(currentPace.description)
        - Complexity: \(currentComplexity.description)
        - Success Rate: \(String(format: "%.1f%%", metrics.successRate * 100))
        """
    }
}
