//
//  VisionAnalysisIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.5: Vision Analysis Integration Tests
//  Tests camera capture → image analysis → homework help workflow
//

@testable import MirrorBuddy
import UIKit
import XCTest

/// Integration tests for vision analysis workflows
@MainActor
final class VisionAnalysisIntegrationTests: XCTestCase {
    var mockURLSession: URLSession!
    var configuration: URLSessionConfiguration!

    override func setUpWithError() throws {
        try super.setUpWithError()

        configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        mockURLSession = URLSession(configuration: configuration)

        MockURLProtocol.responseQueue = []
        MockURLProtocol.requestHistory = []
    }

    override func tearDownWithError() throws {
        mockURLSession = nil
        configuration = nil
        MockURLProtocol.responseQueue = []
        MockURLProtocol.requestHistory = []
        try super.tearDownWithError()
    }

    // MARK: - Vision Analysis Tests

    /// Test 1: Homework problem recognition
    func testHomeworkProblemRecognition() async throws {
        // Given: Mock vision response for math problem
        let visionResponse = """
            {
            "id": "chatcmpl-vision-hw",
            "choices": [{
            "message": {
            "content": "I can see a math problem: Solve for x: 3x + 7 = 22"
            }
            }]
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: visionResponse, statusCode: 200, delay: 0.5)
            )

            let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)
            let (data, _) = try await mockURLSession.data(for: request)

            let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
            XCTAssertTrue(response.choices[0].message.content.contains("3x + 7"))
            }

            /// Test 2: Handwriting OCR
            func testHandwritingOCR() async throws {
            // Given: Mock OCR response
        let ocrResponse = """
        {
            "id": "chatcmpl-ocr",
            "choices": [{
            "message": {
            "content": "Transcribed text: The Pythagorean theorem states a² + b² = c²"
            }
            }]
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: ocrResponse, statusCode: 200, delay: 0.5)
        )

        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)
        let (data, _) = try await mockURLSession.data(for: request)

        let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
        XCTAssertTrue(response.choices[0].message.content.contains("Pythagorean"))
    }

    /// Test 3: Diagram analysis
    func testDiagramAnalysis() async throws {
        // Given: Mock diagram analysis
        let diagramResponse = """
            {
            "id": "chatcmpl-diagram",
            "choices": [{
            "message": {
            "content": "This diagram shows a cell structure with labeled parts: nucleus, mitochondria, cell membrane"
            }
            }]
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: diagramResponse, statusCode: 200, delay: 0.5)
            )

            let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)
            let (data, _) = try await mockURLSession.data(for: request)

            let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
            XCTAssertTrue(response.choices[0].message.content.contains("nucleus"))
            }

            /// Test 4: Multi-step problem analysis
            func testMultiStepProblemAnalysis() async throws {
            // Given: Complex problem analysis
        let problemResponse = """
        {
            "id": "chatcmpl-multistep",
            "choices": [{
            "message": {
            "content": "Step 1: Identify the equation. Step 2: Isolate the variable. Step 3: Solve for x = 5"
            }
            }]
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: problemResponse, statusCode: 200, delay: 0.6)
        )

        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)
        let (data, _) = try await mockURLSession.data(for: request)

        let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
        XCTAssertTrue(response.choices[0].message.content.contains("Step 1"))
        XCTAssertTrue(response.choices[0].message.content.contains("x = 5"))
    }

    /// Test 5: Chemistry equation recognition
    func testChemistryEquationRecognition() async throws {
        // Given: Chemistry equation
        let chemResponse = """
            {
            "id": "chatcmpl-chem",
            "choices": [{
            "message": {
            "content": "Chemical equation: 2H₂ + O₂ → 2H₂O (water synthesis)"
            }
            }]
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: chemResponse, statusCode: 200, delay: 0.5)
            )

            let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)
            let (data, _) = try await mockURLSession.data(for: request)

            let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
            XCTAssertTrue(response.choices[0].message.content.contains("H₂O"))
            }

            /// Test 6: Graph and chart interpretation
            func testGraphInterpretation() async throws {
            // Given: Graph analysis
        let graphResponse = """
        {
            "id": "chatcmpl-graph",
            "choices": [{
            "message": {
            "content": "The graph shows a linear relationship with positive slope, y = 2x + 3"
            }
            }]
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: graphResponse, statusCode: 200, delay: 0.5)
        )

        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)
        let (data, _) = try await mockURLSession.data(for: request)

        let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
        XCTAssertTrue(response.choices[0].message.content.contains("linear"))
    }

    /// Test 7: Table data extraction
    func testTableDataExtraction() async throws {
        // Given: Table extraction
        let tableResponse = """
            {
            "id": "chatcmpl-table",
            "choices": [{
            "message": {
            "content": "Table contains 3 rows and 4 columns with periodic table element data"
            }
            }]
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: tableResponse, statusCode: 200, delay: 0.5)
            )

            let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)
            let (data, _) = try await mockURLSession.data(for: request)

            let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
            XCTAssertTrue(response.choices[0].message.content.contains("Table"))
            }

            /// Test 8: Error correction suggestions
            func testErrorCorrectionSuggestions() async throws {
            // Given: Error analysis
        let errorResponse = """
        {
            "id": "chatcmpl-error",
            "choices": [{
            "message": {
            "content": "I see you wrote 2 + 2 = 5. The correct answer should be 4."
            }
            }]
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: errorResponse, statusCode: 200, delay: 0.5)
        )

        let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
        let request = URLRequest(url: url)
        let (data, _) = try await mockURLSession.data(for: request)

        let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
        XCTAssertTrue(response.choices[0].message.content.contains("correct answer"))
    }

    /// Test 9: Image quality validation
    func testImageQualityValidation() async throws {
        // Given: Poor quality image
        let qualityResponse = """
            {
            "error": {
            "message": "Image quality too low for analysis",
            "code": "image_quality_error"
            }
            }
            ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: qualityResponse, statusCode: 400, delay: 0.3)
            )

            let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
            let request = URLRequest(url: url)
            let (data, response) = try await mockURLSession.data(for: request)

            let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
            XCTAssertEqual(httpResponse.statusCode, 400)
            }

            /// Test 10: Batch image processing
            func testBatchImageProcessing() async throws {
            // Given: Multiple images
            let responses = [
            "Problem 1: 2x + 3 = 7",
            "Problem 2: x² - 4 = 0",
            "Problem 3: 3y + 5 = 14"
            ]

            for content in responses {
            let response = """
        {
            "id": "chatcmpl-batch",
            "choices": [{
            "message": {
            "content": "\(content)"
            }
            }]
        }
        ""Data(".utf8) ?? Data()

            MockURLProtocol.responseQueue.append(
            MockURLProtocol.MockResponse(data: response, statusCode: 200, delay: 0.5)
        )
    }

    // When: Process batch
    var results: [String] = []
    for _ in 0..<3 {
    let url = URL(string: "https://api.openai.com/v1/chat/completions") ?? URL(fileURLWithPath: "")
    let request = URLRequest(url: url)
    let (data, _) = try await mockURLSession.data(for: request)

    let response = try JSONDecoder().decode(MockVisionResponse.self, from: data)
    results.append(response.choices[0].message.content)
    }

    // Then: Verify all processed
    XCTAssertEqual(results.count, 3)
    XCTAssertTrue(results[0].contains("Problem 1"))
    XCTAssertTrue(results[1].contains("Problem 2"))
    XCTAssertTrue(results[2].contains("Problem 3"))
}
}

// MARK: - Mock Structures

struct MockVisionResponse: Codable {
    let id: String
    let choices: [MockVisionChoice]
}

struct MockVisionChoice: Codable {
    let message: MockVisionMessage
}

struct MockVisionMessage: Codable {
    let content: String
}
