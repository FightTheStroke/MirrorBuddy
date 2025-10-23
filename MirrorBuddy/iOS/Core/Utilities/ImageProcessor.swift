import CoreImage
import os.log
import UIKit
import Vision

/// Utility for processing and optimizing images for AI analysis (iOS)
@MainActor
final class ImageProcessor: ImageProcessing {
    /// Shared singleton instance
    static let shared = ImageProcessor()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ImageProcessor")

    // MARK: - Configuration

    /// Maximum image dimension for AI processing
    var maxDimension: CGFloat = 2_048

    /// JPEG compression quality (0-1)
    var compressionQuality: CGFloat = 0.85

    /// Target file size in bytes (1MB default)
    var targetFileSize: Int = 1_048_576

    // MARK: - Initialization

    private init() {}

    // MARK: - Image Optimization

    /// Optimize image for AI processing
    /// - Parameter image: Source image
    /// - Returns: Optimized image
    func optimizeForAI(_ image: UIImage) -> UIImage {
        var processedImage = image

        // 1. Resize if needed
        if max(image.size.width, image.size.height) > maxDimension {
            processedImage = resize(processedImage, maxDimension: maxDimension) ?? processedImage
        }

        // 2. Enhance contrast for better OCR
        processedImage = enhanceContrast(processedImage) ?? processedImage

        // 3. Compress to target size
        processedImage = compressToTargetSize(processedImage) ?? processedImage

        logger.info("Image optimized for AI: \(processedImage.size.width)x\(processedImage.size.height)")
        return processedImage
    }

    /// Resize image maintaining aspect ratio
    /// - Parameters:
    ///   - image: Source image
    ///   - maxDimension: Maximum width or height
    /// - Returns: Resized image
    func resize(_ image: UIImage, maxDimension: CGFloat) -> UIImage? {
        let size = image.size
        let aspectRatio = size.width / size.height

        var newSize: CGSize
        if size.width > size.height {
            newSize = CGSize(width: maxDimension, height: maxDimension / aspectRatio)
        } else {
            newSize = CGSize(width: maxDimension * aspectRatio, height: maxDimension)
        }

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return resizedImage
    }

    /// Enhance image contrast for better text recognition
    /// - Parameter image: Source image
    /// - Returns: Enhanced image
    func enhanceContrast(_ image: UIImage) -> UIImage? {
        guard let ciImage = CIImage(image: image) else { return nil }

        let filter = CIFilter(name: "CIColorControls")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(1.2, forKey: kCIInputContrastKey) // Increase contrast
        filter?.setValue(1.05, forKey: kCIInputSaturationKey) // Slight saturation boost

        guard let outputImage = filter?.outputImage else { return nil }

        let context = CIContext()
        guard let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else {
            return nil
        }

        return UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
    }

    /// Compress image to target file size
    /// - Parameter image: Source image
    /// - Returns: Compressed image
    func compressToTargetSize(_ image: UIImage) -> UIImage? {
        guard let imageData = image.jpegData(compressionQuality: compressionQuality) else {
            return nil
        }

        // If already under target, return as-is
        if imageData.count <= targetFileSize {
            return image
        }

        // Binary search for optimal compression
        var minQuality: CGFloat = 0.1
        var maxQuality: CGFloat = compressionQuality
        var bestQuality: CGFloat = compressionQuality

        while maxQuality - minQuality > 0.05 {
            let midQuality = (minQuality + maxQuality) / 2

            guard let compressed = image.jpegData(compressionQuality: midQuality) else {
                break
            }

            if compressed.count <= targetFileSize {
                bestQuality = midQuality
                minQuality = midQuality
            } else {
                maxQuality = midQuality
            }
        }

        guard let finalData = image.jpegData(compressionQuality: bestQuality),
              let finalImage = UIImage(data: finalData) else {
            return image
        }

        logger.info("Compressed image: \(imageData.count) -> \(finalData.count) bytes")
        return finalImage
    }

    // MARK: - Image Analysis

    /// Detect text regions in image using Vision
    /// - Parameter image: Source image
    /// - Returns: Array of text observation bounding boxes
    func detectTextRegions(in image: UIImage) async throws -> [CGRect] {
        guard let cgImage = image.cgImage else {
            throw ImageProcessorError.invalidImage
        }

        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try handler.perform([request])

        guard let observations = request.results else {
            return []
        }

        let boundingBoxes = observations.map { observation in
            // Convert from Vision coordinates to UIKit coordinates
            let box = observation.boundingBox
            return CGRect(
                x: box.origin.x * image.size.width,
                y: (1 - box.origin.y - box.height) * image.size.height,
                width: box.width * image.size.width,
                height: box.height * image.size.height
            )
        }

        logger.info("Detected \(boundingBoxes.count) text regions")
        return boundingBoxes
    }

    /// Crop image to region of interest
    /// - Parameters:
    ///   - image: Source image
    ///   - rect: Crop rectangle
    /// - Returns: Cropped image
    func crop(_ image: UIImage, to rect: CGRect) -> UIImage? {
        guard let cgImage = image.cgImage?.cropping(to: rect) else {
            return nil
        }

        return UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
    }

    /// Rotate image to correct orientation
    /// - Parameter image: Source image
    /// - Returns: Rotated image
    func fixOrientation(_ image: UIImage) -> UIImage {
        if image.imageOrientation == .up {
            return image
        }

        UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale)
        image.draw(in: CGRect(origin: .zero, size: image.size))
        let normalizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return normalizedImage ?? image
    }

    /// Convert image to grayscale for better text analysis
    /// - Parameter image: Source image
    /// - Returns: Grayscale image
    func convertToGrayscale(_ image: UIImage) -> UIImage? {
        guard let ciImage = CIImage(image: image) else { return nil }

        let filter = CIFilter(name: "CIColorControls")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(0, forKey: kCIInputSaturationKey) // Remove saturation

        guard let outputImage = filter?.outputImage else { return nil }

        let context = CIContext()
        guard let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else {
            return nil
        }

        return UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
    }
}

// MARK: - Image Processor Errors

enum ImageProcessorError: LocalizedError {
    case invalidImage
    case processingFailed
    case textDetectionFailed

    var errorDescription: String? {
        switch self {
        case .invalidImage:
            return "Invalid image format"
        case .processingFailed:
            return "Image processing failed"
        case .textDetectionFailed:
            return "Text detection failed"
        }
    }
}
