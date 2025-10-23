import SwiftUI

// MARK: - Main Onboarding View (Task 55.1)

/// Main onboarding coordinator view
struct OnboardingView: View {
    @StateObject private var state = OnboardingState()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color.blue.opacity(0.1),
                    Color.purple.opacity(0.1)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress indicator
                OnboardingProgressIndicator(
                    currentStep: state.currentStep,
                    completedSteps: state.completedSteps
                )
                .padding(.top)
                .padding(.horizontal)

                // Current step content
                stepView
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))

                // Navigation buttons
                navigationButtons
                    .padding()
            }
        }
        .animation(.easeInOut, value: state.currentStep)
        .onChange(of: state.isCompleted) { _, isCompleted in
            if isCompleted {
                state.complete()
                dismiss()
            }
        }
    }

    @ViewBuilder
    private var stepView: some View {
        switch state.currentStep {
        case .welcome:
            OnboardingWelcomeView(state: state)
        case .permissions:
            OnboardingPermissionsView(state: state)
        case .googleAccount:
            OnboardingGoogleAccountView(state: state)
        case .apiKeys:
            OnboardingAPIKeysView(state: state)
        case .voiceTutorial:
            OnboardingVoiceTutorialView(state: state)
        case .sampleMaterial:
            OnboardingSampleMaterialView(state: state)
        case .completion:
            OnboardingCompletionView(state: state)
        }
    }

    @ViewBuilder
    private var navigationButtons: some View {
        HStack(spacing: 16) {
            // Back button
            if state.currentStep.previous != nil {
                Button {
                    withAnimation {
                        state.moveToPrevious()
                    }
                } label: {
                    HStack {
                        Image(systemName: "chevron.left")
                        Text("Indietro")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }

            // Skip button
            if state.currentStep.isSkippable {
                Button {
                    withAnimation {
                        state.skip()
                    }
                } label: {
                    Text("Salta")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }

            // Next/Complete button
            Button {
                withAnimation {
                    if state.currentStep == .completion {
                        state.complete()
                    } else {
                        state.moveToNext()
                    }
                }
            } label: {
                HStack {
                    Text(state.currentStep == .completion ? "Inizia" : "Continua")
                    Image(systemName: state.currentStep == .completion ? "arrow.right.circle.fill" : "chevron.right")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!state.canProceed && !state.currentStep.isSkippable)
        }
    }
}

// MARK: - Welcome View (Task 55.1)

struct OnboardingWelcomeView: View {
    @ObservedObject var state: OnboardingState

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                Spacer()

                // Logo/Icon
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 120, height: 120)

                    Image(systemName: "book.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.white)
                }
                .shadow(radius: 10)

                VStack(spacing: 16) {
                    Text("Benvenuto in")
                        .font(.title2)
                        .foregroundStyle(.secondary)

                    Text("MirrorBuddy")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )

                    Text("Il tuo compagno di studio con AI")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                VStack(alignment: .leading, spacing: 20) {
                    FeatureRow(
                        icon: "brain.head.profile",
                        title: "Riassunti Intelligenti",
                        description: "Genera riassunti automatici con Apple Intelligence"
                    )

                    FeatureRow(
                        icon: "map.fill",
                        title: "Mappe Mentali",
                        description: "Visualizza concetti con mappe generate da AI"
                    )

                    FeatureRow(
                        icon: "rectangle.stack.fill",
                        title: "Flashcard Adaptive",
                        description: "Studia con flashcard che si adattano al tuo livello"
                    )

                    FeatureRow(
                        icon: "mic.fill",
                        title: "Comandi Vocali",
                        description: "Naviga l'app senza toccare lo schermo"
                    )

                    FeatureRow(
                        icon: "text.book.closed.fill",
                        title: "Modalità Dislessia",
                        description: "Testo ottimizzato per la lettura facilitata"
                    )
                }
                .padding(.horizontal)

                Spacer()
            }
            .padding()
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.blue)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Completion View (Task 55.1)

struct OnboardingCompletionView: View {
    @ObservedObject var state: OnboardingState

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Success animation
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.2))
                    .frame(width: 160, height: 160)

                Circle()
                    .fill(Color.green.opacity(0.3))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.green)
            }

            VStack(spacing: 16) {
                Text("Tutto Pronto!")
                    .font(.system(size: 40, weight: .bold, design: .rounded))

                Text("Hai completato la configurazione di MirrorBuddy")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            // Summary of completed steps
            VStack(alignment: .leading, spacing: 12) {
                if state.cameraPermissionGranted {
                    CompletedItemRow(icon: "camera.fill", text: "Fotocamera abilitata")
                }

                if state.microphonePermissionGranted {
                    CompletedItemRow(icon: "mic.fill", text: "Microfono abilitato")
                }

                if state.notificationsPermissionGranted {
                    CompletedItemRow(icon: "bell.fill", text: "Notifiche abilitate")
                }

                if state.isGoogleAccountConnected {
                    CompletedItemRow(icon: "person.crop.circle.fill", text: "Account Google connesso")
                }

                if state.hasCompletedVoiceTutorial {
                    CompletedItemRow(icon: "mic.fill", text: "Tutorial vocale completato")
                }

                if state.hasViewedSampleMaterial {
                    CompletedItemRow(icon: "book.fill", text: "Materiale di esempio visualizzato")
                }
            }
            .padding()
            .background(Color.green.opacity(0.1))
            .cornerRadius(12)
            .padding(.horizontal)

            Spacer()
        }
        .padding()
    }
}

struct CompletedItemRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(.green)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)
        }
    }
}

// MARK: - Preview

#Preview("Welcome") {
    OnboardingWelcomeView(state: OnboardingState())
}

#Preview("Complete") {
    OnboardingCompletionView(state: {
        let state = OnboardingState()
        state.cameraPermissionGranted = true
        state.microphonePermissionGranted = true
        state.isGoogleAccountConnected = true
        state.hasCompletedVoiceTutorial = true
        return state
    }())
}

#Preview("Full Flow") {
    OnboardingView()
}
