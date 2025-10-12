import Foundation

/// Client for OpenAI API
final class OpenAIClient {
    // MARK: - Properties

    private let configuration: OpenAIConfiguration
    private let urlSession: URLSession
    private let rateLimiter: RateLimiter
    private let jsonDecoder: JSONDecoder
    private let jsonEncoder: JSONEncoder

    // MARK: - Initialization

    init(configuration: OpenAIConfiguration) {
        self.configuration = configuration

        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = configuration.timeout
        sessionConfig.timeoutIntervalForResource = configuration.timeout * 2
        self.urlSession = URLSession(configuration: sessionConfig)

        self.rateLimiter = RateLimiter(requestsPerMinute: 60) // OpenAI default limit
        self.jsonDecoder = JSONDecoder()
        self.jsonEncoder = JSONEncoder()
    }

    // MARK: - Chat Completions

    /// Send a chat completion request
    func chatCompletion(
        model: OpenAIConfiguration.Model = .gpt5,
        messages: [ChatMessage],
        temperature: Double = 0.7,
        maxTokens: Int? = nil
    ) async throws -> ChatCompletionResponse {
        try await rateLimiter.waitIfNeeded()

        let request = ChatCompletionRequest(
            model: model.rawValue,
            messages: messages,
            temperature: temperature,
            maxTokens: maxTokens,
            stream: false,
            responseFormat: nil
        )

        return try await performRequest(
            endpoint: .chatCompletions,
            method: "POST",
            body: request,
            responseType: ChatCompletionResponse.self
        )
    }

    /// Simple text completion with GPT-5 Nano (for quick Q&A)
    func simpleCompletion(prompt: String) async throws -> String {
        let messages = [
            ChatMessage(
                role: .user,
                content: .text(prompt)
            )
        ]

        let response = try await chatCompletion(
            model: .gpt5Nano,
            messages: messages,
            temperature: 0.3,
            maxTokens: 500
        )

        guard let content = response.choices.first?.message.content else {
            throw OpenAIError.invalidRequest("No response content")
        }

        return content
    }

    /// Vision analysis with GPT-5 Mini
    func analyzeImage(
        imageURL: String,
        prompt: String = "Describe this image in detail."
    ) async throws -> String {
        let messages = [
            ChatMessage(
                role: .user,
                content: .multipart([
                    ChatContentPart(type: .text, text: prompt, imageURL: nil),
                    ChatContentPart(
                        type: .imageURL,
                        text: nil,
                        imageURL: ChatImageURL(url: imageURL, detail: .auto)
                    )
                ])
            )
        ]

        let response = try await chatCompletion(
            model: .gpt5Mini,
            messages: messages,
            temperature: 0.5,
            maxTokens: 1_000
        )

        guard let content = response.choices.first?.message.content else {
            throw OpenAIError.invalidRequest("No response content")
        }

        return content
    }

    // MARK: - Image Generation

    /// Generate an image with DALL-E 3
    func generateImage(
        prompt: String,
        size: ImageSize = .square1024,
        quality: ImageQuality = .standard,
        style: ImageStyle = .vivid
    ) async throws -> ImageGenerationResponse {
        try await rateLimiter.waitIfNeeded()

        let request = ImageGenerationRequest(
            model: OpenAIConfiguration.Model.dalle3.rawValue,
            prompt: prompt,
            count: 1,
            size: size,
            quality: quality,
            style: style
        )

        return try await performRequest(
            endpoint: .images,
            method: "POST",
            body: request,
            responseType: ImageGenerationResponse.self
        )
    }

    // MARK: - Private Methods

    /// Context for HTTP request execution
    private struct RequestContext<Request: Encodable, Response: Decodable> {
        let endpoint: OpenAIConfiguration.Endpoint
        let method: String
        let body: Request
        let responseType: Response.Type
        let retryCount: Int
    }

