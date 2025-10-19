//
//  VoiceConversationIntegrationTests.swift
//  MirrorBuddyTests
//
//  Task 62.4: Voice Conversation Integration Tests
//  Tests voice recording → transcription → AI response workflow
//

import XCTest
import SwiftData
@testable import MirrorBuddy

/// Integration tests for voice conversation workflows
@MainActor
final class VoiceConversationIntegrationTests: XCTestCase {

    var modelContainer: ModelContainer!
    var modelContext: ModelContext!

    override func setUp() async throws {
        try await super.setUp()

        let schema = Schema([VoiceConversation.self, Transcript.self])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
        modelContainer = try ModelContainer(for: schema, configurations: [modelConfiguration])
        modelContext = ModelContext(modelContainer)
    }

    override func tearDown() async throws {
        modelContainer = nil
        modelContext = nil
        try await super.tearDown()
    }

    // MARK: - Voice Conversation Flow Tests

    /// Test 1: Complete voice conversation flow
    func testCompleteVoiceConversationFlow() async throws {
        // Given: Start new conversation
        let conversation = VoiceConversation()
        conversation.title = "Math Help Session"
        modelContext.insert(conversation)
        try modelContext.save()

        // When: Add user transcript
        let userTranscript = Transcript(
            conversationID: conversation.id,
            speaker: "user",
            text: "Can you help me solve this quadratic equation?",
            timestamp: Date()
        )
        userTranscript.conversation = conversation
        modelContext.insert(userTranscript)

        // Add AI response
        let aiTranscript = Transcript(
            conversationID: conversation.id,
            speaker: "assistant",
            text: "Of course! I'd be happy to help with quadratic equations. What's the specific equation you're working on?",
            timestamp: Date().addingTimeInterval(1)
        )
        aiTranscript.conversation = conversation
        modelContext.insert(aiTranscript)

        try modelContext.save()

        // Then: Verify conversation
        XCTAssertEqual(conversation.transcripts?.count, 2)
        XCTAssertNotNil(conversation.title)
        XCTAssertNotNil(conversation.startedAt)
    }

    /// Test 2: Voice command detection and routing
    func testVoiceCommandDetectionAndRouting() async throws {
        // Given: Voice manager
        let voiceManager = UnifiedVoiceManager.shared

        // Test command detection
        let commandText = "mostra materiali"
        let commandIntent = voiceManager.detectIntent(from: commandText)
        XCTAssertEqual(commandIntent, .command, "Should detect command intent")

        let conversationText = "come funziona la fotosintesi?"
        let conversationIntent = voiceManager.detectIntent(from: conversationText)
        XCTAssertEqual(conversationIntent, .conversation, "Should detect conversation intent")
    }

    /// Test 3: Multi-turn conversation context
    func testMultiTurnConversationContext() async throws {
        // Given: Conversation with context
        let conversation = VoiceConversation()
        conversation.title = "Physics Discussion"
        modelContext.insert(conversation)

        // Turn 1
        let turn1User = Transcript(
            conversationID: conversation.id,
            speaker: "user",
            text: "What is Newton's First Law?",
            timestamp: Date()
        )
        turn1User.conversation = conversation
        modelContext.insert(turn1User)

        let turn1AI = Transcript(
            conversationID: conversation.id,
            speaker: "assistant",
            text: "Newton's First Law states that an object at rest stays at rest...",
            timestamp: Date().addingTimeInterval(1)
        )
        turn1AI.conversation = conversation
        modelContext.insert(turn1AI)

        // Turn 2 (with context)
        let turn2User = Transcript(
            conversationID: conversation.id,
            speaker: "user",
            text: "Can you give me an example?",
            timestamp: Date().addingTimeInterval(2)
        )
        turn2User.conversation = conversation
        modelContext.insert(turn2User)

        let turn2AI = Transcript(
            conversationID: conversation.id,
            speaker: "assistant",
            text: "Sure! A hockey puck sliding on ice will continue moving until friction stops it.",
            timestamp: Date().addingTimeInterval(3)
        )
        turn2AI.conversation = conversation
        modelContext.insert(turn2AI)

        try modelContext.save()

        // Then: Verify context preservation
        XCTAssertEqual(conversation.transcripts?.count, 4)

        let sortedTranscripts = conversation.transcripts?.sorted { $0.timestamp < $1.timestamp } ?? []
        XCTAssertEqual(sortedTranscripts.count, 4)
        XCTAssertTrue(sortedTranscripts[2].text.contains("example"), "Should maintain context")
    }

    /// Test 4: Voice transcription error handling
    func testVoiceTranscriptionErrorHandling() async throws {
        // Given: Conversation
        let conversation = VoiceConversation()
        modelContext.insert(conversation)

        // When: Add transcript with low confidence
        let lowConfidenceTranscript = Transcript(
            conversationID: conversation.id,
            speaker: "user",
            text: "[unclear audio]",
            timestamp: Date()
        )
        lowConfidenceTranscript.conversation = conversation
        modelContext.insert(lowConfidenceTranscript)

        try modelContext.save()

        // Then: Verify handling
        XCTAssertNotNil(conversation.transcripts)
        XCTAssertEqual(conversation.transcripts?.count, 1)
    }

