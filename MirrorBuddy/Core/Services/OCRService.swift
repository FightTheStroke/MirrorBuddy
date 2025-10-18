//
//  OCRService.swift
//  MirrorBuddy
//
//  Optical Character Recognition service using Vision framework
//  Extracts text from images (PDF pages, photos, scanned documents)
//

import Foundation
import os.log
import UIKit
import Vision

/// OCR service for extracting text from images
@MainActor
final class OCRService {
    static let shared = OCRService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "OCR")

    private init() {}

    /// Extract text from image URL
    func extractText(from imageURL: URL) async throws -> String {
        logger.info("Starting OCR for image: \(imageURL.lastPathComponent)")

        // Load image
        guard let image = UIImage(contentsOfFile: imageURL.path) else {
            throw OCRError.invalidImage
        }

        return try await extractText(from: image)
    }

    /// Extract text from UIImage
    func extractText(from image: UIImage) async throws -> String {
        guard let cgImage = image.cgImage else {
            throw OCRError.invalidImage
        }

        return try await withCheckedThrowingContinuation { continuation in
            // Create Vision request
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: OCRError.recognitionFailed(error.localizedDescription))
                    return
                }

                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(throwing: OCRError.noTextFound)
                    return
                }

                // Extract text from observations
                let recognizedStrings = observations.compactMap { observation in
                    observation.topCandidates(1).first?.string
                }

                let fullText = recognizedStrings.joined(separator: "\n")

                if fullText.isEmpty {
                    continuation.resume(throwing: OCRError.noTextFound)
                } else {
                    continuation.resume(returning: fullText)
                }
            }

            // Configure for Italian text recognition
            request.recognitionLanguages = ["it-IT", "en-US"]
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true

            // Perform request
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: OCRError.recognitionFailed(error.localizedDescription))
            }
        }
    }

    /// Extract text from multiple images (for multi-page documents)
    func extractText(from imageURLs: [URL]) async throws -> String {
        logger.info("Starting OCR for \(imageURLs.count) images")

        var allText: [String] = []

        for (index, url) in imageURLs.enumerated() {
            do {
                let text = try await extractText(from: url)
                allText.append("--- Page \(index + 1) ---\n\(text)")
                logger.debug("Extracted text from page \(index + 1): \(text.prefix(50))...")
            } catch {
                logger.warning("Failed to extract text from page \(index + 1): \(error.localizedDescription)")
                allText.append("--- Page \(index + 1) ---\n[OCR failed]")
            }
        }

        return allText.joined(separator: "\n\n")
    }

    /// Check if file is an image
    static func isImage(url: URL) -> Bool {
        let imageExtensions = ["png", "jpg", "jpeg", "heic", "heif"]
        return imageExtensions.contains(url.pathExtension.lowercased())
    }

    /// Check if file is an image by MIME type
    static func isImage(mimeType: String) -> Bool {
        mimeType.hasPrefix("image/")
    }
}

// MARK: - Errors

enum OCRError: LocalizedError {
    case invalidImage
    case recognitionFailed(String)
    case noTextFound

    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return "Immagine non valida o corrotta"
        case .recognitionFailed(let message):
            return "Riconoscimento testo fallito: \(message)"
        case .noTextFound:
            return "Nessun testo trovato nell'immagine"
        }
    }
}
