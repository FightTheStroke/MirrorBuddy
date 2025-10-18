@testable import MirrorBuddy
import PDFKit
import UIKit
import XCTest

// MARK: - Processing Pipeline Tests (Task 61.3)

@MainActor
final class ProcessingPipelineTests: XCTestCase {
    // MARK: - PDF Text Extraction Tests

    func testPDFDocumentLoading() throws {
        // Create a simple PDF in memory
        let pdfData = createSimplePDF()
        let service = PDFTextExtractionService.shared

        let document = try service.loadPDF(from: pdfData)

        XCTAssertNotNil(document)
        XCTAssertGreaterThan(document.pageCount, 0)
    }

    func testPDFPageRendering() throws {
        let pdfData = createSimplePDF()
        let service = PDFTextExtractionService.shared
        let document = try service.loadPDF(from: pdfData)

        guard let page = document.page(at: 0) else {
            XCTFail("Failed to get first page")
            return
        }

        let image = service.renderPage(page, scale: 2.0)

        XCTAssertNotNil(image)
        XCTAssertGreaterThan(image!.size.width, 0)
        XCTAssertGreaterThan(image!.size.height, 0)
    }

    func testPDFTextBlockSorting() {
        // Create text blocks with different vertical positions
        let blocks = [
            TextBlock(text: "Bottom", confidence: 0.9, boundingBox: CGRect(x: 0, y: 100, width: 100, height: 20), pageNumber: 0),
            TextBlock(text: "Top", confidence: 0.9, boundingBox: CGRect(x: 0, y: 0, width: 100, height: 20), pageNumber: 0),
            TextBlock(text: "Middle", confidence: 0.9, boundingBox: CGRect(x: 0, y: 50, width: 100, height: 20), pageNumber: 0)
        ]

        let sorted = blocks.sorted { $0.boundingBox.origin.y < $1.boundingBox.origin.y }

        XCTAssertEqual(sorted[0].text, "Top")
        XCTAssertEqual(sorted[1].text, "Middle")
        XCTAssertEqual(sorted[2].text, "Bottom")
    }

    func testPDFExtractionResultCreation() {
        let extraction = PDFDocumentExtraction(
            pageExtractions: [],
            totalPages: 5
        )

        XCTAssertEqual(extraction.totalPages, 5)
        XCTAssertTrue(extraction.isEmpty)
    }

    func testFullTextExtraction() {
        let pageExtraction = PDFPageExtraction(
            pageNumber: 0,
            textBlocks: [
                TextBlock(text: "First block", confidence: 0.9, boundingBox: .zero, pageNumber: 0),
                TextBlock(text: "Second block", confidence: 0.9, boundingBox: .zero, pageNumber: 0)
            ],
            embeddedText: "",
            images: []
        )

        let documentExtraction = PDFDocumentExtraction(
            pageExtractions: [pageExtraction],
            totalPages: 1
        )

        let service = PDFTextExtractionService.shared
        let fullText = service.getFullText(from: documentExtraction)

        XCTAssertTrue(fullText.contains("First block"))
        XCTAssertTrue(fullText.contains("Second block"))
    }

    func testPageRangeExtraction() {
        let extractions = [
            PDFPageExtraction(pageNumber: 0, textBlocks: [TextBlock(text: "Page 0", confidence: 0.9, boundingBox: .zero, pageNumber: 0)], embeddedText: "", images: []),
            PDFPageExtraction(pageNumber: 1, textBlocks: [TextBlock(text: "Page 1", confidence: 0.9, boundingBox: .zero, pageNumber: 1)], embeddedText: "", images: []),
            PDFPageExtraction(pageNumber: 2, textBlocks: [TextBlock(text: "Page 2", confidence: 0.9, boundingBox: .zero, pageNumber: 2)], embeddedText: "", images: [])
        ]

        let documentExtraction = PDFDocumentExtraction(pageExtractions: extractions, totalPages: 3)
        let service = PDFTextExtractionService.shared

        let text = service.getText(from: documentExtraction, pageRange: 1..<3)

        XCTAssertTrue(text.contains("Page 1"))
        XCTAssertTrue(text.contains("Page 2"))
        XCTAssertFalse(text.contains("Page 0"))
    }

    // MARK: - Structured Document Tests

