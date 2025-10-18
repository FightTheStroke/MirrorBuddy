import Foundation
import SwiftUI
import Combine

// MARK: - App Voice Command Handler (Task 102.6)

/// Main handler for executing voice commands in the app
@MainActor
final class AppVoiceCommandHandler: ObservableObject, VoiceCommandHandler {
    static let shared = AppVoiceCommandHandler()

    // MARK: - Navigation State

    @Published var navigationPath = NavigationPath()
    @Published var showSettings = false
    @Published var showProfile = false
    @Published var showMaterials = false
    @Published var showTasks = false
    @Published var showHelp = false
    @Published var showMaterialImport = false

    // Task 111: Study navigation
    @Published var showStudy = false
    @Published var studyMode: StudyMode?

    enum StudyMode {
        case flashcards
        case mindMap
        case general
    }

    // Task 112: Material detail navigation
    @Published var selectedMaterialID: String?

    // MARK: - Command Execution Result

    @Published var lastCommandResult: CommandResult?

    enum CommandResult {
        case success(String)
        case failure(String)
        case unrecognized(String)
    }

    private init() {}

    // MARK: - VoiceCommandHandler Protocol

    func executeCommand(_ action: VoiceCommandAction) {
        switch action {
        // Navigation commands
        case .goBack:
            handleGoBack()
        case .goHome:
            handleGoHome()
        case .openSettings:
            showSettings = true
            lastCommandResult = .success("Apertura impostazioni")
        case .openProfile:
            showProfile = true
            lastCommandResult = .success("Apertura profilo")
        case .openMaterials:
            showMaterials = true
            lastCommandResult = .success("Apertura materiali")
        case .openTasks:
            showTasks = true
            lastCommandResult = .success("Apertura compiti")
        case .openHelp:
            showHelp = true
            lastCommandResult = .success("Apertura aiuto")

        // Material actions
        case .openMaterial(let materialID):
            handleOpenMaterial(materialID)
        case .createMaterial:
            showMaterialImport = true
            lastCommandResult = .success("Crea nuovo materiale")
        case .searchMaterials:
            handleSearchMaterials()

        // Study actions
        case .startStudy:
            handleStartStudy()
        case .reviewFlashcards:
            handleReviewFlashcards()
        case .viewMindMap:
            handleViewMindMap()

        // Accessibility commands
        case .enableDyslexiaMode:
            handleToggleDyslexiaMode(enable: true)
        case .disableDyslexiaMode:
            handleToggleDyslexiaMode(enable: false)
        case .increaseFontSize:
            handleAdjustFontSize(increase: true)
        case .decreaseFontSize:
            handleAdjustFontSize(increase: false)
        case .readScreen:
            handleReadScreen()

        // TTS controls
        case .startReading:
            handleStartReading()
        case .stopReading:
            handleStopReading()
        case .pauseReading:
            handlePauseReading()
        case .resumeReading:
            handleResumeReading()

        // App controls
        case .refresh:
            handleRefresh()
        case .closeView:
            handleCloseView()
        case .showHelp:
            showHelp = true
            lastCommandResult = .success("Mostra comandi vocali")

        case .customAction(let name, let action):
            action()
            lastCommandResult = .success("Eseguito: \(name)")
        }

        // Play success feedback
        playHapticFeedback()
    }

    func handleUnrecognizedCommand(_ phrase: String) {
        lastCommandResult = .unrecognized(phrase)
        print("⚠️ Voice command not recognized: \(phrase)")
    }

    // MARK: - Navigation Handlers

    private func handleGoBack() {
        if !navigationPath.isEmpty {
            navigationPath.removeLast()
            lastCommandResult = .success("Torna indietro")
        } else {
            lastCommandResult = .failure("Già nella schermata principale")
        }
    }

    private func handleGoHome() {
        navigationPath = NavigationPath()
        showSettings = false
        showProfile = false
        showMaterials = false
        showTasks = false
        showHelp = false
        lastCommandResult = .success("Vai alla home")
    }

    private func handleOpenMaterial(_ materialID: String?) {
        if let materialID = materialID {
            // Navigate to specific material (Task 112)
            selectedMaterialID = materialID
            showMaterials = true // Also switch to materials tab
            lastCommandResult = .success("Apertura materiale \(materialID)")
        } else {
            showMaterials = true
            lastCommandResult = .success("Apertura lista materiali")
        }
    }

    private func handleSearchMaterials() {
        showMaterials = true
        lastCommandResult = .success("Cerca materiali")
        // TODO: Focus search field
    }

    // MARK: - Study Handlers (Task 111)

    private func handleStartStudy() {
        studyMode = .general
        showStudy = true
        lastCommandResult = .success("Inizia sessione di studio")
    }

    private func handleReviewFlashcards() {
        studyMode = .flashcards
        showStudy = true
        lastCommandResult = .success("Ripassa flashcard")
    }

    private func handleViewMindMap() {
        studyMode = .mindMap
        showStudy = true
        lastCommandResult = .success("Visualizza mappa mentale")
    }

    // MARK: - Accessibility Handlers

    private func handleToggleDyslexiaMode(enable: Bool) {
        UserDefaults.standard.set(enable, forKey: "dyslexiaMode")
        NotificationCenter.default.post(name: Notification.Name("dyslexiaModeChanged"), object: nil)
        lastCommandResult = .success(enable ? "Modalità dislessia attivata" : "Modalità dislessia disattivata")
    }

    private func handleAdjustFontSize(increase: Bool) {
        let currentSize = UserDefaults.standard.double(forKey: "fontSize")
        let newSize = increase ? currentSize + 2 : currentSize - 2
        UserDefaults.standard.set(newSize, forKey: "fontSize")
        NotificationCenter.default.post(name: Notification.Name("fontSizeChanged"), object: nil)
        lastCommandResult = .success(increase ? "Font aumentato" : "Font ridotto")
    }

    private func handleReadScreen() {
        lastCommandResult = .success("Lettura schermo")
        // TODO: Integrate with TTS service
    }

    // MARK: - TTS Handlers

    private func handleStartReading() {
        // TODO: Get current screen text and speak it
        // TextToSpeechService.shared.speak(currentScreenText)
        lastCommandResult = .success("Inizio lettura")
    }

    private func handleStopReading() {
        TextToSpeechService.shared.stop()
        lastCommandResult = .success("Stop lettura")
    }

    private func handlePauseReading() {
        TextToSpeechService.shared.pause()
        lastCommandResult = .success("Pausa lettura")
    }

    private func handleResumeReading() {
        TextToSpeechService.shared.resume()
        lastCommandResult = .success("Riprendi lettura")
    }

    // MARK: - App Control Handlers

    private func handleRefresh() {
        NotificationCenter.default.post(name: Notification.Name("refreshCurrentView"), object: nil)
        lastCommandResult = .success("Aggiornamento...")
    }

    private func handleCloseView() {
        if !navigationPath.isEmpty {
            navigationPath.removeLast()
            lastCommandResult = .success("Vista chiusa")
        } else {
            lastCommandResult = .failure("Nessuna vista da chiudere")
        }
    }

    // MARK: - Feedback

    private func playHapticFeedback() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }
}

// MARK: - View Extension for Command Handler Integration

extension View {
    /// Integrate voice command handler with environment
    func withVoiceCommandHandler() -> some View {
        self.environmentObject(AppVoiceCommandHandler.shared)
    }
}
