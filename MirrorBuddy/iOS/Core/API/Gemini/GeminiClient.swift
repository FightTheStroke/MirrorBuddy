import Foundation

/// Client for interacting with Google Gemini API
@MainActor
final class GeminiClient {
    private let configuration: GeminiConfiguration
    private let urlSession: URLSession
    private let rateLimiter: RateLimiter

    init(configuration: GeminiConfiguration) {
        self.configuration = configuration

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = configuration.timeout
        config.timeoutIntervalForResource = configuration.timeout
        self.urlSession = URLSession(configuration: config)

        // Gemini has a limit of 60 requests per minute for free tier
        self.rateLimiter = RateLimiter(requestsPerMinute: 60)
    }

    // MARK: - Text Generation

    /// Generate text content using Gemini
    func generateContent(
        prompt: String,
        model: GeminiConfiguration.Model = .gemini25Pro,
        temperature: Double = 0.7,
        maxTokens: Int? = nil,
        systemInstruction: String? = nil
    ) async throws -> String {
        try await rateLimiter.waitIfNeeded()

        let contents = [GeminiContent.text(prompt)]
        let systemInstructionContent = systemInstruction.map { GeminiContent.text($0, role: "system") }

        let request = GeminiGenerateContentRequest(
            contents: contents,
            systemInstruction: systemInstructionContent,
            generationConfig: GeminiGenerationConfig(
                temperature: temperature,
                maxOutputTokens: maxTokens
            )
        )

        let response = try await sendRequest(request: request, model: model)

        guard let candidate = response.candidates.first,
              let part = candidate.content.parts.first,
              case .text(let text) = part else {
            throw GeminiError.invalidResponse
        }

        return text
    }

    /// Analyze text with vision capabilities
    func analyzeWithVision(
        text: String,
        imageData: Data,
        mimeType: String = "image/jpeg",
        model: GeminiConfiguration.Model = .gemini25Pro
    ) async throws -> String {
        guard model.supportsVision else {
            throw GeminiError.invalidRequest("Model \(model.rawValue) does not support vision")
        }

        try await rateLimiter.waitIfNeeded()

        let base64Image = imageData.base64EncodedString()
        let contents = [
            GeminiContent(role: "user", parts: [
                .text(text),
                .inlineData(GeminiInlineData(mimeType: mimeType, data: base64Image))
            ])
        ]

        let request = GeminiGenerateContentRequest(contents: contents)
        let response = try await sendRequest(request: request, model: model)

        guard let candidate = response.candidates.first,
              let part = candidate.content.parts.first,
              case .text(let responseText) = part else {
            throw GeminiError.invalidResponse
        }

        return responseText
    }

    // MARK: - Google Workspace Integration

    /// Research and analyze Drive folder contents
    func analyzeDriveFolder(folderPath: String, query: String) async throws -> DriveAnalysisResult {
        let prompt = """
        Analyze the following Google Drive folder and its contents:
        Folder: \(folderPath)
        Query: \(query)

        Provide a structured analysis including:
        1. Relevant files and their purposes
        2. Key insights from the folder contents
        3. Recommendations based on the query

        Format the response as JSON with keys: files, insights, recommendations
        """

        let jsonString = try await generateContent(
            prompt: prompt,
            systemInstruction: "You are an assistant helping analyze Google Drive folders. Always respond with valid JSON."
        )

        guard let data = jsonString.data(using: .utf8),
              let result = try? JSONDecoder().decode(DriveAnalysisResult.self, from: data) else {
            throw GeminiError.decodingError(
                NSError(domain: "GeminiClient", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Failed to parse Drive analysis result"
                ])
            )
        }