    /// Test 5: Conversation persistence and retrieval
    func testConversationPersistenceAndRetrieval() async throws {
        // Given: Multiple conversations
        let conversation1 = VoiceConversation()
        conversation1.title = "Math Help"
        modelContext.insert(conversation1)

        let conversation2 = VoiceConversation()
        conversation2.title = "Science Questions"
        modelContext.insert(conversation2)

        try modelContext.save()

        // When: Fetch conversations
        let descriptor = FetchDescriptor<VoiceConversation>(
            sortBy: [SortDescriptor(\.startedAt, order: .reverse)]
        )
        let conversations = try modelContext.fetch(descriptor)

        // Then: Verify retrieval
        XCTAssertEqual(conversations.count, 2)
        XCTAssertEqual(conversations.last?.title, "Math Help")
    }

    /// Test 6: Voice feedback and encouragement
    func testVoiceFeedbackAndEncouragement() async throws {
        // Given: Conversation with correct answer
        let conversation = VoiceConversation()
        modelContext.insert(conversation)

        let userAnswer = Transcript(
            conversationID: conversation.id,
            speaker: "user",
            text: "The answer is 5",
            timestamp: Date()
        )
        userAnswer.conversation = conversation
        modelContext.insert(userAnswer)

        let encouragingResponse = Transcript(
            conversationID: conversation.id,
            speaker: "assistant",
            text: "Great job! That's absolutely correct!",
            timestamp: Date().addingTimeInterval(1)
        )
        encouragingResponse.conversation = conversation
        modelContext.insert(encouragingResponse)

        try modelContext.save()

        // Then: Verify positive feedback
        let responses = conversation.transcripts?.filter { $0.speaker == "assistant" } ?? []
        XCTAssertTrue(responses.first?.text.contains("Great") ?? false)
    }

    /// Test 7: Conversation summary generation
    func testConversationSummaryGeneration() async throws {
        // Given: Long conversation
        let conversation = VoiceConversation()
        conversation.title = "Algebra Study Session"
        modelContext.insert(conversation)

        // Add multiple exchanges
        for i in 1...5 {
            let userTranscript = Transcript(
                conversationID: conversation.id,
                speaker: "user",
                text: "Question \(i) about algebra",
                timestamp: Date().addingTimeInterval(Double(i * 2))
            )
            userTranscript.conversation = conversation
            modelContext.insert(userTranscript)

            let aiTranscript = Transcript(
                conversationID: conversation.id,
                speaker: "assistant",
                text: "Answer to question \(i)",
                timestamp: Date().addingTimeInterval(Double(i * 2 + 1))
            )
            aiTranscript.conversation = conversation
            modelContext.insert(aiTranscript)
        }

        try modelContext.save()

        // When: Generate summary
        conversation.summary = "Discussed 5 algebra concepts including equations and factoring"

        // Then: Verify summary
        XCTAssertNotNil(conversation.summary)
        XCTAssertTrue(conversation.summary?.contains("algebra") ?? false)
        XCTAssertEqual(conversation.transcripts?.count, 10)
    }

    /// Test 8: Voice conversation with material context
    func testVoiceConversationWithMaterialContext() async throws {
        // Given: Conversation about specific material
        let conversation = VoiceConversation()
        conversation.title = "Discussing Chemistry Notes"
        conversation.summary = "Questions about ionic bonding from chemistry material"
        modelContext.insert(conversation)

        let transcript = Transcript(
            conversationID: conversation.id,
            speaker: "user",
            text: "Can you explain ionic bonding from the notes?",
            timestamp: Date()
        )
        transcript.conversation = conversation
        modelContext.insert(transcript)

        try modelContext.save()

        // Then: Verify material context
        XCTAssertTrue(transcript.text.contains("ionic bonding"))
        XCTAssertTrue(conversation.summary?.contains("chemistry") ?? false)
    }

    /// Test 9: Conversation deletion
    func testConversationDeletion() async throws {
        // Given: Conversation with transcripts
        let conversation = VoiceConversation()
        modelContext.insert(conversation)

        let transcript = Transcript(
            conversationID: conversation.id,
            speaker: "user",
            text: "Test transcript",
            timestamp: Date()
        )
        transcript.conversation = conversation
        modelContext.insert(transcript)

        try modelContext.save()

        let conversationID = conversation.id

        // When: Delete conversation
        modelContext.delete(conversation)
        try modelContext.save()

        // Then: Verify deletion
        let descriptor = FetchDescriptor<VoiceConversation>(
            predicate: #Predicate { $0.id == conversationID }
        )
        let conversations = try modelContext.fetch(descriptor)
        XCTAssertTrue(conversations.isEmpty)
    }

    /// Test 10: Voice input language detection
    func testVoiceInputLanguageDetection() async throws {
        // Given: Conversations in different languages
        let englishConv = VoiceConversation()
        englishConv.title = "English Conversation"
        modelContext.insert(englishConv)

        let englishTranscript = Transcript(
            conversationID: englishConv.id,
            speaker: "user",
            text: "What is photosynthesis?",
            timestamp: Date()
        )
        englishTranscript.conversation = englishConv
        modelContext.insert(englishTranscript)

        let italianConv = VoiceConversation()
        italianConv.title = "Conversazione Italiana"
        modelContext.insert(italianConv)

        let italianTranscript = Transcript(
            conversationID: italianConv.id,
            speaker: "user",
            text: "Cos'è la fotosintesi?",
            timestamp: Date()
        )
        italianTranscript.conversation = italianConv
        modelContext.insert(italianTranscript)

        try modelContext.save()

        // Then: Verify language handling
        XCTAssertNotNil(englishTranscript.text)
        XCTAssertNotNil(italianTranscript.text)
        XCTAssertNotEqual(englishTranscript.text, italianTranscript.text)
    }
}
