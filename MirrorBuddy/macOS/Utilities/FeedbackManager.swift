#if os(macOS)
//
//  FeedbackManager.swift
//  MirrorBuddy macOS
//
//  Cross-platform feedback manager
//  iOS: Haptic feedback
//  macOS: Audio feedback (NSSound)
//

import Foundation

#if os(iOS)
import UIKit

class FeedbackManager {
    static let shared = FeedbackManager()

    private init() {}

    func playSuccess() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }

    func playError() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.error)
    }

    func playWarning() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.warning)
    }

    func playImpact(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }

    func playSelection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
}

#elseif os(macOS)
import AppKit

class FeedbackManager {
    static let shared = FeedbackManager()

    private init() {}

    /// Play success sound (pleasant tone)
    func playSuccess() {
        NSSound(named: .glass)?.play()
    }

    /// Play error sound (gentle alert)
    func playError() {
        NSSound(named: .pop)?.play()
    }

    /// Play warning sound
    func playWarning() {
        NSSound(named: .purr)?.play()
    }

    /// Play impact sound (click/tap)
    func playImpact(style: String = "medium") {
        // macOS doesn't have haptics, use subtle click sound
        NSSound(named: .pop)?.play()
    }

    /// Play selection sound (navigation change)
    func playSelection() {
        NSSound(named: .pop)?.play()
    }

    /// Play custom sound by name
    func playSound(_ name: NSSound.Name) {
        NSSound(named: name)?.play()
    }
}

#endif

#endif
