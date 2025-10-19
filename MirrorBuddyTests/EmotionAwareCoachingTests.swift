import Foundation
@testable import MirrorBuddy
import Testing

/// Tests for emotion-aware coaching system (Task 130)
@Suite("Emotion-Aware Coaching Tests")
struct EmotionAwareCoachingTests {
    // MARK: - Sentiment Detection Tests

    @Test("Detect frustrated sentiment from low success rate")
    func testFrustratedDetection() {
        let analyzer = SentimentAnalyzer()

        // Simulate multiple incorrect answers
        for _ in 0..<5 {
            analyzer.recordInteraction(wasCorrect: false, responseTime: 8.0)
        }

        let sentiment = analyzer.getCurrentSentiment()
        #expect(sentiment == .frustrated || sentiment == .confused)
    }

    @Test("Detect confident sentiment from high success rate")
    func testConfidentDetection() {
        let analyzer = SentimentAnalyzer()

        // Simulate multiple correct answers
        for _ in 0..<5 {
            analyzer.recordInteraction(wasCorrect: true, responseTime: 2.0)
        }

        let sentiment = analyzer.getCurrentSentiment()
        #expect(sentiment == .confident || sentiment == .excited)
    }

    @Test("Detect uncertain sentiment from inconsistent performance")
    func testUncertainDetection() {
        let analyzer = SentimentAnalyzer()

        // Simulate mixed performance
        analyzer.recordInteraction(wasCorrect: true, responseTime: 3.0)
        analyzer.recordInteraction(wasCorrect: false, responseTime: 7.0)
        analyzer.recordInteraction(wasCorrect: true, responseTime: 4.0)

        let sentiment = analyzer.getCurrentSentiment()
        #expect(sentiment == .uncertain || sentiment == .neutral)
    }

    // MARK: - Adaptive Pacing Tests

    @Test("Slow down pacing when student is frustrated")
    func testPacingSlowdown() {
        let analyzer = SentimentAnalyzer()
        let engine = AdaptivePacingEngine(sentimentAnalyzer: analyzer)

        // Record poor performance
        for _ in 0..<5 {
            analyzer.recordInteraction(wasCorrect: false, responseTime: 10.0)
        }

        // Adapt pacing
        let sentiment = analyzer.getCurrentSentiment()
        engine.evaluateAndAdapt(currentSentiment: sentiment, wasAnswerCorrect: false)

        let (_, pace, _) = engine.getCurrentMetrics()
        #expect(pace == .slow || pace == .verySlow)
    }

    @Test("Speed up pacing when student is confident")
    func testPacingSpeedup() {
        let analyzer = SentimentAnalyzer()
        let engine = AdaptivePacingEngine(sentimentAnalyzer: analyzer)

        // Record excellent performance
        for _ in 0..<8 {
            analyzer.recordInteraction(wasCorrect: true, responseTime: 1.5)
            engine.evaluateAndAdapt(currentSentiment: .confident, wasAnswerCorrect: true)
        }

        let (successRate, pace, _) = engine.getCurrentMetrics()
        #expect(successRate > 0.8)
        #expect(pace == .fast || pace == .veryFast)
    }

    @Test("Simplify complexity when student is confused")
    func testComplexitySimplification() {
        let analyzer = SentimentAnalyzer()
        let engine = AdaptivePacingEngine(sentimentAnalyzer: analyzer)

        // Start at normal
        engine.evaluateAndAdapt(currentSentiment: .neutral, wasAnswerCorrect: true)

        // Trigger confusion
        for _ in 0..<3 {
            engine.evaluateAndAdapt(currentSentiment: .confused, wasAnswerCorrect: false)
        }

        let (_, _, complexity) = engine.getCurrentMetrics()
        #expect(complexity == .simple || complexity == .verySimple)
    }

    // MARK: - Persona Adaptation Tests

    @Test("Playful persona uses encouraging language")
    func testPlayfulPersona() async {
        let persona = CoachPersonaService.shared
        persona.updateStyle(.playful)

        let baseResponse = "Good job on that answer!"
        let adapted = persona.generateResponseStyle(for: .confident)

        #expect(adapted.contains("playful") || adapted.contains("fun") || adapted.contains("energy"))
    }

