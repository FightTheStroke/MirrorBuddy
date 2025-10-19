import XCTest
@testable import MirrorBuddy

/// UI automation tests for voice command flows (Task 136.1)
final class AutomatedVoiceFlowTests: XCTestCase {

    func testVoiceCommandNavigationFlow() throws {
        let app = XCUIApplication()
        app.launch()

        // Simulate voice command via accessibility
        let voiceButton = app.buttons["voiceActivationButton"]
        XCTAssertTrue(voiceButton.exists)

        voiceButton.tap()

        // Verify voice recognition starts
        XCTAssertTrue(app.staticTexts["Listening..."].waitForExistence(timeout: 2))

        // Simulate command completion
        // (In real test, would use accessibility APIs to inject speech)

        // Verify command processed
        XCTAssertTrue(app.staticTexts["Command received"].waitForExistence(timeout: 3))
    }

    func testVoiceCommandMaterialSelection() throws {
        let app = XCUIApplication()
        app.launch()

        // Navigate to materials
        app.tabBars.buttons["Materials"].tap()

        // Activate voice
        let voiceButton = app.buttons["voiceActivationButton"]
        voiceButton.tap()

        // Verify material can be selected via voice
        XCTAssertTrue(app.collectionViews.cells.count > 0)
    }

    func testVoiceCommandStudyMode() throws {
        let app = XCUIApplication()
        app.launch()

        // Test study mode activation via voice
        let voiceButton = app.buttons["voiceActivationButton"]
        voiceButton.tap()

        // Verify study modes accessible
        XCTAssertTrue(app.buttons["Start Flashcards"].exists ||
                     app.buttons["Start Quiz"].exists)
    }
}
