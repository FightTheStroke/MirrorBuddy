@preconcurrency import AVFoundation
@preconcurrency import Photos
import UIKit
import os.log

/// Manager for camera capture operations for homework help
@MainActor
final class CameraManager: NSObject {
    /// Shared singleton instance
    static let shared = CameraManager()

    // MARK: - Properties

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Camera")

    /// Capture session for managing camera input/output
    private let captureSession = AVCaptureSession()

    /// Current camera device (front or back)
    private var currentCamera: AVCaptureDevice?

    /// Camera input
    private var cameraInput: AVCaptureDeviceInput?

    /// Photo output
    private let photoOutput = AVCapturePhotoOutput()

    /// Video output
    private let videoOutput = AVCaptureMovieFileOutput()

    /// Preview layer for displaying camera feed
    private(set) var previewLayer: AVCaptureVideoPreviewLayer?

    /// Whether camera is currently running
    private(set) var isRunning = false

    /// Whether video is currently recording
    private(set) var isRecording = false

    /// Current camera position
    private(set) var currentPosition: AVCaptureDevice.Position = .back

    // MARK: - Callbacks

    var onPhotoCapture: ((UIImage) -> Void)?
    var onVideoRecordingStarted: (() -> Void)?
    var onVideoRecordingFinished: ((URL) -> Void)?
    var onError: ((CameraError) -> Void)?

    // MARK: - Initialization

    private override init() {
        super.init()
    }

    // MARK: - Session Setup

    /// Setup camera session with specified position
    /// - Parameter position: Camera position (.front or .back)
    func setupCamera(position: AVCaptureDevice.Position = .back) async throws {
        // Check camera permission
        let status = await checkCameraPermission()
        guard status == .authorized else {
            throw CameraError.permissionDenied
        }

        // Configure session
        captureSession.beginConfiguration()

        // Set session preset for high quality
        if captureSession.canSetSessionPreset(.photo) {
            captureSession.sessionPreset = .photo
        }

        // Setup camera input
        try setupCameraInput(position: position)

        // Setup outputs
        setupPhotoOutput()
        setupVideoOutput()

        captureSession.commitConfiguration()

        logger.info("Camera setup completed for position: \(position.rawValue)")
    }

    /// Setup camera input device
    private func setupCameraInput(position: AVCaptureDevice.Position) throws {
        // Remove existing input if any
        if let existingInput = cameraInput {
            captureSession.removeInput(existingInput)
        }

        // Get camera device
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position) else {
            throw CameraError.cameraUnavailable
        }

        // Create input
        let input = try AVCaptureDeviceInput(device: camera)

        // Add input to session
        guard captureSession.canAddInput(input) else {
            throw CameraError.inputSetupFailed
        }

        captureSession.addInput(input)

        currentCamera = camera
        cameraInput = input
        currentPosition = position

