import Foundation
import os.log
import PencilKit
import UIKit
import Vision

/// Handwriting recognition service using VisionKit and Apple Pencil (Task 38)
@MainActor
final class HandwritingRecognitionService {
    /// Shared singleton instance
    static let shared = HandwritingRecognitionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "HandwritingRecognition")

    // MARK: - Initialization

    private init() {}

    // MARK: - Handwriting Recognition from PKDrawing

    /// Recognize handwritten text from a PencilKit drawing
    func recognizeText(from drawing: PKDrawing, language: String = "en") async throws -> HandwritingRecognitionResult {
        logger.info("Starting handwriting recognition for drawing")

        // Convert drawing to image
        let bounds = drawing.bounds.isEmpty ? CGRect(x: 0, y: 0, width: 800, height: 600) : drawing.bounds
        let image = drawing.image(from: bounds, scale: 2.0)

        // Perform text recognition
        return try await recognizeText(from: image, language: language)
    }

    // MARK: - Handwriting Recognition from UIImage

    /// Recognize handwritten text from an image
    func recognizeText(from image: UIImage, language: String = "en") async throws -> HandwritingRecognitionResult {
        guard let cgImage = image.cgImage else {
            throw HandwritingRecognitionError.invalidImage
        }

        logger.info("Starting handwriting recognition from image")

        // Create Vision request handler
        let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])

        // Configure text recognition request
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate // Use accurate recognition for handwriting
        request.usesLanguageCorrection = true
        request.recognitionLanguages = [language]

        // Set custom words if available (for mathematical terms, etc.)
        if #available(iOS 16.0, *) {
            request.customWords = getMathematicalTerms() + getCommonAcademicTerms()
        }

        // Perform recognition
        try requestHandler.perform([request])

        // Process results
        guard let observations = request.results else {
            throw HandwritingRecognitionError.recognitionFailed
        }

        return processRecognitionResults(observations, image: image)
    }

    // MARK: - Batch Recognition

    /// Recognize text from multiple drawings
    func recognizeTextBatch(from drawings: [PKDrawing], language: String = "en") async throws -> [HandwritingRecognitionResult] {
        var results: [HandwritingRecognitionResult] = []

        for (index, drawing) in drawings.enumerated() {
            logger.debug("Processing drawing \(index + 1) of \(drawings.count)")

            do {
                let result = try await recognizeText(from: drawing, language: language)
                results.append(result)
            } catch {
                logger.warning("Failed to recognize drawing \(index): \(error.localizedDescription)")
                // Continue with other drawings
            }
        }

        return results
    }

    // MARK: - Stroke-Level Recognition

    /// Recognize text for individual strokes (useful for real-time recognition)
    func recognizeStroke(_ stroke: PKStroke, in drawing: PKDrawing) async throws -> String? {
        // Create a new drawing with just this stroke
        let singleStrokeDrawing = PKDrawing(strokes: [stroke])

        // Get bounding box for the stroke
        let bounds = stroke.renderBounds.insetBy(dx: -10, dy: -10)

        // Convert to image
        let image = singleStrokeDrawing.image(from: bounds, scale: 2.0)

        // Recognize
        let result = try await recognizeText(from: image)

        return result.recognizedTexts.first?.text
    }

    // MARK: - Mathematical Expression Recognition

    /// Recognize mathematical expressions from handwriting
    func recognizeMathExpression(from drawing: PKDrawing) async throws -> MathExpressionResult {
        logger.info("Recognizing mathematical expression")

        // First, perform standard text recognition
        let textResult = try await recognizeText(from: drawing)

        // Analyze for mathematical symbols and structure
        let expressions = analyzeMathematicalStructure(from: textResult)

        return MathExpressionResult(
            originalText: textResult.fullText,
            expressions: expressions,
            confidence: textResult.averageConfidence
        )
    }

    // MARK: - Result Processing

    private func processRecognitionResults(_ observations: [VNRecognizedTextObservation], image: UIImage) -> HandwritingRecognitionResult {
        var recognizedTexts: [RecognizedText] = []
        var allText: [String] = []

        for observation in observations {
            // Get top candidate
            guard let topCandidate = observation.topCandidates(1).first else {
                continue
            }

            let text = topCandidate.string
            let confidence = topCandidate.confidence
            let boundingBox = observation.boundingBox

            // Convert normalized coordinates to image coordinates
            let imageRect = VNImageRectForNormalizedRect(
                boundingBox,
                Int(image.size.width),
                Int(image.size.height)
            )

            let recognizedText = RecognizedText(
                text: text,
                confidence: Float(confidence),
                boundingBox: imageRect,
                alternatives: observation.topCandidates(3).map { $0.string }
            )

            recognizedTexts.append(recognizedText)
            allText.append(text)
        }

        // Sort by vertical position (top to bottom)
        recognizedTexts.sort { $0.boundingBox.origin.y < $1.boundingBox.origin.y }

        let fullText = allText.joined(separator: " ")
        let averageConfidence = recognizedTexts.isEmpty ? 0 : recognizedTexts.map { $0.confidence }.reduce(0, +) / Float(recognizedTexts.count)

        logger.info("Recognized \(recognizedTexts.count) text regions with average confidence \(averageConfidence)")

        return HandwritingRecognitionResult(
            recognizedTexts: recognizedTexts,
            fullText: fullText,
            averageConfidence: averageConfidence,
            language: "en"
        )
    }

    // MARK: - Mathematical Analysis

    private func analyzeMathematicalStructure(from result: HandwritingRecognitionResult) -> [MathExpression] {
        var expressions: [MathExpression] = []

        // Common mathematical patterns
        let patterns = [
            // Equations: x = y, a + b = c
            ("=", MathExpressionType.equation),
            // Inequalities: x > y, a < b
            (">|<|≥|≤", MathExpressionType.inequality),
            // Fractions: might be detected as stacked text
            ("/", MathExpressionType.fraction),
            // Exponents: x^2, a^n
            ("\\^", MathExpressionType.exponent),
            // Square roots: √
            ("√", MathExpressionType.root)
        ]

        for recognizedText in result.recognizedTexts {
            let text = recognizedText.text

            for (pattern, type) in patterns where text.range(of: pattern, options: .regularExpression) != nil {
                expressions.append(MathExpression(
                    text: text,
                    type: type,
                    confidence: recognizedText.confidence,
                    boundingBox: recognizedText.boundingBox
                ))
                break
            }
        }

        return expressions
    }

    // MARK: - Domain-Specific Terms

    private func getMathematicalTerms() -> [String] {
        [
            // Greek letters
            "alpha", "beta", "gamma", "delta", "epsilon", "theta", "lambda", "mu", "pi", "sigma", "omega",
            // Mathematical terms
            "sine", "cosine", "tangent", "logarithm", "derivative", "integral", "matrix", "vector",
            "equation", "function", "variable", "constant", "coefficient", "exponent", "polynomial",
            "fraction", "numerator", "denominator", "radical", "square root", "cube root",
            // Operators
            "plus", "minus", "times", "divided", "equals", "approximately", "infinity"
        ]
    }

    private func getCommonAcademicTerms() -> [String] {
        [
            // Science
            "atom", "molecule", "element", "compound", "reaction", "energy", "force", "velocity",
            "acceleration", "mass", "volume", "density", "pressure", "temperature", "nucleus",
            // History
            "century", "dynasty", "empire", "revolution", "treaty", "constitution", "parliament",
            // Geography
            "continent", "peninsula", "archipelago", "latitude", "longitude", "equator", "meridian"
        ]
    }

    // MARK: - Utility Methods

    /// Calculate similarity between two text strings (useful for validation)
    func calculateSimilarity(between text1: String, and text2: String) -> Float {
        let distance = levenshteinDistance(text1, text2)
        let maxLength = max(text1.count, text2.count)

        guard maxLength > 0 else { return 1.0 }

        return 1.0 - (Float(distance) / Float(maxLength))
    }

    private func levenshteinDistance(_ s1: String, _ s2: String) -> Int {
        let s1 = Array(s1)
        let s2 = Array(s2)

        var matrix = Array(repeating: Array(repeating: 0, count: s2.count + 1), count: s1.count + 1)

        for i in 0...s1.count {
            matrix[i][0] = i
        }

        for j in 0...s2.count {
            matrix[0][j] = j
        }

        for i in 1...s1.count {
            for j in 1...s2.count {
                if s1[i - 1] == s2[j - 1] {
                    matrix[i][j] = matrix[i - 1][j - 1]
                } else {
                    matrix[i][j] = min(
                        matrix[i - 1][j] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j - 1] + 1
                    )
                }
            }
        }

        return matrix[s1.count][s2.count]
    }
}

