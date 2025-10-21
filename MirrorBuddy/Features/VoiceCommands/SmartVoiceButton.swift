//
//  SmartVoiceButton.swift
//  MirrorBuddy
//
//  Task 139.3: Smart voice button with unified command + conversation
//  Replaces separate VoiceCommandButton and PersistentVoiceButton
//

import Combine
import SwiftUI

/// Smart voice button with unified command and conversation detection
/// Task 113: Safe area-aware positioning with orientation and keyboard support
struct SmartVoiceButton: View {
    @StateObject private var voiceManager = UnifiedVoiceManager.shared
    @State private var showConversation = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var conversationText = ""
    @State private var isPressed = false
    @State private var pulseAnimation = false
    @State private var showFirstTimeHint = false

    // Task 113.4: Keyboard awareness
    @State private var keyboardHeight: CGFloat = 0

    // Task 113.3: Size class awareness for orientation handling
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    @Environment(\.verticalSizeClass) var verticalSizeClass

    @AppStorage("hasSeenVoiceHint") private var hasSeenVoiceHint = false

    var body: some View {
        // Task 113.3: GeometryReader for responsive safe area positioning
        GeometryReader { geometry in
            Button {
                handleVoiceButtonTap()
            } label: {
                ZStack {
                    // Pulsing ring when listening
                    if voiceManager.isListening {
                        Circle()
                            .stroke(Color.blue.opacity(0.3), lineWidth: 4)
                            .scaleEffect(pulseAnimation ? 1.3 : 1.0)
                            .opacity(pulseAnimation ? 0 : 1)
                            .animation(.easeOut(duration: 1).repeatForever(autoreverses: false), value: pulseAnimation)
                    }

                    // Main button - 80x80pt circle
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: voiceManager.isListening ? [.red, .red.opacity(0.8)] : [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 80, height: 80)
                        .shadow(
                            color: (voiceManager.isListening ? Color.red : Color.blue).opacity(0.4),
                            radius: isPressed ? 4 : 8,
                            y: isPressed ? 2 : 4
                        )

                    // Icon switches between mic.fill and stop.fill
                    Image(systemName: voiceManager.isListening ? "stop.fill" : "mic.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(.white)
                }
            }
            .frame(width: 88, height: 88) // WCAG 2.1 minimum 48x48pt touch target + extra padding
            .accessibilityLabel(voiceManager.isListening ? "Stop listening" : "Start listening")
            .accessibilityHint("Double tap to talk with MirrorBuddy. Say commands or ask questions.")
            .accessibilityAddTraits(.isButton)
            .scaleEffect(isPressed ? 0.95 : 1.0)
            // Task 113.5: Smooth animations for all state changes
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
            .animation(.easeInOut(duration: 0.3), value: keyboardHeight)
            .animation(.easeInOut(duration: 0.3), value: verticalSizeClass)
            .overlay(alignment: .topTrailing) {
                if showFirstTimeHint {
                    VoiceButtonHintTooltip {
                        withAnimation {
                            showFirstTimeHint = false
                            hasSeenVoiceHint = true
                        }
                    }
                    .transition(.scale.combined(with: .opacity))
                }
            }
            // Task 113.3: Dynamic positioning based on orientation, keyboard, and safe areas
            .position(
                x: geometry.size.width - trailingPadding(for: geometry) - 44, // 44 = half of button width
                y: geometry.size.height - bottomPadding(for: geometry) - 44 // 44 = half of button height
            )
            .sheet(isPresented: $showConversation) {
                NavigationStack {
                    VoiceConversationView()
                }
            }
            .alert("Comando Non Riconosciuto", isPresented: $showError) {
                Button("Annulla", role: .cancel) {
                    showError = false
                }
                Button("Continua Conversazione") {
                    showError = false
                    conversationText = voiceManager.recognizedText
                    showConversation = true
                }
            } message: {
                Text(errorMessage)
            }
        }
        .onAppear {
            checkFirstTimeHint()
            setupKeyboardObservers()
        }
        .onDisappear {
            removeKeyboardObservers()
        }
        .onChange(of: voiceManager.isListening) { _, isListening in
            pulseAnimation = isListening
        }
    }

    // MARK: - Actions

    private func handleVoiceButtonTap() {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        // Visual feedback
        withAnimation(.spring(response: 0.2)) {
            isPressed = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.spring(response: 0.2)) {
                isPressed = false
            }
        }

        // Dismiss hint if showing
        if showFirstTimeHint {
            withAnimation {
                showFirstTimeHint = false
                hasSeenVoiceHint = true
            }
        }

        // Handle listening state
        if voiceManager.isListening {
            voiceManager.stopListening()
        } else {
            startListening()
        }
    }

    private func startListening() {
        voiceManager.startListening { result in
            handleVoiceResult(result)
        }
    }

