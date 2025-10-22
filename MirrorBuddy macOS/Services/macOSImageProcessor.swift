import AppKit
import CoreImage
import os.log
import Vision

/// macOS-native image processor using AppKit
@MainActor
final class macOSImageProcessor: ImageProcessing {
    static let shared = macOSImageProcessor()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ImageProcessor-macOS")

    // MARK: - Configuration

    var maxDimension: CGFloat = 2_048
    var compressionQuality: CGFloat = 0.85
    var targetFileSize: Int = 1_048_576

    // MARK: - Initialization

    private init() {}

    // MARK: - Image Optimization

    func optimizeForAI(_ image: NSImage) -> NSImage {
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

    func resize(_ image: NSImage, maxDimension: CGFloat) -> NSImage? {
        let size = image.size
        let aspectRatio = size.width / size.height

        var newSize: CGSize
        if size.width > size.height {
            newSize = CGSize(width: maxDimension, height: maxDimension / aspectRatio)
        } else {
            newSize = CGSize(width: maxDimension * aspectRatio, height: maxDimension)
        }

        let resizedImage = NSImage(size: newSize)
        resizedImage.lockFocus()
        image.draw(in: NSRect(origin: .zero, size: newSize))
        resizedImage.unlockFocus()

        return resizedImage
    }

    func enhanceContrast(_ image: NSImage) -> NSImage? {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            return nil
        }

        let ciImage = CIImage(cgImage: cgImage)

        let filter = CIFilter(name: "CIColorControls")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(1.2, forKey: kCIInputContrastKey)
        filter?.setValue(1.05, forKey: kCIInputSaturationKey)

        guard let outputImage = filter?.outputImage else { return nil }

        let context = CIContext()
        guard let enhancedCGImage = context.createCGImage(outputImage, from: outputImage.extent) else {
            return nil
        }

        return NSImage(cgImage: enhancedCGImage, size: image.size)
    }

    func compressToTargetSize(_ image: NSImage) -> NSImage? {
        guard let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let imageData = bitmap.representation(using: .jpeg, properties: [.compressionFactor: compressionQuality]) else {
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

            guard let compressed = bitmap.representation(using: .jpeg, properties: [.compressionFactor: midQuality]) else {
                break
            }

            if compressed.count <= targetFileSize {
                bestQuality = midQuality
                minQuality = midQuality
            } else {
                maxQuality = midQuality
            }
        }

        guard let finalData = bitmap.representation(using: .jpeg, properties: [.compressionFactor: bestQuality]),
              let finalImage = NSImage(data: finalData) else {
            return image
        }

        logger.info("Compressed image: \(imageData.count) -> \(finalData.count) bytes")
        return finalImage
    }

    // MARK: - Image Analysis

    func detectTextRegions(in image: NSImage) async throws -> [CGRect] {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
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
            // Convert from Vision coordinates to AppKit coordinates
            let box = observation.boundingBox
            return CGRect(
                x: box.origin.x * image.size.width,
                y: box.origin.y * image.size.height, // Vision and AppKit both use bottom-left origin
                width: box.width * image.size.width,
                height: box.height * image.size.height
            )
        }

        logger.info("Detected \(boundingBoxes.count) text regions")
        return boundingBoxes
    }

    func crop(_ image: NSImage, to rect: CGRect) -> NSImage? {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)?.cropping(to: rect) else {
            return nil
        }

        return NSImage(cgImage: cgImage, size: rect.size)
    }

    func fixOrientation(_ image: NSImage) -> NSImage {
        // NSImage doesn't have orientation issues like UIImage
        return image
    }

    func convertToGrayscale(_ image: NSImage) -> NSImage? {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            return nil
        }

        let ciImage = CIImage(cgImage: cgImage)

        let filter = CIFilter(name: "CIColorControls")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(0, forKey: kCIInputSaturationKey)

        guard let outputImage = filter?.outputImage else { return nil }

        let context = CIContext()
        guard let grayscaleCGImage = context.createCGImage(outputImage, from: outputImage.extent) else {
            return nil
        }

        return NSImage(cgImage: grayscaleCGImage, size: image.size)
    }
}

// MARK: - NSImage Extension

extension NSImage {
    var cgImage: CGImage? {
        cgImage(forProposedRect: nil, context: nil, hints: nil)
    }
}