    /// Perform HTTP request with retry logic
    private func performRequest<Request: Encodable, Response: Decodable>(
        endpoint: OpenAIConfiguration.Endpoint,
        method: String,
        body: Request,
        responseType: Response.Type,
        retryCount: Int = 0
    ) async throws -> Response {
        let context = RequestContext(
            endpoint: endpoint,
            method: method,
            body: body,
            responseType: responseType,
            retryCount: retryCount
        )
        guard let url = URL(string: endpoint.path(baseURL: configuration.baseURL)) else {
            throw OpenAIError.invalidConfiguration
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.addValue("Bearer \(configuration.apiKey)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        if let orgID = configuration.organizationID {
            request.addValue(orgID, forHTTPHeaderField: "OpenAI-Organization")
        }

        // Encode body
        request.httpBody = try jsonEncoder.encode(body)

        do {
            let (data, response) = try await urlSession.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw OpenAIError.unknown("Invalid response type")
            }

            // Handle HTTP status codes
            try await handleHTTPResponse(
                httpResponse: httpResponse,
                data: data,
                context: context
            )

            // Decode successful response
            return try jsonDecoder.decode(responseType, from: data)
        } catch let error as DecodingError {
            throw OpenAIError.decodingError(error)
        } catch let error as URLError {
            throw handleURLError(error)
        } catch let error as OpenAIError {
            throw error
        } catch {
            throw OpenAIError.unknown(error.localizedDescription)
        }
    }

    /// Handle HTTP response status codes
    private func handleHTTPResponse<Request: Encodable, Response: Decodable>(
        httpResponse: HTTPURLResponse,
        data: Data,
        context: RequestContext<Request, Response>
    ) async throws {
        // Handle rate limiting
        if httpResponse.statusCode == 429 {
            try await handleRateLimitError(httpResponse: httpResponse, context: context)
        }

        // Handle authentication errors
        if httpResponse.statusCode == 401 {
            throw OpenAIError.authenticationFailed
        }

        // Handle other errors
        if httpResponse.statusCode >= 400 {
            throw try handleServerError(statusCode: httpResponse.statusCode, data: data)
        }
    }

    /// Handle rate limit errors with retry logic
    private func handleRateLimitError<Request: Encodable, Response: Decodable>(
        httpResponse: HTTPURLResponse,
        context: RequestContext<Request, Response>
    ) async throws {
        let retryAfter = httpResponse.value(forHTTPHeaderField: "Retry-After")
            .flatMap { TimeInterval($0) }

        guard context.retryCount < configuration.maxRetries else {
            throw OpenAIError.rateLimitExceeded(retryAfter: retryAfter)
        }

        let sleepDuration = retryAfter ?? 2.0
        await withCheckedContinuation { continuation in
            DispatchQueue.global().asyncAfter(deadline: .now() + sleepDuration) {
                continuation.resume()
            }
        }

        _ = try await performRequest(
            endpoint: context.endpoint,
            method: context.method,
            body: context.body,
            responseType: context.responseType,
            retryCount: context.retryCount + 1
        )
    }

    /// Handle server errors
    private func handleServerError(statusCode: Int, data: Data) throws -> OpenAIError {
        if let errorResponse = try? jsonDecoder.decode(OpenAIErrorResponse.self, from: data) {
            return OpenAIError.serverError(
                statusCode: statusCode,
                message: errorResponse.error.message
            )
        }
        return OpenAIError.serverError(statusCode: statusCode, message: "Unknown error")
    }

    /// Handle URL errors
    private func handleURLError(_ error: URLError) -> OpenAIError {
        switch error.code {
        case .timedOut:
            return OpenAIError.timeout
        case .cancelled:
            return OpenAIError.cancelled
        default:
            return OpenAIError.networkError(error)
        }
    }
}

// MARK: - Rate Limiter

/// Simple rate limiter to prevent exceeding API limits
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

        // If we've hit the limit, wait
        if requestTimestamps.count >= requestsPerMinute {
            if let oldest = requestTimestamps.first {
                let waitTime = 60 - now.timeIntervalSince(oldest)
                if waitTime > 0 {
                    await withCheckedContinuation { continuation in
                        DispatchQueue.global().asyncAfter(deadline: .now() + waitTime) {
                            continuation.resume()
                        }
                    }
                    // Recurse to check again
                    try await waitIfNeeded()
                }
            }
        }

        // Record this request
        requestTimestamps.append(now)
    }
}