    private func handleVoiceResult(_ result: VoiceResult) {
        switch result {
        case .command(let commandResult):
            // VoiceCommandFeedbackView automatically shows feedback
            // Command already executed by UnifiedVoiceManager
            handleCommandResult(commandResult)

        case .conversation(let text):
            // Open VoiceConversationView with recognized text
            conversationText = text
            showConversation = true

        case .error(let message):
            // Show error with option to continue as conversation
            errorMessage = message
            showError = true

        case .suggestions(let commands, let originalText):
            // Show disambiguation UI
            print("Voice suggestions for '\(originalText)': \(commands.count) commands")

        case .requiresConfirmation(let command):
            // Show confirmation dialog
            print("Voice command requires confirmation: \(command)")
        }
    }

    private func handleCommandResult(_ result: VoiceCommandResult) {
        switch result {
        case .success:
            // VoiceCommandFeedbackView shows success automatically
            break

        case .failed(let error):
            // Show error
            errorMessage = "Errore: \(error.localizedDescription)"
            showError = true
        }
    }

    private func checkFirstTimeHint() {
        // Show hint only once, after a short delay
        guard !hasSeenVoiceHint else { return }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            withAnimation {
                showFirstTimeHint = true
            }
        }

        // Auto-dismiss after 10 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 11.0) {
            withAnimation {
                showFirstTimeHint = false
                hasSeenVoiceHint = true
            }
        }
    }

    // MARK: - Task 113.3: Responsive Positioning

    /// Calculate trailing padding based on safe area and orientation
    /// Handles edge cases: iPhone SE (small), iPhone 15 Pro Max (large), Dynamic Island
    private func trailingPadding(for geometry: GeometryProxy) -> CGFloat {
        let baseInset = geometry.safeAreaInsets.trailing
        let basePadding: CGFloat = 16

        // Adapt for horizontal size class (iPad split-screen support)
        if horizontalSizeClass == .regular {
            // iPad or split-screen: more padding
            return baseInset + 24
        }

        // iPhone: standard padding
        return max(baseInset + basePadding, 16)
    }

    /// Calculate bottom padding based on safe area, orientation, and keyboard
    /// Handles: tab bar, home indicator, landscape mode, keyboard visibility
    private func bottomPadding(for geometry: GeometryProxy) -> CGFloat {
        let baseInset = geometry.safeAreaInsets.bottom

        // Task 113.4: Keyboard-aware positioning
        if keyboardHeight > 0 {
            // Position above keyboard with spacing
            return keyboardHeight + 20
        }

        // Task 113.3: Orientation-aware positioning
        if verticalSizeClass == .compact {
            // Landscape: reduced padding (less vertical space)
            return max(baseInset + 20, 20)
        } else {
            // Portrait: standard padding above tab bar
            // TabBar height (~49pt) + safe area + extra spacing
            return baseInset + 90
        }
    }

    // MARK: - Task 113.4: Keyboard Observers

    /// Setup keyboard visibility observers
    private func setupKeyboardObservers() {
        NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardWillShowNotification,
            object: nil,
            queue: .main
        ) { notification in
            if let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
                _Concurrency.Task { @MainActor in
                    withAnimation(.easeInOut(duration: 0.3)) {
                        keyboardHeight = keyboardFrame.height
                    }
                }
            }
        }

        NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardWillHideNotification,
            object: nil,
            queue: .main
        ) { _ in
            _Concurrency.Task { @MainActor in
                withAnimation(.easeInOut(duration: 0.3)) {
                    keyboardHeight = 0
                }
            }
        }
    }

    /// Remove keyboard observers
    private func removeKeyboardObservers() {
        NotificationCenter.default.removeObserver(
            self,
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        NotificationCenter.default.removeObserver(
            self,
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }
}

// MARK: - First-Time Hint Tooltip

struct VoiceButtonHintTooltip: View {
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            HStack(spacing: 12) {
                Image(systemName: "hand.wave.fill")
                    .font(.title2)
                    .foregroundStyle(.yellow)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Tocca per parlare!")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text("Posso aiutarti con i compiti, navigare l'app, e molto altro.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                Button {
                    onDismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.ultraThinMaterial)
                    .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
            )

            // Arrow pointing to button
            Image(systemName: "arrowtriangle.down.fill")
                .font(.title)
                .foregroundStyle(.blue)
                .offset(x: -40, y: -4)
        }
        .offset(y: -100)
        .padding(.trailing, 8)
    }
}

// MARK: - Preview

#Preview("Smart Voice Button") {
    ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                SmartVoiceButton()
                    .padding()
            }
        }
    }
}

#Preview("Voice Button with Hint") {
    ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()

        VStack {
            Spacer()
            HStack {
                Spacer()
                SmartVoiceButton()
                    .padding()
                    .onAppear {
                        // Force show hint for preview
                        UserDefaults.standard.set(false, forKey: "hasSeenVoiceHint")
                    }
            }
        }
    }
}
