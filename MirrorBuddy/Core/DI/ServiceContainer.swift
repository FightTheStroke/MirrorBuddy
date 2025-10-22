import Foundation

/// Dependency injection container for cross-platform services
/// Automatically selects platform-specific implementations
@MainActor
final class ServiceContainer {
    /// Shared singleton instance
    static let shared = ServiceContainer()

    private init() {}

    // MARK: - Core Services

    /// Audio pipeline manager (platform-specific)
    lazy var audioManager: AudioManaging = {
        #if os(iOS)
        return AudioPipelineManager.shared
        #elseif os(macOS)
        return macOSAudioPipelineManager.shared
        #endif
    }()

    /// Text-to-speech manager (platform-specific)
    lazy var textToSpeech: TextToSpeechManaging = {
        #if os(iOS)
        return TextToSpeechService.shared
        #elseif os(macOS)
        return TextToSpeechService.shared // Same implementation works for both
        #endif
    }()

    /// Image processor (platform-specific)
    lazy var imageProcessor: ImageProcessing = {
        #if os(iOS)
        return ImageProcessor.shared
        #elseif os(macOS)
        return macOSImageProcessor.shared
        #endif
    }()

    /// Camera manager (platform-specific)
    lazy var cameraManager: CameraManaging = {
        #if os(iOS)
        return CameraManager.shared
        #elseif os(macOS)
        return macOSCameraManager.shared
        #endif
    }()

    /// Performance monitor (platform-specific)
    lazy var performanceMonitor: PerformanceMonitoring = {
        #if os(iOS)
        return PerformanceMonitor.shared
        #elseif os(macOS)
        return macOSPerformanceMonitor.shared
        #endif
    }()

    /// Feedback provider (platform-specific)
    lazy var feedbackProvider: FeedbackProviding = {
        #if os(iOS)
        return FeedbackService.shared
        #elseif os(macOS)
        return FeedbackManager.shared
        #endif
    }()

    /// Background task manager (platform-specific)
    lazy var backgroundTaskManager: BackgroundTaskManaging = {
        #if os(iOS)
        return BackgroundTaskScheduler.shared
        #elseif os(macOS)
        return macOSBackgroundTaskManager.shared
        #endif
    }()

    // MARK: - Reset (for testing)

    /// Reset all lazy-loaded services (useful for testing)
    func reset() {
        // Force re-initialization on next access
        // This is a no-op for lazy vars, but documents the pattern
    }
}

// MARK: - Global Access (Convenience)

/// Global service container instance
let Services = ServiceContainer.shared