        logger.info("Camera input configured for \(position.rawValue) camera")
    }

    /// Setup photo output
    private func setupPhotoOutput() {
        guard captureSession.canAddOutput(photoOutput) else {
            logger.error("Cannot add photo output to session")
            return
        }

        captureSession.addOutput(photoOutput)

        // Configure photo output
        if #available(iOS 16.0, *) {
            photoOutput.maxPhotoDimensions = photoOutput.maxPhotoDimensions
        }

        logger.info("Photo output configured")
    }

    /// Setup video output
    private func setupVideoOutput() {
        guard captureSession.canAddOutput(videoOutput) else {
            logger.error("Cannot add video output to session")
            return
        }

        captureSession.addOutput(videoOutput)

        logger.info("Video output configured")
    }

    // MARK: - Session Control

    /// Start camera session
    func startSession() {
        guard !isRunning else { return }

        _Concurrency.Task {
            captureSession.startRunning()
            await MainActor.run {
                self.isRunning = true
                self.logger.info("Camera session started")
            }
        }
    }

    /// Stop camera session
    func stopSession() {
        guard isRunning else { return }

        _Concurrency.Task {
            captureSession.stopRunning()
            await MainActor.run {
                self.isRunning = false
                self.logger.info("Camera session stopped")
            }
        }
    }

    /// Pause camera session
    func pauseSession() {
        guard isRunning else { return }
        stopSession()
    }

    /// Resume camera session
    func resumeSession() {
        guard !isRunning else { return }
        startSession()
    }

    // MARK: - Preview Layer

    /// Create preview layer for displaying camera feed
    /// - Returns: Preview layer configured for the capture session
    func createPreviewLayer() -> AVCaptureVideoPreviewLayer {
        let preview = AVCaptureVideoPreviewLayer(session: captureSession)
        preview.videoGravity = .resizeAspectFill
        previewLayer = preview

        logger.info("Preview layer created")
        return preview
    }

    // MARK: - Camera Switching

    /// Switch between front and back cameras
    func switchCamera() async throws {
        let newPosition: AVCaptureDevice.Position = currentPosition == .back ? .front : .back

        captureSession.beginConfiguration()
        try setupCameraInput(position: newPosition)
        captureSession.commitConfiguration()

        logger.info("Switched to \(newPosition.rawValue) camera")
    }

    // MARK: - Photo Capture

    /// Capture a photo
    func capturePhoto() {
        guard isRunning else {
            onError?(.sessionNotRunning)
            return
        }

        let settings = AVCapturePhotoSettings()

        // Configure photo settings
        if #available(iOS 16.0, *) {
            settings.maxPhotoDimensions = photoOutput.maxPhotoDimensions
        }

        // Enable flash if available and needed
        if currentCamera?.hasFlash == true {
            settings.flashMode = .auto
        }

        photoOutput.capturePhoto(with: settings, delegate: self)

        logger.info("Photo capture initiated")
    }

    // MARK: - Video Capture

    /// Start video recording
    /// - Returns: URL where video will be saved
    func startVideoRecording() -> URL? {
        guard isRunning else {
            onError?(.sessionNotRunning)
            return nil
        }

        guard !isRecording else {
            logger.warning("Already recording")
            return nil
        }

        // Create temporary file URL
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mov")

        // Start recording
        videoOutput.startRecording(to: outputURL, recordingDelegate: self)
        isRecording = true

        logger.info("Video recording started: \(outputURL.path)")
        onVideoRecordingStarted?()

        return outputURL
    }

    /// Stop video recording
    func stopVideoRecording() {
        guard isRecording else {
            logger.warning("Not currently recording")
            return
        }

        videoOutput.stopRecording()
        isRecording = false

        logger.info("Video recording stopped")
    }

    // MARK: - Focus and Exposure

    /// Set focus point
    /// - Parameter point: Point in preview layer coordinates (0-1 range)
    func setFocusPoint(_ point: CGPoint) throws {
        guard let device = currentCamera else {
            throw CameraError.cameraUnavailable
        }

        do {
            try device.lockForConfiguration()

            if device.isFocusPointOfInterestSupported {
                device.focusPointOfInterest = point
                device.focusMode = .autoFocus
            }

            device.unlockForConfiguration()

            logger.info("Focus point set to: (\(point.x), \(point.y))")
        } catch {
            throw CameraError.configurationFailed(error)
        }
    }

    /// Set exposure point
    /// - Parameter point: Point in preview layer coordinates (0-1 range)
    func setExposurePoint(_ point: CGPoint) throws {
        guard let device = currentCamera else {
            throw CameraError.cameraUnavailable
        }

        do {
            try device.lockForConfiguration()

            if device.isExposurePointOfInterestSupported {
                device.exposurePointOfInterest = point
                device.exposureMode = .autoExpose
            }

            device.unlockForConfiguration()

            logger.info("Exposure point set to: (\(point.x), \(point.y))")
        } catch {
            throw CameraError.configurationFailed(error)
        }
    }

    /// Reset focus and exposure to automatic
    func resetFocusAndExposure() throws {
        guard let device = currentCamera else {
            throw CameraError.cameraUnavailable
        }

        do {
            try device.lockForConfiguration()

            if device.isFocusModeSupported(.continuousAutoFocus) {
                device.focusMode = .continuousAutoFocus
            }

            if device.isExposureModeSupported(.continuousAutoExposure) {
                device.exposureMode = .continuousAutoExposure
            }

            device.unlockForConfiguration()

            logger.info("Focus and exposure reset to automatic")
        } catch {
            throw CameraError.configurationFailed(error)
        }
    }

    // MARK: - Zoom

    /// Set zoom factor
    /// - Parameter factor: Zoom factor (1.0 = no zoom)
    func setZoom(_ factor: CGFloat) throws {
        guard let device = currentCamera else {
            throw CameraError.cameraUnavailable
        }

        do {
            try device.lockForConfiguration()

            let maxZoom = device.activeFormat.videoMaxZoomFactor
            let clampedFactor = min(max(factor, 1.0), maxZoom)

            device.videoZoomFactor = clampedFactor

            device.unlockForConfiguration()

            logger.info("Zoom set to: \(clampedFactor)")
        } catch {
            throw CameraError.configurationFailed(error)
        }
    }

    // MARK: - Permission Handling

    /// Check camera permission status
    /// - Returns: Current authorization status
    func checkCameraPermission() async -> AVAuthorizationStatus {
        return AVCaptureDevice.authorizationStatus(for: .video)
    }

    /// Request camera permission
    /// - Returns: Whether permission was granted
    func requestCameraPermission() async -> Bool {
        await AVCaptureDevice.requestAccess(for: .video)
    }

    // MARK: - Cleanup

    nonisolated deinit {
        // Note: Cannot call @MainActor methods from deinit
        // Caller is responsible for calling stopSession() before deallocation
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension CameraManager: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        if let error {
            _Concurrency.Task { @MainActor in
                self.logger.error("Photo capture failed: \(error.localizedDescription)")
                self.onError?(.captureFailed(error))
            }
            return
        }

        guard let imageData = photo.fileDataRepresentation(),
              let image = UIImage(data: imageData) else {
            _Concurrency.Task { @MainActor in
                self.logger.error("Failed to convert photo data to image")
                self.onError?(.imageConversionFailed)
            }
            return
        }

        _Concurrency.Task { @MainActor in
            self.logger.info("Photo captured successfully")
            self.onPhotoCapture?(image)
        }
    }
}

