//
//  WhisperTranscriptionService.swift
//  MirrorBuddy
//
//  Service for transcribing audio using OpenAI Whisper API
//  Implements error handling, retry logic, and rate limiting (Task 93.3)
//

import Foundation
import os.log

/// Service for transcribing audio segments using Whisper API
@MainActor
final class WhisperTranscriptionService {
    static let shared = WhisperTranscriptionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "WhisperTranscription")

    // MARK: - Configuration

    /// Whisper API endpoint
    private let apiEndpoint = "https://api.openai.com/v1/audio/transcriptions"

    /// API model to use
    private let model = "whisper-1"

    /// Maximum retry attempts for failed requests
    private let maxRetries = 3

    /// Delay between retries (exponential backoff)
    private let baseRetryDelay: TimeInterval = 2.0

    /// Timeout for API requests (60 seconds)
    private let requestTimeout: TimeInterval = 60.0

    /// Rate limiting: maximum concurrent requests
    private let maxConcurrentRequests = 3

    /// Current number of active requests
    private var activeRequests = 0

    /// API key (loaded from environment or config)
    private var apiKey: String?

    private init() {
        loadAPIKey()
    }

    // MARK: - API Key Management

    /// Load OpenAI API key from environment or configuration
    private func loadAPIKey() {
        // Try to load from environment variable first
        if let envKey = ProcessInfo.processInfo.environment["OPENAI_API_KEY"] {
            apiKey = envKey
            logger.info("Loaded OpenAI API key from environment")
            return
        }

        // TODO: Load from secure keychain storage in production
        // For now, log warning if no key found
        logger.warning("No OpenAI API key found. Transcription will fail.")
    }

    /// Set API key programmatically (for testing or dynamic configuration)
    func setAPIKey(_ key: String) {
        apiKey = key
        logger.info("OpenAI API key set programmatically")
    }

    // MARK: - Transcription

    /// Transcribe a single optimized audio segment
    /// - Parameters:
    ///   - segment: The optimized audio segment to transcribe
    ///   - language: Language code (default: "it" for Italian)
    ///   - prompt: Optional prompt to guide transcription
    /// - Returns: Transcription result with text and metadata
    func transcribeSegment(
        _ segment: OptimizedAudioSegment,
        language: String = "it",
        prompt: String? = nil
    ) async throws -> TranscriptionResult {
        guard let apiKey = apiKey else {
            throw TranscriptionError.missingAPIKey
        }

        logger.info("Starting transcription for segment \(segment.originalSegment.index)")

        // Wait for rate limiting
        await waitForAvailableSlot()

        defer {
            releaseSlot()
        }

        // Attempt transcription with retry logic
        var lastError: Error?

        for attempt in 0..<maxRetries {
            do {
                let result = try await performTranscription(
                    audioURL: segment.optimizedURL,
                    apiKey: apiKey,
                    language: language,
                    prompt: prompt,
                    segmentIndex: segment.originalSegment.index
                )

                logger.info("Successfully transcribed segment \(segment.originalSegment.index)")

                return TranscriptionResult(
                    segmentIndex: segment.originalSegment.index,
                    text: result.text,
                    language: result.language,
                    duration: result.duration,
                    startTime: segment.originalSegment.startTime,
                    endTime: segment.originalSegment.endTime,
                    attemptCount: attempt + 1,
                    timestamp: Date()
                )

            } catch let error as TranscriptionError where error.isRetryable {
                lastError = error
                logger.warning("Transcription attempt \(attempt + 1) failed (retryable): \(error.localizedDescription)")

                if attempt < maxRetries - 1 {
                    let delay = baseRetryDelay * Double(1 << attempt) // Exponential backoff
                    logger.info("Retrying in \(delay) seconds...")
                    try await _Concurrency.Task.sleep(for: .seconds(delay))
                }

            } catch {
                // Non-retryable error
                logger.error("Transcription failed with non-retryable error: \(error.localizedDescription)")
                throw error
            }
        }

        // All retries exhausted
        throw lastError ?? TranscriptionError.unknownError
    }

    /// Transcribe multiple segments in batch
    func transcribeSegments(
        _ segments: [OptimizedAudioSegment],
        language: String = "it",
        prompt: String? = nil,
        progressHandler: ((Int, Int) -> Void)? = nil
    ) async throws -> [TranscriptionResult] {
        logger.info("Starting batch transcription of \(segments.count) segments")

        var results: [TranscriptionResult] = []
        var errors: [TranscriptionError] = []

        for (index, segment) in segments.enumerated() {
            do {
                let result = try await transcribeSegment(
                    segment,
                    language: language,
                    prompt: prompt
                )
                results.append(result)

                // Report progress
                progressHandler?(index + 1, segments.count)

            } catch let error as TranscriptionError {
                logger.error("Failed to transcribe segment \(segment.originalSegment.index): \(error.localizedDescription)")
                errors.append(error)

                // Continue with other segments unless critical error
                if case .missingAPIKey = error {
                    throw error // Stop immediately for missing API key
                }
            }
        }

        logger.info("Batch transcription complete: \(results.count) successful, \(errors.count) failed")

        // If all failed, throw error
        if results.isEmpty && !errors.isEmpty {
            throw errors.first!
        }

        return results.sorted { $0.segmentIndex < $1.segmentIndex }
    }

    // MARK: - HTTP Request

    /// Perform the actual API request to Whisper
    private func performTranscription(
        audioURL: URL,
        apiKey: String,
        language: String,
        prompt: String?,
        segmentIndex: Int
    ) async throws -> WhisperAPIResponse {
        // Create multipart form data request
        let boundary = "Boundary-\(UUID().uuidString)"

        var request = URLRequest(url: URL(string: apiEndpoint)!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = requestTimeout

        // Build multipart body
        var body = Data()

        // Add file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(audioURL.lastPathComponent)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)

        let audioData = try Data(contentsOf: audioURL)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)

        // Add model
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(model)\r\n".data(using: .utf8)!)

        // Add language
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"language\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(language)\r\n".data(using: .utf8)!)

        // Add response format
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"response_format\"\r\n\r\n".data(using: .utf8)!)
        body.append("verbose_json\r\n".data(using: .utf8)!)

        // Add prompt if provided
        if let prompt = prompt {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"prompt\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(prompt)\r\n".data(using: .utf8)!)
        }

        // Close boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        logger.info("Sending transcription request for segment \(segmentIndex) (\(audioData.count / 1024) KB)")

        // Perform request
        let (data, response) = try await URLSession.shared.data(for: request)

        // Check HTTP status
        guard let httpResponse = response as? HTTPURLResponse else {
            throw TranscriptionError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200:
            // Success - decode response
            let decoder = JSONDecoder()
            return try decoder.decode(WhisperAPIResponse.self, from: data)

        case 400:
            throw TranscriptionError.badRequest
        case 401:
            throw TranscriptionError.authenticationFailed
        case 429:
            throw TranscriptionError.rateLimitExceeded
        case 500...599:
            throw TranscriptionError.serverError(httpResponse.statusCode)
        default:
            logger.error("Unexpected status code: \(httpResponse.statusCode)")
            throw TranscriptionError.unknownError
        }
    }

    // MARK: - Rate Limiting

    /// Wait for an available request slot
    private func waitForAvailableSlot() async {
        while activeRequests >= maxConcurrentRequests {
            logger.info("Rate limit reached, waiting for available slot...")
            try? await _Concurrency.Task.sleep(for: .milliseconds(500))
        }
        activeRequests += 1
    }

    /// Release a request slot
    private func releaseSlot() {
        activeRequests = max(0, activeRequests - 1)
    }
}

