//
//  VoiceConversationViewModelTests.swift
//  MirrorBuddyTests
//
//  Task 121.2: Unit tests for VoiceConversationViewModel
//  Tests session control, fallback mechanisms, state management
//

@testable import MirrorBuddy
import SwiftData
import XCTest

@MainActor
final class VoiceConversationViewModelTests: XCTestCase {
    var viewModel: VoiceConversationViewModel!
    var mockModelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([
            Material.self,
            Flashcard.self,
            MindMap.self,
            SubjectEntity.self,
            VoiceConversation.self,
            VoiceMessage.self
        ])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        mockModelContext = ModelContext(container)

        viewModel = VoiceConversationViewModel(modelContext: mockModelContext)
    }

    override func tearDown() async throws {
        viewModel = nil
        mockModelContext = nil
        try await super.tearDown()
    }

    // MARK: - Initialization Tests

    func testViewModelInitialization() {
        XCTAssertNotNil(viewModel)
        XCTAssertFalse(viewModel.isConversationActive)
        XCTAssertFalse(viewModel.isOfflineMode)
        XCTAssertTrue(viewModel.conversationHistory.isEmpty)
        XCTAssertEqual(viewModel.waveformAmplitudes.count, 20)
        XCTAssertFalse(viewModel.pulseAnimation)
        XCTAssertFalse(viewModel.isUserSpeaking)
        XCTAssertFalse(viewModel.showError)
        XCTAssertFalse(viewModel.showSettings)
    }

    func testViewModelInitializationWithModelContext() {
        let vm = VoiceConversationViewModel(modelContext: mockModelContext)
        XCTAssertNotNil(vm)
        XCTAssertFalse(vm.isConversationActive)
    }

    // MARK: - Configuration Tests

    func testConfigureWithModelContext() {
        let vm = VoiceConversationViewModel()
        vm.configure(modelContext: mockModelContext)

        // Configuration should succeed without errors
        XCTAssertNotNil(vm)
    }

    // MARK: - Session State Tests

    func testInitialSessionState() {
        XCTAssertFalse(viewModel.isConversationActive, "Conversation should not be active initially")
        XCTAssertFalse(viewModel.isOfflineMode, "Should not be in offline mode initially")
        XCTAssertFalse(viewModel.pulseAnimation, "Pulse animation should be off initially")
        XCTAssertFalse(viewModel.isUserSpeaking, "User should not be speaking initially")
    }

    // MARK: - Context Loading Tests

    func testContextLoadingWithNoData() {
        // With empty database, should fall back to default context
        viewModel.configure(modelContext: mockModelContext)

        // Default context should be loaded
        XCTAssertNotNil(viewModel.currentSubject)
        XCTAssertNotNil(viewModel.currentMaterial)
    }

    func testContextLoadingWithSubject() async throws {
        // Create a test subject (custom subject stores name in localizationKey)
        let subject = SubjectEntity(
            localizationKey: "Matematica",
            iconName: "book",
            colorName: "blue",
            sortOrder: 0,
            isActive: true,
            isCustom: true
        )
        mockModelContext.insert(subject)
        try mockModelContext.save()

        // Configure ViewModel
        viewModel.configure(modelContext: mockModelContext)

        // Should load the subject
        XCTAssertEqual(viewModel.currentSubject, "Matematica")
    }

    func testContextLoadingWithMaterial() async throws {
        // Create test subject and material
        let subject = SubjectEntity(
            localizationKey: "Fisica",
            iconName: "atom",
            colorName: "green",
            sortOrder: 1,
            isActive: true,
            isCustom: true
        )
        mockModelContext.insert(subject)

        let material = Material(
            title: "Meccanica",
            subject: subject,
            googleDriveFileID: nil
        )
        mockModelContext.insert(material)
        try mockModelContext.save()

        // Configure ViewModel
        viewModel.configure(modelContext: mockModelContext)

        // Should load the latest material
        XCTAssertEqual(viewModel.currentSubject, "Fisica")
        XCTAssertEqual(viewModel.currentMaterial, "Meccanica")
    }

    // MARK: - Conversation History Tests

    func testConversationHistoryInitiallyEmpty() {
        XCTAssertTrue(viewModel.conversationHistory.isEmpty)
    }

    // MARK: - Waveform State Tests

    func testWaveformAmplitudesInitialization() {
        XCTAssertEqual(viewModel.waveformAmplitudes.count, 20)

        // All amplitudes should be initialized to 0.3
        for amplitude in viewModel.waveformAmplitudes {
            XCTAssertEqual(amplitude, 0.3, accuracy: 0.01)
        }
    }

    // MARK: - Error State Tests

    func testErrorStateInitialization() {
        XCTAssertFalse(viewModel.showError)
        XCTAssertTrue(viewModel.errorMessage.isEmpty)
    }

    // MARK: - Settings Tests

    func testSettingsToggle() {
        XCTAssertFalse(viewModel.showSettings)

        viewModel.toggleSettings()
        XCTAssertTrue(viewModel.showSettings)

        viewModel.toggleSettings()
        XCTAssertFalse(viewModel.showSettings)
    }

    // MARK: - Offline Mode State Tests

    func testOfflineModeInitialState() {
        XCTAssertFalse(viewModel.isOfflineMode, "Should not be in offline mode initially")
    }

    // MARK: - Pulse Animation State Tests

    func testPulseAnimationInitialState() {
        XCTAssertFalse(viewModel.pulseAnimation)
    }

    // MARK: - User Speaking State Tests

    func testUserSpeakingInitialState() {
        XCTAssertFalse(viewModel.isUserSpeaking)
    }

    // MARK: - Conversation Loading Tests

    func testLoadConversationWithInvalidID() {
        let invalidID = UUID()

        // Should not crash when loading non-existent conversation
        viewModel.loadConversation(id: invalidID)

        // Should show error
        XCTAssertTrue(viewModel.showError)
        XCTAssertFalse(viewModel.errorMessage.isEmpty)
    }

    func testLoadConversationWithValidID() async throws {
        // Create a test conversation
        let subject = SubjectEntity(
            localizationKey: "Storia",
            iconName: "clock",
            colorName: "red",
            sortOrder: 2,
            isActive: true,
            isCustom: true
        )
        mockModelContext.insert(subject)

        let conversation = VoiceConversation(
            title: "Test Conversation",
            subject: subject,
            material: nil
        )
        mockModelContext.insert(conversation)
        try mockModelContext.save()

        // Load the conversation
        viewModel.loadConversation(id: conversation.id)

        // Should load without error
        XCTAssertFalse(viewModel.showError)
        XCTAssertEqual(viewModel.currentSubject, "Storia")
    }

    func testLoadConversationWithMessages() async throws {
        // Create conversation with messages
        let conversation = VoiceConversation(
            title: "Test Chat",
            subject: nil,
            material: nil
        )
        mockModelContext.insert(conversation)

        let message1 = VoiceMessage(
            content: "Hello",
            isFromUser: true,
            timestamp: Date(),
            audioData: nil
        )
        message1.conversation = conversation

        let message2 = VoiceMessage(
            content: "Hi there!",
            isFromUser: false,
            timestamp: Date(),
            audioData: nil
        )
        message2.conversation = conversation

        mockModelContext.insert(message1)
        mockModelContext.insert(message2)
        try mockModelContext.save()

        // Load conversation
        viewModel.loadConversation(id: conversation.id)

        // Should load messages
        XCTAssertEqual(viewModel.conversationHistory.count, 2)
        XCTAssertTrue(viewModel.conversationHistory[0].isFromUser)
        XCTAssertFalse(viewModel.conversationHistory[1].isFromUser)
    }

    // MARK: - Observable State Tests

    func testObservableStateChanges() {
        // Test that published properties can be modified
        viewModel.isConversationActive = true
        XCTAssertTrue(viewModel.isConversationActive)

        viewModel.isOfflineMode = true
        XCTAssertTrue(viewModel.isOfflineMode)

        viewModel.pulseAnimation = true
        XCTAssertTrue(viewModel.pulseAnimation)

        viewModel.isUserSpeaking = true
        XCTAssertTrue(viewModel.isUserSpeaking)

        viewModel.showError = true
        XCTAssertTrue(viewModel.showError)

        viewModel.showSettings = true
        XCTAssertTrue(viewModel.showSettings)
    }

    // MARK: - Multiple ViewModel Instances

    func testMultipleViewModelInstances() {
        let vm1 = VoiceConversationViewModel(modelContext: mockModelContext)
        let vm2 = VoiceConversationViewModel(modelContext: mockModelContext)

        // Each instance should have independent state
        vm1.isConversationActive = true
        vm2.isConversationActive = false

        XCTAssertTrue(vm1.isConversationActive)
        XCTAssertFalse(vm2.isConversationActive)
    }

    // MARK: - Memory Management Tests

    func testViewModelDeallocation() {
        var vm: VoiceConversationViewModel? = VoiceConversationViewModel(modelContext: mockModelContext)
        weak var weakVM = vm

        // Release the view model
        vm = nil

        // Weak reference should be nil after deallocation
        XCTAssertNil(weakVM, "ViewModel should be deallocated")
    }

    // MARK: - Context Property Tests

    func testCurrentSubjectProperty() {
        viewModel.currentSubject = "Test Subject"
        XCTAssertEqual(viewModel.currentSubject, "Test Subject")

        viewModel.currentSubject = nil
        XCTAssertNil(viewModel.currentSubject)
    }

    func testCurrentMaterialProperty() {
        viewModel.currentMaterial = "Test Material"
        XCTAssertEqual(viewModel.currentMaterial, "Test Material")

        viewModel.currentMaterial = nil
        XCTAssertNil(viewModel.currentMaterial)
    }

    // MARK: - Error Message Tests

    func testErrorMessageProperty() {
        XCTAssertTrue(viewModel.errorMessage.isEmpty)

        viewModel.errorMessage = "Test error"
        XCTAssertEqual(viewModel.errorMessage, "Test error")

        viewModel.errorMessage = ""
        XCTAssertTrue(viewModel.errorMessage.isEmpty)
    }

    // MARK: - Concurrency Tests

    func testMainActorIsolation() async {
        // ViewModel operations should be MainActor-isolated
        await MainActor.run {
            viewModel.toggleSettings()
            XCTAssertTrue(viewModel.showSettings)
        }
    }

    // MARK: - State Consistency Tests

    func testStateConsistencyAfterMultipleOperations() {
        // Perform multiple state changes
        viewModel.isConversationActive = true
        viewModel.isOfflineMode = false
        viewModel.pulseAnimation = true
        viewModel.isUserSpeaking = true

        // Verify all states are consistent
        XCTAssertTrue(viewModel.isConversationActive)
        XCTAssertFalse(viewModel.isOfflineMode)
        XCTAssertTrue(viewModel.pulseAnimation)
        XCTAssertTrue(viewModel.isUserSpeaking)

        // Reset states
        viewModel.isConversationActive = false
        viewModel.pulseAnimation = false
        viewModel.isUserSpeaking = false

        XCTAssertFalse(viewModel.isConversationActive)
        XCTAssertFalse(viewModel.pulseAnimation)
        XCTAssertFalse(viewModel.isUserSpeaking)
    }
}
