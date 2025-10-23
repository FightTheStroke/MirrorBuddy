//
//  MaterialTextExtractionService.swift
//  MirrorBuddy
//
//  Task 87.1: Unified text extraction orchestration for materials
//  Integrates OCR, PDF extraction, and Vision API for comprehensive text extraction
//

import Foundation
import os.log
import SwiftData
import UIKit

/// Unified service for extracting text from materials (PDFs, images, documents)
@MainActor
final class MaterialTextExtractionService {
    static let shared = MaterialTextExtractionService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MaterialTextExtraction")

    // Service dependencies
    private let ocrService = OCRService.shared
    private let pdfService = PDFTextExtractionService.shared
    private let visionService = VisionAnalysisService.shared

    private init() {}

    // MARK: - Main Extraction Methods

    /// Extract text from a material and update its extractedText field
    /// - Parameters:
    ///   - material: Material to extract text from
    ///   - modelContext: SwiftData model context for saving
    /// - Returns: Extracted text
    @discardableResult
    func extractText(
        from material: Material,
        modelContext: ModelContext
    ) async throws -> String {
        logger.info("Starting text extraction for material: \(material.title)")

        // Update processing status
        material.processingStatus = .processing
        try modelContext.save()

        do {
            let extractedText: String

            // Determine extraction method based on content type
            if let pdfURL = material.pdfURL {
                extractedText = try await extractTextFromPDF(url: pdfURL)
            } else if let textContent = material.textContent, !textContent.isEmpty {
                // Already has text content, no extraction needed
                extractedText = textContent
            } else if let googleDriveFileID = material.googleDriveFileID {
                // Google Drive files would need to be downloaded first
                // For now, log and mark as pending additional implementation
                logger.warning("Google Drive extraction not yet implemented for: \(googleDriveFileID)")
                throw MaterialExtractionError.googleDriveNotSupported
            } else {
                throw MaterialExtractionError.noContentToExtract
            }

            // Update material with extracted text
            material.extractedText = extractedText
            material.processingStatus = .completed
            try modelContext.save()

            logger.info("Successfully extracted \(extractedText.count) characters from material: \(material.title)")

            return extractedText
        } catch {
            logger.error("Failed to extract text from material: \(error.localizedDescription)")
            material.processingStatus = .failed
            try modelContext.save()
            throw error
        }
    }

    /// Extract text from multiple images (e.g., scanned pages)
    func extractText(
        from images: [UIImage],
        title: String
    ) async throws -> String {
        logger.info("Extracting text from \(images.count) images for: \(title)")

        var allText: [String] = []

        for (index, image) in images.enumerated() {
            do {
                let text = try await ocrService.extractText(from: image)
                allText.append("--- Page \(index + 1) ---\n\(text)")
                logger.debug("Extracted text from page \(index + 1)")
            } catch {
                logger.warning("Failed to extract text from page \(index + 1): \(error.localizedDescription)")
                allText.append("--- Page \(index + 1) ---\n[Extraction failed]")
            }
        }

        return allText.joined(separator: "\n\n")
    }

    /// Extract text from a single image
    func extractText(from image: UIImage) async throws -> String {
        logger.info("Extracting text from single image")
        return try await ocrService.extractText(from: image)
    }

    /// Extract text from PDF file
    func extractTextFromPDF(url: URL) async throws -> String {
        logger.info("Extracting text from PDF: \(url.lastPathComponent)")

        // Load PDF document
        let document = try pdfService.loadPDF(from: url)

        // Extract text from all pages
        let extraction = try await pdfService.extractText(from: document, language: "it")

        // Get full text
        let fullText = pdfService.getFullText(from: extraction)

        logger.info("Extracted \(fullText.count) characters from PDF")

        return fullText
    }

    // MARK: - Enhanced Extraction with Vision API

