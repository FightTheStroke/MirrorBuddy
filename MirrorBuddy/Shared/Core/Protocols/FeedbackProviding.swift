import Foundation

/// Protocol for cross-platform haptic and audio feedback
@MainActor
protocol FeedbackProviding: AnyObject {
    // MARK: - Haptic Feedback

    /// Trigger success haptic feedback
    func triggerSuccessFeedback()

    /// Trigger warning haptic feedback
    func triggerWarningFeedback()

    /// Trigger error haptic feedback
    func triggerErrorFeedback()

    /// Trigger selection haptic feedback
    func triggerSelectionFeedback()

    /// Trigger impact haptic feedback
    func triggerImpactFeedback(style: ImpactStyle)

    // MARK: - Audio Feedback

    /// Play system sound
    func playSystemSound(_ sound: SystemSound)

    /// Play custom sound file
    func playSound(named soundName: String, withExtension ext: String)

    /// Stop all sounds
    func stopAllSounds()
}

// MARK: - Supporting Types

enum ImpactStyle {
    case light
    case medium
    case heavy
    case soft
    case rigid
}

enum SystemSound {
    case success
    case warning
    case error
    case notification
    case delete
    case pop
    case glass
    case tink
}