        return result
    }

    /// Parse and extract events from Calendar
    func parseCalendarEvents(
        calendarData: String,
        startDate: Date,
        endDate: Date
    ) async throws -> [CalendarEventData] {
        let dateFormatter = ISO8601DateFormatter()
        let startDateString = dateFormatter.string(from: startDate)
        let endDateString = dateFormatter.string(from: endDate)

        let prompt = """
        Parse the following calendar data and extract events between \(startDateString) and \(endDateString):

        \(calendarData)

        Extract each event with:
        - title: Event title
        - startTime: ISO 8601 format
        - endTime: ISO 8601 format
        - location: Location if available
        - description: Event description
        - attendees: List of attendees

        Return as JSON array with these exact keys.
        """

        let jsonString = try await generateContent(
            prompt: prompt,
            systemInstruction: "You are an assistant that parses calendar data. Always respond with valid JSON array."
        )

        guard let data = jsonString.data(using: .utf8),
              let events = try? JSONDecoder().decode([CalendarEventData].self, from: data) else {
            throw GeminiError.decodingError(
                NSError(domain: "GeminiClient", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Failed to parse calendar events"
                ])
            )
        }

        return events
    }

    /// Extract assignments from Gmail messages
    func extractAssignmentsFromGmail(emailContent: String) async throws -> [AssignmentData] {
        let prompt = """
        Analyze the following email content and extract any school assignments or homework:

        \(emailContent)

        For each assignment found, extract:
        - title: Assignment title
        - subject: School subject (e.g., Math, History)
        - dueDate: Due date in ISO 8601 format if mentioned
        - description: Assignment description or instructions
        - priority: high, medium, or low based on urgency
        - type: homework, project, test, quiz, or other

        Return as JSON array with these exact keys. If no assignments found, return empty array.
        """

        let jsonString = try await generateContent(
            prompt: prompt,
            systemInstruction: """
            You are an assistant that extracts school assignments from emails. \
            Always respond with valid JSON array, even if empty.
            """
        )

        guard let data = jsonString.data(using: .utf8),
              let assignments = try? JSONDecoder().decode([AssignmentData].self, from: data) else {
            throw GeminiError.decodingError(
                NSError(domain: "GeminiClient", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Failed to parse assignments"
                ])
            )
        }

        return assignments
    }

    // MARK: - Private Methods

    private func sendRequest(
        request: GeminiGenerateContentRequest,
        model: GeminiConfiguration.Model
    ) async throws -> GeminiGenerateContentResponse {
        let endpoint = GeminiConfiguration.Endpoint.generateContent(model: model)
        let urlString = endpoint.path(baseURL: configuration.baseURL, apiKey: configuration.apiKey)

        guard let url = URL(string: urlString) else {
            throw GeminiError.configurationError("Invalid URL")
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(request)

        return try await executeWithRetry {
            try await self.performRequest(urlRequest)
        }
    }

    private func performRequest(_ request: URLRequest) async throws -> GeminiGenerateContentResponse {
        let (data, response) = try await urlSession.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GeminiError.invalidResponse
        }

        // Handle rate limiting
        if httpResponse.statusCode == 429 {
            let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
                .flatMap { TimeInterval($0) }
            throw GeminiError.rateLimitExceeded(retryAfter: retryAfter)
        }

        // Handle other error status codes
        if !(200...299).contains(httpResponse.statusCode) {
            if let errorResponse = try? JSONDecoder().decode(GeminiErrorResponse.self, from: data) {
                throw GeminiError.apiError(
                    code: errorResponse.error.code,
                    message: errorResponse.error.message
                )
            }
            throw GeminiError.apiError(
                code: httpResponse.statusCode,
                message: "Unknown error occurred"
            )
        }

        do {
            let response = try JSONDecoder().decode(GeminiGenerateContentResponse.self, from: data)

            // Check for content safety blocks
            if let promptFeedback = response.promptFeedback {
                for rating in promptFeedback.safetyRatings where rating.probability == "HIGH" {
                    throw GeminiError.contentBlocked(reason: "Content blocked due to \(rating.category)")
                }
            }

            return response
        } catch {
            throw GeminiError.decodingError(error)
        }
    }

    private func executeWithRetry<T>(
        operation: () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        var attempt = 0

        while attempt < configuration.maxRetries {
            do {
                return try await operation()
            } catch let error as GeminiError {
                lastError = error

                switch error {
                case .rateLimitExceeded(let retryAfter):
                    let delay = retryAfter ?? Double(attempt * 2)
                    try await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                case .networkError, .invalidResponse:
                    let delay = Double(attempt + 1)
                    try await _Concurrency.Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                default:
                    throw error // Don't retry on other errors
                }

                attempt += 1
            } catch {
                throw GeminiError.networkError(error)
            }
        }

        throw lastError ?? GeminiError.maxRetriesExceeded
    }
}

// MARK: - Rate Limiter Actor

private actor RateLimiter {
    private let requestsPerMinute: Int
    private var requestTimestamps: [Date] = []

    init(requestsPerMinute: Int) {
        self.requestsPerMinute = requestsPerMinute
    }

    func waitIfNeeded() async throws {
        let now = Date()
        let oneMinuteAgo = now.addingTimeInterval(-60)

        // Remove timestamps older than 1 minute
        requestTimestamps.removeAll { $0 < oneMinuteAgo }

        // If we've hit the limit, wait until the oldest request is 1 minute old
        if requestTimestamps.count >= requestsPerMinute {
            if let oldestRequest = requestTimestamps.first {
                let waitTime = 60 - now.timeIntervalSince(oldestRequest)
                if waitTime > 0 {
                    try await _Concurrency.Task.sleep(nanoseconds: UInt64(waitTime * 1_000_000_000))
                }
                // Remove the oldest timestamp
                requestTimestamps.removeFirst()
            }
        }

        // Add current request timestamp
        requestTimestamps.append(now)
    }
}

// MARK: - Supporting Data Models

struct DriveAnalysisResult: Codable {
    let files: [DriveFileInfo]
    let insights: [String]
    let recommendations: [String]
}

struct DriveFileInfo: Codable {
    let name: String
    let purpose: String
    let type: String?
}

struct CalendarEventData: Codable {
    let title: String
    let startTime: String
    let endTime: String
    let location: String?
    let description: String?
    let attendees: [String]?
}

struct AssignmentData: Codable {
    let title: String
    let subject: String
    let dueDate: String?
    let description: String
    let priority: String
    let type: String
}