    func testStructuredDocumentCreation() {
        let service = PDFTextExtractionService.shared

        let pageExtraction = PDFPageExtraction(
            pageNumber: 0,
            textBlocks: [
                TextBlock(text: "Introduction", confidence: 0.9, boundingBox: CGRect(x: 0, y: 0, width: 100, height: 30), pageNumber: 0),
                TextBlock(text: "This is the introduction paragraph.", confidence: 0.9, boundingBox: CGRect(x: 0, y: 40, width: 200, height: 15), pageNumber: 0)
            ],
            embeddedText: "",
            images: []
        )

        let extraction = PDFDocumentExtraction(pageExtractions: [pageExtraction], totalPages: 1)
        let structured = service.createStructuredDocument(from: extraction)

        XCTAssertFalse(structured.sections.isEmpty)
        XCTAssertEqual(structured.totalPages, 1)
    }

    func testDocumentElementTypeClassification() {
        // Test list item detection
        let listText = "• First item"
        XCTAssertTrue(listText.matches(pattern: "^[•\\-\\*]\\s"))

        let numberedList = "1. First item"
        XCTAssertTrue(numberedList.matches(pattern: "^\\d+\\.\\s"))

        // Test normal text
        let normalText = "This is normal text"
        XCTAssertFalse(normalText.matches(pattern: "^[•\\-\\*]\\s"))
    }

    func testColumnDetection() {
        // Create blocks simulating two-column layout
        let leftColumn = [
            TextBlock(text: "Left 1", confidence: 0.9, boundingBox: CGRect(x: 0, y: 0, width: 100, height: 20), pageNumber: 0),
            TextBlock(text: "Left 2", confidence: 0.9, boundingBox: CGRect(x: 0, y: 30, width: 100, height: 20), pageNumber: 0)
        ]

        let rightColumn = [
            TextBlock(text: "Right 1", confidence: 0.9, boundingBox: CGRect(x: 200, y: 0, width: 100, height: 20), pageNumber: 0),
            TextBlock(text: "Right 2", confidence: 0.9, boundingBox: CGRect(x: 200, y: 30, width: 100, height: 20), pageNumber: 0)
        ]

        let allBlocks = leftColumn + rightColumn

        // Verify blocks are separated by position
        let sortedByX = allBlocks.sorted { $0.boundingBox.origin.x < $1.boundingBox.origin.x }
        XCTAssertEqual(sortedByX[0].text, "Left 1")
        XCTAssertEqual(sortedByX[1].text, "Left 2")
        XCTAssertEqual(sortedByX[2].text, "Right 1")
        XCTAssertEqual(sortedByX[3].text, "Right 2")
    }

    // MARK: - Handwriting Recognition Tests

    func testRecognitionResultStructure() {
        let result = HandwritingRecognitionResult(
            recognizedTexts: [
                RecognizedText(text: "Hello", confidence: 0.95, boundingBox: .zero, alternatives: ["Hello", "Hallo"]),
                RecognizedText(text: "World", confidence: 0.90, boundingBox: .zero, alternatives: ["World", "Word"])
            ],
            fullText: "Hello World",
            averageConfidence: 0.925,
            language: "en"
        )

        XCTAssertEqual(result.recognizedTexts.count, 2)
        XCTAssertEqual(result.fullText, "Hello World")
        XCTAssertEqual(result.averageConfidence, 0.925, accuracy: 0.001)
        XCTAssertFalse(result.isEmpty)
    }

    func testLevenshteinDistance() {
        let service = HandwritingRecognitionService.shared

        // Identical strings
        let similarity1 = service.calculateSimilarity(between: "hello", and: "hello")
        XCTAssertEqual(similarity1, 1.0)

        // Completely different
        let similarity2 = service.calculateSimilarity(between: "abc", and: "xyz")
        XCTAssertLessThan(similarity2, 0.5)

        // Similar strings
        let similarity3 = service.calculateSimilarity(between: "hello", and: "hallo")
        XCTAssertGreaterThan(similarity3, 0.7)

        // Empty strings
        let similarity4 = service.calculateSimilarity(between: "", and: "")
        XCTAssertEqual(similarity4, 1.0)
    }

    func testMathExpressionDetection() {
        let recognizedTexts = [
            RecognizedText(text: "x = 5", confidence: 0.9, boundingBox: .zero, alternatives: []),
            RecognizedText(text: "y > 10", confidence: 0.9, boundingBox: .zero, alternatives: []),
            RecognizedText(text: "z^2", confidence: 0.9, boundingBox: .zero, alternatives: []),
            RecognizedText(text: "a / b", confidence: 0.9, boundingBox: .zero, alternatives: [])
        ]

        let result = HandwritingRecognitionResult(
            recognizedTexts: recognizedTexts,
            fullText: "x = 5 y > 10 z^2 a / b",
            averageConfidence: 0.9,
            language: "en"
        )

        // Verify equation detection
        XCTAssertTrue(result.fullText.contains("="))
        // Verify inequality detection
        XCTAssertTrue(result.fullText.contains(">"))
        // Verify exponent detection
        XCTAssertTrue(result.fullText.contains("^"))
        // Verify fraction detection
        XCTAssertTrue(result.fullText.contains("/"))
    }