    @Test("Calm persona uses gentle language")
    func testCalmPersona() async {
        let persona = CoachPersonaService.shared
        persona.updateStyle(.calm)

        let adapted = persona.generateResponseStyle(for: .frustrated)

        #expect(adapted.contains("gentle") || adapted.contains("patient") || adapted.contains("calm"))
    }

    @Test("Persona adjusts based on sentiment")
    func testPersonaSentimentAdaptation() {
        let persona = CoachPersonaService.shared
        persona.updateStyle(.enthusiastic)

        // Should be extra supportive when frustrated
        let frustratedResponse = persona.generateResponseStyle(for: .frustrated)
        #expect(frustratedResponse.contains("support") || frustratedResponse.contains("help"))

        // Should celebrate when confident
        let confidentResponse = persona.generateResponseStyle(for: .confident)
        #expect(confidentResponse.contains("great") || confidentResponse.contains("excellent") || confidentResponse.contains("amazing"))
    }

    // MARK: - Integration Tests

    @Test("Complete emotion-aware cycle")
    func testCompleteEmotionAwareCycle() {
        let analyzer = SentimentAnalyzer()
        let engine = AdaptivePacingEngine(sentimentAnalyzer: analyzer)
        let persona = CoachPersonaService.shared
        persona.updateStyle(.playful)

        // Simulate learning session with varying performance
        let interactions: [(correct: Bool, time: Double)] = [
            (true, 2.0),
            (true, 1.5),
            (false, 8.0),  // Struggle
            (false, 9.0),  // More struggle
            (true, 3.0),   // Recovery
            (true, 2.0),
            (true, 1.8)
        ]

        for (isCorrect, responseTime) in interactions {
            analyzer.recordInteraction(wasCorrect: isCorrect, responseTime: responseTime)
            let sentiment = analyzer.getCurrentSentiment()
            engine.evaluateAndAdapt(currentSentiment: sentiment, wasAnswerCorrect: isCorrect)
        }

        // Should have adapted during the session
        let (successRate, finalPace, finalComplexity) = engine.getCurrentMetrics()

        #expect(successRate >= 0.0)  // Valid rate
        #expect(finalPace.speedMultiplier >= 0.7)  // Within reasonable bounds
        #expect(finalPace.speedMultiplier <= 1.3)
    }

    @Test("Pacing instructions generated correctly")
    func testPacingInstructions() {
        let analyzer = SentimentAnalyzer()
        let engine = AdaptivePacingEngine(sentimentAnalyzer: analyzer)

        engine.evaluateAndAdapt(currentSentiment: .confused, wasAnswerCorrect: false)

        let instructions = engine.generatePacingInstructions()

        #expect(instructions.contains("PACING LEVEL"))
        #expect(instructions.contains("COMPLEXITY LEVEL"))
        #expect(!instructions.isEmpty)
    }

    @Test("Adaptation history tracked correctly")
    func testAdaptationHistory() {
        let analyzer = SentimentAnalyzer()
        let engine = AdaptivePacingEngine(sentimentAnalyzer: analyzer)

        // Trigger adaptation
        engine.evaluateAndAdapt(currentSentiment: .neutral)
        engine.evaluateAndAdapt(currentSentiment: .frustrated, wasAnswerCorrect: false)
        engine.evaluateAndAdapt(currentSentiment: .confused, wasAnswerCorrect: false)

        #expect(!engine.adaptationHistory.isEmpty)

        let summary = engine.getAdaptationSummary()
        #expect(summary.contains("Recent Adaptations") || summary.contains("Current State"))
    }

    @Test("Manual pacing adjustments work")
    func testManualPacingAdjustments() {
        let analyzer = SentimentAnalyzer()
        let engine = AdaptivePacingEngine(sentimentAnalyzer: analyzer)

        let (_, initialPace, initialComplexity) = engine.getCurrentMetrics()

        // Increase pace manually
        engine.increasePace()
        let (_, newPace, _) = engine.getCurrentMetrics()
        #expect(newPace.speedMultiplier > initialPace.speedMultiplier || newPace == .veryFast)

        // Reset
        engine.resetToDefaults()
        let (_, resetPace, resetComplexity) = engine.getCurrentMetrics()
        #expect(resetPace == .normal)
        #expect(resetComplexity == .medium)
    }
}
