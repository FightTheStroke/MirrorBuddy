import XCTest
@testable import MirrorBuddy

@MainActor
final class SentimentAnalyzerTests: XCTestCase {

    var sut: SentimentAnalyzer!

    override func setUp() async throws {
        try await super.setUp()
        sut = SentimentAnalyzer()
    }

    override func tearDown() async throws {
        sut = nil
        try await super.tearDown()
    }

    // MARK: - Text Analysis Tests

    func testAnalyzeFrustratedText() {
        // Given
        let frustratedTexts = [
            "I don't understand this at all",
            "This is too difficult",
            "Non capisco niente",
            "Questo è impossibile"
        ]

        // When/Then
        for text in frustratedTexts {
            let result = sut.analyzeSentimentFromText(text)
            XCTAssertTrue(
                result.sentiment == .frustrated || result.sentiment == .confused,
                "Expected frustrated or confused sentiment for: \(text)"
            )
            XCTAssertTrue(result.sentiment.needsEncouragement)
        }
    }

    func testAnalyzeConfidentText() {
        // Given
        let confidentTexts = [
            "Yes, I got it!",
            "That's clear now",
            "Capito, è chiaro",
            "Esatto, ora capisco"
        ]

        // When/Then
        for text in confidentTexts {
            let result = sut.analyzeSentimentFromText(text)
            XCTAssertEqual(result.sentiment, .confident, "Expected confident sentiment for: \(text)")
            XCTAssertFalse(result.sentiment.needsEncouragement)
        }
    }

    func testAnalyzeUncertainText() {
        // Given
        let uncertainTexts = [
            "I think maybe it's like this",
            "Non sono sicuro",
            "I guess so",
            "Forse è così"
        ]

        // When/Then
        for text in uncertainTexts {
            let result = sut.analyzeSentimentFromText(text)
            XCTAssertEqual(result.sentiment, .uncertain, "Expected uncertain sentiment for: \(text)")
            XCTAssertTrue(result.sentiment.needsSlowerPacing)
        }
    }

    func testAnalyzeExcitedText() {
        // Given
        let excitedTexts = [
            "This is amazing!",
            "Fantastico!",
            "Perfect! I love this!",
            "Ottimo, grande!"
        ]

        // When/Then
        for text in excitedTexts {
            let result = sut.analyzeSentimentFromText(text)
            XCTAssertEqual(result.sentiment, .excited, "Expected excited sentiment for: \(text)")
            XCTAssertTrue(result.sentiment.canHandleFasterPacing)
        }
    }

    func testShortResponseIndicatesUncertainty() {
        // Given
        let shortText = "no"

        // When
        let result = sut.analyzeSentimentFromText(shortText)

        // Then
        XCTAssertTrue(result.indicators.contains { $0.contains("Very short response") })
    }

    func testDetailedResponseIndicatesConfidence() {
        // Given
        let detailedText = "I understand the concept now because it's similar to how we organize our thoughts in everyday life when we solve problems step by step"

        // When
        let result = sut.analyzeSentimentFromText(detailedText)

        // Then
        XCTAssertTrue(result.indicators.contains { $0.contains("Detailed response") })
    }

    // MARK: - Voice Analysis Tests

    func testHighAmplitudeIndicatesExcitement() {
        // Given
        let characteristics = SentimentAnalyzer.VoiceCharacteristics(
            amplitude: 0.8,
            speechRate: 150,
            pauseDuration: 0.5,
            pitchVariance: 0.7
        )

        // When
        let result = sut.analyzeSentimentFromVoice(characteristics: characteristics)

        // Then
        XCTAssertEqual(result.sentiment, .excited)
        XCTAssertTrue(result.indicators.contains { $0.contains("High energy") })
    }

    func testLowAmplitudeIndicatesFrustration() {
        // Given
        let characteristics = SentimentAnalyzer.VoiceCharacteristics(
            amplitude: 0.2,
            speechRate: 120,
            pauseDuration: 1.5,
            pitchVariance: 0.2
        )

        // When
        let result = sut.analyzeSentimentFromVoice(characteristics: characteristics)

        // Then
        XCTAssertTrue(
            result.sentiment == .frustrated || result.sentiment == .uncertain,
            "Low amplitude should indicate negative sentiment"
        )
        XCTAssertTrue(result.indicators.contains { $0.contains("Low energy") })
    }

    func testSlowSpeechIndicatesUncertainty() {
        // Given
        let characteristics = SentimentAnalyzer.VoiceCharacteristics(
            amplitude: 0.5,
            speechRate: 100,
            pauseDuration: 2.5,
            pitchVariance: 0.4
        )

        // When
        let result = sut.analyzeSentimentFromVoice(characteristics: characteristics)

        // Then
        XCTAssertTrue(
            result.sentiment == .uncertain || result.sentiment == .confused,
            "Slow speech with long pauses should indicate uncertainty"
        )
    }

    func testFastSpeechIndicatesExcitement() {
        // Given
        let characteristics = SentimentAnalyzer.VoiceCharacteristics(
            amplitude: 0.7,
            speechRate: 200,
            pauseDuration: 0.3,
            pitchVariance: 0.8
        )

        // When
        let result = sut.analyzeSentimentFromVoice(characteristics: characteristics)

        // Then
        XCTAssertEqual(result.sentiment, .excited)
        XCTAssertTrue(result.indicators.contains { $0.contains("Fast speech") })
    }

