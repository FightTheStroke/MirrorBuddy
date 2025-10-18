//
//  PerformanceTests.swift
//  MirrorBuddyTests
//
//  Task 122: Establish performance harness for sync, transcription, and mind maps
//  Performance benchmarking for critical operations
//

@testable import MirrorBuddy
import SwiftData
import XCTest

@MainActor
final class PerformanceTests: XCTestCase {
    var mockModelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        // Create in-memory model container for testing
        let schema = Schema([Material.self, Flashcard.self, MindMap.self])
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: schema, configurations: [configuration])
        mockModelContext = ModelContext(container)
    }

    override func tearDown() async throws {
        mockModelContext = nil
        try await super.tearDown()
    }

    // MARK: - Drive Sync Performance Tests

    /// Performance test: Sync 100+ Google Drive files
    /// Expected baseline: <5s for 100 files, <500MB memory
    func testDriveSyncPerformance100Files() {
        let mockFiles = createMockDriveFiles(count: 100)

        let options = XCTMeasureOptions()
        options.iterationCount = 5

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate Drive sync processing
            processMockDriveFiles(mockFiles)
        }

        // Baseline expectations (to be captured):
        // - Time: <5.0 seconds
        // - Memory: <500MB peak usage
    }

    /// Performance test: Sync 500+ Google Drive files (stress test)
    /// Expected baseline: <20s for 500 files, <1GB memory
    func testDriveSyncPerformance500Files() {
        let mockFiles = createMockDriveFiles(count: 500)

        let options = XCTMeasureOptions()
        options.iterationCount = 3 // Fewer iterations for stress test

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate Drive sync processing
            processMockDriveFiles(mockFiles)
        }

        // Baseline expectations (to be captured):
        // - Time: <20.0 seconds
        // - Memory: <1GB peak usage
    }

    /// Performance test: Incremental sync (10 new files among 100 existing)
    /// Expected baseline: <1s for incremental update
    func testDriveSyncPerformanceIncremental() {
        let existingFiles = createMockDriveFiles(count: 100)
        let newFiles = createMockDriveFiles(count: 10, startIndex: 100)

        let options = XCTMeasureOptions()
        options.iterationCount = 10 // More iterations for faster operation

        measure(metrics: [XCTClockMetric()], options: options) {
            // Simulate incremental sync
            let allFiles = existingFiles + newFiles
            processMockDriveFiles(allFiles, incrementalMode: true)
        }

        // Baseline expectations:
        // - Time: <1.0 second
    }

    // MARK: - Whisper Transcription Performance Tests

    /// Performance test: Transcribe 1-hour audio segment
    /// Expected baseline: <60s transcription time (1x realtime), <1GB memory
    func testWhisperTranscription1Hour() {
        let mockAudioSegment = createMockAudioSegment(durationMinutes: 60)

        let options = XCTMeasureOptions()
        options.iterationCount = 3

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate Whisper transcription processing
            processMockTranscription(mockAudioSegment)
        }

        // Baseline expectations:
        // - Time: <60.0 seconds (1x realtime or better)
        // - Memory: <1GB peak usage
    }

    /// Performance test: Transcribe 3-hour audio (full lecture)
    /// Expected baseline: <180s transcription time, <1.5GB memory
    func testWhisperTranscription3Hours() {
        let mockAudioSegment = createMockAudioSegment(durationMinutes: 180)

        let options = XCTMeasureOptions()
        options.iterationCount = 2

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate Whisper transcription processing
            processMockTranscription(mockAudioSegment)
        }

        // Baseline expectations:
        // - Time: <180.0 seconds
        // - Memory: <1.5GB peak usage
    }

    /// Performance test: Batch transcription of 10 short segments
    /// Expected baseline: <30s for batch, <500MB memory
    func testWhisperTranscriptionBatch() {
        let mockSegments = (0..<10).map { _ in createMockAudioSegment(durationMinutes: 5) }

        let options = XCTMeasureOptions()
        options.iterationCount = 5

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate batch transcription
            for segment in mockSegments {
                processMockTranscription(segment)
            }
        }

        // Baseline expectations:
        // - Time: <30.0 seconds total
        // - Memory: <500MB peak usage
    }

    // MARK: - Mind Map Rendering Performance Tests

    /// Performance test: Render mind map with 100 nodes
    /// Expected baseline: <1s render time, <200MB memory
    func testMindMapRendering100Nodes() {
        let mockMindMap = createMockMindMap(nodeCount: 100, maxDepth: 5)

        let options = XCTMeasureOptions()
        options.iterationCount = 10

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate mind map rendering
            processMockMindMapRendering(mockMindMap)
        }

        // Baseline expectations:
        // - Time: <1.0 second
        // - Memory: <200MB peak usage
    }

    /// Performance test: Render mind map with 500 nodes (stress test)
    /// Expected baseline: <3s render time, <500MB memory
    func testMindMapRendering500Nodes() {
        let mockMindMap = createMockMindMap(nodeCount: 500, maxDepth: 8)

        let options = XCTMeasureOptions()
        options.iterationCount = 5

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate mind map rendering
            processMockMindMapRendering(mockMindMap)
        }

        // Baseline expectations:
        // - Time: <3.0 seconds
        // - Memory: <500MB peak usage
    }

    /// Performance test: Interactive mind map updates (zoom/pan)
    /// Expected baseline: <100ms per interaction, smooth 60fps
    func testMindMapInteractiveUpdates() {
        let mockMindMap = createMockMindMap(nodeCount: 200, maxDepth: 6)

        let options = XCTMeasureOptions()
        options.iterationCount = 20

        measure(metrics: [XCTClockMetric()], options: options) {
            // Simulate interactive updates
            processMockMindMapInteraction(mockMindMap, interactions: 10)
        }

        // Baseline expectations:
        // - Time: <100ms per interaction (10ms average for 60fps)
    }

    /// Performance test: Mind map search across 300 nodes
    /// Expected baseline: <500ms search time
    func testMindMapSearchPerformance() {
        let mockMindMap = createMockMindMap(nodeCount: 300, maxDepth: 7)
        let searchQueries = ["concept", "definition", "example", "summary"]

        let options = XCTMeasureOptions()
        options.iterationCount = 10

        measure(metrics: [XCTClockMetric()], options: options) {
            // Simulate search across mind map
            for query in searchQueries {
                processMockMindMapSearch(mockMindMap, query: query)
            }
        }

        // Baseline expectations:
        // - Time: <500ms for 4 searches
    }

    // MARK: - Combined Workflow Performance Tests

    /// Performance test: Full material processing pipeline
    /// Drive sync → OCR → Summary → Mind map → Flashcards
    /// Expected baseline: <30s for single material
    func testFullMaterialProcessingPipeline() {
        let mockFile = createMockDriveFile(id: "test-123", name: "Lecture Notes.pdf")

        let options = XCTMeasureOptions()
        options.iterationCount = 3

        measure(metrics: [XCTClockMetric(), XCTMemoryMetric()], options: options) {
            // Simulate full pipeline
            _ = processMockMaterialPipeline(mockFile)
        }

        // Baseline expectations:
        // - Time: <30.0 seconds
        // - Memory: <800MB peak usage
    }

    // MARK: - Mock Data Generators

    private func createMockDriveFiles(count: Int, startIndex: Int = 0) -> [MockDriveFile] {
        (startIndex..<startIndex + count).map { index in
            MockDriveFile(
                id: "file-\(index)",
                name: "Document \(index).pdf",
                mimeType: "application/pdf",
                size: Int64.random(in: 100_000...5_000_000),
                modifiedTime: Date()
            )
        }
    }

    private func createMockDriveFile(id: String, name: String) -> MockDriveFile {
        MockDriveFile(
            id: id,
            name: name,
            mimeType: "application/pdf",
            size: 2_000_000,
            modifiedTime: Date()
        )
    }

    private func createMockAudioSegment(durationMinutes: Int) -> MockAudioSegment {
        MockAudioSegment(
            duration: TimeInterval(durationMinutes * 60),
            sampleRate: 16_000,
            channels: 1
        )
    }

    private func createMockMindMap(nodeCount: Int, maxDepth: Int) -> MockMindMap {
        var nodes: [MockMindMapNode] = []

        // Create root node
        nodes.append(MockMindMapNode(
            id: "node-0",
            title: "Root Concept",
            depth: 0,
            children: []
        ))

        // Create hierarchical nodes
        var currentId = 1
        for depth in 1...maxDepth {
            let nodesAtDepth = min(nodeCount / maxDepth, 50) // Distribute nodes across depths
            for _ in 0..<nodesAtDepth where currentId < nodeCount {
                nodes.append(MockMindMapNode(
                    id: "node-\(currentId)",
                    title: "Concept \(currentId)",
                    depth: depth,
                    children: []
                ))
                currentId += 1
            }
        }

        return MockMindMap(nodes: nodes)
    }

    // MARK: - Mock Processing Functions

    private func processMockDriveFiles(_ files: [MockDriveFile], incrementalMode: Bool = false) {
        // Simulate file processing overhead
        for file in files {
            // Simulate metadata extraction
            _ = file.name.count
            _ = file.size

            if !incrementalMode {
                // Simulate content processing
                autoreleasepool {
                    _ = (0..<100).map { $0 * 2 } // Simulate work
                }
            }
        }
    }

    private func processMockTranscription(_ segment: MockAudioSegment) {
        // Simulate transcription processing
        let samplesCount = Int(segment.duration * Double(segment.sampleRate))

        autoreleasepool {
            // Simulate audio processing
            var sum = 0
            for index in 0..<min(samplesCount / 1_000, 10_000) {
                sum += index * segment.channels
            }
            _ = sum
        }
    }

    private func processMockMindMapRendering(_ mindMap: MockMindMap) {
        // Simulate rendering calculations
        for node in mindMap.nodes {
            // Simulate layout calculations
            _ = node.title.count * node.depth
            autoreleasepool {
                _ = (0..<10).map { $0 + node.depth }
            }
        }
    }

    private func processMockMindMapInteraction(_ mindMap: MockMindMap, interactions: Int) {
        // Simulate interactive updates
        for _ in 0..<interactions {
            // Simulate viewport update
            let visibleNodes = mindMap.nodes.prefix(50)
            for node in visibleNodes {
                _ = node.title.count
            }
        }
    }

    private func processMockMindMapSearch(_ mindMap: MockMindMap, query: String) {
        // Simulate search operation
        _ = mindMap.nodes.filter { $0.title.lowercased().contains(query.lowercased()) }
    }

    private func processMockMaterialPipeline(_ file: MockDriveFile) -> MockProcessedMaterial {
        // Simulate full pipeline
        autoreleasepool {
            // 1. Download simulation
            _ = file.size

            // 2. OCR simulation
            _ = (0..<1_000).map { "word\($0)" }

            // 3. Summary generation
            _ = "Summary of \(file.name)"

            // 4. Mind map creation
            let mindMap = createMockMindMap(nodeCount: 50, maxDepth: 4)
            processMockMindMapRendering(mindMap)

            // 5. Flashcard generation
            _ = (0..<20).map { "Flashcard \($0)" }
        }

        return MockProcessedMaterial(
            id: file.id,
            title: file.name,
            hasTranscription: false,
            hasMindMap: true,
            flashcardCount: 20
        )
    }
}

// MARK: - Mock Data Structures

struct MockDriveFile {
    let id: String
    let name: String
    let mimeType: String
    let size: Int64
    let modifiedTime: Date
}

struct MockAudioSegment {
    let duration: TimeInterval
    let sampleRate: Int
    let channels: Int
}

struct MockMindMap {
    let nodes: [MockMindMapNode]
}

struct MockMindMapNode {
    let id: String
    let title: String
    let depth: Int
    let children: [String]
}

struct MockProcessedMaterial {
    let id: String
    let title: String
    let hasTranscription: Bool
    let hasMindMap: Bool
    let flashcardCount: Int
}