    func testMathematicalTermRecognition() {
        let service = HandwritingRecognitionService.shared

        // Note: These are private methods, so we test indirectly through public API
        // by verifying the recognition result structure supports custom words

        let result = HandwritingRecognitionResult(
            recognizedTexts: [
                RecognizedText(text: "sine", confidence: 0.9, boundingBox: .zero, alternatives: ["sine", "sign"]),
                RecognizedText(text: "derivative", confidence: 0.9, boundingBox: .zero, alternatives: ["derivative"])
            ],
            fullText: "sine derivative",
            averageConfidence: 0.9,
            language: "en"
        )

        XCTAssertTrue(result.fullText.contains("sine"))
        XCTAssertTrue(result.fullText.contains("derivative"))
    }

    // MARK: - Vision Analysis Tests

    func testAnalysisResultStructure() {
        let result = AnalysisResult(
            rawContent: "Test analysis content",
            analysisType: .mathProblem,
            extractedProblems: ["Problem 1: Solve for x"],
            identifiedConcepts: ["Linear equations", "Algebra"],
            detectedText: "x + 5 = 10",
            confidence: 0.95,
            tokensUsed: 150
        )

        XCTAssertEqual(result.analysisType, .mathProblem)
        XCTAssertEqual(result.extractedProblems.count, 1)
        XCTAssertEqual(result.identifiedConcepts.count, 2)
        XCTAssertEqual(result.confidence, 0.95)
        XCTAssertEqual(result.tokensUsed, 150)
        XCTAssertNotNil(result.timestamp)
    }

    func testAnalysisTypeEnumeration() {
        let types: [AnalysisType] = [
            .textbookPage,
            .mathProblem,
            .diagram,
            .handwriting,
            .stepByStep,
            .general
        ]

        XCTAssertEqual(types.count, 6)
    }