// MARK: - AVCaptureFileOutputRecordingDelegate

extension CameraManager: AVCaptureFileOutputRecordingDelegate {
    nonisolated func fileOutput(
        _ output: AVCaptureFileOutput,
        didFinishRecordingTo outputFileURL: URL,
        from connections: [AVCaptureConnection],
        error: Error?
    ) {
        if let error {
            _Concurrency.Task { @MainActor in
                self.logger.error("Video recording failed: \(error.localizedDescription)")
                self.onError?(.recordingFailed(error))
            }
            return
        }

        _Concurrency.Task { @MainActor in
            self.logger.info("Video recording finished: \(outputFileURL.path)")
            self.onVideoRecordingFinished?(outputFileURL)
        }
    }
}

// MARK: - Camera Errors

enum CameraError: LocalizedError {
    case permissionDenied
    case cameraUnavailable
    case inputSetupFailed
    case outputSetupFailed
    case sessionNotRunning
    case captureFailed(Error)
    case recordingFailed(Error)
    case imageConversionFailed
    case configurationFailed(Error)

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Camera permission was denied"
        case .cameraUnavailable:
            return "Camera is not available"
        case .inputSetupFailed:
            return "Failed to setup camera input"
        case .outputSetupFailed:
            return "Failed to setup camera output"
        case .sessionNotRunning:
            return "Camera session is not running"
        case let .captureFailed(error):
            return "Photo capture failed: \(error.localizedDescription)"
        case let .recordingFailed(error):
            return "Video recording failed: \(error.localizedDescription)"
        case .imageConversionFailed:
            return "Failed to convert captured image"
        case let .configurationFailed(error):
            return "Camera configuration failed: \(error.localizedDescription)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .permissionDenied:
            return "Please enable camera access in Settings."
        case .cameraUnavailable:
            return "Make sure no other app is using the camera."
        case .sessionNotRunning:
            return "Start the camera session before capturing."
        default:
            return "Please try again or restart the app."
        }
    }
}
