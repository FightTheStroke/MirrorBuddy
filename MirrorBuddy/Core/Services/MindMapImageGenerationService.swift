import Foundation
import os.log
import SwiftData
import UIKit

/// Image generation service for mind map nodes using DALL-E 3 (Task 22)
@MainActor
final class MindMapImageGenerationService {
    /// Shared singleton instance
    static let shared = MindMapImageGenerationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MindMapImageGeneration")

    // MARK: - Configuration

    /// Image size for mind map nodes
    private let imageSize: ImageSize = .square1024

    /// Image quality setting
    private let imageQuality: ImageQuality = .standard

    /// Image style for educational content
    private let imageStyle: ImageStyle = .vivid

    // MARK: - Dependencies (Subtask 22.1)

    private var openAIClient: OpenAIClient?
    private var modelContext: ModelContext?

    /// Images directory in app container
    private let imagesDirectory: URL = {
        let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let imagesURL = documentsURL.appendingPathComponent("MindMapImages", isDirectory: true)

        // Create directory if it doesn't exist
        try? FileManager.default.createDirectory(at: imagesURL, withIntermediateDirectories: true)

        return imagesURL
    }()

    // MARK: - Cache

    /// In-memory cache for generated images
    private var imageCache: [UUID: UIImage] = [:]

    /// Cache for generation status
    private var generationStatus: [UUID: GenerationStatus] = [:]

    // MARK: - Initialization

