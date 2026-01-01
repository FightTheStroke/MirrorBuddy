// ============================================================================
// MINDMAP HANDLER TESTS
// Comprehensive unit tests for mindmap creation and validation
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateMarkdownFromNodes } from '@/lib/tools/handlers/mindmap-handler';
import type { MindmapNode, ToolExecutionResult } from '@/types/tools';

// Mock dependencies
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-tool-id-123'),
}));

vi.mock('@/lib/tools/tool-executor', () => {
  const handlers = new Map();
  return {
    registerToolHandler: vi.fn((name: string, handler: Function) => {
      handlers.set(name, handler);
    }),
    getRegisteredHandlers: () => handlers,
  };
});

// Import after mocking
import { getRegisteredHandlers } from '@/lib/tools/tool-executor';

describe('Mindmap Handler', () => {
  let mindmapHandler: Function;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Re-import the handler to register it
    await import('@/lib/tools/handlers/mindmap-handler');

    // Get the registered handler
    const handlers = getRegisteredHandlers();
    mindmapHandler = handlers.get('create_mindmap')!;

    expect(mindmapHandler).toBeDefined();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // SUCCESSFUL MINDMAP CREATION
  // ============================================================================

  describe('Successful mindmap creation', () => {
    it('should create a mindmap with single root node', async () => {
      const args = {
        title: 'Solar System',
        nodes: [
          { id: '1', label: 'The Sun', parentId: null },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('test-tool-id-123');
      expect(result.toolType).toBe('mindmap');
      expect(result.data).toBeDefined();

      const data = result.data as any;
      expect(data.topic).toBe('Solar System');
      expect(data.nodes).toHaveLength(1);
      expect(data.nodes[0]).toEqual({
        id: '1',
        label: 'The Sun',
        parentId: null,
      });
      expect(data.markdown).toContain('# Solar System');
      expect(data.markdown).toContain('## The Sun');
    });

    it('should create a mindmap with multiple root nodes', async () => {
      const args = {
        title: 'Photosynthesis',
        nodes: [
          { id: '1', label: 'Inputs', parentId: null },
          { id: '2', label: 'Outputs', parentId: null },
          { id: '3', label: 'Process', parentId: null },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(3);
      expect(data.markdown).toContain('# Photosynthesis');
      expect(data.markdown).toContain('## Inputs');
      expect(data.markdown).toContain('## Outputs');
      expect(data.markdown).toContain('## Process');
    });

    it('should create a hierarchical mindmap with parent-child relationships', async () => {
      const args = {
        title: 'Italian Renaissance',
        nodes: [
          { id: '1', label: 'Art', parentId: null },
          { id: '2', label: 'Leonardo da Vinci', parentId: '1' },
          { id: '3', label: 'Michelangelo', parentId: '1' },
          { id: '4', label: 'Mona Lisa', parentId: '2' },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(4);
      expect(data.markdown).toContain('# Italian Renaissance');
      expect(data.markdown).toContain('## Art');
      expect(data.markdown).toContain('### Leonardo da Vinci');
      expect(data.markdown).toContain('#### Mona Lisa');
    });

    it('should handle nodes with empty string parentId as root nodes', async () => {
      const args = {
        title: 'Test Topic',
        nodes: [
          { id: '1', label: 'Root with empty string', parentId: '' },
          { id: '2', label: 'Root with null literal', parentId: 'null' },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.markdown).toContain('## Root with empty string');
      expect(data.markdown).toContain('## Root with null literal');
    });

    it('should normalize parentId to null when undefined or empty', async () => {
      const args = {
        title: 'Normalization Test',
        nodes: [
          { id: '1', label: 'No parentId' },
          { id: '2', label: 'Empty parentId', parentId: '' },
          { id: '3', label: 'Null parentId', parentId: null },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes[0].parentId).toBe(null);
      expect(data.nodes[1].parentId).toBe(null);
      expect(data.nodes[2].parentId).toBe(null);
    });

    it('should handle deeply nested hierarchies', async () => {
      const args = {
        title: 'Biological Classification',
        nodes: [
          { id: '1', label: 'Kingdom', parentId: null },
          { id: '2', label: 'Phylum', parentId: '1' },
          { id: '3', label: 'Class', parentId: '2' },
          { id: '4', label: 'Order', parentId: '3' },
          { id: '5', label: 'Family', parentId: '4' },
          { id: '6', label: 'Genus', parentId: '5' },
          { id: '7', label: 'Species', parentId: '6' },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(7);
      // Markdown should contain increasing header levels (capped at h6)
      expect(data.markdown).toContain('## Kingdom');
      expect(data.markdown).toContain('###### Species'); // Max h6
    });
  });

  // ============================================================================
  // INPUT VALIDATION
  // ============================================================================

  describe('Input validation', () => {
    it('should reject missing topic', async () => {
      const args = {
        nodes: [{ id: '1', label: 'Node', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title is required and must be a string');
      expect(result.toolType).toBe('mindmap');
    });

    it('should reject empty string topic', async () => {
      const args = {
        title: '',
        nodes: [{ id: '1', label: 'Node', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title is required and must be a string');
    });

    it('should reject non-string topic', async () => {
      const args = {
        title: 123,
        nodes: [{ id: '1', label: 'Node', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title is required and must be a string');
    });

    it('should reject missing nodes array', async () => {
      const args = {
        title: 'Test Topic',
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nodes array is required and must not be empty');
    });

    it('should reject empty nodes array', async () => {
      const args = {
        title: 'Test Topic',
        nodes: [],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nodes array is required and must not be empty');
    });

    it('should reject non-array nodes', async () => {
      const args = {
        title: 'Test Topic',
        nodes: 'not-an-array',
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nodes array is required and must not be empty');
    });
  });

  // ============================================================================
  // NODE STRUCTURE VALIDATION
  // ============================================================================

  describe('Node structure validation', () => {
    it('should accept nodes with only required fields (id, label)', async () => {
      const args = {
        title: 'Minimal Nodes',
        nodes: [
          { id: '1', label: 'Node 1' },
          { id: '2', label: 'Node 2' },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(2);
      expect(data.nodes[0].parentId).toBe(null);
      expect(data.nodes[1].parentId).toBe(null);
    });

    it('should preserve node ids and labels', async () => {
      const args = {
        title: 'ID Preservation',
        nodes: [
          { id: 'custom-id-1', label: 'Custom Label 1', parentId: null },
          { id: 'custom-id-2', label: 'Custom Label 2', parentId: 'custom-id-1' },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes[0].id).toBe('custom-id-1');
      expect(data.nodes[0].label).toBe('Custom Label 1');
      expect(data.nodes[1].id).toBe('custom-id-2');
      expect(data.nodes[1].parentId).toBe('custom-id-1');
    });

    it('should handle nodes with special characters in labels', async () => {
      const args = {
        title: 'Special Characters',
        nodes: [
          { id: '1', label: 'Node with "quotes"', parentId: null },
          { id: '2', label: 'Node with <angle> brackets', parentId: null },
          { id: '3', label: 'Node with & ampersand', parentId: null },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.markdown).toContain('Node with "quotes"');
      expect(data.markdown).toContain('Node with <angle> brackets');
      expect(data.markdown).toContain('Node with & ampersand');
    });
  });

  // ============================================================================
  // MARKDOWN GENERATION
  // ============================================================================

  describe('Markdown generation', () => {
    it('should generate correct markdown for flat structure', () => {
      const topic = 'Flat Structure';
      const nodes: MindmapNode[] = [
        { id: '1', label: 'Item A', parentId: null },
        { id: '2', label: 'Item B', parentId: null },
        { id: '3', label: 'Item C', parentId: null },
      ];

      const markdown = generateMarkdownFromNodes(topic, nodes);

      expect(markdown).toContain('# Flat Structure');
      expect(markdown).toContain('## Item A');
      expect(markdown).toContain('## Item B');
      expect(markdown).toContain('## Item C');
      expect(markdown.match(/##/g)).toHaveLength(3); // Only h2 headers for root nodes
    });

    it('should generate correct markdown for hierarchical structure', () => {
      const topic = 'Hierarchical Structure';
      const nodes: MindmapNode[] = [
        { id: '1', label: 'Parent', parentId: null },
        { id: '2', label: 'Child 1', parentId: '1' },
        { id: '3', label: 'Child 2', parentId: '1' },
        { id: '4', label: 'Grandchild', parentId: '2' },
      ];

      const markdown = generateMarkdownFromNodes(topic, nodes);

      expect(markdown).toContain('# Hierarchical Structure');
      expect(markdown).toContain('## Parent');
      expect(markdown).toContain('### Child 1');
      expect(markdown).toContain('### Child 2');
      expect(markdown).toContain('#### Grandchild');
    });

    it('should cap header level at h6 for deep hierarchies', () => {
      const topic = 'Deep Hierarchy';
      const nodes: MindmapNode[] = [
        { id: '1', label: 'Level 1', parentId: null },
        { id: '2', label: 'Level 2', parentId: '1' },
        { id: '3', label: 'Level 3', parentId: '2' },
        { id: '4', label: 'Level 4', parentId: '3' },
        { id: '5', label: 'Level 5', parentId: '4' },
        { id: '6', label: 'Level 6', parentId: '5' },
        { id: '7', label: 'Level 7', parentId: '6' },
        { id: '8', label: 'Level 8', parentId: '7' },
      ];

      const markdown = generateMarkdownFromNodes(topic, nodes);

      // Count h6 headers - should be at least 2 (Level 6, 7, 8 all capped at h6)
      const h6Count = (markdown.match(/######/g) || []).length;
      expect(h6Count).toBeGreaterThanOrEqual(2);

      // Should not have more than 6 # symbols in a row
      expect(markdown).not.toMatch(/#######/);
    });

    it('should maintain markdown structure with multiple branches', () => {
      const topic = 'Multiple Branches';
      const nodes: MindmapNode[] = [
        { id: '1', label: 'Branch A', parentId: null },
        { id: '2', label: 'Branch B', parentId: null },
        { id: '3', label: 'A-1', parentId: '1' },
        { id: '4', label: 'A-2', parentId: '1' },
        { id: '5', label: 'B-1', parentId: '2' },
        { id: '6', label: 'B-2', parentId: '2' },
      ];

      const markdown = generateMarkdownFromNodes(topic, nodes);

      // Check structure
      expect(markdown).toContain('## Branch A');
      expect(markdown).toContain('### A-1');
      expect(markdown).toContain('### A-2');
      expect(markdown).toContain('## Branch B');
      expect(markdown).toContain('### B-1');
      expect(markdown).toContain('### B-2');

      // Verify order (Branch A content should come before Branch B)
      const branchAIndex = markdown.indexOf('## Branch A');
      const branchBIndex = markdown.indexOf('## Branch B');
      const a1Index = markdown.indexOf('### A-1');
      const b1Index = markdown.indexOf('### B-1');

      expect(branchAIndex).toBeLessThan(a1Index);
      expect(a1Index).toBeLessThan(branchBIndex);
      expect(branchBIndex).toBeLessThan(b1Index);
    });

    it('should handle empty labels gracefully', () => {
      const topic = 'Empty Labels Test';
      const nodes: MindmapNode[] = [
        { id: '1', label: '', parentId: null },
        { id: '2', label: 'Normal Node', parentId: null },
      ];

      const markdown = generateMarkdownFromNodes(topic, nodes);

      expect(markdown).toContain('# Empty Labels Test');
      expect(markdown).toContain('## Normal Node');
      // Empty label should still create a header (might be blank)
      expect(markdown).toMatch(/## \n/);
    });
  });

  // ============================================================================
  // TOPIC HANDLING
  // ============================================================================

  describe('Topic handling', () => {
    it('should preserve topic with special characters', async () => {
      const args = {
        title: 'La "Divina Commedia" di Dante',
        nodes: [{ id: '1', label: 'Inferno', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe('La "Divina Commedia" di Dante');
      expect(data.markdown).toContain('# La "Divina Commedia" di Dante');
    });

    it('should handle very long topic names', async () => {
      const longTopic = 'A'.repeat(500);
      const args = {
        title: longTopic,
        nodes: [{ id: '1', label: 'Node', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe(longTopic);
      expect(data.markdown).toContain(`# ${longTopic}`);
    });

    it('should handle topic with unicode characters', async () => {
      const args = {
        title: '数学 (Mathematics) 🔢',
        nodes: [{ id: '1', label: 'Algebra 代数', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe('数学 (Mathematics) 🔢');
      expect(data.markdown).toContain('# 数学 (Mathematics) 🔢');
      expect(data.markdown).toContain('## Algebra 代数');
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error handling', () => {
    it('should return consistent error structure', async () => {
      const args = {
        title: '',
        nodes: [],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('toolId');
      expect(result).toHaveProperty('toolType');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
      expect(result.toolType).toBe('mindmap');
      expect(typeof result.error).toBe('string');
    });

    it('should handle null topic', async () => {
      const args = {
        title: null,
        nodes: [{ id: '1', label: 'Node', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title is required');
    });

    it('should handle undefined nodes', async () => {
      const args = {
        title: 'Test',
        nodes: undefined,
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Nodes array is required');
    });

    it('should generate unique tool IDs', async () => {
      // Mock nanoid to return different values
      const { nanoid } = await import('nanoid');
      let callCount = 0;
      vi.mocked(nanoid).mockImplementation(() => `tool-${++callCount}`);

      const args = {
        title: 'Test',
        nodes: [{ id: '1', label: 'Node', parentId: null }],
      };

      const result1 = await mindmapHandler(args, {}) as ToolExecutionResult;
      const result2 = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result1.toolId).toBe('tool-1');
      expect(result2.toolId).toBe('tool-2');
      expect(result1.toolId).not.toBe(result2.toolId);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle single node mindmap', async () => {
      const args = {
        title: 'Single Node',
        nodes: [{ id: '1', label: 'Only Node', parentId: null }],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(1);
      expect(data.markdown).toContain('# Single Node');
      expect(data.markdown).toContain('## Only Node');
    });

    it('should handle very large mindmaps (100+ nodes)', async () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        label: `Node ${i + 1}`,
        parentId: i === 0 ? null : `${Math.floor(i / 2) + 1}`,
      }));

      const args = {
        title: 'Large Mindmap',
        nodes,
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(100);
      expect(data.markdown).toContain('# Large Mindmap');
    });

    it('should handle orphaned nodes (parentId references non-existent node)', async () => {
      const args = {
        title: 'Orphaned Nodes',
        nodes: [
          { id: '1', label: 'Root', parentId: null },
          { id: '2', label: 'Orphan', parentId: 'non-existent' },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      // Should still succeed but orphan won't appear in hierarchy
      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(2);
    });

    it('should handle circular references gracefully', async () => {
      const args = {
        title: 'Circular Reference',
        nodes: [
          { id: '1', label: 'Node A', parentId: '2' },
          { id: '2', label: 'Node B', parentId: '1' },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      // Should not crash, but might create unusual structure
      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(2);
    });

    it('should handle nodes with whitespace-only labels', async () => {
      const args = {
        title: 'Whitespace Labels',
        nodes: [
          { id: '1', label: '   ', parentId: null },
          { id: '2', label: '\t\n', parentId: null },
        ],
      };

      const result = await mindmapHandler(args, {}) as ToolExecutionResult;

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.nodes).toHaveLength(2);
    });
  });

  // ============================================================================
  // INTEGRATION WITH TOOL EXECUTOR
  // ============================================================================

  describe('Integration with tool executor', () => {
    it('should register handler and make it available in registry', () => {
      // Handler should be registered after import in beforeEach
      const handlers = getRegisteredHandlers();
      expect(handlers.has('create_mindmap')).toBe(true);
      expect(handlers.get('create_mindmap')).toBe(mindmapHandler);
    });

    it('should export generateMarkdownFromNodes function', () => {
      expect(generateMarkdownFromNodes).toBeDefined();
      expect(typeof generateMarkdownFromNodes).toBe('function');
    });

    it('should accept context parameter without errors', async () => {
      const args = {
        title: 'Context Test',
        nodes: [{ id: '1', label: 'Node', parentId: null }],
      };

      const context = {
        sessionId: 'session-123',
        userId: 'user-456',
        maestroId: 'leonardo',
      };

      const result = await mindmapHandler(args, context) as ToolExecutionResult;

      expect(result.success).toBe(true);
      // Context is currently not used in handler, but should not cause errors
    });
  });
});
