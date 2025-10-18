import os.log
import UIKit

/// Comprehensive service for GPT-5 Vision API integration for homework analysis
@MainActor
final class VisionAnalysisService {
    /// Shared singleton instance
    static let shared = VisionAnalysisService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "VisionAnalysis")

    // MARK: - Configuration (Subtask 36.1)

    private var configuration: OpenAIConfiguration?
    private let baseURL = "https://api.openai.com/v1/chat/completions"
    private let visionModel = "gpt-4o" // Using GPT-4o for vision capabilities

    private lazy var circuitBreaker = CircuitBreaker(endpoint: "vision-api")

    // MARK: - Initialization

    private init() {
        loadConfiguration()
    }

    private func loadConfiguration() {
        configuration = OpenAIConfiguration.loadFromEnvironment()
        if configuration != nil {
            logger.info("Vision API configuration loaded successfully")
        } else {
            logger.warning("Vision API configuration not found")
        }
    }

    // MARK: - Image Upload & Analysis (Subtask 36.2)

    /// Analyze homework image with GPT-5 Vision
    /// - Parameters:
    ///   - image: Homework image to analyze
    ///   - analysisType: Type of analysis to perform
    ///   - language: Language for response (Italian/English)
    /// - Returns: Analysis result
    func analyzeHomework(
        image: UIImage,
        analysisType: AnalysisType,
        language: StudyCoachPersonality.Language = .italian
    ) async throws -> AnalysisResult {
        guard let configuration else {
            throw VisionAnalysisError.configurationMissing
        }

        // Optimize and encode image
        let optimizedImage = ImageProcessor.shared.optimizeForAI(image)
        guard let imageData = optimizedImage.jpegData(compressionQuality: 0.85) else {
            throw VisionAnalysisError.imageEncodingFailed
        }

        let base64Image = imageData.base64EncodedString()

        // Generate appropriate prompt based on analysis type
        let prompt = generatePrompt(for: analysisType, language: language)

        // Create API request
        let request = try createVisionRequest(
            base64Image: base64Image,
            prompt: prompt,
            configuration: configuration
        )

        // Execute with circuit breaker and retry logic (Subtask 36.8)
        return try await circuitBreaker.execute {
            try await self.executeVisionRequest(request)
        }
    }

    private func createVisionRequest(
        base64Image: String,
        prompt: String,
        configuration: OpenAIConfiguration
    ) throws -> URLRequest {
        guard let url = URL(string: baseURL) else {
            throw VisionAnalysisError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(configuration.apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let organizationID = configuration.organizationID {
            request.setValue(organizationID, forHTTPHeaderField: "OpenAI-Organization")
        }

        let requestBody: [String: Any] = [
            "model": visionModel,
            "messages": [
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "text",
                            "text": prompt
                        ],
                        [
                            "type": "image_url",
                            "image_url": [
                                "url": "data:image/jpeg;base64,\(base64Image)",
                                "detail": "high"
                            ]
                        ]
                    ]
                ]
            ],
            "max_tokens": 2_000,
            "temperature": 0.7
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        request.timeoutInterval = configuration.timeout

        return request
    }

    private func executeVisionRequest(_ request: URLRequest) async throws -> AnalysisResult {
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw VisionAnalysisError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            logger.error("Vision API error: \(httpResponse.statusCode) - \(errorMessage)")
            throw VisionAnalysisError.apiError(statusCode: httpResponse.statusCode, message: errorMessage)
        }

        // Parse response (Subtask 36.8)
        return try parseVisionResponse(data)
    }

    // MARK: - Prompt Generation (Subtasks 36.3, 36.4, 36.5, 36.6, 36.7)

    /// Generate analysis prompt based on type and language
    private func generatePrompt(
        for analysisType: AnalysisType,
        language: StudyCoachPersonality.Language
    ) -> String {
        switch analysisType {
        case .textbookPage:
            return generateTextbookPrompt(language: language)
        case .mathProblem:
            return generateMathPrompt(language: language)
        case .diagram:
            return generateDiagramPrompt(language: language)
        case .handwriting:
            return generateHandwritingPrompt(language: language)
        case .stepByStep:
            return generateStepByStepPrompt(language: language)
        case .general:
            return generateGeneralPrompt(language: language)
        }
    }

    // Subtask 36.3: Textbook Page Analysis
    private func generateTextbookPrompt(language: StudyCoachPersonality.Language) -> String {
        switch language {
        case .italian:
            return """
            Analizza questa pagina di libro di testo.

            Identifica:
            1. L'argomento principale trattato
            2. I concetti chiave spiegati
            3. Gli esempi forniti
            4. Gli esercizi o problemi presenti
            5. Eventuali formule, definizioni o teoremi

            Fornisci un'analisi strutturata e chiara.
            Se ci sono esercizi, elencali separatamente.
            """
        case .english:
            return """
            Analyze this textbook page.

            Identify:
            1. The main topic covered
            2. Key concepts explained
            3. Examples provided
            4. Exercises or problems present
            5. Any formulas, definitions, or theorems

            Provide a structured and clear analysis.
            If there are exercises, list them separately.
            """
        }
    }

    // Subtask 36.4: Math Problem Recognition
    private func generateMathPrompt(language: StudyCoachPersonality.Language) -> String {
        switch language {
        case .italian:
            return """
            Analizza questo problema matematico.

            1. Identifica il tipo di problema (algebra, geometria, calcolo, etc.)
            2. Estrai tutti i dati forniti
            3. Identifica cosa viene richiesto di trovare
            4. Riconosci eventuali formule o teoremi applicabili
            5. Nota se ci sono grafici, diagrammi o figure geometriche

            Fornisci un'analisi dettagliata del problema.
            NON risolvere il problema, solo analizzalo.
            """
        case .english:
            return """
            Analyze this math problem.

            1. Identify the problem type (algebra, geometry, calculus, etc.)
            2. Extract all given data
            3. Identify what is being asked to find
            4. Recognize any applicable formulas or theorems
            5. Note if there are graphs, diagrams, or geometric figures

            Provide a detailed analysis of the problem.
            DO NOT solve the problem, only analyze it.
            """
        }
    }

    // Subtask 36.5: Diagram Understanding
    private func generateDiagramPrompt(language: StudyCoachPersonality.Language) -> String {
        switch language {
        case .italian:
            return """
            Analizza questo diagramma o figura.

            1. Descrivi cosa rappresenta il diagramma
            2. Identifica tutti gli elementi etichettati
            3. Nota le relazioni tra gli elementi
            4. Identifica misure, angoli, o valori presenti
            5. Spiega il contesto matematico o scientifico

            Fornisci una descrizione dettagliata e strutturata.
            """
        case .english:
            return """
            Analyze this diagram or figure.

            1. Describe what the diagram represents
            2. Identify all labeled elements
            3. Note relationships between elements
            4. Identify measurements, angles, or values present
            5. Explain the mathematical or scientific context

            Provide a detailed and structured description.
            """
        }
    }

    // Subtask 36.6: Handwriting Recognition
    private func generateHandwritingPrompt(language: StudyCoachPersonality.Language) -> String {
        switch language {
        case .italian:
            return """
            Trascrivi accuratamente il testo scritto a mano in questa immagine.

            1. Mantieni la formattazione originale dove possibile
            2. Per formule matematiche, usa notazione standard
            3. Indica chiaramente se ci sono parti illeggibili con [?]
            4. Preserva numeri, simboli e notazione matematica
            5. Se ci sono schizzi o diagrammi, descrivili brevemente

            Trascrizione:
            """
        case .english:
            return """
            Accurately transcribe the handwritten text in this image.

            1. Maintain original formatting where possible
            2. For mathematical formulas, use standard notation
            3. Clearly indicate any illegible parts with [?]
            4. Preserve numbers, symbols, and mathematical notation
            5. If there are sketches or diagrams, describe them briefly

            Transcription:
            """
        }
    }

    // Subtask 36.7: Step-by-Step Problem Solving
    private func generateStepByStepPrompt(language: StudyCoachPersonality.Language) -> String {
        switch language {
        case .italian:
            return """
            Fornisci una guida passo-passo per risolvere questo problema.

            Per ogni passo:
            1. Spiega cosa si sta facendo
            2. Spiega PERCHÉ si sta facendo
            3. Mostra i calcoli o ragionamenti
            4. Indica il risultato di questo passo

            Usa un linguaggio chiaro e incoraggiante.
            Adatta la spiegazione a uno studente che sta imparando.
            NON saltare passaggi, anche se sembrano ovvi.
            Celebra il progresso ad ogni passo completato.
            """
        case .english:
            return """
            Provide a step-by-step guide to solve this problem.

            For each step:
            1. Explain what is being done
            2. Explain WHY it's being done
            3. Show calculations or reasoning
            4. State the result of this step

            Use clear and encouraging language.
            Adapt the explanation for a learning student.
            DO NOT skip steps, even if they seem obvious.
            Celebrate progress at each completed step.
            """
        }
    }

    // General analysis prompt
    private func generateGeneralPrompt(language: StudyCoachPersonality.Language) -> String {
        switch language {
        case .italian:
            return """
            Analizza questa immagine di compiti per casa.

            1. Identifica il tipo di contenuto (problema, testo, diagramma, etc.)
            2. Estrai tutte le informazioni rilevanti
            3. Fornisci un'analisi chiara e strutturata
            4. Se appropriato, suggerisci come affrontare questo materiale

            Usa un linguaggio chiaro e accessibile.
            """
        case .english:
            return """
            Analyze this homework image.

            1. Identify the type of content (problem, text, diagram, etc.)
            2. Extract all relevant information
            3. Provide a clear and structured analysis
            4. If appropriate, suggest how to approach this material

            Use clear and accessible language.
            """
        }
    }

    // MARK: - Response Parsing (Subtask 36.8)

    private func parseVisionResponse(_ data: Data) throws -> AnalysisResult {
        struct OpenAIResponse: Codable {
            struct Choice: Codable {
                struct Message: Codable {
                    let content: String
                }
                let message: Message
            }
            let choices: [Choice]
            let usage: Usage?

            struct Usage: Codable {
                let promptTokens: Int
                let completionTokens: Int
                let totalTokens: Int

                enum CodingKeys: String, CodingKey {
                    case promptTokens = "prompt_tokens"
                    case completionTokens = "completion_tokens"
                    case totalTokens = "total_tokens"
                }
            }
        }

        let decoder = JSONDecoder()
        let response = try decoder.decode(OpenAIResponse.self, from: data)

        guard let firstChoice = response.choices.first else {
            throw VisionAnalysisError.emptyResponse
        }

        let content = firstChoice.message.content

        // Extract structured information from response
        let analysis = parseAnalysisContent(content)

        logger.info("Vision analysis completed - tokens: \(response.usage?.totalTokens ?? 0)")

        return AnalysisResult(
            rawContent: content,
            analysisType: .general,
            extractedProblems: analysis.problems,
            identifiedConcepts: analysis.concepts,
            detectedText: analysis.text,
            confidence: 0.9, // High confidence from GPT-4o
            tokensUsed: response.usage?.totalTokens ?? 0
        )
    }

    private func parseAnalysisContent(_ content: String) -> (problems: [String], concepts: [String], text: String) {
        var problems: [String] = []
        var concepts: [String] = []

        // Extract numbered problems
        let problemPattern = #/(?:Problem|Problema|Exercise|Esercizio)\s*\d+:?\s*(.+?)(?=(?:Problem|Problema|Exercise|Esercizio)\s*\d+|$)/#
        if let matches = try? problemPattern.firstMatch(in: content) {
            problems.append(String(matches.1))
        }

        // Extract key concepts (simple heuristic)
        let conceptKeywords = ["formula", "theorem", "definition", "formula", "teorema", "definizione"]
        for keyword in conceptKeywords {
            if content.localizedCaseInsensitiveContains(keyword) {
                let lines = content.components(separatedBy: .newlines)
                for line in lines where line.localizedCaseInsensitiveContains(keyword) {
                    concepts.append(line.trimmingCharacters(in: .whitespaces))
                }
            }
        }

        return (problems, concepts, content)
    }

    // MARK: - Batch Analysis

    /// Analyze multiple images in batch
    func analyzeMultipleImages(
        _ images: [UIImage],
        analysisType: AnalysisType,
        language: StudyCoachPersonality.Language = .italian
    ) async throws -> [AnalysisResult] {
        var results: [AnalysisResult] = []

        for (index, image) in images.enumerated() {
            do {
                let result = try await analyzeHomework(
                    image: image,
                    analysisType: analysisType,
                    language: language
                )
                results.append(result)
                logger.info("Analyzed image \(index + 1)/\(images.count)")
            } catch {
                logger.error("Failed to analyze image \(index + 1): \(error.localizedDescription)")
                throw error
            }

            // Rate limiting: wait 1 second between requests
            if index < images.count - 1 {
                try await _Concurrency.Task.sleep(nanoseconds: 1_000_000_000)
            }
        }

        return results
    }

    // MARK: - Convenience Methods

    /// Quick analyze for textbook page
    func analyzeTextbookPage(_ image: UIImage) async throws -> AnalysisResult {
        try await analyzeHomework(image: image, analysisType: .textbookPage)
    }

    /// Quick analyze for math problem
    func analyzeMathProblem(_ image: UIImage) async throws -> AnalysisResult {
        try await analyzeHomework(image: image, analysisType: .mathProblem)
    }

    /// Quick analyze for diagram
    func analyzeDiagram(_ image: UIImage) async throws -> AnalysisResult {
        try await analyzeHomework(image: image, analysisType: .diagram)
    }

    /// Transcribe handwriting
    func transcribeHandwriting(_ image: UIImage) async throws -> String {
        let result = try await analyzeHomework(image: image, analysisType: .handwriting)
        return result.detectedText
    }

    /// Get step-by-step solution guidance
    func getStepByStepGuidance(_ image: UIImage) async throws -> AnalysisResult {
        try await analyzeHomework(image: image, analysisType: .stepByStep)
    }
}