    private init() {
        setupClient()
    }

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Mind map image service configured with model context")
    }

    private func setupClient() {
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            openAIClient = OpenAIClient(configuration: config)
            logger.info("DALL-E 3 client configured")
        } else {
            logger.warning("No API configuration found")
        }
    }

    // MARK: - Image Generation (Subtask 22.2)

    /// Generate image for a mind map node
    func generateImage(for node: MindMapNode, subject: Subject? = nil) async throws -> UIImage {
        logger.info("Generating image for node: \(node.title)")

        // Check cache first
        if let cachedImage = getCachedImage(for: node.id) {
            logger.debug("Returning cached image for node \(node.id)")
            return cachedImage
        }

        // Check if generation already in progress
        if generationStatus[node.id] == .inProgress {
            throw MindMapImageError.generationInProgress
        }

        generationStatus[node.id] = .inProgress

        guard let client = openAIClient else {
            generationStatus[node.id] = .failed
            throw MindMapImageError.noClientAvailable
        }

        do {
            // Build prompt for educational image
            let prompt = buildImagePrompt(for: node, subject: subject)
            logger.debug("Generated prompt: \(prompt)")

            // Generate image with DALL-E 3
            let response = try await client.generateImage(
                prompt: prompt,
                size: imageSize,
                quality: imageQuality,
                style: imageStyle
            )

            guard let imageURLString = response.data.first?.url else {
                throw MindMapImageError.noImageURL
            }

            // Download and process image
            let image = try await downloadImage(from: imageURLString)

            // Store image in file system
            try storeImage(image, for: node.id)

            // Update node with image URL
            updateNodeImageURL(node, imageURL: getImageFileURL(for: node.id))

            // Cache image
            cacheImage(image, for: node.id)

            generationStatus[node.id] = .completed
            logger.info("Image generated successfully for node \(node.id)")

            return image
        } catch {
            generationStatus[node.id] = .failed
            logger.error("Failed to generate image: \(error.localizedDescription)")
            throw error
        }
    }

    /// Build DALL-E 3 prompt for mind map node
    private func buildImagePrompt(for node: MindMapNode, subject: Subject?) -> String {
        let nodeTitle = node.title
        let nodeContent = node.content ?? ""

        // Base style for educational images
        let baseStyle = "simple, clean, educational illustration"
        let colorScheme = "bright, friendly colors"
        let perspective = "minimalist style, flat design"

        // Subject-specific modifications
        let subjectModifier = getSubjectStyleModifier(subject)

        let prompt: String

        if !nodeContent.isEmpty {
            prompt = """
            Create a \(baseStyle) of "\(nodeTitle)" - \(nodeContent).
            Style: \(perspective), \(colorScheme), \(subjectModifier).
            No text, labels, or words in the image. Icon-style illustration suitable for students.
            """
        } else {
            prompt = """
            Create a \(baseStyle) representing "\(nodeTitle)".
            Style: \(perspective), \(colorScheme), \(subjectModifier).
            No text, labels, or words in the image. Icon-style illustration suitable for students.
            """
        }

        return prompt
    }

    /// Get subject-specific style modifier
    private func getSubjectStyleModifier(_ subject: Subject?) -> String {
        guard let subject = subject else {
            return "general educational style"
        }

        switch subject {
        case .matematica:
            return "mathematical and geometric elements, clean lines"
        case .fisica:
            return "scientific and physics-related elements, diagrams"
        case .scienzeNaturali:
            return "natural science elements, biological or chemical themes"
        case .storiaGeografia:
            return "historical or geographical elements, maps or landmarks"
        case .italiano:
            return "literary and artistic elements, books or writing themes"
        case .inglese:
            return "language learning elements, communication themes"
        case .religione:
            return "spiritual or philosophical symbols, peaceful themes"
        case .scienzeMotorie:
            return "sports and physical activity elements, movement"
        case .educazioneCivica:
            return "civic and social themes, community elements"
        case .sostegno, .other:
            return "general educational style, learning themes"
        }
    }

    /// Download image from URL
    private func downloadImage(from urlString: String) async throws -> UIImage {
        guard let url = URL(string: urlString) else {
            throw MindMapImageError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw MindMapImageError.downloadFailed
        }

        guard let image = UIImage(data: data) else {
            throw MindMapImageError.invalidImageData
        }

        return image
    }

    // MARK: - Image Storage (Subtask 22.3)

    /// Store image in file system
    private func storeImage(_ image: UIImage, for nodeID: UUID) throws {
        let fileURL = getImageFileURL(for: nodeID)

        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw MindMapImageError.compressionFailed
        }

        try imageData.write(to: fileURL, options: [.atomic])
        logger.debug("Image stored at: \(fileURL.path)")
    }

    /// Get file URL for node image
    private func getImageFileURL(for nodeID: UUID) -> URL {
        imagesDirectory.appendingPathComponent("\(nodeID.uuidString).jpg")
    }

    /// Load image from file system
    func loadImage(for nodeID: UUID) -> UIImage? {
        // Check memory cache first
        if let cachedImage = imageCache[nodeID] {
            return cachedImage
        }

        // Load from file system
        let fileURL = getImageFileURL(for: nodeID)

        guard FileManager.default.fileExists(atPath: fileURL.path),
              let imageData = try? Data(contentsOf: fileURL),
              let image = UIImage(data: imageData) else {
            return nil
        }

        // Cache in memory
        imageCache[nodeID] = image

        return image
    }

    /// Delete image for node
    func deleteImage(for nodeID: UUID) throws {
        let fileURL = getImageFileURL(for: nodeID)

        if FileManager.default.fileExists(atPath: fileURL.path) {
            try FileManager.default.removeItem(at: fileURL)
            logger.debug("Image deleted for node \(nodeID)")
        }

        // Remove from cache
        imageCache.removeValue(forKey: nodeID)
    }

    // MARK: - Cache Management

    /// Cache image in memory
    private func cacheImage(_ image: UIImage, for nodeID: UUID) {
        imageCache[nodeID] = image
    }

    /// Get cached image
    private func getCachedImage(for nodeID: UUID) -> UIImage? {
        imageCache[nodeID]
    }

    /// Clear memory cache
    func clearCache() {
        imageCache.removeAll()
        logger.info("Image cache cleared")
    }

    /// Get cache size in bytes
    func getCacheSize() -> Int {
        var totalSize = 0

        do {
            let fileURLs = try FileManager.default.contentsOfDirectory(
                at: imagesDirectory,
                includingPropertiesForKeys: [.fileSizeKey],
                options: []
            )

            for fileURL in fileURLs {
                if let resourceValues = try? fileURL.resourceValues(forKeys: [.fileSizeKey]),
                   let fileSize = resourceValues.fileSize {
                    totalSize += fileSize
                }
            }
        } catch {
            logger.error("Failed to calculate cache size: \(error.localizedDescription)")
        }

        return totalSize
    }

    /// Clear all stored images
    func clearAllStoredImages() throws {
        let fileURLs = try FileManager.default.contentsOfDirectory(
            at: imagesDirectory,
            includingPropertiesForKeys: nil,
            options: []
        )

        for fileURL in fileURLs {
            try FileManager.default.removeItem(at: fileURL)
        }

        imageCache.removeAll()
        logger.info("All stored images cleared")
    }

    // MARK: - Batch Processing

    /// Generate images for multiple nodes
    func generateImages(for nodes: [MindMapNode], subject: Subject? = nil) async throws -> [UUID: UIImage] {
        var generatedImages: [UUID: UIImage] = [:]

        for node in nodes {
            logger.debug("Processing node \(node.id) (\(node.title))")

            do {
                // Check if image already exists
                if let existingImage = loadImage(for: node.id) {
                    generatedImages[node.id] = existingImage
                    continue
                }

                let image = try await generateImage(for: node, subject: subject)
                generatedImages[node.id] = image

                // Add small delay between requests to avoid rate limiting
                try await _Concurrency.Task.sleep(nanoseconds: 1_000_000_000) // 1 second

            } catch {
                logger.warning("Failed to generate image for node \(node.id): \(error.localizedDescription)")
                // Continue with other nodes
            }
        }

        return generatedImages
    }

    // MARK: - Fallback Icons

    /// Get fallback icon for node when image generation fails
    func getFallbackIcon(for node: MindMapNode, subject: Subject?) -> UIImage? {
        let iconName = getFallbackIconName(for: node.title, subject: subject)

        return UIImage(systemName: iconName)?.withTintColor(
            .systemBlue,
            renderingMode: .alwaysOriginal
        )
    }

    /// Determine appropriate SF Symbol icon name
    private func getFallbackIconName(for nodeTitle: String, subject: Subject?) -> String {
        let title = nodeTitle.lowercased()

        // Math/Science related
        if title.contains("formula") || title.contains("equation") {
            return "function"
        } else if title.contains("experiment") || title.contains("lab") {
            return "flask"
        } else if title.contains("atom") || title.contains("molecule") {
            return "atom"
        } else if title.contains("book") || title.contains("read") {
            return "book"
        } else if title.contains("write") || title.contains("essay") {
            return "pencil"
        } else if title.contains("question") || title.contains("problem") {
            return "questionmark.circle"
        }

        // Subject-based fallback
        if let subject = subject {
            return subject.iconName
        }

        // Default
        return "lightbulb"
    }

    // MARK: - Node Update

    /// Update node with image URL
    private func updateNodeImageURL(_ node: MindMapNode, imageURL: URL) {
        // Note: MindMapNode doesn't have an imageURL property in the current model
        // This would need to be added to the model if we want to persist the URL
        // For now, we just log it
        logger.debug("Image URL for node \(node.id): \(imageURL.path)")
    }

    /// Check if node has generated image
    func hasGeneratedImage(for nodeID: UUID) -> Bool {
        let fileURL = getImageFileURL(for: nodeID)
        return FileManager.default.fileExists(atPath: fileURL.path)
    }

    /// Get generation status for node
    func getGenerationStatus(for nodeID: UUID) -> GenerationStatus {
        generationStatus[nodeID] ?? .notStarted
    }
}

// MARK: - Supporting Types

/// Image generation status
enum GenerationStatus {
    case notStarted
    case inProgress
    case completed
    case failed
}

/// Mind map image generation errors
enum MindMapImageError: LocalizedError {
    case noClientAvailable
    case noImageURL
    case invalidURL
    case downloadFailed
    case invalidImageData
    case compressionFailed
    case generationInProgress

    var errorDescription: String? {
        switch self {
        case .noClientAvailable:
            return "No API client available for image generation"
        case .noImageURL:
            return "No image URL in API response"
        case .invalidURL:
            return "Invalid image URL"
        case .downloadFailed:
            return "Failed to download generated image"
        case .invalidImageData:
            return "Invalid image data received"
        case .compressionFailed:
            return "Failed to compress image"
        case .generationInProgress:
            return "Image generation already in progress for this node"
        }
    }
}
