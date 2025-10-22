import AVFoundation
import Combine
import Foundation

/// Protocol for cross-platform camera management
@MainActor
protocol CameraManaging: AnyObject {
    // MARK: - Published State

    var isAuthorized: Bool { get }
    var isCameraAvailable: Bool { get }
    var currentCameraPosition: CameraPosition { get }

    // MARK: - Authorization

    /// Request camera access permission
    func requestCameraAccess() async -> Bool

    /// Check current authorization status
    func checkCameraAuthorization() -> CameraAuthorizationStatus

    // MARK: - Camera Control

    /// Start camera session
    func startCamera() throws

    /// Stop camera session
    func stopCamera()

    /// Switch between front and back camera
    func switchCamera() throws

    /// Capture photo
    func capturePhoto() async throws -> CapturedPhoto

    // MARK: - Flash and Focus

    /// Set flash mode
    func setFlashMode(_ mode: FlashMode) throws

    /// Focus at point (normalized coordinates 0-1)
    func focusAt(point: CGPoint) throws

    /// Set exposure at point
    func setExposure(at point: CGPoint) throws
}

// MARK: - Supporting Types

enum CameraPosition {
    case front
    case back
    case unspecified
}

enum CameraAuthorizationStatus {
    case notDetermined
    case authorized
    case denied
    case restricted
}

enum FlashMode {
    case off
    case on
    case auto
}

struct CapturedPhoto {
    let imageData: Data
    let metadata: [String: Any]?
    let timestamp: Date
}