// MARK: - Whisper API Response

/// Response from Whisper API
struct WhisperAPIResponse: Codable {
    let text: String
    let language: String?
    let duration: Double?
    let segments: [WhisperSegment]?

    struct WhisperSegment: Codable {
        let id: Int
        let seek: Int
        let start: Double
        let end: Double
        let text: String
        let tokens: [Int]
        let temperature: Double
        let avg_logprob: Double
        let compression_ratio: Double
        let no_speech_prob: Double
    }
}

// MARK: - Transcription Result Model

/// Result of a transcription operation
struct TranscriptionResult: Identifiable, Codable {
    let id: UUID
    let segmentIndex: Int
    let text: String
    let language: String?
    let duration: Double?
    let startTime: TimeInterval  // Start time in original recording
    let endTime: TimeInterval    // End time in original recording
    let attemptCount: Int
    let timestamp: Date

    init(
        segmentIndex: Int,
        text: String,
        language: String?,
        duration: Double?,
        startTime: TimeInterval,
        endTime: TimeInterval,
        attemptCount: Int,
        timestamp: Date
    ) {
        self.id = UUID()
        self.segmentIndex = segmentIndex
        self.text = text
        self.language = language
        self.duration = duration
        self.startTime = startTime
        self.endTime = endTime
        self.attemptCount = attemptCount
        self.timestamp = timestamp
    }

    /// Formatted start time
    var formattedStartTime: String {
        let hours = Int(startTime) / 3600
        let minutes = (Int(startTime) % 3600) / 60
        let seconds = Int(startTime) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    /// Word count
    var wordCount: Int {
        text.split(separator: " ").count
    }
}

// MARK: - Batch Transcription Statistics

struct BatchTranscriptionStats {
    let totalSegments: Int
    let successfulSegments: Int
    let failedSegments: Int
    let totalDuration: TimeInterval
    let totalWords: Int
    let averageRetries: Double

    var successRate: Double {
        guard totalSegments > 0 else { return 0 }
        return Double(successfulSegments) / Double(totalSegments) * 100
    }

    var formattedDuration: String {
        let hours = Int(totalDuration) / 3600
        let minutes = (Int(totalDuration) % 3600) / 60
        return String(format: "%02d:%02d hours", hours, minutes)
    }
}

// MARK: - Errors

enum TranscriptionError: LocalizedError {
    case missingAPIKey
    case badRequest
    case authenticationFailed
    case rateLimitExceeded
    case serverError(Int)
    case invalidResponse
    case networkError(Error)
    case unknownError

    var errorDescription: String? {
        switch self {
        case .missingAPIKey:
            return "Chiave API OpenAI mancante"
        case .badRequest:
            return "Richiesta non valida inviata a Whisper API"
        case .authenticationFailed:
            return "Autenticazione fallita. Verifica la chiave API."
        case .rateLimitExceeded:
            return "Limite di richieste superato. Riprova più tardi."
        case .serverError(let code):
            return "Errore del server Whisper (\(code))"
        case .invalidResponse:
            return "Risposta non valida da Whisper API"
        case .networkError(let error):
            return "Errore di rete: \(error.localizedDescription)"
        case .unknownError:
            return "Errore sconosciuto durante la trascrizione"
        }
    }

    /// Whether this error should trigger a retry
    var isRetryable: Bool {
        switch self {
        case .rateLimitExceeded, .serverError, .networkError:
            return true
        case .missingAPIKey, .badRequest, .authenticationFailed, .invalidResponse, .unknownError:
            return false
        }
    }
}
