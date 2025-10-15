//
//  FeedbackService.swift
//  MirrorBuddy
//
//  Collects user feedback and usability metrics for continuous improvement
//  Subtask 98.5: User Testing and Refinements
//

import Foundation
import SwiftUI

/// Service for collecting and managing user feedback
@MainActor
final class FeedbackService {
    static let shared = FeedbackService()

    private init() {}

    // MARK: - Feedback Collection

    /// Submit user feedback
    func submitFeedback(_ feedback: UserFeedback) async -> Bool {
        // TODO: Integrate with backend API or analytics service
        // For now, log locally
        logger.info("User feedback submitted: \(feedback.type.rawValue) - \(feedback.message)")

        // Save to local storage for later sync
        saveFeedbackLocally(feedback)

        return true
    }

    /// Log a usability event for analysis
    func logUsabilityEvent(_ event: UsabilityEvent) {
        // TODO: Integrate with analytics (e.g., Firebase, Mixpanel)
        logger.info("Usability event: \(event.type.rawValue) in \(event.screen)")
    }

    /// Track task completion time
    func trackTaskCompletion(taskName: String, duration: TimeInterval, success: Bool) {
        let event = UsabilityEvent(
            type: success ? .taskCompleted : .taskFailed,
            screen: taskName,
            details: ["duration": String(format: "%.2f", duration)]
        )
        logUsabilityEvent(event)
    }

    /// Track touch target miss
    func trackTouchMiss(screen: String, targetName: String) {
        let event = UsabilityEvent(
            type: .touchTargetMissed,
            screen: screen,
            details: ["target": targetName]
        )
        logUsabilityEvent(event)
    }

    // MARK: - Local Storage

    private func saveFeedbackLocally(_ feedback: UserFeedback) {
        // Save to UserDefaults for now
        // TODO: Use Core Data or file system for production
        var savedFeedback = getSavedFeedback()
        savedFeedback.append(feedback)

        if let encoded = try? JSONEncoder().encode(savedFeedback) {
            UserDefaults.standard.set(encoded, forKey: "pendingFeedback")
        }
    }

    private func getSavedFeedback() -> [UserFeedback] {
        guard let data = UserDefaults.standard.data(forKey: "pendingFeedback"),
              let feedback = try? JSONDecoder().decode([UserFeedback].self, from: data) else {
            return []
        }
        return feedback
    }

    /// Get all pending feedback (for syncing to server)
    func getPendingFeedback() -> [UserFeedback] {
        getSavedFeedback()
    }

    /// Clear synced feedback
    func clearSyncedFeedback() {
        UserDefaults.standard.removeObject(forKey: "pendingFeedback")
    }
}

// MARK: - User Feedback Model

struct UserFeedback: Codable, Identifiable {
    let id: UUID
    let type: FeedbackType
    let message: String
    let screen: String
    let timestamp: Date
    let appVersion: String
    let metadata: [String: String]?

    init(
        type: FeedbackType,
        message: String,
        screen: String,
        metadata: [String: String]? = nil
    ) {
        self.id = UUID()
        self.type = type
        self.message = message
        self.screen = screen
        self.timestamp = Date()
        self.appVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "Unknown"
        self.metadata = metadata
    }
}

enum FeedbackType: String, Codable {
    case bug = "Bug"
    case suggestion = "Suggestion"
    case compliment = "Compliment"
    case usabilityIssue = "Usability Issue"
    case accessibility = "Accessibility"
    case other = "Other"
}

// MARK: - Usability Event Model

struct UsabilityEvent {
    let type: UsabilityEventType
    let screen: String
    let timestamp: Date
    let details: [String: String]?

    init(
        type: UsabilityEventType,
        screen: String,
        details: [String: String]? = nil
    ) {
        self.type = type
        self.screen = screen
        self.timestamp = Date()
        self.details = details
    }
}

enum UsabilityEventType: String {
    case taskCompleted = "Task Completed"
    case taskFailed = "Task Failed"
    case touchTargetMissed = "Touch Target Missed"
    case navigationConfusion = "Navigation Confusion"
    case errorEncountered = "Error Encountered"
    case featureDiscovered = "Feature Discovered"
    case sessionStarted = "Session Started"
    case sessionEnded = "Session Ended"
}

// MARK: - SwiftUI Feedback View

import SwiftUI

struct FeedbackView: View {
    @State private var feedbackType: FeedbackType = .suggestion
    @State private var message: String = ""
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @Environment(\.dismiss) private var dismiss

    let currentScreen: String

    var body: some View {
        NavigationStack {
            Form {
                Section("Tipo di Feedback") {
                    Picker("Tipo", selection: $feedbackType) {
                        Text("💡 Suggerimento").tag(FeedbackType.suggestion)
                        Text("🐛 Problema").tag(FeedbackType.bug)
                        Text("❤️ Complimento").tag(FeedbackType.compliment)
                        Text("🤔 Difficoltà d'uso").tag(FeedbackType.usabilityIssue)
                        Text("♿ Accessibilità").tag(FeedbackType.accessibility)
                        Text("💬 Altro").tag(FeedbackType.other)
                    }
                    .pickerStyle(.menu)
                }

                Section("Il Tuo Feedback") {
                    TextEditor(text: $message)
                        .frame(minHeight: 100)
                        .accessibilityLabel("Campo messaggio feedback")
                }
                .headerProminence(.increased)

                Section {
                    Text("Il tuo feedback ci aiuta a migliorare MirrorBuddy per tutti i bambini!")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Invia Feedback")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Invia") {
                        submitFeedback()
                    }
                    .disabled(message.trimmingCharacters(in: .whitespaces).isEmpty || isSubmitting)
                }
            }
            .alert("Grazie!", isPresented: $showSuccess) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Il tuo feedback è stato ricevuto. Grazie per aiutarci a migliorare!")
            }
        }
    }

    private func submitFeedback() {
        isSubmitting = true

        let feedback = UserFeedback(
            type: feedbackType,
            message: message,
            screen: currentScreen
        )

        _Concurrency.Task {
            let success = await FeedbackService.shared.submitFeedback(feedback)

            await MainActor.run {
                isSubmitting = false

                if success {
                    showSuccess = true
                }
            }
        }
    }
}

// MARK: - Feedback Button Modifier

extension View {
    /// Add a feedback button to any view
    func withFeedbackButton(screenName: String) -> some View {
        modifier(FeedbackButtonModifier(screenName: screenName))
    }
}

struct FeedbackButtonModifier: ViewModifier {
    let screenName: String
    @State private var showingFeedback = false

    func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItem(placement: .secondaryAction) {
                    Button {
                        showingFeedback = true
                    } label: {
                        Label("Invia Feedback", systemImage: "bubble.left.and.exclamationmark.bubble.right")
                    }
                }
            }
            .sheet(isPresented: $showingFeedback) {
                FeedbackView(currentScreen: screenName)
            }
    }
}

// MARK: - Logger Extension

import OSLog

extension FeedbackService {
    private var logger: Logger {
        Logger(subsystem: "com.mirrorbuddy.app", category: "Feedback")
    }
}

// MARK: - Preview

#Preview("Feedback View") {
    FeedbackView(currentScreen: "Dashboard")
}
