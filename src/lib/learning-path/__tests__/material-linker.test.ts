/**
 * Tests for material-linker.ts
 * Plan 8 MVP - Wave 1: Pedagogical Analysis [F-08]
 *
 * @vitest-environment node
 * @module learning-path/__tests__/material-linker.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findRelatedMaterials,
  formatRelatedMaterialsMessage,
  type TopicWithRelations,
} from '../material-linker';
import type { IdentifiedTopic } from '../topic-analyzer';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    material: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('material-linker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // findRelatedMaterials - [F-08]
  // ============================================================================
  describe('findRelatedMaterials', () => {
    const mockTopics: IdentifiedTopic[] = [
      {
        id: 'topic-1',
        title: 'La Repubblica Romana',
        description: 'Il periodo repubblicano',
        keyConcepts: ['Senato', 'Consoli', 'Roma'],
        estimatedDifficulty: 'intermediate',
        order: 1,
        textExcerpt: 'La repubblica romana...',
      },
    ];

    it('should find related materials by keyword match [F-08]', async () => {
      const mockMaterials = [
        {
          id: 'mat-1',
          title: 'Storia del Senato Romano',
          toolType: 'mindmap',
          subject: 'storia',
          topic: 'Roma Antica',
          searchableText: 'Il senato romano era il consiglio principale della Repubblica',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'mat-2',
          title: 'Matematica base',
          toolType: 'quiz',
          subject: 'matematica',
          topic: 'Algebra',
          searchableText: 'Equazioni di primo grado',
          createdAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(prisma.material.findMany).mockResolvedValue(mockMaterials as never);

      const result = await findRelatedMaterials('user-123', mockTopics);

      // Should find the Roman material, not the math one
      expect(result[0].relatedMaterials.length).toBe(1);
      expect(result[0].relatedMaterials[0].title).toBe('Storia del Senato Romano');
      expect(result[0].relatedMaterials[0].matchedKeywords).toContain('senato');
    });

    it('should return empty related materials when no matches', async () => {
      const mockMaterials = [
        {
          id: 'mat-1',
          title: 'Matematica base',
          toolType: 'quiz',
          subject: 'matematica',
          topic: 'Algebra',
          searchableText: 'Equazioni di primo grado',
          createdAt: new Date('2024-01-01'),
        },
      ];

      vi.mocked(prisma.material.findMany).mockResolvedValue(mockMaterials as never);

      const result = await findRelatedMaterials('user-123', mockTopics);

      expect(result[0].relatedMaterials.length).toBe(0);
    });

    it('should limit results to maxPerTopic', async () => {
      const mockMaterials = Array.from({ length: 10 }, (_, i) => ({
        id: `mat-${i}`,
        title: `Documento Roma ${i}`,
        toolType: 'mindmap',
        subject: 'storia',
        topic: 'Roma',
        searchableText: 'senato consoli roma',
        createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
      }));

      vi.mocked(prisma.material.findMany).mockResolvedValue(mockMaterials as never);

      const result = await findRelatedMaterials('user-123', mockTopics, 3);

      expect(result[0].relatedMaterials.length).toBe(3);
    });

    it('should calculate relevance score based on keyword matches', async () => {
      const mockMaterials = [
        {
          id: 'mat-1',
          title: 'Senato e Consoli di Roma',
          toolType: 'mindmap',
          subject: 'storia',
          topic: 'Repubblica',
          searchableText: 'senato consoli roma repubblica',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'mat-2',
          title: 'Solo Roma',
          toolType: 'quiz',
          subject: 'storia',
          topic: null,
          searchableText: 'roma città eterna',
          createdAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(prisma.material.findMany).mockResolvedValue(mockMaterials as never);

      const result = await findRelatedMaterials('user-123', mockTopics);

      // First material should have higher score (more keywords matched)
      expect(result[0].relatedMaterials[0].relevanceScore).toBeGreaterThan(
        result[0].relatedMaterials[1].relevanceScore
      );
    });

    it('should preserve topic properties in result', async () => {
      vi.mocked(prisma.material.findMany).mockResolvedValue([]);

      const result = await findRelatedMaterials('user-123', mockTopics);

      expect(result[0].id).toBe('topic-1');
      expect(result[0].title).toBe('La Repubblica Romana');
      expect(result[0].keyConcepts).toEqual(['Senato', 'Consoli', 'Roma']);
    });
  });

  // ============================================================================
  // formatRelatedMaterialsMessage
  // ============================================================================
  describe('formatRelatedMaterialsMessage', () => {
    const baseTopic: IdentifiedTopic = {
      id: 'topic-1',
      title: 'Test Topic',
      description: 'Description',
      keyConcepts: ['a', 'b'],
      estimatedDifficulty: 'basic',
      order: 1,
      textExcerpt: '',
    };

    it('should return null when no related materials', () => {
      const topic: TopicWithRelations = {
        ...baseTopic,
        relatedMaterials: [],
      };

      const result = formatRelatedMaterialsMessage(topic);

      expect(result).toBeNull();
    });

    it('should format single material message', () => {
      const topic: TopicWithRelations = {
        ...baseTopic,
        relatedMaterials: [
          {
            id: 'mat-1',
            title: 'Storia Romana',
            toolType: 'mindmap',
            createdAt: new Date(),
            relevanceScore: 0.8,
            matchedKeywords: ['roma'],
          },
        ],
      };

      const result = formatRelatedMaterialsMessage(topic);

      expect(result).toBe('Hai già studiato questo argomento in "Storia Romana"');
    });

    it('should format multiple materials message', () => {
      const topic: TopicWithRelations = {
        ...baseTopic,
        relatedMaterials: [
          {
            id: 'mat-1',
            title: 'Doc A',
            toolType: 'mindmap',
            createdAt: new Date(),
            relevanceScore: 0.8,
            matchedKeywords: ['a'],
          },
          {
            id: 'mat-2',
            title: 'Doc B',
            toolType: 'quiz',
            createdAt: new Date(),
            relevanceScore: 0.6,
            matchedKeywords: ['b'],
          },
        ],
      };

      const result = formatRelatedMaterialsMessage(topic);

      expect(result).toBe('Questo si collega a quello che hai studiato in: "Doc A", "Doc B"');
    });

    it('should show remaining count when more than maxToShow', () => {
      const topic: TopicWithRelations = {
        ...baseTopic,
        relatedMaterials: [
          { id: 'm1', title: 'A', toolType: 't', createdAt: new Date(), relevanceScore: 1, matchedKeywords: [] },
          { id: 'm2', title: 'B', toolType: 't', createdAt: new Date(), relevanceScore: 0.9, matchedKeywords: [] },
          { id: 'm3', title: 'C', toolType: 't', createdAt: new Date(), relevanceScore: 0.8, matchedKeywords: [] },
          { id: 'm4', title: 'D', toolType: 't', createdAt: new Date(), relevanceScore: 0.7, matchedKeywords: [] },
          { id: 'm5', title: 'E', toolType: 't', createdAt: new Date(), relevanceScore: 0.6, matchedKeywords: [] },
        ],
      };

      const result = formatRelatedMaterialsMessage(topic, 2);

      expect(result).toContain('"A", "B"');
      expect(result).toContain('e altri 3 materiali');
    });
  });
});
