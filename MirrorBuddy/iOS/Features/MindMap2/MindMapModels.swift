import Foundation
import SwiftUI

/// Mind map node model for MindMap2 feature
struct MindMapNodeModel: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var content: String?
    var position: CGPoint
    var connections: [String]
    var voiceNotes: [VoiceNote]
    var textNotes: [String]
    var color: String

    init(id: String = UUID().uuidString, title: String, content: String? = nil, position: CGPoint = .zero, connections: [String] = [], voiceNotes: [VoiceNote] = [], textNotes: [String] = [], color: String = "blue") {
        self.id = id
        self.title = title
        self.content = content
        self.position = position
        self.connections = connections
        self.voiceNotes = voiceNotes
        self.textNotes = textNotes
        self.color = color
    }
}

/// Voice note attached to a node
struct VoiceNote: Identifiable, Codable, Equatable {
    let id: String
    let audioURL: String
    let transcript: String?
    let duration: TimeInterval
    let createdDate: Date

    init(id: String = UUID().uuidString, audioURL: String, transcript: String? = nil, duration: TimeInterval, createdDate: Date = Date()) {
        self.id = id
        self.audioURL = audioURL
        self.transcript = transcript
        self.duration = duration
        self.createdDate = createdDate
    }
}

/// Complete mind map structure for MindMap2 feature
struct MindMapModel: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var subject: String?
    var nodes: [MindMapNodeModel]
    var centerNodeId: String
    var createdDate: Date
    var lastModifiedDate: Date

    init(id: String = UUID().uuidString, title: String, subject: String? = nil, nodes: [MindMapNodeModel], centerNodeId: String, createdDate: Date = Date(), lastModifiedDate: Date = Date()) {
        self.id = id
        self.title = title
        self.subject = subject
        self.nodes = nodes
        self.centerNodeId = centerNodeId
        self.createdDate = createdDate
        self.lastModifiedDate = lastModifiedDate
    }
}
