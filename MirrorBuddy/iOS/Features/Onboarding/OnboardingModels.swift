import Combine
import Foundation
import SwiftUI

// MARK: - Onboarding Models (Task 55.1)

/// Onboarding flow step
enum OnboardingStep: Int, CaseIterable {
    case welcome
    case permissions
    case googleAccount
    case apiKeys
    case voiceTutorial
    case sampleMaterial
    case completion

    var title: String {
        switch self {
        case .welcome:
            return "Benvenuto in MirrorBuddy!"
        case .permissions:
            return "Permessi"
        case .googleAccount:
            return "Account Google"
        case .apiKeys:
            return "Configurazione API"
        case .voiceTutorial:
            return "Tutorial Vocale"
        case .sampleMaterial:
            return "Esempio Pratico"
        case .completion:
            return "Tutto Pronto!"
        }
    }

    var icon: String {
        switch self {
        case .welcome:
            return "hand.wave.fill"
        case .permissions:
            return "checkmark.shield.fill"
        case .googleAccount:
            return "person.crop.circle.fill"
        case .apiKeys:
            return "key.fill"
        case .voiceTutorial:
            return "mic.fill"
        case .sampleMaterial:
            return "book.fill"
        case .completion:
            return "checkmark.circle.fill"
        }
    }

    var description: String {
        switch self {
        case .welcome:
            return "Inizia il tuo viaggio verso uno studio più efficace"
        case .permissions:
            return "Abilita le funzionalità di MirrorBuddy"
        case .googleAccount:
            return "Connetti il tuo account per sincronizzare i materiali"
        case .apiKeys:
            return "Configura le chiavi API per sviluppatori"
        case .voiceTutorial:
            return "Scopri i comandi vocali"
        case .sampleMaterial:
            return "Prova le funzionalità con un materiale di esempio"
        case .completion:
            return "Sei pronto per iniziare!"
        }
    }

    var isSkippable: Bool {
        switch self {
        case .welcome, .completion:
            return false
        case .permissions, .googleAccount, .apiKeys, .voiceTutorial, .sampleMaterial:
            return true
        }
    }

    var next: OnboardingStep? {
        guard let nextIndex = OnboardingStep.allCases.firstIndex(of: self)?.advanced(by: 1),
              nextIndex < OnboardingStep.allCases.count else {
            return nil
        }
        return OnboardingStep.allCases[nextIndex]
    }

    var previous: OnboardingStep? {
        guard let currentIndex = OnboardingStep.allCases.firstIndex(of: self),
              currentIndex > 0 else {
            return nil
        }
        return OnboardingStep.allCases[currentIndex - 1]
    }
}

/// Permission type for onboarding
enum OnboardingPermission: String, CaseIterable {
    case camera
    case microphone
    case notifications

    var title: String {
        switch self {
        case .camera:
            return "Fotocamera"
        case .microphone:
            return "Microfono"
        case .notifications:
            return "Notifiche"
        }
    }

    var icon: String {
        switch self {
        case .camera:
            return "camera.fill"
        case .microphone:
            return "mic.fill"
        case .notifications:
            return "bell.fill"
        }
    }

    var description: String {
        switch self {
        case .camera:
            return "Scansiona documenti e crea materiali fotografando i tuoi appunti"
        case .microphone:
            return "Usa i comandi vocali per navigare senza toccare lo schermo"
        case .notifications:
            return "Ricevi promemoria per le sessioni di studio e gli aggiornamenti"
        }
    }

    var color: Color {
        switch self {
        case .camera:
            return .blue
        case .microphone:
            return .orange
        case .notifications:
            return .purple
        }
    }
}

/// Onboarding state manager
@MainActor
final class OnboardingState: ObservableObject {
    @Published var currentStep: OnboardingStep = .welcome
    @Published var completedSteps: Set<OnboardingStep> = []
    @Published var skippedSteps: Set<OnboardingStep> = []
    @Published var isCompleted: Bool = false

    // Permission states
    @Published var cameraPermissionGranted: Bool = false
    @Published var microphonePermissionGranted: Bool = false
    @Published var notificationsPermissionGranted: Bool = false

    // Account states
    @Published var isGoogleAccountConnected: Bool = false
    @Published var hasAPIKeys: Bool = false

    // Tutorial states
    @Published var hasCompletedVoiceTutorial: Bool = false
    @Published var hasViewedSampleMaterial: Bool = false

    var progress: Double {
        let total = OnboardingStep.allCases.count
        let completed = completedSteps.count
        return Double(completed) / Double(total)
    }

    var canProceed: Bool {
        // Check if current step requirements are met
        switch currentStep {
        case .welcome, .completion:
            return true
        case .permissions:
            // At least one permission should be granted
            return cameraPermissionGranted || microphonePermissionGranted || notificationsPermissionGranted
        case .googleAccount:
            return isGoogleAccountConnected
        case .apiKeys:
            return hasAPIKeys
        case .voiceTutorial:
            return hasCompletedVoiceTutorial
        case .sampleMaterial:
            return hasViewedSampleMaterial
        }
    }

    func moveToNext() {
        completedSteps.insert(currentStep)

        if let next = currentStep.next {
            currentStep = next
        } else {
            isCompleted = true
        }
    }

    func moveToPrevious() {
        if let previous = currentStep.previous {
            currentStep = previous
        }
    }

    func skip() {
        guard currentStep.isSkippable else { return }
        skippedSteps.insert(currentStep)
        moveToNext()
    }

    func complete() {
        isCompleted = true
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
    }

    static var hasCompletedOnboarding: Bool {
        UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")
    }

    static func resetOnboarding() {
        UserDefaults.standard.removeObject(forKey: "hasCompletedOnboarding")
    }
}