// MARK: - Supporting Types

/// Result of handwriting recognition
struct HandwritingRecognitionResult {
    let recognizedTexts: [RecognizedText]
    let fullText: String
    let averageConfidence: Float
    let language: String

    var isEmpty: Bool {
        recognizedTexts.isEmpty
    }
}

/// Individual recognized text region
struct RecognizedText {
    let text: String
    let confidence: Float
    let boundingBox: CGRect
    let alternatives: [String]
}

/// Result of mathematical expression recognition
struct MathExpressionResult {
    let originalText: String
    let expressions: [MathExpression]
    let confidence: Float
}

/// Recognized mathematical expression
struct MathExpression {
    let text: String
    let type: MathExpressionType
    let confidence: Float
    let boundingBox: CGRect
}

/// Types of mathematical expressions
enum MathExpressionType {
    case equation
    case inequality
    case fraction
    case exponent
    case root
    case function
    case matrix
    case summation
    case integral
    case limit
    case other
}

/// Handwriting recognition errors
enum HandwritingRecognitionError: LocalizedError {
    case invalidImage
    case recognitionFailed
    case noTextFound
    case unsupportedLanguage(String)

    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return "The provided image is invalid or cannot be processed"
        case .recognitionFailed:
            return "Text recognition failed"
        case .noTextFound:
            return "No text was found in the image"
        case .unsupportedLanguage(let lang):
            return "Language '\(lang)' is not supported"
        }
    }
}
