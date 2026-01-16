/**
 * Transparency Service Tests
 * Part of Ethical Design Hardening (F-09, F-10, F-11, F-12)
 */

import { describe, it, expect } from 'vitest';
import {
  assessResponseTransparency,
  getTransparencyDisplayConfig,
  formatCitationsForDisplay,
  type TransparencyContext,
} from '../transparency-service';

describe('transparency-service', () => {
  describe('assessResponseTransparency', () => {
    it('should return metadata with high confidence for RAG-backed response', () => {
      const context: TransparencyContext = {
        response: 'La fotosintesi è il processo delle piante',
        query: 'Cosa è la fotosintesi?',
        ragResults: [
          { content: 'La fotosintesi è il processo...', similarity: 0.85 },
        ],
        usedKnowledgeBase: true,
        maestroId: 'darwin',
      };

      const result = assessResponseTransparency(context);

      expect(result.confidence).toBeDefined();
      expect(result.confidence.level).toBe('high');
      expect(result.citations.length).toBeGreaterThan(0);
    });

    it('should return lower confidence without RAG results or knowledge base', () => {
      const context: TransparencyContext = {
        response: 'Questa è una risposta generica',
        query: 'Dimmi qualcosa',
        usedKnowledgeBase: false,
      };

      const result = assessResponseTransparency(context);

      expect(result.confidence.level).not.toBe('high');
    });

    it('should detect hallucination risk for uncertain claims', () => {
      const context: TransparencyContext = {
        response: 'Nel 2050 le macchine voleranno sicuramente, secondo studi mostrano',
        query: 'Come sarà il futuro?',
        usedKnowledgeBase: false,
      };

      const result = assessResponseTransparency(context);

      expect(result.hallucinationRisk).toBeDefined();
      expect(['medium', 'high', 'low']).toContain(result.hallucinationRisk.level);
    });

    it('should include assessment timestamp', () => {
      const context: TransparencyContext = {
        response: 'Test response',
        query: 'Test query',
        usedKnowledgeBase: false,
      };

      const result = assessResponseTransparency(context);

      expect(result.assessedAt).toBeInstanceOf(Date);
    });

    it('should have showTransparencyUI property', () => {
      const context: TransparencyContext = {
        response: 'Non sono sicuro ma forse...',
        query: 'Domanda difficile',
        usedKnowledgeBase: false,
      };

      const result = assessResponseTransparency(context);

      expect(typeof result.showTransparencyUI).toBe('boolean');
    });

    it('should attribute to knowledge base when used', () => {
      const context: TransparencyContext = {
        response: 'La risposta dal maestro',
        query: 'Insegnami qualcosa',
        usedKnowledgeBase: true,
        maestroId: 'euclide',
      };

      const result = assessResponseTransparency(context);

      expect(result.primarySource).toBe('knowledge_base');
    });

    it('should have citations even without specific sources', () => {
      const context: TransparencyContext = {
        response: 'Generic AI response',
        query: 'Question',
        usedKnowledgeBase: false,
      };

      const result = assessResponseTransparency(context);

      // Should at least have model_generated citation
      expect(result.citations.length).toBeGreaterThan(0);
    });
  });

  describe('getTransparencyDisplayConfig', () => {
    it('should return display config with badge color', () => {
      const config = getTransparencyDisplayConfig({
        primarySource: 'knowledge_base',
        citations: [],
        confidence: { level: 'high', score: 0.9, factors: [], explanation: '' },
        hallucinationRisk: { level: 'low', indicators: [], score: 0.1 },
        showTransparencyUI: false,
        assessedAt: new Date(),
      });

      expect(config.badgeColor).toBeDefined();
      expect(['green', 'yellow', 'orange', 'red']).toContain(config.badgeColor);
    });

    it('should return green badge for high confidence', () => {
      const config = getTransparencyDisplayConfig({
        primarySource: 'knowledge_base',
        citations: [],
        confidence: { level: 'high', score: 0.9, factors: [], explanation: '' },
        hallucinationRisk: { level: 'none', indicators: [], score: 0 },
        showTransparencyUI: false,
        assessedAt: new Date(),
      });

      expect(config.badgeColor).toBe('green');
    });

    it('should return red badge for high hallucination risk', () => {
      const config = getTransparencyDisplayConfig({
        primarySource: 'model_generated',
        citations: [],
        confidence: { level: 'low', score: 0.3, factors: [], explanation: '' },
        hallucinationRisk: { level: 'high', indicators: [], score: 0.8 },
        showTransparencyUI: true,
        assessedAt: new Date(),
      });

      expect(config.badgeColor).toBe('red');
    });

    it('should include icon property', () => {
      const config = getTransparencyDisplayConfig({
        primarySource: 'rag_retrieval',
        citations: [],
        confidence: { level: 'medium', score: 0.6, factors: [], explanation: '' },
        hallucinationRisk: { level: 'low', indicators: [], score: 0.2 },
        showTransparencyUI: false,
        assessedAt: new Date(),
      });

      expect(config.icon).toBeDefined();
    });
  });

  describe('formatCitationsForDisplay', () => {
    it('should return label for single citation', () => {
      const citations = [
        {
          type: 'rag_retrieval' as const,
          label: 'Materiale studente',
          referenceId: 'mat-123',
          referenceType: 'study_material' as const,
          confidence: 0.85,
          excerpt: 'La fotosintesi è...',
        },
      ];

      const formatted = formatCitationsForDisplay(citations);

      expect(formatted).toBe('Materiale studente');
    });

    it('should return default label for no citations', () => {
      const formatted = formatCitationsForDisplay([]);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('should handle multiple citations', () => {
      const citations = [
        {
          type: 'rag_retrieval' as const,
          label: 'Fonte 1',
          confidence: 0.9,
        },
        {
          type: 'knowledge_base' as const,
          label: 'Fonte 2',
          confidence: 0.8,
        },
      ];

      const formatted = formatCitationsForDisplay(citations);

      expect(formatted).toContain('Fonte 1');
      expect(formatted).toContain('+1');
    });
  });
});
