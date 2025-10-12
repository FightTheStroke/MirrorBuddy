@preconcurrency import Photos
import UIKit
import os.log

/// Manager for photo library access and operations
@MainActor
final class PhotoLibraryManager {
    /// Shared singleton instance
    static let shared = PhotoLibraryManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "PhotoLibrary")

    // MARK: - Initialization

    private init() {}

    // MARK: - Permission Handling

    /// Check photo library permission status
    func checkPermission() -> PHAuthorizationStatus {
        return PHPhotoLibrary.authorizationStatus(for: .readWrite)
    }

    /// Request photo library permission
    func requestPermission() async -> Bool {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        return status == .authorized || status == .limited
    }

    // MARK: - Photo Fetching

    /// Fetch recent photos from library
    /// - Parameter limit: Maximum number of photos to fetch
    /// - Returns: Array of UIImage
    func fetchRecentPhotos(limit: Int = 20) async throws -> [UIImage] {
        guard checkPermission() == .authorized || checkPermission() == .limited else {
            throw PhotoLibraryError.permissionDenied
        }

        let fetchOptions = PHFetchOptions()
        fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        fetchOptions.fetchLimit = limit

        let fetchResult = PHAsset.fetchAssets(with: .image, options: fetchOptions)

        var images: [UIImage] = []
        let imageManager = PHImageManager.default()
        let requestOptions = PHImageRequestOptions()
        requestOptions.isSynchronous = true
        requestOptions.deliveryMode = .highQualityFormat

        for i in 0..<fetchResult.count {
            let asset = fetchResult.object(at: i)

            await withCheckedContinuation { continuation in
                imageManager.requestImage(
                    for: asset,
                    targetSize: PHImageManagerMaximumSize,
                    contentMode: .aspectFit,
                    options: requestOptions
                ) { image, _ in
                    if let image {
                        images.append(image)
                    }
                    continuation.resume()
                }
            }
        }

        logger.info("Fetched \(images.count) photos from library")
        return images
    }

    /// Fetch photo by asset identifier
    /// - Parameter identifier: PHAsset local identifier
    /// - Returns: UIImage if found
    func fetchPhoto(byIdentifier identifier: String) async throws -> UIImage? {
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil)

        guard let asset = fetchResult.firstObject else {
            return nil
        }

        let imageManager = PHImageManager.default()
        let requestOptions = PHImageRequestOptions()
        requestOptions.isSynchronous = true
        requestOptions.deliveryMode = .highQualityFormat

        return await withCheckedContinuation { continuation in
            imageManager.requestImage(
                for: asset,
                targetSize: PHImageManagerMaximumSize,
                contentMode: .aspectFit,
                options: requestOptions
            ) { image, _ in
                continuation.resume(returning: image)
            }
        }
    }

    // MARK: - Photo Saving

    /// Save image to photo library
    /// - Parameter image: UIImage to save
    /// - Returns: Asset identifier if successful
    @discardableResult
    func savePhoto(_ image: UIImage) async throws -> String? {
        guard checkPermission() == .authorized else {
            throw PhotoLibraryError.permissionDenied
        }

        var localIdentifier: String?

        try await PHPhotoLibrary.shared().performChanges {
            let request = PHAssetChangeRequest.creationRequestForAsset(from: image)
            localIdentifier = request.placeholderForCreatedAsset?.localIdentifier
        }

        logger.info("Photo saved to library: \(localIdentifier ?? "unknown")")
        return localIdentifier
    }

    /// Save video to photo library
    /// - Parameter videoURL: URL of video file
    /// - Returns: Asset identifier if successful
    @discardableResult
    func saveVideo(at videoURL: URL) async throws -> String? {
        guard checkPermission() == .authorized else {
            throw PhotoLibraryError.permissionDenied
        }

        var localIdentifier: String?

        try await PHPhotoLibrary.shared().performChanges {
            let request = PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: videoURL)
            localIdentifier = request?.placeholderForCreatedAsset?.localIdentifier
        }

        logger.info("Video saved to library: \(localIdentifier ?? "unknown")")
        return localIdentifier
    }
}

// MARK: - Photo Library Errors

enum PhotoLibraryError: LocalizedError {
    case permissionDenied
    case fetchFailed
    case saveFailed

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Photo library access was denied"
        case .fetchFailed:
            return "Failed to fetch photos from library"
        case .saveFailed:
            return "Failed to save to photo library"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .permissionDenied:
            return "Please enable photo library access in Settings."
        default:
            return "Please try again."
        }
    }
}
