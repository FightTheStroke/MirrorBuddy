import Foundation
@testable import MirrorBuddy
import Testing

/// Tests for mind map generation functionality
@Suite("Mind Map Generation Tests")
struct MindMapGenerationTests {
    @Test("Generate mind map from material content")
    func testMindMapGeneration() async throws {
        // Given: Sample material content
        let content = """
        Photosynthesis is the process by which plants convert light energy into chemical energy.
        The main components are chlorophyll, water, and carbon dioxide.
        The products are glucose and oxygen.
        """

        // When: Generating mind map
        let service = MindMapGenerationService.shared
        let mindMap = try await service.generateMindMap(
            from: content,
            title: "Photosynthesis"
        )

        // Then: Mind map should have expected structure
        #expect(mindMap.rootNode != nil)
        #expect(mindMap.rootNode?.title == "Photosynthesis")
        #expect((mindMap.rootNode?.children.count ?? 0) > 0)
    }

    @Test("Extract key concepts from text")
    func testKeyConceptExtraction() async throws {
        // Given: Text with multiple concepts
        let text = "Newton's laws of motion describe force, mass, and acceleration."

        // When: Extracting concepts
        let service = MindMapGenerationService.shared
        let concepts = await service.extractKeyConcepts(from: text)

        // Then: Should identify key terms
        #expect(concepts.contains("force"))
        #expect(concepts.contains("mass"))
        #expect(concepts.contains("acceleration"))
    }

    @Test("Create hierarchical structure")
    func testHierarchicalStructure() async throws {
        // Given: Nested content
        let content = """
        Main topic: Mathematics
        Subtopic 1: Algebra
        Subtopic 2: Geometry
        """

        // When: Creating hierarchy
        let service = MindMapGenerationService.shared
        let mindMap = try await service.generateMindMap(from: content, title: "Math")

        // Then: Should have proper depth
        #expect(mindMap.rootNode != nil)
        let depth = mindMap.calculateDepth()
        #expect(depth >= 2)
    }

    @Test("Handle empty content gracefully")
    func testEmptyContent() async {
        // Given: Empty content
        let content = ""

        // When: Generating mind map
        let service = MindMapGenerationService.shared

        // Then: Should handle gracefully (not crash)
        do {
            _ = try await service.generateMindMap(from: content, title: "Empty")
            // Success if no crash
        } catch {
            // Expected error for empty content
            #expect(error is MindMapError)
        }
    }

    @Test("Generate mind map with custom depth")
    func testCustomDepth() async throws {
        // Given: Content and depth limit
        let content = "Complex topic with many subtopics and details."

        // When: Generating with max depth
        let service = MindMapGenerationService.shared
        let mindMap = try await service.generateMindMap(
            from: content,
            title: "Complex",
            maxDepth: 3
        )

        // Then: Should respect depth limit
        let depth = mindMap.calculateDepth()
        #expect(depth <= 3)
    }

    @Test("Detect relationships between concepts")
    func testConceptRelationships() async throws {
        // Given: Related concepts
        let content = "Cause and effect: Rain causes wet ground."

        // When: Analyzing relationships
        let service = MindMapGenerationService.shared
        let mindMap = try await service.generateMindMap(from: content, title: "Cause-Effect")

        // Then: Should connect related nodes
        #expect(mindMap.rootNode?.children.count ?? 0 > 0)
    }
}
