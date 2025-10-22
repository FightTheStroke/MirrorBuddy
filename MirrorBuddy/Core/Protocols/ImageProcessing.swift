import CoreImage
import Foundation

#if os(iOS)
import UIKit
public typealias PlatformImage = UIImage
#elseif os(macOS)
import AppKit
public typealias PlatformImage = NSImage
#endif

/// Protocol for cross-platform image processing
@MainActor
protocol ImageProcessing: AnyObject {
    // MARK: - Configuration

    var maxDimension: CGFloat { get set }
    var compressionQuality: CGFloat { get set }
    var targetFileSize: Int { get set }

    // MARK: - Image Optimization

    /// Optimize image for AI processing
    func optimizeForAI(_ image: PlatformImage) -> PlatformImage

    /// Resize image maintaining aspect ratio
    func resize(_ image: PlatformImage, maxDimension: CGFloat) -> PlatformImage?

    /// Enhance image contrast for better text recognition
    func enhanceContrast(_ image: PlatformImage) -> PlatformImage?

    /// Compress image to target file size
    func compressToTargetSize(_ image: PlatformImage) -> PlatformImage?

    // MARK: - Image Analysis

    /// Detect text regions in image using Vision
    func detectTextRegions(in image: PlatformImage) async throws -> [CGRect]

    /// Crop image to region of interest
    func crop(_ image: PlatformImage, to rect: CGRect) -> PlatformImage?

    /// Rotate image to correct orientation
    func fixOrientation(_ image: PlatformImage) -> PlatformImage

    /// Convert image to grayscale for better text analysis
    func convertToGrayscale(_ image: PlatformImage) -> PlatformImage?
}