    /// Extract text with enhanced analysis using GPT-4 Vision
    /// Useful for complex documents with mixed content (text, diagrams, handwriting)
    func extractTextWithVisionAnalysis(
        from images: [UIImage],
        analysisType: AnalysisType = .textbookPage
    ) async throws -> EnhancedExtractionResult {
        logger.info("Performing enhanced extraction with Vision API for \(images.count) images")

        var allResults: [AnalysisResult] = []
        var allText: [String] = []
        var allConcepts: [String] = []
        var allProblems: [String] = []

        // Process each image with Vision API
        for (index, image) in images.enumerated() {
            do {
                let result = try await visionService.analyzeHomework(
                    image: image,
                    analysisType: analysisType,
                    language: .italian
                )

                allResults.append(result)
                allText.append("--- Page \(index + 1) ---\n\(result.detectedText)")
                allConcepts.append(contentsOf: result.identifiedConcepts)
                allProblems.append(contentsOf: result.extractedProblems)

                logger.debug("Analyzed page \(index + 1) with Vision API")

                // Rate limiting
                if index < images.count - 1 {
                    try await _Concurrency.Task.sleep(nanoseconds: 1_000_000_000) // 1 second
                }
            } catch {
                logger.warning("Vision API failed for page \(index + 1): \(error.localizedDescription)")
                // Fallback to standard OCR
                let ocrText = try await ocrService.extractText(from: image)
                allText.append("--- Page \(index + 1) ---\n\(ocrText)")
            }
        }

        let combinedText = allText.joined(separator: "\n\n")

        return EnhancedExtractionResult(
            extractedText: combinedText,
            identifiedConcepts: Array(Set(allConcepts)), // Remove duplicates
            extractedProblems: allProblems,
            analysisResults: allResults
        )
    }

    // MARK: - Batch Processing

    /// Process multiple materials in batch
    func batchExtractText(
        from materials: [Material],
        modelContext: ModelContext,
        progressHandler: ((Int, Int) -> Void)? = nil
    ) async throws {
        logger.info("Starting batch extraction for \(materials.count) materials")

        for (index, material) in materials.enumerated() {
            do {
                try await extractText(from: material, modelContext: modelContext)
                progressHandler?(index + 1, materials.count)
            } catch {
                logger.error("Failed to extract text from material \(material.title): \(error.localizedDescription)")
                // Continue with next material
            }

            // Rate limiting between materials
            if index < materials.count - 1 {
                try await _Concurrency.Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
            }
        }

        logger.info("Completed batch extraction")
    }

    // MARK: - Utility Methods

    /// Check if material needs text extraction
    func needsExtraction(_ material: Material) -> Bool {
        // Needs extraction if:
        // 1. extractedText is empty
        // 2. Processing status is pending or failed
        // 3. Has PDF but no extracted text
        material.extractedText.isEmpty &&
            (material.processingStatus == .pending || material.processingStatus == .failed) &&
            (material.pdfURL != nil || material.googleDriveFileID != nil)
    }

    /// Get extraction statistics
    func getExtractionStats(_ materials: [Material]) -> ExtractionStats {
        let total = materials.count
        let completed = materials.filter { $0.processingStatus == .completed }.count
        let pending = materials.filter { $0.processingStatus == .pending }.count
        let processing = materials.filter { $0.processingStatus == .processing }.count
        let failed = materials.filter { $0.processingStatus == .failed }.count

        let totalCharacters = materials.reduce(0) { $0 + $1.extractedText.count }

        return ExtractionStats(
            totalMaterials: total,
            completed: completed,
            pending: pending,
            processing: processing,
            failed: failed,
            totalCharactersExtracted: totalCharacters
        )
    }
}

// MARK: - Supporting Types

/// Enhanced extraction result with Vision API analysis
struct EnhancedExtractionResult {
    let extractedText: String
    let identifiedConcepts: [String]
    let extractedProblems: [String]
    let analysisResults: [AnalysisResult]

    var hasStructuredData: Bool {
        !identifiedConcepts.isEmpty || !extractedProblems.isEmpty
    }
}

/// Statistics about text extraction
struct ExtractionStats {
    let totalMaterials: Int
    let completed: Int
    let pending: Int
    let processing: Int
    let failed: Int
    let totalCharactersExtracted: Int

    var completionRate: Double {
        guard totalMaterials > 0 else { return 0 }
        return Double(completed) / Double(totalMaterials)
    }

    var averageCharactersPerMaterial: Int {
        guard completed > 0 else { return 0 }
        return totalCharactersExtracted / completed
    }
}

/// Material extraction errors
enum MaterialExtractionError: LocalizedError {
    case noContentToExtract
    case googleDriveNotSupported
    case extractionFailed(String)
    case invalidContentType

    var errorDescription: String? {
        switch self {
        case .noContentToExtract:
            return "Nessun contenuto da estrarre nel materiale"
        case .googleDriveNotSupported:
            return "Estrazione da Google Drive non ancora supportata"
        case .extractionFailed(let message):
            return "Estrazione fallita: \(message)"
        case .invalidContentType:
            return "Tipo di contenuto non valido"
        }
    }
}
