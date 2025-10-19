import AVFoundation
import Combine
import Foundation

/// Service for detecting emotional sentiment from voice characteristics
@MainActor
final class SentimentDetectionService: ObservableObject {
    // MARK: - Published Properties

    @Published var currentSentiment: Sentiment = .neutral
    @Published var sentimentHistory: [SentimentReading] = []

    // MARK: - Dependencies

    private let anthropicClient: AnthropicClient?

    // MARK: - State

    private var audioLevelBuffer: [Float] = []
    private let bufferSize = 30 // 30 samples for rolling average

    // MARK: - Types

    enum Sentiment: String, Codable {
        case enthusiastic
        case neutral
        case frustrated
        case confused
        case tired

        var needsSupport: Bool {
            switch self {
            case .frustrated, .confused, .tired:
                return true
            case .enthusiastic, .neutral:
                return false
            }
        }

        var suggestedPacing: PacingAdjustment {
            switch self {
            case .enthusiastic:
                return .maintain
            case .neutral:
                return .maintain
            case .frustrated:
                return .slowDown
            case .confused:
                return .simplify
            case .tired:
                return .energize
            }
        }
    }

    enum PacingAdjustment {
        case maintain
        case slowDown
        case simplify
        case energize
    }

    struct SentimentReading: Identifiable, Codable {
        let id: UUID
        let timestamp: Date
        let sentiment: Sentiment
        let confidence: Double
        let audioFeatures: AudioFeatures?

        init(
            sentiment: Sentiment,
            confidence: Double = 0.7,
            audioFeatures: AudioFeatures? = nil
        ) {
            self.id = UUID()
            self.timestamp = Date()
            self.sentiment = sentiment
            self.confidence = confidence
            self.audioFeatures = audioFeatures
        }
    }

    struct AudioFeatures: Codable {
        let averageAmplitude: Float
        let peakAmplitude: Float
        let speechRate: Double?
        let pauseFrequency: Double?
    }

    // MARK: - Initialization

    init(anthropicClient: AnthropicClient? = nil) {
        self.anthropicClient = anthropicClient
    }

    // MARK: - Audio-Based Detection

    /// Analyze audio levels to infer basic sentiment
    func analyzeSpeechAudio(amplitude: Float, peakLevel: Float) {
        // Add to buffer
        audioLevelBuffer.append(amplitude)
        if audioLevelBuffer.count > bufferSize {
            audioLevelBuffer.removeFirst()
        }

        // Calculate features
        let avgAmplitude = audioLevelBuffer.reduce(0, +) / Float(audioLevelBuffer.count)
        let variance = audioLevelBuffer.map { pow($0 - avgAmplitude, 2) }.reduce(0, +) / Float(audioLevelBuffer.count)

        // Infer sentiment from audio patterns
        let sentiment: Sentiment
        let confidence: Double

        if variance > 0.3 && avgAmplitude > 0.6 {
            // High variance + high amplitude = enthusiastic
            sentiment = .enthusiastic
            confidence = 0.7
        } else if variance < 0.1 && avgAmplitude < 0.3 {
            // Low variance + low amplitude = tired
            sentiment = .tired
            confidence = 0.65
        } else if variance > 0.4 && peakLevel > 0.8 {
            // High variance + high peaks = frustrated
            sentiment = .frustrated
            confidence = 0.6
        } else {
            sentiment = .neutral
            confidence = 0.8
        }

        updateSentiment(
            sentiment,
            confidence: confidence,
            audioFeatures: AudioFeatures(
                averageAmplitude: avgAmplitude,
                peakAmplitude: peakLevel,
                speechRate: nil,
                pauseFrequency: nil
            )
        )
    }

    /// Analyze speech patterns (pause frequency, rate)
    func analyzeSpeechPatterns(speechRate: Double, pauseFrequency: Double) {
        let sentiment: Sentiment
        let confidence: Double

        if pauseFrequency > 0.4 && speechRate < 100 {
            // Frequent pauses + slow speech = confused
            sentiment = .confused
            confidence = 0.7
        } else if speechRate > 180 {
            // Fast speech = enthusiastic or frustrated
            sentiment = currentSentiment == .frustrated ? .frustrated : .enthusiastic
            confidence = 0.6
        } else {
            sentiment = .neutral
            confidence = 0.75
        }

        updateSentiment(
            sentiment,
            confidence: confidence,
            audioFeatures: AudioFeatures(
                averageAmplitude: audioLevelBuffer.last ?? 0.5,
                peakAmplitude: audioLevelBuffer.max() ?? 0.5,
                speechRate: speechRate,
                pauseFrequency: pauseFrequency
            )
        )
    }

    // MARK: - LLM-Based Detection

    /// Use LLM to analyze conversation transcript for sentiment
    func analyzeTranscript(_ transcript: String) async throws {
        guard let client = anthropicClient else {
            // Fallback to neutral if no LLM available
            updateSentiment(.neutral, confidence: 0.5)
            return
        }

        let prompt = """
        Analyze the following student speech for emotional sentiment.
        Respond with ONLY one word: enthusiastic, neutral, frustrated, confused, or tired.

        Student: "\(transcript)"

        Sentiment:
        """

        let request = AnthropicCompletionRequest(
            model: "claude-3-5-sonnet-20241022",
            messages: [
                AnthropicMessage(role: "user", content: prompt)
            ],
            maxTokens: 10,
            temperature: 0.3
        )

        do {
            let response = try await client.sendMessage(request)
            let sentimentText = response.content.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() ?? "neutral"

            let sentiment = Sentiment(rawValue: sentimentText) ?? .neutral
            updateSentiment(sentiment, confidence: 0.85)
        } catch {
            print("⚠️ LLM sentiment analysis failed: \(error)")
            updateSentiment(.neutral, confidence: 0.5)
        }
    }

    // MARK: - State Management

    private func updateSentiment(_ sentiment: Sentiment, confidence: Double, audioFeatures: AudioFeatures? = nil) {
        // Only update if confidence threshold met
        guard confidence > 0.6 else { return }

        // Add to history
        let reading = SentimentReading(
            sentiment: sentiment,
            confidence: confidence,
            audioFeatures: audioFeatures
        )
        sentimentHistory.append(reading)

        // Keep last 50 readings
        if sentimentHistory.count > 50 {
            sentimentHistory.removeFirst()
        }

        // Update current sentiment
        currentSentiment = sentiment
    }

    /// Get aggregated sentiment over recent history
    func getRecentSentiment(last minutes: Int = 5) -> Sentiment {
        let cutoff = Date().addingTimeInterval(-Double(minutes * 60))
        let recentReadings = sentimentHistory.filter { $0.timestamp > cutoff }

        guard !recentReadings.isEmpty else { return .neutral }

        // Calculate weighted average by confidence
        var sentimentScores: [Sentiment: Double] = [:]
        for reading in recentReadings {
            sentimentScores[reading.sentiment, default: 0] += reading.confidence
        }

        return sentimentScores.max { $0.value < $1.value }?.key ?? .neutral
    }

    /// Reset sentiment tracking
    func reset() {
        currentSentiment = .neutral
        sentimentHistory.removeAll()
        audioLevelBuffer.removeAll()
    }
}
