//
//  StartConversationIntent.swift
//  MirrorBuddy
//
//  Siri App Intent for voice-first interaction
//  "Hey Siri, parla con MirrorBuddy"
//

import AppIntents
import SwiftUI

/// App Intent to start a voice conversation with MirrorBuddy
/// Invoked via Siri: "Hey Siri, parla con MirrorBuddy"
@available(iOS 16.0, *)
struct StartConversationIntent: AppIntent {
    static var title: LocalizedStringResource = "Parla con MirrorBuddy"
    static var description = IntentDescription("Inizia una conversazione vocale con il tuo coach AI")

    static var openAppWhenRun: Bool = true

    // Optional parameters for subject-specific conversations
    @Parameter(title: "Materia")
    var subject: String?

    @Parameter(title: "Argomento")
    var topic: String?

    // Parameter summary for Siri
    static var parameterSummary: some ParameterSummary {
        Summary("Parla con MirrorBuddy") {
            \.$subject
            \.$topic
        }
    }

    // Perform the intent
    @MainActor
    func perform() async throws -> some IntentResult & OpensIntent {
        // Store intent parameters for the app to pick up
        NotificationCenter.default.post(
            name: .startVoiceConversation,
            object: nil,
            userInfo: [
                "subject": subject as Any,
                "topic": topic as Any,
                "autoStart": true
            ]
        )

        return .result()
    }
}

/// Entity for subject selection
@available(iOS 16.0, *)
struct SubjectEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Materia"

    var id: String
    var displayString: String

    static var defaultQuery = SubjectEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(displayString)")
    }
}

/// Query for subject entities
@available(iOS 16.0, *)
struct SubjectEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [SubjectEntity] {
        identifiers.compactMap { id in
            SubjectEntity.allSubjects.first { $0.id == id }
        }
    }

    func suggestedEntities() async throws -> [SubjectEntity] {
        SubjectEntity.allSubjects
    }
}

@available(iOS 16.0, *)
extension SubjectEntity {
    static let allSubjects = [
        SubjectEntity(id: "matematica", displayString: "Matematica"),
        SubjectEntity(id: "italiano", displayString: "Italiano"),
        SubjectEntity(id: "inglese", displayString: "Inglese"),
        SubjectEntity(id: "scienze", displayString: "Scienze"),
        SubjectEntity(id: "storia", displayString: "Storia"),
        SubjectEntity(id: "geografia", displayString: "Geografia"),
        SubjectEntity(id: "arte", displayString: "Arte"),
        SubjectEntity(id: "musica", displayString: "Musica")
    ]
}

// MARK: - Notification Names

extension Notification.Name {
    static let startVoiceConversation = Notification.Name("startVoiceConversation")
}
