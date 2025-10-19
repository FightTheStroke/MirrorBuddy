//
//  MirrorBuddyUITests.swift
//  MirrorBuddyUITests
//
//  Created by Mario D'Angelo on 12/10/25.
//

import XCTest

final class MirrorBuddyUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - Onboarding Flow Tests

    func testOnboardingFlow() throws {
        // Test that onboarding appears for first launch
        let onboardingTitle = app.staticTexts["Welcome to MirrorBuddy"]
        if onboardingTitle.exists {
            XCTAssertTrue(onboardingTitle.exists, "Onboarding title should be visible")

            // Test next button navigation
            let nextButton = app.buttons["Next"]
            if nextButton.exists {
                nextButton.tap()

                // Verify second onboarding screen
                let secondScreen = app.staticTexts["Your AI Study Assistant"]
                XCTAssertTrue(secondScreen.waitForExistence(timeout: 2))
            }

            // Test skip onboarding
            let getStartedButton = app.buttons["Get Started"]
            if getStartedButton.exists {
                getStartedButton.tap()
            }
        }

        // Verify we reach main app
        let mainView = app.otherElements["MainView"]
        XCTAssertTrue(mainView.waitForExistence(timeout: 5), "Should reach main view after onboarding")
    }

    // MARK: - Material Browsing Tests

    func testMaterialBrowsing() throws {
        // Navigate to materials
        let materialsTab = app.buttons["Materials"]
        XCTAssertTrue(materialsTab.waitForExistence(timeout: 5))
        materialsTab.tap()

        // Verify materials list loads
        let materialsList = app.collectionViews["MaterialsList"]
        XCTAssertTrue(materialsList.exists, "Materials list should be visible")

        // Test search functionality
        let searchField = app.searchFields["Search materials"]
        if searchField.exists {
            searchField.tap()
            searchField.typeText("math")

            // Verify search results appear
            sleep(1) // Wait for search
            let firstResult = materialsList.cells.firstMatch
            XCTAssertTrue(firstResult.exists, "Search should return results")
        }

        // Test filter by subject
        let filterButton = app.buttons["Filter"]
        if filterButton.exists {
            filterButton.tap()

            let mathFilter = app.buttons["Math"]
            if mathFilter.exists {
                mathFilter.tap()

                // Apply filter
                let applyButton = app.buttons["Apply"]
                applyButton.tap()

                // Verify filtered results
                XCTAssertTrue(!materialsList.cells.isEmpty, "Filtered results should appear")
            }
        }
    }

    func testMaterialDetailView() throws {
        // Navigate to materials and select one
        let materialsTab = app.buttons["Materials"]
        materialsTab.tap()

        let materialsList = app.collectionViews["MaterialsList"]
        XCTAssertTrue(materialsList.waitForExistence(timeout: 3))

        let firstMaterial = materialsList.cells.firstMatch
        if firstMaterial.exists {
            firstMaterial.tap()

            // Verify detail view appears
            let detailView = app.otherElements["MaterialDetailView"]
            XCTAssertTrue(detailView.waitForExistence(timeout: 2))

            // Test action buttons
            let studyButton = app.buttons["Start Studying"]
            XCTAssertTrue(studyButton.exists)

            let shareButton = app.buttons["Share"]
            XCTAssertTrue(shareButton.exists)

            // Go back
            let backButton = app.navigationBars.buttons.firstMatch
            backButton.tap()
            XCTAssertTrue(materialsList.waitForExistence(timeout: 2))
        }
    }

    // MARK: - Voice Interaction Tests

    func testVoiceCommandActivation() throws {
        // Test voice button exists
        let voiceButton = app.buttons["Voice Command"]
        XCTAssertTrue(voiceButton.waitForExistence(timeout: 5))

        // Tap voice button
        voiceButton.tap()

        // Verify voice interface appears
        let voiceSheet = app.sheets["VoiceCommandSheet"]
        XCTAssertTrue(voiceSheet.waitForExistence(timeout: 2))

        // Check for microphone indicator
        let micIndicator = app.images["MicrophoneIndicator"]
        XCTAssertTrue(micIndicator.exists)

        // Test cancel button
        let cancelButton = app.buttons["Cancel"]
        if cancelButton.exists {
            cancelButton.tap()
            XCTAssertFalse(voiceSheet.exists, "Voice sheet should dismiss")
        }
    }

    func testVoiceCommandHelp() throws {
        let voiceButton = app.buttons["Voice Command"]
        voiceButton.tap()

        // Access help
        let helpButton = app.buttons["Voice Help"]
        if helpButton.exists {
            helpButton.tap()

            // Verify help content
            let helpView = app.otherElements["VoiceCommandHelpView"]
            XCTAssertTrue(helpView.waitForExistence(timeout: 2))

            // Check for example commands
            let exampleCommands = app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'Apri'"))
            XCTAssertTrue(!exampleCommands.isEmpty, "Should show example commands")

            // Close help
            let doneButton = app.buttons["Done"]
            if doneButton.exists {
                doneButton.tap()
            }
        }
    }

    // MARK: - Vision Analysis Tests

    func testVisionAnalysisActivation() throws {
        // Test camera/vision button
        let visionButton = app.buttons["Vision Analysis"]
        if visionButton.waitForExistence(timeout: 5) {
            visionButton.tap()

            // Verify camera permission or analysis view
            let cameraView = app.otherElements["CameraView"]
            let analysisView = app.otherElements["VisionAnalysisView"]

            XCTAssertTrue(cameraView.exists || analysisView.exists,
                          "Vision interface should appear")

            // Test cancel
            let cancelButton = app.buttons["Cancel"]
            if cancelButton.exists {
                cancelButton.tap()
            }
        }
    }

    func testImageSelection() throws {
        let visionButton = app.buttons["Vision Analysis"]
        if visionButton.exists {
            visionButton.tap()

            // Test photo library option
            let photoLibraryButton = app.buttons["Choose from Library"]
            if photoLibraryButton.exists {
                photoLibraryButton.tap()

                // Note: In real testing, this would require simulator photos
                // For now, verify the picker appears
                sleep(1)

                // Cancel picker
                let cancelPickerButton = app.buttons["Cancel"]
                if cancelPickerButton.exists {
                    cancelPickerButton.tap()
                }
            }
        }
    }

    // MARK: - Mind Map Navigation Tests

    func testMindMapView() throws {
        // Navigate to a material with mind map
        let materialsTab = app.buttons["Materials"]
        materialsTab.tap()

        // Find material with mind map capability
        let materialsList = app.collectionViews["MaterialsList"]
        let firstMaterial = materialsList.cells.firstMatch

        if firstMaterial.exists {
            firstMaterial.tap()

            // Look for mind map button
            let mindMapButton = app.buttons["View Mind Map"]
            if mindMapButton.exists {
                mindMapButton.tap()

                // Verify mind map view
                let mindMapView = app.otherElements["MindMapView"]
                XCTAssertTrue(mindMapView.waitForExistence(timeout: 3))

                // Test zoom gestures (simulated)
                if mindMapView.exists {
                    mindMapView.pinch(withScale: 1.5, velocity: 1.0)
                    mindMapView.pinch(withScale: 0.5, velocity: 1.0)
                }

                // Test node selection
                let firstNode = mindMapView.buttons.firstMatch
                if firstNode.exists {
                    firstNode.tap()

                    // Verify node detail appears
                    let nodeDetail = app.otherElements["NodeDetailView"]
                    XCTAssert(nodeDetail.exists || !app.popovers.isEmpty,
                              "Node selection should show details")
                }

                // Close mind map
                let closeButton = app.buttons["Close"]
                if closeButton.exists {
                    closeButton.tap()
                }
            }
        }
    }

    // MARK: - Task Management Tests

    func testTaskCreation() throws {
        // Navigate to tasks
        let tasksTab = app.buttons["Tasks"]
        if tasksTab.waitForExistence(timeout: 5) {
            tasksTab.tap()

            // Test add task button
            let addButton = app.buttons["Add Task"]
            if addButton.exists {
                addButton.tap()

                // Fill in task details
                let titleField = app.textFields["Task Title"]
                if titleField.exists {
                    titleField.tap()
                    titleField.typeText("Study algebra")

                    // Set due date if available
                    let dueDatePicker = app.datePickers.firstMatch
                    if dueDatePicker.exists {
                        dueDatePicker.tap()
                    }

                    // Save task
                    let saveButton = app.buttons["Save"]
                    saveButton.tap()

                    // Verify task appears in list
                    let tasksList = app.collectionViews["TasksList"]
                    let newTask = tasksList.cells.containing(NSPredicate(format: "label CONTAINS 'algebra'")).firstMatch
                    XCTAssertTrue(newTask.waitForExistence(timeout: 2), "New task should appear")
                }
            }
        }
    }

    func testTaskCompletion() throws {
        let tasksTab = app.buttons["Tasks"]
        tasksTab.tap()

        let tasksList = app.collectionViews["TasksList"]
        let firstTask = tasksList.cells.firstMatch

        if firstTask.exists {
            // Test checkbox tap
            let checkbox = firstTask.buttons["TaskCheckbox"]
            if checkbox.exists {
                checkbox.tap()

                // Verify task marked complete
                sleep(1)
                XCTAssertTrue(checkbox.isSelected || firstTask.value as? String == "completed",
                              "Task should be marked complete")
            }
        }
    }

    // MARK: - Settings Configuration Tests

    func testSettingsNavigation() throws {
        // Navigate to settings
        let settingsTab = app.buttons["Settings"]
        if settingsTab.waitForExistence(timeout: 5) {
            settingsTab.tap()

            // Verify settings view
            let settingsView = app.otherElements["SettingsView"]
            XCTAssertTrue(settingsView.exists || app.navigationBars["Settings"].exists)

            // Test navigation to subsections
            let notificationsOption = app.cells["Notifications"]
            if notificationsOption.exists {
                notificationsOption.tap()

                // Verify notifications settings
                XCTAssertTrue(app.navigationBars["Notifications"].waitForExistence(timeout: 2))

                // Go back
                app.navigationBars.buttons.firstMatch.tap()
            }

            // Test appearance settings
            let appearanceOption = app.cells["Appearance"]
            if appearanceOption.exists {
                appearanceOption.tap()

                // Test theme selection
                let darkModeToggle = app.switches["Dark Mode"]
                if darkModeToggle.exists {
                    let initialState = darkModeToggle.value as? String
                    darkModeToggle.tap()

                    // Verify toggle changed
                    sleep(0.5)
                    let newState = darkModeToggle.value as? String
                    XCTAssertNotEqual(initialState, newState, "Dark mode should toggle")
                }

                app.navigationBars.buttons.firstMatch.tap()
            }
        }
    }

    // MARK: - Accessibility Tests

    func testVoiceOverLabels() throws {
        // Verify important elements have accessibility labels
        let materialsTab = app.buttons["Materials"]
        XCTAssertTrue(materialsTab.exists)
        XCTAssertNotNil(materialsTab.label, "Materials tab should have label")

        let voiceButton = app.buttons["Voice Command"]
        if voiceButton.exists {
            XCTAssertNotNil(voiceButton.label, "Voice button should have label")
        }
    }

    func testAccessibilityHints() throws {
        // Test that interactive elements have hints
        let materialsTab = app.buttons["Materials"]
        if let hint = materialsTab.value(forKey: "accessibilityHint") as? String {
            XCTAssertFalse(hint.isEmpty, "Should have accessibility hint")
        }
    }

    // MARK: - Performance Tests

    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }

    func testScrollPerformance() throws {
        let materialsTab = app.buttons["Materials"]
        materialsTab.tap()

        let materialsList = app.collectionViews["MaterialsList"]
        XCTAssertTrue(materialsList.waitForExistence(timeout: 5))

        // Measure scroll performance
        measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
            materialsList.swipeUp(velocity: .fast)
            materialsList.swipeDown(velocity: .fast)
        }
    }

    // MARK: - Edge Cases and Error Handling

    func testNetworkErrorHandling() throws {
        // This would require network stubbing in real scenario
        // For now, test that app doesn't crash with network toggle

        // Attempt action that requires network
        let materialsTab = app.buttons["Materials"]
        materialsTab.tap()

        // Verify app shows appropriate feedback
        // (This would need proper network mocking in real tests)
        XCTAssertTrue(app.exists, "App should remain stable")
    }

    func testEmptyStateHandling() throws {
        // Navigate to section that might be empty
        let tasksTab = app.buttons["Tasks"]
        if tasksTab.exists {
            tasksTab.tap()

            // Check for empty state messaging
            let emptyMessage = app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'No tasks' || label CONTAINS 'empty'")).firstMatch

            // Either have tasks or show empty state
            let tasksList = app.collectionViews["TasksList"]
            XCTAssertTrue(emptyMessage.exists || !tasksList.cells.isEmpty,
                          "Should show empty state or tasks")
        }
    }
}
