import Foundation
import PDFKit
import Vision
import UIKit
import os.log

/// PDF text extraction service using VisionKit OCR (Task 19)
@MainActor
final class PDFTextExtractionService {
    /// Shared singleton instance
    static let shared = PDFTextExtractionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "PDFTextExtraction")

    // MARK: - Configuration

    /// Rendering resolution for OCR (higher = better quality but slower)
    private let renderScale: CGFloat = 2.0

    /// Maximum number of pages to process in parallel
    private let maxConcurrentPages = 4

    // MARK: - Initialization

    private init() {}

    // MARK: - PDF Loading and Rendering (Subtask 19.1)

    /// Load a PDF document from a URL
    func loadPDF(from url: URL) throws -> PDFDocument {
        guard let document = PDFDocument(url: url) else {
            throw PDFExtractionError.failedToLoadPDF
        }

        logger.info("Loaded PDF with \(document.pageCount) pages")
        return document
    }

    /// Load a PDF document from data
    func loadPDF(from data: Data) throws -> PDFDocument {
        guard let document = PDFDocument(data: data) else {
            throw PDFExtractionError.failedToLoadPDF
        }

        logger.info("Loaded PDF from data with \(document.pageCount) pages")
        return document
    }

    /// Render a PDF page to an image for OCR processing
    func renderPage(_ page: PDFPage, scale: CGFloat = 2.0) -> UIImage? {
        let bounds = page.bounds(for: .mediaBox)
        let scaledSize = CGSize(
            width: bounds.width * scale,
            height: bounds.height * scale
        )

        let renderer = UIGraphicsImageRenderer(size: scaledSize)
        let image = renderer.image { context in
            // Fill with white background
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: scaledSize))

            // Scale and render PDF page
            context.cgContext.scaleBy(x: scale, y: scale)
            context.cgContext.translateBy(x: 0, y: bounds.height)
            context.cgContext.scaleBy(x: 1.0, y: -1.0)

            page.draw(with: .mediaBox, to: context.cgContext)
        }

        return image
    }

    // MARK: - VisionKit OCR Text Extraction (Subtask 19.2)

    /// Extract text from an entire PDF document
    func extractText(from document: PDFDocument, language: String = "en") async throws -> PDFDocumentExtraction {
        let pageCount = document.pageCount
        logger.info("Starting text extraction from PDF with \(pageCount) pages")

        var pageExtractions: [PDFPageExtraction] = []

        // Process pages sequentially to avoid actor isolation issues
        for pageIndex in 0..<pageCount {
            guard let page = document.page(at: pageIndex) else {
                logger.warning("Failed to get page \(pageIndex)")
                continue
            }

            do {
                let extraction = try await extractText(from: page, pageNumber: pageIndex, language: language)
                pageExtractions.append(extraction)
            } catch {
                logger.error("Failed to extract text from page \(pageIndex): \(error.localizedDescription)")
            }
        }

        logger.info("Completed text extraction from \(pageExtractions.count) pages")

        return PDFDocumentExtraction(
            pageExtractions: pageExtractions,
            totalPages: pageCount
        )
    }

    /// Extract text from a single PDF page
    private func extractText(from page: PDFPage, pageNumber: Int, language: String) async throws -> PDFPageExtraction {
        // First try to get embedded text
        let embeddedText = page.string ?? ""

        // Render page for OCR
        guard let image = renderPage(page, scale: renderScale) else {
            throw PDFExtractionError.failedToRenderPage(pageNumber)
        }

        guard let cgImage = image.cgImage else {
            throw PDFExtractionError.failedToRenderPage(pageNumber)
        }

        // Perform OCR
        let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = [language]

        try requestHandler.perform([request])

        guard let observations = request.results else {
            throw PDFExtractionError.ocrFailed
        }

        // Process observations
        var textBlocks: [TextBlock] = []

        for observation in observations {
            guard let topCandidate = observation.topCandidates(1).first else {
                continue
            }

            let text = topCandidate.string
            let confidence = topCandidate.confidence
            let boundingBox = observation.boundingBox

            // Convert normalized coordinates to page coordinates
            let pageBounds = page.bounds(for: .mediaBox)
            let rect = VNImageRectForNormalizedRect(
                boundingBox,
                Int(pageBounds.width),
                Int(pageBounds.height)
            )

            let textBlock = TextBlock(
                text: text,
                confidence: Float(confidence),
                boundingBox: rect,
                pageNumber: pageNumber
            )

            textBlocks.append(textBlock)
        }

        // Sort text blocks by vertical position (top to bottom)
        textBlocks.sort { $0.boundingBox.origin.y < $1.boundingBox.origin.y }

        // Extract images from page
        let images = extractImages(from: page)

        return PDFPageExtraction(
            pageNumber: pageNumber,
            textBlocks: textBlocks,
            embeddedText: embeddedText,
            images: images
        )
    }

    /// Extract images embedded in a PDF page
    private func extractImages(from page: PDFPage) -> [PDFImageExtraction] {
        let images: [PDFImageExtraction] = []

        // Note: PDFKit doesn't provide direct image extraction API
        // This is a placeholder for future enhancement
        // In production, you would need to use CGPDFDocument for direct image access

        return images
    }

    // MARK: - Structured Document Model (Subtask 19.3)

    /// Create a structured document model from extracted text
    func createStructuredDocument(from extraction: PDFDocumentExtraction) -> StructuredPDFDocument {
        logger.info("Creating structured document model from \(extraction.pageExtractions.count) pages")

        var sections: [DocumentSection] = []
        var currentSection: DocumentSection?

        for pageExtraction in extraction.pageExtractions {
            let elements = analyzePageStructure(pageExtraction)

            for element in elements {
                switch element.type {
                case .heading:
                    // Save previous section
                    if let section = currentSection {
                        sections.append(section)
                    }

                    // Start new section
                    currentSection = DocumentSection(
                        heading: element.text,
                        level: detectHeadingLevel(element),
                        content: [],
                        pageNumber: element.pageNumber
                    )

                case .paragraph:
                    if var section = currentSection {
                        section.content.append(.paragraph(element.text))
                        currentSection = section
                    } else {
                        // Create default section if no heading
                        currentSection = DocumentSection(
                            heading: "Content",
                            level: 1,
                            content: [.paragraph(element.text)],
                            pageNumber: element.pageNumber
                        )
                    }

                case .listItem:
                    if var section = currentSection {
                        section.content.append(.listItem(element.text))
                        currentSection = section
                    }

                case .image:
                    if var section = currentSection {
                        section.content.append(.image(element.boundingBox))
                        currentSection = section
                    }
                }
            }
        }

        // Add final section
        if let section = currentSection {
            sections.append(section)
        }

        logger.info("Created structured document with \(sections.count) sections")

        return StructuredPDFDocument(
            sections: sections,
            totalPages: extraction.totalPages
        )
    }

    /// Analyze page structure to identify document elements
    private func analyzePageStructure(_ pageExtraction: PDFPageExtraction) -> [DocumentElement] {
        var elements: [DocumentElement] = []

        // Detect multi-column layout
        let columnGroups = detectColumns(pageExtraction.textBlocks)

        for column in columnGroups {
            // Sort blocks within column by vertical position
            let sortedBlocks = column.sorted { $0.boundingBox.origin.y < $1.boundingBox.origin.y }

            for block in sortedBlocks {
                let elementType = classifyTextBlock(block, in: sortedBlocks)

                let element = DocumentElement(
                    text: block.text,
                    type: elementType,
                    boundingBox: block.boundingBox,
                    pageNumber: block.pageNumber,
                    confidence: block.confidence
                )

                elements.append(element)
            }
        }

        return elements
    }

    /// Detect multi-column layout in text blocks
    private func detectColumns(_ blocks: [TextBlock]) -> [[TextBlock]] {
        guard !blocks.isEmpty else { return [] }

        // Simple column detection: group blocks by horizontal position
        let sortedByX = blocks.sorted { $0.boundingBox.origin.x < $1.boundingBox.origin.x }

        var columns: [[TextBlock]] = []
        var currentColumn: [TextBlock] = []
        var lastX: CGFloat = sortedByX[0].boundingBox.origin.x
        let columnThreshold: CGFloat = 50.0 // Minimum gap between columns

        for block in sortedByX {
            if abs(block.boundingBox.origin.x - lastX) > columnThreshold && !currentColumn.isEmpty {
                // Start new column
                columns.append(currentColumn)
                currentColumn = [block]
            } else {
                currentColumn.append(block)
            }
            lastX = block.boundingBox.origin.x
        }

        if !currentColumn.isEmpty {
            columns.append(currentColumn)
        }

        // If only one column detected, return all blocks as single column
        return columns.isEmpty ? [blocks] : columns
    }

    /// Classify a text block as heading, paragraph, or list item
    private func classifyTextBlock(_ block: TextBlock, in context: [TextBlock]) -> DocumentElementType {
        let text = block.text.trimmingCharacters(in: .whitespacesAndNewlines)

        // Check for list item patterns
        if text.matches(pattern: "^[•\\-\\*]\\s") || text.matches(pattern: "^\\d+\\.\\s") {
            return .listItem
        }

        // Check for heading characteristics
        let avgFontSize = estimateFontSize(block, in: context)
        let isShortLine = text.count < 80
        let hasCapitalization = text.first?.isUppercase == true

        if isShortLine && hasCapitalization && avgFontSize > 1.2 {
            return .heading
        }

        return .paragraph
    }

    /// Estimate relative font size based on bounding box height
    private func estimateFontSize(_ block: TextBlock, in context: [TextBlock]) -> CGFloat {
        let avgHeight = context.map { $0.boundingBox.height }.reduce(0, +) / CGFloat(context.count)
        return block.boundingBox.height / avgHeight
    }

    /// Detect heading level (1-6) based on font size and position
    private func detectHeadingLevel(_ element: DocumentElement) -> Int {
        // Simplified heading level detection
        // In production, this would use more sophisticated analysis
        let height = element.boundingBox.height

        if height > 30 {
            return 1
        } else if height > 25 {
            return 2
        } else if height > 20 {
            return 3
        } else {
            return 4
        }
    }

    // MARK: - Utility Methods

    /// Get full text from document extraction
    func getFullText(from extraction: PDFDocumentExtraction) -> String {
        var fullText = ""

        for pageExtraction in extraction.pageExtractions {
            let pageText = pageExtraction.textBlocks
                .map { $0.text }
                .joined(separator: "\n")

            fullText += pageText + "\n\n"
        }

        return fullText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Get text from specific page range
    func getText(from extraction: PDFDocumentExtraction, pageRange: Range<Int>) -> String {
        let relevantPages = extraction.pageExtractions.filter { pageRange.contains($0.pageNumber) }

        var text = ""
        for pageExtraction in relevantPages {
            let pageText = pageExtraction.textBlocks
                .map { $0.text }
                .joined(separator: "\n")

            text += pageText + "\n\n"
        }

        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Supporting Types

/// Complete extraction from a PDF document
struct PDFDocumentExtraction {
    let pageExtractions: [PDFPageExtraction]
    let totalPages: Int

    var isEmpty: Bool {
        pageExtractions.isEmpty
    }
}

/// Extraction from a single PDF page
struct PDFPageExtraction {
    let pageNumber: Int
    let textBlocks: [TextBlock]
    let embeddedText: String
    let images: [PDFImageExtraction]
}

/// A block of text extracted from a PDF
struct TextBlock {
    let text: String
    let confidence: Float
    let boundingBox: CGRect
    let pageNumber: Int
}

/// An image extracted from a PDF
struct PDFImageExtraction {
    let image: UIImage
    let boundingBox: CGRect
    let pageNumber: Int
}

/// Structured PDF document model
struct StructuredPDFDocument {
    let sections: [DocumentSection]
    let totalPages: Int
}

/// A section in a structured document
struct DocumentSection {
    let heading: String
    let level: Int // 1-6 (h1-h6)
    var content: [DocumentContent]
    let pageNumber: Int
}

/// Content within a document section
enum DocumentContent {
    case paragraph(String)
    case listItem(String)
    case image(CGRect)
}

/// A document element identified during structure analysis
struct DocumentElement {
    let text: String
    let type: DocumentElementType
    let boundingBox: CGRect
    let pageNumber: Int
    let confidence: Float
}

/// Types of document elements
enum DocumentElementType {
    case heading
    case paragraph
    case listItem
    case image
}

/// PDF extraction errors
enum PDFExtractionError: LocalizedError {
    case failedToLoadPDF
    case failedToRenderPage(Int)
    case ocrFailed
    case invalidPageNumber(Int)

    var errorDescription: String? {
        switch self {
        case .failedToLoadPDF:
            return "Failed to load PDF document"
        case .failedToRenderPage(let page):
            return "Failed to render page \(page)"
        case .ocrFailed:
            return "OCR text recognition failed"
        case .invalidPageNumber(let page):
            return "Invalid page number: \(page)"
        }
    }
}

// MARK: - String Extensions

extension String {
    func matches(pattern: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return false
        }

        let range = NSRange(location: 0, length: self.utf16.count)
        return regex.firstMatch(in: self, options: [], range: range) != nil
    }
}
