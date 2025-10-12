//
//  [Component]View.swift
//  MirrorBuddy
//
//  Created by AI Agent on [Date]
//  Purpose: [Brief description of what this component does]
//

import SwiftUI

/// [Component] view for [purpose]
///
/// This component is designed with Mario's needs in mind:
/// - Voice-first: [Voice command support]
/// - One-handed: [Right-thumb optimization]
/// - Dyslexia-friendly: [Font/spacing considerations]
/// - Limited working memory: [Context always visible]
///
/// Usage:
/// ```swift
/// [Component]View(
///     parameter: value
/// )
/// ```
struct [Component]View: View {

    // MARK: - Properties

    /// [Description of property]
    let property: Type

    /// [Description of state]
    @State private var stateProperty: Type = defaultValue

    /// [Description of binding if needed]
    @Binding var bindingProperty: Type

    /// Environment objects
    @Environment(\.modelContext) private var modelContext
    @Environment(\.colorScheme) private var colorScheme

    // MARK: - Body

    var body: some View {
        mainContent
            .navigationTitle("Title")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
            // Voice command support
            .onAppear { registerVoiceCommands() }
            .onDisappear { unregisterVoiceCommands() }
    }

    // MARK: - Main Content

    @ViewBuilder
    private var mainContent: some View {
        VStack(spacing: 16) {
            // Header/Context (always visible for working memory)
            contextBanner

            // Main content area
            ScrollView {
                contentArea
            }

            Spacer()

            // Primary action in bottom-right (right-thumb optimized)
            primaryActionButton
        }
        .padding()
    }

    // MARK: - Context Banner

    /// Always shows current context (for limited working memory)
    private var contextBanner: some View {
        HStack {
            Image(systemName: "icon.name")
                .font(.title2)
                .foregroundStyle(.blue)

            VStack(alignment: .leading, spacing: 4) {
                Text("Current Context")
                    .font(.headline)

                Text("Subtitle/Status")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
        // Accessibility
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Context: Current Context, Subtitle")
    }

    // MARK: - Content Area

    private var contentArea: some View {
        VStack(spacing: 20) {
            // Content goes here
            Text("Content")
                .font(.body)
                .lineSpacing(8) // Extra spacing for dyslexia
                .dynamicTypeSize(...<= .xxxLarge) // Support Dynamic Type
        }
    }

    // MARK: - Primary Action Button

    /// Primary action button in bottom-right (right-thumb reach)
    private var primaryActionButton: some View {
        HStack {
            Spacer()

            Button {
                performPrimaryAction()
            } label: {
                Label("Action", systemImage: "icon.name")
                    .font(.headline)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 16)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            // Minimum touch target 44x44pt
            .frame(minWidth: 44, minHeight: 44)
            // Accessibility
            .accessibilityLabel("Action name")
            .accessibilityHint("Double tap to perform action")
            .accessibilityAddTraits(.isButton)
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                // Action
            } label: {
                Image(systemName: "ellipsis.circle")
            }
            .accessibilityLabel("Options")
            .accessibilityHint("Double tap for more options")
        }
    }

    // MARK: - Actions

    /// Performs the primary action
    private func performPrimaryAction() {
        // Provide haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        // Execute action
        Task {
            do {
                try await performAsyncAction()
            } catch {
                handleError(error)
            }
        }
    }

    private func performAsyncAction() async throws {
        // Async work here
    }

    // MARK: - Error Handling

    @State private var showError = false
    @State private var errorMessage = ""

    private func handleError(_ error: Error) {
        errorMessage = error.localizedDescription
        showError = true

        // Log error for debugging
        print("❌ [Component] Error: \(error)")
    }

    // MARK: - Voice Commands

    private func registerVoiceCommands() {
        VoiceCommandRegistry.shared.register([
            .commandName: handleVoiceCommand
        ])
    }

    private func unregisterVoiceCommands() {
        VoiceCommandRegistry.shared.unregister([.commandName])
    }

    private func handleVoiceCommand() {
        performPrimaryAction()
    }
}

// MARK: - Preview

#Preview("Default State") {
    NavigationStack {
        [Component]View(
            property: sampleValue
        )
    }
}

#Preview("Empty State") {
    NavigationStack {
        [Component]View(
            property: emptyValue
        )
    }
}

#Preview("Error State") {
    NavigationStack {
        [Component]View(
            property: errorValue
        )
    }
}

#Preview("Dark Mode") {
    NavigationStack {
        [Component]View(
            property: sampleValue
        )
    }
    .preferredColorScheme(.dark)
}

#Preview("Large Text") {
    NavigationStack {
        [Component]View(
            property: sampleValue
        )
    }
    .environment(\.dynamicTypeSize, .xxxLarge)
}

// MARK: - Component Variants (if needed)

/// Loading state variant
struct [Component]LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Loading...")
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading content")
    }
}

/// Empty state variant
struct [Component]EmptyView: View {
    let message: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "tray")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)

            Text(message)
                .font(.title3)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("Action", action: action)
                .buttonStyle(.borderedProminent)
                .frame(minWidth: 44, minHeight: 44)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("No content. \(message)")
    }
}

/// Error state variant
struct [Component]ErrorView: View {
    let error: Error
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundStyle(.orange)

            Text("Something went wrong")
                .font(.title3)
                .fontWeight(.semibold)

            Text(error.localizedDescription)
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("Try Again", action: retry)
                .buttonStyle(.borderedProminent)
                .frame(minWidth: 44, minHeight: 44)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Error: \(error.localizedDescription)")
    }
}

// MARK: - Accessibility Extensions

extension [Component]View {
    /// Configures accessibility for the entire view
    func accessibilityConfiguration() -> some View {
        self
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Component name")
            .accessibilityHint("Description of what this component does")
    }
}

// MARK: - Style Modifiers

extension View {
    /// Applies Mario-friendly styling
    func marioFriendlyStyle() -> some View {
        self
            .font(.body)
            .lineSpacing(8) // Extra line spacing for dyslexia
            .dynamicTypeSize(...<= .xxxLarge) // Support Dynamic Type
            .tint(.blue) // High contrast
    }
}
