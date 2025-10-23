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
    /// TODO: Add TextToSpeechService to macOS target or create macOS version
    lazy var textToSpeech: TextToSpeechManaging? = {
        #if os(iOS)
        return TextToSpeechService.shared
        #elseif os(macOS)
        return nil // TODO: Add TextToSpeechService.swift to macOS target
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
    /// TODO: Update when CameraManager conforms to CameraManaging
    lazy var cameraManager: Any = {
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
    /// TODO: Update when FeedbackService conforms to FeedbackProviding
    lazy var feedbackProvider: Any = {
        #if os(iOS)
        return FeedbackService.shared
        #elseif os(macOS)
        return FeedbackManager.shared
        #endif
    }()

    /// Background task manager (platform-specific)
    /// TODO: Update when BackgroundTaskScheduler conforms to BackgroundTaskManaging
    lazy var backgroundTaskManager: Any = {
        #if os(iOS)
        return BackgroundTaskScheduler.shared
        #elseif os(macOS)
        return macOSBackgroundTaskManager.shared
        #endif
    }()

    /// Gmail service (platform-specific)
    lazy var gmailService: GmailManaging = {
        #if os(iOS)
        return GmailService.shared
        #elseif os(macOS)
        return macOSGmailService.shared
        #endif
    }()

    /// Google Calendar service (platform-specific)
    lazy var googleCalendarService: GoogleCalendarManaging = {
        #if os(iOS)
        return GoogleCalendarService.shared
        #elseif os(macOS)
        return macOSGoogleCalendarService.shared
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
