import Foundation
import SwiftData

/// Visual mind map representation of material content
@Model
final class MindMap {
    var id: UUID
    var materialID: UUID
    var imageURL: URL?
    var generatedAt: Date
    var prompt: String?

    @Relationship(deleteRule: .cascade)
    var nodes: [MindMapNode] = []

    init(materialID: UUID, prompt: String? = nil) {
        self.id = UUID()
        self.materialID = materialID
        self.generatedAt = Date()
        self.prompt = prompt
    }
}

/// Individual node in a mind map
@Model
final class MindMapNode {
    var id: UUID
    var title: String
    var content: String?
    var positionX: Double
    var positionY: Double
    var color: String?

    var parentNodeID: UUID?

    @Relationship(deleteRule: .nullify)
    var childNodes: [MindMapNode] = []

    init(
        title: String,
        content: String? = nil,
        positionX: Double,
        positionY: Double,
        color: String? = nil,
        parentNodeID: UUID? = nil
    ) {
        self.id = UUID()
        self.title = title
        self.content = content
        self.positionX = positionX
        self.positionY = positionY
        self.color = color
        self.parentNodeID = parentNodeID
    }
}