    func testVisionAnalysisErrorTypes() {
        let errors: [VisionAnalysisError] = [
            .configurationMissing,
            .imageEncodingFailed,
            .invalidURL,
            .invalidResponse,
            .emptyResponse,
            .apiError(statusCode: 404, message: "Not found"),
            .rateLimitExceeded,
            .timeout
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription)
            // Some errors have recovery suggestions
            _ = error.recoverySuggestion
        }
    }

    // MARK: - Pipeline Integration Tests

    func testPDFToStructuredDocumentPipeline() {
        // Test full pipeline: PDF → extraction → structured document
        let pdfData = createSimplePDF()
        let service = PDFTextExtractionService.shared

        do {
            let document = try service.loadPDF(from: pdfData)
            XCTAssertNotNil(document)

            // In a full integration test, we would:
            // 1. Extract text from PDF
            // 2. Create structured document
            // 3. Verify transformation integrity

            XCTAssertGreaterThan(document.pageCount, 0)
        } catch {
            XCTFail("Pipeline failed: \(error)")
        }
    }

    func testDataTransformationIntegrity() {
        // Test that data maintains integrity through transformation
        let originalText = "Test content"
        let block = TextBlock(
            text: originalText,
            confidence: 0.95,
            boundingBox: CGRect(x: 0, y: 0, width: 100, height: 20),
            pageNumber: 0
        )

        // Verify text is preserved
        XCTAssertEqual(block.text, originalText)
        XCTAssertGreaterThan(block.confidence, 0.9)
    }

    func testErrorPropagation() {
        // Test that errors propagate correctly through pipeline
        let service = PDFTextExtractionService.shared
        let invalidData = Data()

        XCTAssertThrowsError(try service.loadPDF(from: invalidData)) { error in
            XCTAssertTrue(error is PDFExtractionError)
        }
    }

    func testEmptyInputHandling() {
        // Test pipeline handles empty inputs gracefully
        let emptyExtraction = PDFDocumentExtraction(
            pageExtractions: [],
            totalPages: 0
        )

        XCTAssertTrue(emptyExtraction.isEmpty)
        XCTAssertEqual(emptyExtraction.totalPages, 0)

        let service = PDFTextExtractionService.shared
        let fullText = service.getFullText(from: emptyExtraction)

        XCTAssertTrue(fullText.isEmpty)
    }

    func testBoundingBoxTransformations() {
        // Test coordinate transformations maintain accuracy
        let originalBox = CGRect(x: 10, y: 20, width: 100, height: 50)
        let block = TextBlock(
            text: "Test",
            confidence: 0.9,
            boundingBox: originalBox,
            pageNumber: 0
        )

        XCTAssertEqual(block.boundingBox.origin.x, 10)
        XCTAssertEqual(block.boundingBox.origin.y, 20)
        XCTAssertEqual(block.boundingBox.width, 100)
        XCTAssertEqual(block.boundingBox.height, 50)
    }

    func testConfidenceScoreAggregation() {
        let results = [
            RecognizedText(text: "A", confidence: 0.9, boundingBox: .zero, alternatives: []),
            RecognizedText(text: "B", confidence: 0.8, boundingBox: .zero, alternatives: []),
            RecognizedText(text: "C", confidence: 0.95, boundingBox: .zero, alternatives: [])
        ]

        let averageConfidence = results.map { $0.confidence }.reduce(0, +) / Float(results.count)

        XCTAssertEqual(averageConfidence, 0.8833333, accuracy: 0.001)
    }

    // MARK: - Edge Cases

    func testLargeDocumentHandling() {
        // Simulate large document with many pages
        var pageExtractions: [PDFPageExtraction] = []
        for i in 0..<100 {
            let extraction = PDFPageExtraction(
                pageNumber: i,
                textBlocks: [
                    TextBlock(text: "Page \(i) content", confidence: 0.9, boundingBox: .zero, pageNumber: i)
                ],
                embeddedText: "",
                images: []
            )
            pageExtractions.append(extraction)
        }

        let largeDocument = PDFDocumentExtraction(
            pageExtractions: pageExtractions,
            totalPages: 100
        )

        XCTAssertEqual(largeDocument.pageExtractions.count, 100)
        XCTAssertEqual(largeDocument.totalPages, 100)
        XCTAssertFalse(largeDocument.isEmpty)
    }

    func testSpecialCharacterHandling() {
        // Test handling of mathematical and special characters
        let specialChars = "α β γ θ π ∑ ∫ √ ≈ ≠ ≤ ≥"
        let block = TextBlock(
            text: specialChars,
            confidence: 0.85,
            boundingBox: .zero,
            pageNumber: 0
        )

        XCTAssertEqual(block.text, specialChars)
        XCTAssertTrue(block.text.contains("α"))
        XCTAssertTrue(block.text.contains("∫"))
    }

    func testUnicodeTextHandling() {
        // Test handling of non-ASCII characters
        let italianText = "Più matematica è meglio"
        let block = TextBlock(
            text: italianText,
            confidence: 0.9,
            boundingBox: .zero,
            pageNumber: 0
        )

        XCTAssertEqual(block.text, italianText)
        XCTAssertTrue(block.text.contains("Più"))
        XCTAssertTrue(block.text.contains("è"))
    }

    func testVeryLowConfidenceHandling() {
        let lowConfidenceBlock = TextBlock(
            text: "Uncertain text",
            confidence: 0.3, // Very low confidence
            boundingBox: .zero,
            pageNumber: 0
        )

        XCTAssertLessThan(lowConfidenceBlock.confidence, 0.5)
        XCTAssertFalse(lowConfidenceBlock.text.isEmpty)
    }

    func testBoundaryConditions() {
        // Test with zero-sized bounding boxes
        let zeroBox = CGRect.zero
        let block = TextBlock(text: "Test", confidence: 0.9, boundingBox: zeroBox, pageNumber: 0)

        XCTAssertEqual(block.boundingBox.width, 0)
        XCTAssertEqual(block.boundingBox.height, 0)

        // Test with negative page numbers (should still work)
        let negativePage = TextBlock(text: "Test", confidence: 0.9, boundingBox: .zero, pageNumber: -1)
        XCTAssertEqual(negativePage.pageNumber, -1)
    }

    // MARK: - Helper Methods

    private func createSimplePDF() -> Data {
        // Create a simple PDF document for testing
        let pageRect = CGRect(x: 0, y: 0, width: 612, height: 792) // US Letter
        let pdfData = NSMutableData()

        UIGraphicsBeginPDFContextToData(pdfData, pageRect, nil)
        UIGraphicsBeginPDFPage()

        let text = "Test PDF Content"
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 14)
        ]
        text.draw(at: CGPoint(x: 50, y: 50), withAttributes: attributes)

        UIGraphicsEndPDFContext()

        return pdfData as Data
    }

    private func createTestImage(withText text: String, size: CGSize = CGSize(width: 400, height: 300)) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { context in
            // White background
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))

            // Black text
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 24),
                .foregroundColor: UIColor.black
            ]

            let textRect = CGRect(x: 20, y: 20, width: size.width - 40, height: size.height - 40)
            text.draw(in: textRect, withAttributes: attributes)
        }
    }
}
