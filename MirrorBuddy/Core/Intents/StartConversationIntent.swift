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
    static let title: LocalizedStringResource = "Parla con MirrorBuddy"
    static let description = IntentDescription("Inizia una conversazione vocale con il tuo coach AI")

    static let openAppWhenRun: Bool = true

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
    func perform() async throws -> some ProvidesDialog {
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

        return .result(dialog: "Avvio conversazione con MirrorBuddy")
    }
}

/// Entity for subject selection (Siri Shortcuts)
@available(iOS 16.0, *)
struct SiriSubjectEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Materia"

    var id: String
    var displayString: String

    static let defaultQuery = SiriSubjectEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(displayString)")
    }
}

/// Query for subject entities
@available(iOS 16.0, *)
struct SiriSubjectEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [SiriSubjectEntity] {
        identifiers.compactMap { id in
            SiriSubjectEntity.allSubjects.first { $0.id == id }
        }
    }

    func suggestedEntities() async throws -> [SiriSubjectEntity] {
        SiriSubjectEntity.allSubjects
    }
}

@available(iOS 16.0, *)
extension SiriSubjectEntity {
    static let allSubjects = [
        SiriSubjectEntity(id: "matematica", displayString: "Matematica"),
        SiriSubjectEntity(id: "italiano", displayString: "Italiano"),
        SiriSubjectEntity(id: "inglese", displayString: "Inglese"),
        SiriSubjectEntity(id: "scienze", displayString: "Scienze"),
        SiriSubjectEntity(id: "storia", displayString: "Storia"),
        SiriSubjectEntity(id: "geografia", displayString: "Geografia"),
        SiriSubjectEntity(id: "arte", displayString: "Arte"),
        SiriSubjectEntity(id: "musica", displayString: "Musica")
    ]
}

// MARK: - Notification Names

extension Notification.Name {
    static let startVoiceConversation = Notification.Name("startVoiceConversation")
}
