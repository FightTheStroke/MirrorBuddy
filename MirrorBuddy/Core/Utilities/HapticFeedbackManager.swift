//
//  HapticFeedbackManager.swift
//  MirrorBuddy
//
//  Strategic haptic feedback for voice conversation states
//  Neurodiverse-friendly tactile feedback patterns
//

import UIKit

/// Manages haptic feedback for voice conversation
/// Provides tactile cues for state changes to reduce cognitive load
@MainActor
final class HapticFeedbackManager {
    static let shared = HapticFeedbackManager()

    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private let notificationFeedback = UINotificationFeedbackGenerator()

    private init() {
        // Prepare generators for lower latency
        prepareGenerators()
    }

    // MARK: - Preparation

    private func prepareGenerators() {
        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
        selectionFeedback.prepare()
        notificationFeedback.prepare()
    }

    // MARK: - Voice State Transitions

    /// Haptic feedback for voice state change
    func stateChanged(to state: VoiceSessionState) {
        switch state {
        case .inactive:
            // No feedback - silent state
            break

        case .connecting:
            // Light tap - starting connection
            lightImpact.impactOccurred()

        case .passive:
            // Very gentle tap - now listening passively
            lightImpact.impactOccurred(intensity: 0.5)

        case .listening:
            // Gentle double tap - user started speaking
            lightImpact.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                self?.lightImpact.impactOccurred()
            }

        case .thinking:
            // Medium single tap - AI processing
            mediumImpact.impactOccurred()

        case .speaking:
            // Gentle vibration - AI starting to speak
            lightImpact.impactOccurred(intensity: 0.7)

        case .paused:
            // Two quick taps - conversation paused
            selectionFeedback.selectionChanged()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { [weak self] in
                self?.selectionFeedback.selectionChanged()
            }

        case .error:
            // Error pattern - three short taps
            notificationFeedback.notificationOccurred(.error)
        }

        // Re-prepare for next feedback
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.prepareGenerators()
        }
    }

    // MARK: - Specific Events

    /// User interrupted AI (barge-in)
    func userInterrupted() {
        // Quick medium tap to acknowledge interruption
        mediumImpact.impactOccurred()
    }

    /// Conversation started successfully
    func conversationStarted() {
        // Success pattern - gentle rise
        lightImpact.impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.mediumImpact.impactOccurred(intensity: 0.8)
        }
    }

    /// Conversation ended
    func conversationEnded() {
        // Gentle fade - two decreasing taps
        mediumImpact.impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in
            self?.lightImpact.impactOccurred(intensity: 0.5)
        }
    }

    /// Message received
    func messageReceived() {
        // Subtle notification
        selectionFeedback.selectionChanged()
    }

    /// Error occurred
    func errorOccurred() {
        notificationFeedback.notificationOccurred(.error)
    }

    /// Warning or important notice
    func warningOccurred() {
        notificationFeedback.notificationOccurred(.warning)
    }

    /// Success feedback
    func successOccurred() {
        notificationFeedback.notificationOccurred(.success)
    }

    // MARK: - Button Interactions

    /// Standard button press
    func buttonPressed() {
        mediumImpact.impactOccurred()
    }

    /// Toggle or selection change
    func selectionChanged() {
        selectionFeedback.selectionChanged()
    }

    // MARK: - Custom Patterns

    /// Gentle pulsing pattern (for breathing states)
    func breathingPulse() {
        // Very subtle, repeating pattern
        lightImpact.impactOccurred(intensity: 0.3)
    }

    /// Strong confirmation pattern
    func strongConfirmation() {
        heavyImpact.impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.heavyImpact.impactOccurred()
        }
    }
}

// MARK: - SwiftUI Convenience

import SwiftUI

/// SwiftUI modifier for haptic feedback on tap
struct HapticFeedbackModifier: ViewModifier {
    let style: UIImpactFeedbackGenerator.FeedbackStyle

    func body(content: Content) -> some View {
        content
            .onTapGesture {
                let generator = UIImpactFeedbackGenerator(style: style)
                generator.impactOccurred()
            }
    }
}

extension View {
    /// Add haptic feedback on tap
    func hapticFeedback(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) -> some View {
        modifier(HapticFeedbackModifier(style: style))
    }
}