    // MARK: - Combined Analysis Tests

    func testCombinedAnalysisWithBothSources() {
        // Given
        let text = "I got it!"
        let characteristics = SentimentAnalyzer.VoiceCharacteristics(
            amplitude: 0.8,
            speechRate: 180,
            pauseDuration: 0.2,
            pitchVariance: 0.7
        )

        // When
        let result = sut.analyzeSentiment(text: text, voiceCharacteristics: characteristics)

        // Then
        XCTAssertTrue(
            result.sentiment == .confident || result.sentiment == .excited,
            "Combined positive indicators should result in positive sentiment"
        )
        XCTAssertGreaterThan(result.confidence, 0.5)
    }

    func testCombinedAnalysisConflictingSignals() {
        // Given - text is positive but voice is uncertain
        let text = "Yes, I understand"
        let characteristics = SentimentAnalyzer.VoiceCharacteristics(
            amplitude: 0.3,
            speechRate: 100,
            pauseDuration: 2.0,
            pitchVariance: 0.3
        )

        // When
        let result = sut.analyzeSentiment(text: text, voiceCharacteristics: characteristics)

        // Then
        // Text weight is 0.6, voice weight is 0.4, so text should have more influence
        XCTAssertNotNil(result.sentiment)
        XCTAssertFalse(result.indicators.isEmpty)
    }

    // MARK: - Sentiment History Tests

    func testSentimentHistoryTracking() {
        // Given
        let texts = ["I don't get it", "Still confused", "Wait, I think I see it", "Yes! Got it!"]

        // When
        for text in texts {
            _ = sut.analyzeSentimentFromText(text)
        }

        // Then
        let recentSentiment = sut.getRecentSentiment()
        XCTAssertNotNil(recentSentiment)
        XCTAssertTrue(recentSentiment == .confident || recentSentiment == .excited)
    }

    func testSentimentTrendImproving() {
        // Given - progression from frustrated to confident
        _ = sut.analyzeSentimentFromText("This is hard")
        _ = sut.analyzeSentimentFromText("I think I understand")
        _ = sut.analyzeSentimentFromText("Yes, I got it!")

        // When
        let trend = sut.getSentimentTrend()

        // Then
        XCTAssertEqual(trend, .improving)
        XCTAssertFalse(trend.requiresIntervention)
    }

    func testSentimentTrendDeclining() {
        // Given - progression from confident to frustrated
        _ = sut.analyzeSentimentFromText("I understand this")
        _ = sut.analyzeSentimentFromText("Wait, I'm confused")
        _ = sut.analyzeSentimentFromText("I don't get it at all")

        // When
        let trend = sut.getSentimentTrend()

        // Then
        XCTAssertEqual(trend, .declining)
        XCTAssertTrue(trend.requiresIntervention)
    }

    func testClearHistory() {
        // Given
        _ = sut.analyzeSentimentFromText("Test text")
        _ = sut.analyzeSentimentFromText("Another test")

        // When
        sut.clearHistory()

        // Then
        XCTAssertNil(sut.getRecentSentiment())
    }

    func testAverageSentiment() {
        // Given - mostly confident responses
        _ = sut.analyzeSentimentFromText("I got it")
        _ = sut.analyzeSentimentFromText("Yes, clear")
        _ = sut.analyzeSentimentFromText("I understand")
        _ = sut.analyzeSentimentFromText("Maybe")

        // When
        let average = sut.getAverageSentiment()

        // Then
        XCTAssertEqual(average, .confident, "Majority sentiment should be confident")
    }

    // MARK: - Edge Cases

    func testEmptyTextDefaultsToNeutral() {
        // Given
        let emptyText = ""

        // When
        let result = sut.analyzeSentimentFromText(emptyText)

        // Then
        XCTAssertEqual(result.sentiment, .neutral)
    }

    func testNeutralVoiceCharacteristics() {
        // Given
        let neutralCharacteristics = SentimentAnalyzer.VoiceCharacteristics(
            amplitude: 0.5,
            speechRate: 150,
            pauseDuration: 0.5,
            pitchVariance: 0.5
        )

        // When
        let result = sut.analyzeSentimentFromVoice(characteristics: neutralCharacteristics)

        // Then
        XCTAssertTrue(
            result.sentiment == .neutral || result.sentiment == .confident,
            "Neutral characteristics should result in neutral or confident sentiment"
        )
    }

    func testConfidenceScoreRange() {
        // Given
        let text = "I understand this perfectly"

        // When
        let result = sut.analyzeSentimentFromText(text)

        // Then
        XCTAssertGreaterThanOrEqual(result.confidence, 0.0)
        XCTAssertLessThanOrEqual(result.confidence, 1.0)
    }

    func testResultIncludesTimestamp() {
        // Given
        let text = "Test"
        let beforeTime = Date()

        // When
        let result = sut.analyzeSentimentFromText(text)

        // Then
        let afterTime = Date()
        XCTAssertGreaterThanOrEqual(result.timestamp, beforeTime)
        XCTAssertLessThanOrEqual(result.timestamp, afterTime)
    }

    func testIndicatorsNotEmpty() {
        // Given
        let text = "I'm confused about this"

        // When
        let result = sut.analyzeSentimentFromText(text)

        // Then
        XCTAssertFalse(result.indicators.isEmpty, "Analysis should provide indicators")
    }
}
