import Foundation
import SwiftData
import os.log

/// Mind map generation service using GPT-5 (Task 21)
@MainActor
final class MindMapGenerationService {
    /// Shared singleton instance
    static let shared = MindMapGenerationService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MindMapGeneration")

    // MARK: - Configuration

    /// Maximum depth for mind map hierarchy
    private let maxDepth = 3

    /// Ideal node text length (words)
    private let idealNodeLength = (min: 5, max: 7)

    // MARK: - Dependencies (Subtask 21.2)

    private var openAIClient: OpenAIClient?
    private var modelContext: ModelContext?

    // MARK: - Initialization

    private init() {
        setupClient()
    }

    /// Configure the service with a SwiftData model context
    func configure(modelContext: ModelContext) {
        self.modelContext = modelContext
        logger.info("Mind map service configured with model context")
    }

    private func setupClient() {
        if let config = OpenAIConfiguration.loadFromEnvironment() {
            openAIClient = OpenAIClient(configuration: config)
            logger.info("OpenAI client configured for mind map generation")
        } else {
            logger.warning("No API configuration found")
        }
    }

    // MARK: - Mind Map Generation (Subtasks 21.1 & 21.2)

    /// Generate a mind map from study material text
    func generateMindMap(
        from text: String,
        materialID: UUID,
        subject: Subject? = nil
    ) async throws -> MindMap {
        logger.info("Generating mind map for material \(materialID)")

        guard let client = openAIClient else {
            throw MindMapGenerationError.noClientAvailable
        }

        // Build the prompt based on subject
        let prompt = buildMindMapPrompt(text: text, subject: subject)

        // Call GPT-5 for mind map structure
        let response = try await client.chatCompletion(
            model: .gpt5,
            messages: [
                ChatMessage(role: .system, content: .text(getSystemPrompt(subject: subject))),
                ChatMessage(role: .user, content: .text(prompt))
            ],
            temperature: 0.7,
            maxTokens: 2000
        )

        guard let content = response.choices.first?.message.content else {
            throw MindMapGenerationError.emptyResponse
        }

        // Parse the response into mind map structure
        let mindMapStructure = try parseMindMapResponse(content)

        // Create MindMap and nodes
        let mindMap = try await createMindMapModels(
            structure: mindMapStructure,
            materialID: materialID,
            prompt: prompt
        )

        // Store in SwiftData (Subtask 21.3)
        try storeMindMap(mindMap)

        logger.info("Mind map generated with \(mindMap.nodesArray.count) nodes")
        return mindMap
    }

    // MARK: - Prompt Engineering (Subtask 21.1)

    /// Get system prompt for mind map generation
    private func getSystemPrompt(subject: Subject?) -> String {
        let basePrompt = """
        You are an expert educational mind map creator. Your role is to transform study materials into clear, hierarchical mind maps.

        STRICT REQUIREMENTS:
        1. Maximum 3 levels deep (root → level 1 → level 2)
        2. Each node must be 5-7 words maximum
        3. Include concrete examples for abstract concepts
        4. Use clear, student-friendly language
        5. Focus on key concepts and relationships
        6. Return ONLY valid JSON in the specified format
        """

        if let subject = subject {
            return basePrompt + "\n\n" + getSubjectSpecificGuidance(subject)
        }

        return basePrompt
    }

    /// Get subject-specific guidance for mind map generation
    private func getSubjectSpecificGuidance(_ subject: Subject) -> String {
        switch subject {
        case .matematica, .fisica:
            return """
            MATHEMATICS/PHYSICS SPECIFIC:
            - Include formulas as separate nodes
            - Show step-by-step problem solving
            - Connect related theorems and concepts
            - Include numerical examples
            """
        case .scienzeNaturali:
            return """
            SCIENCE SPECIFIC:
            - Show cause-effect relationships
            - Include experimental methods
            - Connect theories to real-world applications
            - Use scientific terminology accurately
            """
        case .storiaGeografia, .educazioneCivica:
            return """
            HISTORY/GEOGRAPHY SPECIFIC:
            - Use chronological organization
            - Show cause-effect of events
            - Connect people, places, and dates
            - Include significant impacts
            """
        case .italiano:
            return """
            ITALIAN LITERATURE SPECIFIC:
            - Organize by themes and motifs
            - Connect characters and relationships
            - Include key quotes
            - Show literary devices
            """
        case .inglese:
            return """
            LANGUAGE SPECIFIC:
            - Group by grammar concepts
            - Include example sentences
            - Show verb conjugations
            - Connect related vocabulary
            """
        case .religione, .scienzeMotorie, .sostegno, .other:
            return """
            GENERAL APPROACH:
            - Organize by main topics
            - Show relationships between concepts
            - Include practical examples
            - Use hierarchical structure
            """
        }
    }