// MARK: - Supporting Types

enum AnalysisType {
    case textbookPage
    case mathProblem
    case diagram
    case handwriting
    case stepByStep
    case general
}

struct AnalysisResult {
    let rawContent: String
    let analysisType: AnalysisType
    let extractedProblems: [String]
    let identifiedConcepts: [String]
    let detectedText: String
    let confidence: Double
    let tokensUsed: Int
    let timestamp: Date

    init(
        rawContent: String,
        analysisType: AnalysisType,
        extractedProblems: [String] = [],
        identifiedConcepts: [String] = [],
        detectedText: String = "",
        confidence: Double = 0.0,
        tokensUsed: Int = 0,
        timestamp: Date = Date()
    ) {
        self.rawContent = rawContent
        self.analysisType = analysisType
        self.extractedProblems = extractedProblems
        self.identifiedConcepts = identifiedConcepts
        self.detectedText = detectedText.isEmpty ? rawContent : detectedText
        self.confidence = confidence
        self.tokensUsed = tokensUsed
        self.timestamp = timestamp
    }
}

enum VisionAnalysisError: LocalizedError {
    case configurationMissing
    case imageEncodingFailed
    case invalidURL
    case invalidResponse
    case emptyResponse
    case apiError(statusCode: Int, message: String)
    case rateLimitExceeded
    case timeout

    var errorDescription: String? {
        switch self {
        case .configurationMissing:
            return "OpenAI API configuration is missing"
        case .imageEncodingFailed:
            return "Failed to encode image"
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from Vision API"
        case .emptyResponse:
            return "Empty response from Vision API"
        case .apiError(let statusCode, let message):
            return "Vision API error (\(statusCode)): \(message)"
        case .rateLimitExceeded:
            return "Rate limit exceeded. Please wait and try again."
        case .timeout:
            return "Vision API request timed out"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .configurationMissing:
            return "Please add your OpenAI API key in Settings."
        case .imageEncodingFailed:
            return "Try capturing a new image."
        case .apiError(let statusCode, _):
            if statusCode == 429 {
                return "You've exceeded the API rate limit. Please wait a few moments and try again."
            } else if statusCode >= 500 {
                return "OpenAI servers are experiencing issues. Please try again later."
            }
            return "Please check your API key and try again."
        case .timeout:
            return "Check your internet connection and try again."
        default:
            return "Please try again."
        }
    }
}
