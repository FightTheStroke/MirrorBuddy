/**
 * Renderers Tests
 *
 * Tests for content rendering functions.
 */

import { describe, it, expect } from 'vitest';
import {
  renderMindmap,
  renderFlashcards,
  renderSummary,
  renderQuiz,
  renderTimeline,
  renderDiagram,
  renderGenericContent,
} from '../renderers';

describe('Renderers', () => {
  describe('renderMindmap', () => {
    it('should render empty string for no matching nodes', () => {
      const nodes = [{ id: '1', label: 'Root', parentId: 'nonexistent' }];
      const result = renderMindmap(nodes, null);

      expect(result).toBe('');
    });

    it('should render root nodes', () => {
      const nodes = [
        { id: '1', label: 'Root', parentId: null },
      ];
      const result = renderMindmap(nodes);

      expect(result).toContain('Root');
      expect(result).toContain('level-0');
    });

    it('should render nested nodes recursively', () => {
      const nodes = [
        { id: '1', label: 'Root', parentId: null },
        { id: '2', label: 'Child', parentId: '1' },
        { id: '3', label: 'Grandchild', parentId: '2' },
      ];
      const result = renderMindmap(nodes);

      expect(result).toContain('Root');
      expect(result).toContain('Child');
      expect(result).toContain('Grandchild');
    });

    it('should escape HTML in labels', () => {
      const nodes = [
        { id: '1', label: '<script>alert("xss")</script>', parentId: null },
      ];
      const result = renderMindmap(nodes);

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('renderFlashcards', () => {
    it('should render flashcard structure', () => {
      const cards = [{ front: 'Question', back: 'Answer' }];
      const result = renderFlashcards(cards);

      expect(result).toContain('Question');
      expect(result).toContain('Answer');
      expect(result).toContain('flashcard-front');
      expect(result).toContain('flashcard-back');
    });

    it('should include aria labels', () => {
      const cards = [{ front: 'Q', back: 'A' }];
      const result = renderFlashcards(cards);

      expect(result).toContain('aria-label="Flashcard 1"');
    });

    it('should escape HTML in content', () => {
      const cards = [{ front: '<b>Bold</b>', back: '<i>Italic</i>' }];
      const result = renderFlashcards(cards);

      expect(result).toContain('&lt;b&gt;');
      expect(result).toContain('&lt;i&gt;');
    });
  });

  describe('renderSummary', () => {
    it('should render summary with topic', () => {
      const data = {
        topic: 'Test Topic',
        sections: [],
      };
      const result = renderSummary(data);

      expect(result).toContain('Test Topic');
      expect(result).toContain('<h2>');
    });

    it('should render length labels', () => {
      const data = {
        topic: 'Topic',
        sections: [],
        length: 'short' as const,
      };
      const result = renderSummary(data);

      expect(result).toContain('Breve');
    });

    it('should render medium length label', () => {
      const data = {
        topic: 'Topic',
        sections: [],
        length: 'medium' as const,
      };
      const result = renderSummary(data);

      expect(result).toContain('Medio');
    });

    it('should render long length label', () => {
      const data = {
        topic: 'Topic',
        sections: [],
        length: 'long' as const,
      };
      const result = renderSummary(data);

      expect(result).toContain('Dettagliato');
    });

    it('should handle unknown length label', () => {
      const data = {
        topic: 'Topic',
        sections: [],
        length: 'unknown' as 'short' | 'medium' | 'long',
      };
      const result = renderSummary(data);

      expect(result).toContain('Tipo: Riassunto');
    });

    it('should render sections with key points', () => {
      const data = {
        topic: 'Topic',
        sections: [
          {
            title: 'Section 1',
            content: 'Content here',
            keyPoints: ['Point 1', 'Point 2'],
          },
        ],
      };
      const result = renderSummary(data);

      expect(result).toContain('Section 1');
      expect(result).toContain('Content here');
      expect(result).toContain('Point 1');
      expect(result).toContain('Point 2');
      expect(result).toContain('Punti chiave');
    });

    it('should handle sections without content', () => {
      const data = {
        topic: 'Topic',
        sections: [{ title: 'Empty' }],
      };
      const result = renderSummary(data);

      expect(result).toContain('Empty');
    });
  });

  describe('renderQuiz', () => {
    it('should render quiz questions', () => {
      const data = {
        topic: 'Quiz',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5'],
            correctIndex: 1,
          },
        ],
      };
      const result = renderQuiz(data);

      expect(result).toContain('What is 2+2?');
      expect(result).toContain('Domanda 1');
    });

    it('should mark correct answers', () => {
      const data = {
        topic: 'Quiz',
        questions: [
          {
            question: 'Q?',
            options: ['Wrong', 'Right'],
            correctIndex: 1,
          },
        ],
      };
      const result = renderQuiz(data);

      expect(result).toContain('(Corretta)');
      expect(result).toContain('class="quiz-option correct"');
    });

    it('should render explanations', () => {
      const data = {
        topic: 'Quiz',
        questions: [
          {
            question: 'Q?',
            options: ['A'],
            correctIndex: 0,
            explanation: 'Because...',
          },
        ],
      };
      const result = renderQuiz(data);

      expect(result).toContain('Spiegazione: Because...');
    });
  });

  describe('renderTimeline', () => {
    it('should render timeline events', () => {
      const data = {
        topic: 'History',
        events: [
          { date: '1492', title: 'Discovery', description: 'Columbus sailed' },
        ],
      };
      const result = renderTimeline(data);

      expect(result).toContain('1492');
      expect(result).toContain('Discovery');
      expect(result).toContain('Columbus sailed');
    });

    it('should handle events without date', () => {
      const data = {
        topic: 'Events',
        events: [{ title: 'No Date Event' }],
      };
      const result = renderTimeline(data);

      expect(result).toContain('No Date Event');
      expect(result).toContain('timeline-date');
    });

    it('should handle events without description', () => {
      const data = {
        topic: 'Events',
        events: [{ date: '2000', title: 'Title Only' }],
      };
      const result = renderTimeline(data);

      expect(result).toContain('Title Only');
      expect(result).not.toContain('<p></p>');
    });
  });

  describe('renderDiagram', () => {
    it('should render diagram with mermaid code', () => {
      const data = {
        topic: 'Flow',
        diagramType: 'flowchart' as const,
        mermaidCode: 'graph TD; A-->B;',
      };
      const result = renderDiagram(data);

      expect(result).toContain('Diagramma di flusso');
      expect(result).toContain('graph TD; A--&gt;B;');
    });

    it('should render sequence diagram label', () => {
      const data = {
        topic: 'Sequence',
        diagramType: 'sequence' as const,
        mermaidCode: 'test',
      };
      const result = renderDiagram(data);

      expect(result).toContain('Diagramma di sequenza');
    });

    it('should handle missing mermaid code', () => {
      const data = {
        topic: 'Empty',
        diagramType: 'flowchart' as const,
      };
      const result = renderDiagram(data);

      expect(result).toContain('Nessun codice diagramma disponibile');
    });

    it('should handle unknown diagram type', () => {
      const data = {
        topic: 'Unknown',
        diagramType: 'unknown' as 'flowchart',
        mermaidCode: 'code',
      };
      const result = renderDiagram(data);

      expect(result).toContain('Diagramma:');
    });
  });

  describe('renderGenericContent', () => {
    it('should render string content', () => {
      const result = renderGenericContent('Plain text');

      expect(result).toContain('Plain text');
      expect(result).toContain('<p>');
    });

    it('should escape HTML in string content', () => {
      const result = renderGenericContent('<script>alert("xss")</script>');

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should render array content as list', () => {
      const result = renderGenericContent(['Item 1', 'Item 2']);

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });

    it('should render object content as JSON', () => {
      const result = renderGenericContent({ key: 'value' });

      expect(result).toContain('<pre');
      // HTML escapes quotes to &quot;
      expect(result).toContain('&quot;key&quot;');
      expect(result).toContain('&quot;value&quot;');
    });

    it('should handle null by converting to string', () => {
      const result = renderGenericContent(null);

      expect(result).toContain('null');
    });

    it('should handle number by converting to string', () => {
      const result = renderGenericContent(42);

      expect(result).toContain('42');
    });

    it('should handle undefined by converting to string', () => {
      const result = renderGenericContent(undefined);

      expect(result).toContain('undefined');
    });
  });
});
