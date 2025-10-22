import AVFoundation
import AppKit
import Combine
import Foundation
import os.log

/// macOS-native camera manager using AVFoundation macOS APIs
@MainActor
final class macOSCameraManager: NSObject, CameraManaging {
    static let shared = macOSCameraManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Camera-macOS")

    // MARK: - Camera Components

    private var captureSession: AVCaptureSession?
    private var videoInput: AVCaptureDeviceInput?
    private var photoOutput: AVCapturePhotoOutput?
    private var currentDevice: AVCaptureDevice?

    // MARK: - Published State

    @Published private(set) var isAuthorized = false
    @Published private(set) var isCameraAvailable = false
    @Published private(set) var currentCameraPosition: CameraPosition = .unspecified

    // MARK: - Capture Delegate

    private var photoCaptureDelegate: PhotoCaptureDelegate?

    // MARK: - Initialization

    override private init() {
        super.init()
        checkCameraAvailability()
    }

    // MARK: - Authorization

    func requestCameraAccess() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            isAuthorized = true
            return true

        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            isAuthorized = granted
            return granted

        case .denied, .restricted:
            isAuthorized = false
            return false

        @unknown default:
            isAuthorized = false
            return false
        }
    }

    func checkCameraAuthorization() -> CameraAuthorizationStatus {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return .authorized
        case .notDetermined:
            return .notDetermined
        case .denied:
            return .denied
        case .restricted:
            return .restricted
        @unknown default:
            return .notDetermined
        }
    }

    // MARK: - Camera Control

    func startCamera() throws {
        guard isAuthorized else {
            throw CameraError.notAuthorized
        }

        guard isCameraAvailable else {
            throw CameraError.noCameraAvailable
        }

        // Create capture session
        let session = AVCaptureSession()
        session.sessionPreset = .photo

        // Get default camera (macOS typically only has FaceTime camera)
        guard let camera = AVCaptureDevice.default(for: .video) else {
            throw CameraError.noCameraAvailable
        }

        currentDevice = camera
        currentCameraPosition = .front // macOS cameras are typically front-facing

        // Create input
        let input = try AVCaptureDeviceInput(device: camera)

        guard session.canAddInput(input) else {
            throw CameraError.sessionConfigurationFailed
        }

        session.addInput(input)
        videoInput = input

        // Create photo output
        let output = AVCapturePhotoOutput()

        guard session.canAddOutput(output) else {
            throw CameraError.sessionConfigurationFailed
        }

        session.addOutput(output)
        photoOutput = output

        // Start session
        captureSession = session

        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }

        logger.info("Camera started (macOS)")
    }

    func stopCamera() {
        captureSession?.stopRunning()
        captureSession = nil
        videoInput = nil
        photoOutput = nil
        currentDevice = nil

        logger.info("Camera stopped")
    }

    func switchCamera() throws {
        // macOS typically only has one camera, so this is a no-op
        logger.warning("Camera switching not available on macOS (single camera)")
        throw CameraError.cameraSwitchNotSupported
    }

    func capturePhoto() async throws -> CapturedPhoto {
        guard let photoOutput = photoOutput else {
            throw CameraError.notConfigured
        }

        let settings = AVCapturePhotoSettings()

        // Use highest quality
        if let format = photoOutput.availablePhotoCodecTypes.first {
            settings.photoQualityPrioritization = .quality
        }

        // Create delegate
        let delegate = PhotoCaptureDelegate()
        photoCaptureDelegate = delegate

        // Capture photo
        photoOutput.capturePhoto(with: settings, delegate: delegate)

        // Wait for photo capture
        return try await delegate.waitForPhoto()
    }

    // MARK: - Flash and Focus

    func setFlashMode(_ mode: FlashMode) throws {
        // Most macOS cameras don't have flash
        logger.warning("Flash mode not supported on most macOS cameras")
        throw CameraError.flashNotSupported
    }

    func focusAt(point: CGPoint) throws {
        guard let device = currentDevice else {
            throw CameraError.notConfigured
        }

        guard device.isFocusPointOfInterestSupported else {
            throw CameraError.focusNotSupported
        }

        try device.lockForConfiguration()
        device.focusPointOfInterest = point
        device.focusMode = .autoFocus
        device.unlockForConfiguration()

        logger.info("Focus set at point: \(point)")
    }

    func setExposure(at point: CGPoint) throws {
        guard let device = currentDevice else {
            throw CameraError.notConfigured
        }

        guard device.isExposurePointOfInterestSupported else {
            throw CameraError.exposureNotSupported
        }

        try device.lockForConfiguration()
        device.exposurePointOfInterest = point
        device.exposureMode = .autoExpose
        device.unlockForConfiguration()

        logger.info("Exposure set at point: \(point)")
    }

    // MARK: - Private Helpers

    private func checkCameraAvailability() {
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .externalUnknown],
            mediaType: .video,
            position: .unspecified
        )

        isCameraAvailable = !discoverySession.devices.isEmpty
        logger.info("Camera availability: \(self.isCameraAvailable)")
    }
}

// MARK: - Photo Capture Delegate

private class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    private var continuation: CheckedContinuation<CapturedPhoto, Error>?

    func waitForPhoto() async throws -> CapturedPhoto {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
        }
    }

    func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        if let error = error {
            continuation?.resume(throwing: error)
            continuation = nil
            return
        }

        guard let imageData = photo.fileDataRepresentation() else {
            continuation?.resume(throwing: CameraError.captureProcessingFailed)
            continuation = nil
            return
        }

        let capturedPhoto = CapturedPhoto(
            imageData: imageData,
            metadata: photo.metadata,
            timestamp: Date()
        )

        continuation?.resume(returning: capturedPhoto)
        continuation = nil
    }
}

// MARK: - Camera Errors

enum CameraError: LocalizedError {
    case notAuthorized
    case noCameraAvailable
    case sessionConfigurationFailed
    case cameraSwitchNotSupported
    case flashNotSupported
    case focusNotSupported
    case exposureNotSupported
    case notConfigured
    case captureProcessingFailed

    var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Camera access not authorized"
        case .noCameraAvailable:
            return "No camera available"
        case .sessionConfigurationFailed:
            return "Failed to configure camera session"
        case .cameraSwitchNotSupported:
            return "Camera switching not supported on macOS"
        case .flashNotSupported:
            return "Flash not supported on this camera"
        case .focusNotSupported:
            return "Focus adjustment not supported"
        case .exposureNotSupported:
            return "Exposure adjustment not supported"
        case .notConfigured:
            return "Camera not configured"
        case .captureProcessingFailed:
            return "Failed to process captured photo"
        }
    }
}
