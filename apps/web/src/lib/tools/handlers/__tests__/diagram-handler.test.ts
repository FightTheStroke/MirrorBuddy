// ============================================================================
// DIAGRAM HANDLER TESTS
// Comprehensive unit tests for Mermaid diagram creation
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ToolExecutionResult } from '@/types/tools';

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-diagram-id-123'),
}));

// Mock the tool executor module
vi.mock('../../tool-executor', () => ({
  registerToolHandler: vi.fn((name: string, handler: any) => {
    (globalThis as any).__diagramHandler = handler;
  }),
}));

// Import after mocks
import { validateMermaidCode } from '../diagram-handler';
import '../diagram-handler';

function getDiagramHandler(): ((args: Record<string, unknown>) => Promise<ToolExecutionResult>) | null {
  return (globalThis as any).__diagramHandler ?? null;
}

function requireDiagramHandler(): (args: Record<string, unknown>) => Promise<ToolExecutionResult> {
  const handler = getDiagramHandler();
  if (!handler) throw new Error('Handler not registered');
  return handler;
}

describe('Diagram Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateMermaidCode', () => {
    it('should validate flowchart code starting with graph', () => {
      const result = validateMermaidCode('graph TD\nA-->B', 'flowchart');
      expect(result.valid).toBe(true);
    });

    it('should validate flowchart code starting with flowchart', () => {
      const result = validateMermaidCode('flowchart LR\nA-->B-->C', 'flowchart');
      expect(result.valid).toBe(true);
    });

    it('should validate sequence diagram code', () => {
      const result = validateMermaidCode('sequenceDiagram\nAlice->>Bob: Hello', 'sequence');
      expect(result.valid).toBe(true);
    });

    it('should validate class diagram code', () => {
      const result = validateMermaidCode('classDiagram\nAnimal <|-- Duck', 'class');
      expect(result.valid).toBe(true);
    });

    it('should validate ER diagram code', () => {
      const result = validateMermaidCode('erDiagram\nCUSTOMER ||--o{ ORDER : places', 'er');
      expect(result.valid).toBe(true);
    });

    it('should reject empty code', () => {
      const result = validateMermaidCode('', 'flowchart');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mermaid code is required');
    });

    it('should reject null code', () => {
      const result = validateMermaidCode(null as any, 'flowchart');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mermaid code is required');
    });

    it('should reject code that is too short', () => {
      const result = validateMermaidCode('graph TD', 'flowchart');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mermaid code is too short');
    });

    it('should reject flowchart code with wrong prefix', () => {
      const result = validateMermaidCode('sequenceDiagram\nA-->B', 'flowchart');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('should start with');
    });

    it('should reject sequence code with wrong prefix', () => {
      const result = validateMermaidCode('graph TD\nA-->B-->C', 'sequence');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('should start with');
    });

    it('should handle case insensitive prefix matching', () => {
      const result = validateMermaidCode('GRAPH TD\nA-->B-->C', 'flowchart');
      expect(result.valid).toBe(true);
    });
  });

  describe('Diagram Handler Registration', () => {
    it('should have a registered handler', () => {
      expect(getDiagramHandler()).not.toBeNull();
      expect(typeof getDiagramHandler()).toBe('function');
    });
  });

  describe('Diagram Creation', () => {
    it('should create a valid flowchart', async () => {
      const args = {
        topic: 'Water Cycle',
        diagramType: 'flowchart',
        mermaidCode: 'graph TD\nA[Evaporation]-->B[Condensation]-->C[Precipitation]-->A',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(true);
      expect(result.toolId).toBe('test-diagram-id-123');
      expect(result.toolType).toBe('diagram');

      const data = result.data as any;
      expect(data.topic).toBe('Water Cycle');
      expect(data.diagramType).toBe('flowchart');
      expect(data.mermaidCode).toContain('graph TD');
    });

    it('should create a valid sequence diagram', async () => {
      const args = {
        topic: 'HTTP Request',
        diagramType: 'sequence',
        mermaidCode: 'sequenceDiagram\nClient->>Server: Request\nServer->>Client: Response',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.diagramType).toBe('sequence');
    });

    it('should create a valid class diagram', async () => {
      const args = {
        topic: 'OOP Inheritance',
        diagramType: 'class',
        mermaidCode: 'classDiagram\nAnimal <|-- Dog\nAnimal <|-- Cat',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.diagramType).toBe('class');
    });

    it('should create a valid ER diagram', async () => {
      const args = {
        topic: 'Database Schema',
        diagramType: 'er',
        mermaidCode: 'erDiagram\nSTUDENT ||--o{ ENROLLMENT : enrolls\nCOURSE ||--o{ ENROLLMENT : has',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.diagramType).toBe('er');
    });

    it('should trim whitespace from topic and code', async () => {
      const args = {
        topic: '  My Topic  ',
        diagramType: 'flowchart',
        mermaidCode: '  graph TD\nA-->B  ',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe('My Topic');
      expect(data.mermaidCode).toBe('graph TD\nA-->B');
    });
  });

  describe('Diagram Validation Errors', () => {
    it('should return error for missing topic', async () => {
      const args = {
        diagramType: 'flowchart',
        mermaidCode: 'graph TD\nA-->B',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic is required and must be a string');
    });

    it('should return error for non-string topic', async () => {
      const args = {
        topic: 123,
        diagramType: 'flowchart',
        mermaidCode: 'graph TD\nA-->B',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Topic is required and must be a string');
    });

    it('should return error for invalid diagram type', async () => {
      const args = {
        topic: 'Test',
        diagramType: 'invalid',
        mermaidCode: 'graph TD\nA-->B',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid diagram type');
    });

    it('should return error for invalid mermaid code', async () => {
      const args = {
        topic: 'Test',
        diagramType: 'flowchart',
        mermaidCode: 'invalid code here',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('should start with');
    });

    it('should return error for empty mermaid code', async () => {
      const args = {
        topic: 'Test',
        diagramType: 'flowchart',
        mermaidCode: '',
      };

      const result = await requireDiagramHandler()(args);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mermaid code is required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle complex flowchart with subgraphs', async () => {
      const args = {
        topic: 'Complex Flow',
        diagramType: 'flowchart',
        mermaidCode: `graph TB
          subgraph one
            A-->B
          end
          subgraph two
            C-->D
          end
          B-->C`,
      };

      const result = await requireDiagramHandler()(args);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in topic', async () => {
      const args = {
        topic: 'Test & "Quotes" <HTML>',
        diagramType: 'flowchart',
        mermaidCode: 'graph TD\nA-->B-->C',
      };

      const result = await requireDiagramHandler()(args);
      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.topic).toBe('Test & "Quotes" <HTML>');
    });

    it('should handle unicode in topic', async () => {
      const args = {
        topic: 'Ciclo dell\'acqua 💧',
        diagramType: 'flowchart',
        mermaidCode: 'graph TD\nA-->B-->C',
      };

      const result = await requireDiagramHandler()(args);
      expect(result.success).toBe(true);
    });
  });
});