    /// Build the mind map generation prompt
    private func buildMindMapPrompt(text: String, subject: Subject?) -> String {
        let subjectContext = subject.map { " for \($0.rawValue)" } ?? ""

        return """
        Create a hierarchical mind map\(subjectContext) from the following study material.

        STRUCTURE REQUIREMENTS:
        - Root node: Main topic (5-7 words)
        - Level 1: Major subtopics (3-6 nodes, 5-7 words each)
        - Level 2: Details and examples (2-4 per parent, 5-7 words each)
        - Maximum depth: 3 levels

        TEXT REQUIREMENTS:
        - Keep all node text to 5-7 words
        - Use concrete, specific language
        - Include practical examples where possible

        OUTPUT FORMAT (strict JSON):
        {
          "root": {
            "title": "Main Topic Here",
            "example": "Optional concrete example",
            "children": [
              {
                "title": "Subtopic One",
                "example": "Example for this subtopic",
                "children": [
                  {
                    "title": "Detail or Example",
                    "example": "Specific concrete example"
                  }
                ]
              }
            ]
          }
        }

        STUDY MATERIAL:
        \(text)

        Generate the mind map JSON now:
        """
    }

    // MARK: - Response Parsing (Subtask 21.3)

    /// Parse GPT-5 response into mind map structure
    private func parseMindMapResponse(_ response: String) throws -> MindMapStructureNode {
        // Extract JSON from response (might have markdown code blocks)
        let jsonString = extractJSON(from: response)

        guard let data = jsonString.data(using: .utf8) else {
            throw MindMapGenerationError.invalidResponse
        }

        let decoder = JSONDecoder()
        let structure = try decoder.decode(MindMapStructureResponse.self, from: data)

        // Validate depth
        try validateDepth(structure.root, currentDepth: 0)

        return structure.root
    }

    /// Extract JSON from markdown code blocks or raw text
    private func extractJSON(from text: String) -> String {
        // Remove markdown code block markers
        let cleaned = text
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        // Find first { and last }
        if let startIndex = cleaned.firstIndex(of: "{"),
           let endIndex = cleaned.lastIndex(of: "}") {
            return String(cleaned[startIndex...endIndex])
        }

        return cleaned
    }

    /// Validate mind map depth doesn't exceed limit
    private func validateDepth(_ node: MindMapStructureNode, currentDepth: Int) throws {
        if currentDepth >= maxDepth {
            throw MindMapGenerationError.depthLimitExceeded
        }

        for child in node.children {
            try validateDepth(child, currentDepth: currentDepth + 1)
        }
    }

    /// Create SwiftData models from parsed structure
    private func createMindMapModels(
        structure: MindMapStructureNode,
        materialID: UUID,
        prompt: String
    ) async throws -> MindMap {
        let mindMap = MindMap(materialID: materialID, prompt: prompt)

        // Calculate positions for nodes (hierarchical layout)
        let layout = calculateNodePositions(structure: structure)

        // Create root node
        let rootNode = MindMapNode(
            title: structure.title,
            content: structure.example,
            positionX: layout.root.x,
            positionY: layout.root.y,
            color: getColorForLevel(0)
        )

        if mindMap.nodes == nil {
            mindMap.nodes = []
        }
        mindMap.nodes?.append(rootNode)

        // Create child nodes recursively
        createChildNodes(
            structure: structure,
            parentNode: rootNode,
            parentPosition: layout.root,
            level: 1,
            layout: layout.children,
            mindMap: mindMap
        )

        return mindMap
    }

