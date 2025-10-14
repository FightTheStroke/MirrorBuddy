import Foundation
import SwiftData

/// Visual mind map representation of material content
@Model
final class MindMap {
    var id: UUID = UUID()
    var materialID: UUID = UUID()
    var imageURL: URL?
    var generatedAt: Date = Date()
    var prompt: String?

    @Relationship(deleteRule: .cascade, inverse: \MindMapNode.mindMap)
    var nodes: [MindMapNode]?

    // Inverse relationship to Material
    @Relationship(deleteRule: .nullify)
    var material: Material?

    // Computed property for backwards compatibility
    var nodesArray: [MindMapNode] {
        get { nodes ?? [] }
        set { nodes = newValue }
    }

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
    var id: UUID = UUID()
    var title: String = ""
    var content: String?
    var positionX: Double = 0.0
    var positionY: Double = 0.0
    var color: String?

    var parentNodeID: UUID?

    @Relationship(deleteRule: .nullify, inverse: \MindMapNode.parentNode)
    var childNodes: [MindMapNode]?

    // Inverse relationships
    @Relationship(deleteRule: .nullify)
    var parentNode: MindMapNode?

    @Relationship(deleteRule: .nullify)
    var mindMap: MindMap?

    // Computed property for backwards compatibility
    var childNodesArray: [MindMapNode] {
        get { childNodes ?? [] }
        set { childNodes = newValue }
    }

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
