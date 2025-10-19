import Foundation
import SwiftData

/// Visual mind map representation of material content
@Model
final class MindMap {
    var id = UUID()
    var materialID = UUID()
    var title: String?
    var imageURL: URL?
    var generatedAt = Date()
    var prompt: String?

    @Relationship(deleteRule: .cascade, inverse: \MindMapNode.mindMap)
    var nodes: [MindMapNode]?

    // Relationship to Material (inverse specified on Material side)
    @Relationship(deleteRule: .nullify)
    var material: Material?

    // Computed property for backwards compatibility
    var nodesArray: [MindMapNode] {
        get { nodes ?? [] }
        set { nodes = newValue }
    }

    // Computed property for root node (first node with no parent)
    var rootNode: MindMapNode? {
        nodes?.first { $0.parentNodeID == nil }
    }

    init(materialID: UUID, title: String? = nil, prompt: String? = nil) {
        self.id = UUID()
        self.materialID = materialID
        self.title = title
        self.generatedAt = Date()
        self.prompt = prompt
    }
}

/// Individual node in a mind map
@Model
final class MindMapNode {
    var id = UUID()
    var title: String = ""
    var content: String?
    var positionX: Double = 0.0
    var positionY: Double = 0.0
    var color: String?

    var parentNodeID: UUID?

    @Relationship(deleteRule: .nullify, inverse: \MindMapNode.parentNode)
    var childNodes: [MindMapNode]?

    // Inverse relationships (NO inverse for one-to-many "one" side)
    @Relationship(deleteRule: .nullify)
    var parentNode: MindMapNode?

    @Relationship(deleteRule: .nullify)
    var mindMap: MindMap?

    // Computed property for backwards compatibility
    var childNodesArray: [MindMapNode] {
        get { childNodes ?? [] }
        set { childNodes = newValue }
    }

    // Alias for childNodes (for compatibility with LMSIntegrationService)
    var children: [MindMapNode] {
        childNodesArray
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