    /// Create child nodes recursively
    private func createChildNodes(
        structure: MindMapStructureNode,
        parentNode: MindMapNode,
        parentPosition: NodePosition,
        level: Int,
        layout: [NodePosition],
        mindMap: MindMap
    ) {
        for (index, childStructure) in structure.children.enumerated() {
            guard index < layout.count else { break }

            let position = layout[index]
            let childNode = MindMapNode(
                title: childStructure.title,
                content: childStructure.example,
                positionX: position.x,
                positionY: position.y,
                color: getColorForLevel(level),
                parentNodeID: parentNode.id
            )

            if parentNode.childNodes == nil {
                parentNode.childNodes = []
            }
            parentNode.childNodes?.append(childNode)

            if mindMap.nodes == nil {
                mindMap.nodes = []
            }
            mindMap.nodes?.append(childNode)

            // Recursively create grandchildren if they exist
            if !childStructure.children.isEmpty && level < maxDepth - 1 {
                let grandchildLayout = calculateChildPositions(
                    parentPosition: position,
                    childCount: childStructure.children.count,
                    level: level + 1
                )

                createChildNodes(
                    structure: childStructure,
                    parentNode: childNode,
                    parentPosition: position,
                    level: level + 1,
                    layout: grandchildLayout,
                    mindMap: mindMap
                )
            }
        }
    }

    // MARK: - Layout Calculation

    /// Calculate node positions for hierarchical layout
    private func calculateNodePositions(structure: MindMapStructureNode) -> MindMapLayout {
        let rootPosition = NodePosition(x: 0, y: 0) // Center

        let childPositions = calculateChildPositions(
            parentPosition: rootPosition,
            childCount: structure.children.count,
            level: 1
        )

        return MindMapLayout(root: rootPosition, children: childPositions)
    }

    /// Calculate positions for child nodes
    private func calculateChildPositions(
        parentPosition: NodePosition,
        childCount: Int,
        level: Int
    ) -> [NodePosition] {
        let radius: Double = Double(level) * 200.0 // Distance from parent
        let angleStep = (2.0 * .pi) / Double(childCount)

        return (0..<childCount).map { index in
            let angle = angleStep * Double(index) - (.pi / 2.0) // Start from top
            let x = parentPosition.x + radius * cos(angle)
            let y = parentPosition.y + radius * sin(angle)
            return NodePosition(x: x, y: y)
        }
    }

    /// Get color for node based on hierarchy level
    private func getColorForLevel(_ level: Int) -> String {
        switch level {
        case 0: return "#4A90E2" // Root - blue
        case 1: return "#7ED321" // Level 1 - green
        case 2: return "#F5A623" // Level 2 - orange
        default: return "#9013FE" // Level 3+ - purple
        }
    }

    // MARK: - Storage (Subtask 21.3)

    /// Store mind map in SwiftData
    private func storeMindMap(_ mindMap: MindMap) throws {
        guard let context = modelContext else {
            logger.warning("No model context available for storing mind map")
            return
        }

        context.insert(mindMap)

        do {
            try context.save()
            logger.debug("Mind map stored successfully")
        } catch {
            logger.error("Failed to store mind map: \(error.localizedDescription)")
            throw error
        }
    }

    /// Retrieve mind map for material
    func getMindMap(for materialID: UUID) throws -> MindMap? {
        guard let context = modelContext else { return nil }

        let descriptor = FetchDescriptor<MindMap>(
            predicate: #Predicate { mindMap in
                mindMap.materialID == materialID
            },
            sortBy: [SortDescriptor(\.generatedAt, order: .reverse)]
        )

        let results = try context.fetch(descriptor)
        return results.first
    }

    /// Delete mind map
    func deleteMindMap(_ mindMap: MindMap) throws {
        guard let context = modelContext else { return }

        context.delete(mindMap)
        try context.save()
        logger.info("Mind map deleted")
    }
}

// MARK: - Supporting Types

/// Mind map structure from API response
struct MindMapStructureResponse: Codable {
    let root: MindMapStructureNode
}

/// Individual node in mind map structure
struct MindMapStructureNode: Codable {
    let title: String
    let example: String?
    let children: [MindMapStructureNode]

    init(title: String, example: String? = nil, children: [MindMapStructureNode] = []) {
        self.title = title
        self.example = example
        self.children = children
    }
}

/// Node position in 2D space
struct NodePosition {
    let x: Double
    let y: Double
}

/// Complete mind map layout
struct MindMapLayout {
    let root: NodePosition
    let children: [NodePosition]
}

/// Mind map generation errors
enum MindMapGenerationError: LocalizedError {
    case noClientAvailable
    case emptyResponse
    case invalidResponse
    case depthLimitExceeded
    case parsingFailed

    var errorDescription: String? {
        switch self {
        case .noClientAvailable:
            return "No API client available for mind map generation"
        case .emptyResponse:
            return "Received empty response from API"
        case .invalidResponse:
            return "Invalid response format from API"
        case .depthLimitExceeded:
            return "Mind map depth exceeds 3-level limit"
        case .parsingFailed:
            return "Failed to parse mind map structure"
        }
    }
}
