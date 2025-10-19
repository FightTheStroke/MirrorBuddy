import Foundation
import os.log

/// Analyzes voice characteristics and text to detect emotional sentiment
@MainActor
final class SentimentAnalyzer {

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "SentimentAnalyzer")

    // MARK: - Sentiment Types

    enum Sentiment: String, Codable {
        case excited        // High energy, positive
        case confident      // Steady, assured
        case neutral        // Baseline emotional state
        case uncertain      // Hesitant, questioning
        case frustrated     // Low energy, negative
        case confused       // Seeking help, lost

        var needsEncouragement: Bool {
            switch self {
            case .frustrated, .confused, .uncertain:
                return true
            case .excited, .confident, .neutral:
                return false
            }
        }

        var needsSlowerPacing: Bool {
            switch self {
            case .frustrated, .confused:
                return true
            case .uncertain:
                return true
            case .excited, .confident, .neutral:
                return false
            }
        }

        var canHandleFasterPacing: Bool {
            switch self {
            case .excited, .confident:
                return true
            case .neutral, .uncertain, .frustrated, .confused:
                return false
            }
        }
    }

    // MARK: - Voice Characteristics

    struct VoiceCharacteristics {
        /// Audio amplitude (0.0 to 1.0)
        let amplitude: Double

        /// Speech rate (words per minute)
        let speechRate: Double

        /// Pause duration (in seconds)
        let pauseDuration: Double

        /// Voice pitch variance
        let pitchVariance: Double

        init(
            amplitude: Double = 0.5,
            speechRate: Double = 150,
            pauseDuration: Double = 0.0,
            pitchVariance: Double = 0.5
        ) {
            self.amplitude = amplitude
            self.speechRate = speechRate
            self.pauseDuration = pauseDuration
            self.pitchVariance = pitchVariance
        }
    }

    // MARK: - Analysis Results

    struct SentimentAnalysisResult {
        let sentiment: Sentiment
        let confidence: Double // 0.0 to 1.0
        let indicators: [String]
        let timestamp: Date

        init(sentiment: Sentiment, confidence: Double, indicators: [String]) {
            self.sentiment = sentiment
            self.confidence = confidence
            self.indicators = indicators
            self.timestamp = Date()
        }
    }

    // MARK: - History Tracking

    private var sentimentHistory: [SentimentAnalysisResult] = []
    private let historyLimit = 10

    // MARK: - Analysis Methods

    /// Analyze sentiment from voice characteristics
    func analyzeSentimentFromVoice(
        characteristics: VoiceCharacteristics
    ) -> SentimentAnalysisResult {
        var indicators: [String] = []
        var sentimentScores: [Sentiment: Double] = [:]

        // Analyze amplitude (energy level)
        if characteristics.amplitude > 0.7 {
            sentimentScores[.excited, default: 0] += 0.3
            indicators.append("High energy detected")
        } else if characteristics.amplitude < 0.3 {
            sentimentScores[.frustrated, default: 0] += 0.3
            sentimentScores[.uncertain, default: 0] += 0.2
            indicators.append("Low energy detected")
        }

        // Analyze speech rate
        if characteristics.speechRate > 180 {
            // Fast speech - excited or nervous
            sentimentScores[.excited, default: 0] += 0.2
            sentimentScores[.uncertain, default: 0] += 0.1
            indicators.append("Fast speech rate")
        } else if characteristics.speechRate < 120 {
            // Slow speech - uncertain or thinking
            sentimentScores[.uncertain, default: 0] += 0.3
            sentimentScores[.confused, default: 0] += 0.2
            indicators.append("Slow speech rate")
        } else {
            sentimentScores[.confident, default: 0] += 0.2
            sentimentScores[.neutral, default: 0] += 0.1
        }

        // Analyze pauses
        if characteristics.pauseDuration > 2.0 {
            sentimentScores[.confused, default: 0] += 0.3
            sentimentScores[.uncertain, default: 0] += 0.2
            indicators.append("Long pauses detected")
        } else if characteristics.pauseDuration > 1.0 {
            sentimentScores[.uncertain, default: 0] += 0.2
            indicators.append("Moderate pauses")
        }

        // Analyze pitch variance
        if characteristics.pitchVariance > 0.7 {
            sentimentScores[.excited, default: 0] += 0.2
            indicators.append("High pitch variation")
        } else if characteristics.pitchVariance < 0.3 {
            sentimentScores[.frustrated, default: 0] += 0.2
            sentimentScores[.neutral, default: 0] += 0.1
            indicators.append("Low pitch variation")
        }

        // Default to neutral if no strong indicators
        if sentimentScores.isEmpty {
            sentimentScores[.neutral] = 0.5
            indicators.append("Baseline emotional state")
        }

        // Find dominant sentiment
        let sortedScores = sentimentScores.sorted { $0.value > $1.value }
        let topSentiment = sortedScores.first?.key ?? .neutral
        let confidence = sortedScores.first?.value ?? 0.5

        let result = SentimentAnalysisResult(
            sentiment: topSentiment,
            confidence: confidence,
            indicators: indicators
        )

        addToHistory(result)
        logger.info("Voice analysis: \(topSentiment.rawValue) (confidence: \(String(format: "%.2f", confidence)))")

        return result
    }

    /// Analyze sentiment from text content
    func analyzeSentimentFromText(_ text: String) -> SentimentAnalysisResult {
        let lowercased = text.lowercased()
        var indicators: [String] = []
        var sentimentScores: [Sentiment: Double] = [:]

        // Frustrated indicators
        let frustratedWords = ["non capisco", "difficile", "impossibile", "don't understand", "hard", "difficult", "can't", "impossible", "confused", "stuck"]
        for word in frustratedWords {
            if lowercased.contains(word) {
                sentimentScores[.frustrated, default: 0] += 0.3
                sentimentScores[.confused, default: 0] += 0.2
                indicators.append("Frustration keywords: \(word)")
            }
        }

        // Uncertain indicators
        let uncertainWords = ["forse", "non sono sicuro", "credo", "penso", "maybe", "not sure", "think", "guess", "probably"]
        for word in uncertainWords {
            if lowercased.contains(word) {
                sentimentScores[.uncertain, default: 0] += 0.3
                indicators.append("Uncertainty keywords: \(word)")
            }
        }

        // Confused indicators
        let confusedWords = ["cosa significa", "perché", "come", "what does", "why", "how", "?"]
        for word in confusedWords {
            if lowercased.contains(word) {
                sentimentScores[.confused, default: 0] += 0.2
                indicators.append("Question/confusion: \(word)")
            }
        }

        // Confident indicators
        let confidentWords = ["capito", "chiaro", "sì", "esatto", "got it", "yes", "clear", "right", "understand", "correct"]
        for word in confidentWords {
            if lowercased.contains(word) {
                sentimentScores[.confident, default: 0] += 0.3
                indicators.append("Confidence keywords: \(word)")
            }
        }

        // Excited indicators
        let excitedWords = ["fantastico", "ottimo", "grande", "amazing", "great", "awesome", "perfect", "excellent", "!"]
        for word in excitedWords {
            if lowercased.contains(word) {
                sentimentScores[.excited, default: 0] += 0.3
                indicators.append("Excitement keywords: \(word)")
            }
        }

        // Analyze response length
        let wordCount = text.split(separator: " ").count
        if wordCount < 3 {
            sentimentScores[.uncertain, default: 0] += 0.2
            indicators.append("Very short response")
        } else if wordCount > 20 {
            sentimentScores[.confident, default: 0] += 0.1
            sentimentScores[.excited, default: 0] += 0.1
            indicators.append("Detailed response")
        }

        // Default to neutral if no indicators
        if sentimentScores.isEmpty {
            sentimentScores[.neutral] = 0.5
            indicators.append("No strong sentiment indicators")
        }

        // Find dominant sentiment
        let sortedScores = sentimentScores.sorted { $0.value > $1.value }
        let topSentiment = sortedScores.first?.key ?? .neutral
        let confidence = sortedScores.first?.value ?? 0.5

        let result = SentimentAnalysisResult(
            sentiment: topSentiment,
            confidence: confidence,
            indicators: indicators
        )

        addToHistory(result)
        logger.info("Text analysis: \(topSentiment.rawValue) (confidence: \(String(format: "%.2f", confidence)))")

        return result
    }

    /// Combined analysis from both voice and text
    func analyzeSentiment(
        text: String,
        voiceCharacteristics: VoiceCharacteristics? = nil
    ) -> SentimentAnalysisResult {
        let textResult = analyzeSentimentFromText(text)

        guard let voice = voiceCharacteristics else {
            return textResult
        }

        let voiceResult = analyzeSentimentFromVoice(characteristics: voice)

        // Combine results with weighted average
        let textWeight = 0.6
        let voiceWeight = 0.4

        var combinedScores: [Sentiment: Double] = [:]
        combinedScores[textResult.sentiment, default: 0] += textResult.confidence * textWeight
        combinedScores[voiceResult.sentiment, default: 0] += voiceResult.confidence * voiceWeight

        let sortedScores = combinedScores.sorted { $0.value > $1.value }
        let finalSentiment = sortedScores.first?.key ?? .neutral
        let finalConfidence = sortedScores.first?.value ?? 0.5

        let combinedIndicators = textResult.indicators + voiceResult.indicators

        let result = SentimentAnalysisResult(
            sentiment: finalSentiment,
            confidence: finalConfidence,
            indicators: combinedIndicators
        )

        logger.info("Combined analysis: \(finalSentiment.rawValue) (confidence: \(String(format: "%.2f", finalConfidence)))")

        return result
    }

    // MARK: - Trend Analysis

    /// Get sentiment trend over recent history
    func getSentimentTrend() -> SentimentTrend {
        guard sentimentHistory.count >= 3 else {
            return .stable
        }

        let recent = Array(sentimentHistory.suffix(3))
        let negativeSentiments: Set<Sentiment> = [.frustrated, .confused, .uncertain]
        let positiveSentiments: Set<Sentiment> = [.excited, .confident]

        let negativeCount = recent.filter { negativeSentiments.contains($0.sentiment) }.count
        let positiveCount = recent.filter { positiveSentiments.contains($0.sentiment) }.count

        if negativeCount >= 2 {
            return .declining
        } else if positiveCount >= 2 {
            return .improving
        } else {
            return .stable
        }
    }

    enum SentimentTrend {
        case improving
        case stable
        case declining

        var requiresIntervention: Bool {
            self == .declining
        }
    }

    // MARK: - History Management

    private func addToHistory(_ result: SentimentAnalysisResult) {
        sentimentHistory.append(result)
        if sentimentHistory.count > historyLimit {
            sentimentHistory.removeFirst()
        }
    }

    func clearHistory() {
        sentimentHistory.removeAll()
        logger.info("Sentiment history cleared")
    }

    func getRecentSentiment() -> Sentiment? {
        sentimentHistory.last?.sentiment
    }

    func getAverageSentiment() -> Sentiment {
        guard !sentimentHistory.isEmpty else { return .neutral }

        var sentimentCounts: [Sentiment: Int] = [:]
        for result in sentimentHistory {
            sentimentCounts[result.sentiment, default: 0] += 1
        }

        let mostCommon = sentimentCounts.max { $0.value < $1.value }
        return mostCommon?.key ?? .neutral
    }
}
