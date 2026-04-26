import { describe, expect, it } from 'vitest';
import { CreateMaterialSchema, UpdateMaterialSchema } from '../schemas/materials';

describe('Materials Validation Schemas', () => {
  describe('CreateMaterialSchema', () => {
    const validMaterial = {
      toolId: 'tool-123',
      toolType: 'mindmap' as const,
      title: 'Introduction to Math',
      content: { data: 'sample content' },
    };

    it('accepts valid material with required fields only', () => {
      expect(() => CreateMaterialSchema.parse(validMaterial)).not.toThrow();
    });

    it('accepts valid material with all optional fields', () => {
      const fullMaterial = {
        ...validMaterial,
        maestroId: 'socrates',
        sessionId: 'session-456',
        subject: 'Mathematics',
        preview: 'A quick overview of math concepts',
        collectionId: 'collection-789',
        tagIds: ['tag1', 'tag2', 'tag3'],
        userId: 'user-123',
      };
      expect(() => CreateMaterialSchema.parse(fullMaterial)).not.toThrow();
    });

    it('accepts all valid tool types', () => {
      const validToolTypes = [
        'mindmap',
        'quiz',
        'flashcard',
        'demo',
        'webcam',
        'pdf',
        'search',
        'diagram',
        'timeline',
        'summary',
        'formula',
        'chart',
      ];

      validToolTypes.forEach(toolType => {
        const material = { ...validMaterial, toolType };
        expect(() => CreateMaterialSchema.parse(material)).not.toThrow();
      });
    });

    it('rejects invalid tool type', () => {
      const invalidMaterial = {
        ...validMaterial,
        toolType: 'invalid-type',
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('rejects empty toolId', () => {
      const invalidMaterial = {
        ...validMaterial,
        toolId: '',
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('rejects toolId exceeding max length', () => {
      const invalidMaterial = {
        ...validMaterial,
        toolId: 'a'.repeat(256),
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('accepts toolId at max length', () => {
      const validMaterialAtMax = {
        ...validMaterial,
        toolId: 'a'.repeat(255),
      };
      expect(() => CreateMaterialSchema.parse(validMaterialAtMax)).not.toThrow();
    });

    it('rejects empty title', () => {
      const invalidMaterial = {
        ...validMaterial,
        title: '',
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('rejects title exceeding max length', () => {
      const invalidMaterial = {
        ...validMaterial,
        title: 'a'.repeat(501),
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('accepts title at max length', () => {
      const validMaterialAtMax = {
        ...validMaterial,
        title: 'a'.repeat(500),
      };
      expect(() => CreateMaterialSchema.parse(validMaterialAtMax)).not.toThrow();
    });

    it('accepts content as record with any structure', () => {
      const materials = [
        { ...validMaterial, content: {} },
        { ...validMaterial, content: { key: 'value' } },
        { ...validMaterial, content: { nested: { data: 123 } } },
        { ...validMaterial, content: { array: [1, 2, 3] } },
      ];

      materials.forEach(material => {
        expect(() => CreateMaterialSchema.parse(material)).not.toThrow();
      });
    });

    it('rejects non-object content', () => {
      const invalidMaterials = [
        { ...validMaterial, content: 'string' },
        { ...validMaterial, content: 123 },
        { ...validMaterial, content: null },
        { ...validMaterial, content: [] },
      ];

      invalidMaterials.forEach(material => {
        expect(() => CreateMaterialSchema.parse(material)).toThrow();
      });
    });

    it('accepts maestroId within max length', () => {
      const validMaterialWithMaestro = {
        ...validMaterial,
        maestroId: 'a'.repeat(100),
      };
      expect(() => CreateMaterialSchema.parse(validMaterialWithMaestro)).not.toThrow();
    });

    it('rejects maestroId exceeding max length', () => {
      const invalidMaterial = {
        ...validMaterial,
        maestroId: 'a'.repeat(101),
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('accepts sessionId within max length', () => {
      const validMaterialWithSession = {
        ...validMaterial,
        sessionId: 'a'.repeat(100),
      };
      expect(() => CreateMaterialSchema.parse(validMaterialWithSession)).not.toThrow();
    });

    it('rejects sessionId exceeding max length', () => {
      const invalidMaterial = {
        ...validMaterial,
        sessionId: 'a'.repeat(101),
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('accepts subject within max length', () => {
      const validMaterialWithSubject = {
        ...validMaterial,
        subject: 'a'.repeat(200),
      };
      expect(() => CreateMaterialSchema.parse(validMaterialWithSubject)).not.toThrow();
    });

    it('rejects subject exceeding max length', () => {
      const invalidMaterial = {
        ...validMaterial,
        subject: 'a'.repeat(201),
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('accepts preview within max length', () => {
      const validMaterialWithPreview = {
        ...validMaterial,
        preview: 'a'.repeat(1000),
      };
      expect(() => CreateMaterialSchema.parse(validMaterialWithPreview)).not.toThrow();
    });

    it('rejects preview exceeding max length', () => {
      const invalidMaterial = {
        ...validMaterial,
        preview: 'a'.repeat(1001),
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('accepts tagIds array within max size', () => {
      const validMaterialWithTags = {
        ...validMaterial,
        tagIds: Array(50).fill('tag'),
      };
      expect(() => CreateMaterialSchema.parse(validMaterialWithTags)).not.toThrow();
    });

    it('rejects tagIds array exceeding max size', () => {
      const invalidMaterial = {
        ...validMaterial,
        tagIds: Array(51).fill('tag'),
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });

    it('rejects missing required fields', () => {
      expect(() => CreateMaterialSchema.parse({ toolType: 'mindmap', title: 'Test', content: {} })).toThrow();
      expect(() => CreateMaterialSchema.parse({ toolId: '123', title: 'Test', content: {} })).toThrow();
      expect(() => CreateMaterialSchema.parse({ toolId: '123', toolType: 'mindmap', content: {} })).toThrow();
      expect(() => CreateMaterialSchema.parse({ toolId: '123', toolType: 'mindmap', title: 'Test' })).toThrow();
    });

    it('rejects extra fields due to strict mode', () => {
      const invalidMaterial = {
        ...validMaterial,
        extraField: 'not allowed',
      };
      expect(() => CreateMaterialSchema.parse(invalidMaterial)).toThrow();
    });
  });

  describe('UpdateMaterialSchema', () => {
    const validUpdate = {
      toolId: 'tool-123',
    };

    it('accepts valid update with only toolId', () => {
      expect(() => UpdateMaterialSchema.parse(validUpdate)).not.toThrow();
    });

    it('accepts valid update with all optional fields', () => {
      const fullUpdate = {
        ...validUpdate,
        title: 'Updated Title',
        content: { updated: 'data' },
        status: 'archived' as const,
        userRating: 4,
        isBookmarked: true,
        collectionId: 'collection-789',
        tagIds: ['tag1', 'tag2'],
      };
      expect(() => UpdateMaterialSchema.parse(fullUpdate)).not.toThrow();
    });

    it('rejects empty toolId', () => {
      const invalidUpdate = {
        toolId: '',
      };
      expect(() => UpdateMaterialSchema.parse(invalidUpdate)).toThrow();
    });

    it('rejects toolId exceeding max length', () => {
      const invalidUpdate = {
        toolId: 'a'.repeat(256),
      };
      expect(() => UpdateMaterialSchema.parse(invalidUpdate)).toThrow();
    });

    it('accepts title at max length', () => {
      const validUpdateAtMax = {
        ...validUpdate,
        title: 'a'.repeat(500),
      };
      expect(() => UpdateMaterialSchema.parse(validUpdateAtMax)).not.toThrow();
    });

    it('rejects empty title', () => {
      const invalidUpdate = {
        ...validUpdate,
        title: '',
      };
      expect(() => UpdateMaterialSchema.parse(invalidUpdate)).toThrow();
    });

    it('rejects title exceeding max length', () => {
      const invalidUpdate = {
        ...validUpdate,
        title: 'a'.repeat(501),
      };
      expect(() => UpdateMaterialSchema.parse(invalidUpdate)).toThrow();
    });

    it('accepts content as record with any structure', () => {
      const updates = [
        { ...validUpdate, content: {} },
        { ...validUpdate, content: { key: 'value' } },
        { ...validUpdate, content: { nested: { data: 123 } } },
      ];

      updates.forEach(update => {
        expect(() => UpdateMaterialSchema.parse(update)).not.toThrow();
      });
    });

    it('rejects non-object content', () => {
      const invalidUpdates = [
        { ...validUpdate, content: 'string' },
        { ...validUpdate, content: 123 },
        { ...validUpdate, content: [] },
      ];

      invalidUpdates.forEach(update => {
        expect(() => UpdateMaterialSchema.parse(update)).toThrow();
      });
    });

    it('accepts all valid status values', () => {
      const validStatuses = ['active', 'archived', 'deleted'];
      validStatuses.forEach(status => {
        const update = { ...validUpdate, status };
        expect(() => UpdateMaterialSchema.parse(update)).not.toThrow();
      });
    });

    it('rejects invalid status', () => {
      const invalidUpdate = {
        ...validUpdate,
        status: 'pending',
      };
      expect(() => UpdateMaterialSchema.parse(invalidUpdate)).toThrow();
    });

    it('accepts userRating within valid range', () => {
      const ratings = [1, 2, 3, 4, 5];
      ratings.forEach(rating => {
        const update = { ...validUpdate, userRating: rating };
        expect(() => UpdateMaterialSchema.parse(update)).not.toThrow();
      });
    });

    it('rejects userRating outside valid range', () => {
      expect(() => UpdateMaterialSchema.parse({ ...validUpdate, userRating: 0 })).toThrow();
      expect(() => UpdateMaterialSchema.parse({ ...validUpdate, userRating: 6 })).toThrow();
    });

    it('rejects non-integer userRating', () => {
      expect(() => UpdateMaterialSchema.parse({ ...validUpdate, userRating: 3.5 })).toThrow();
    });

    it('accepts boolean isBookmarked', () => {
      expect(() => UpdateMaterialSchema.parse({ ...validUpdate, isBookmarked: true })).not.toThrow();
      expect(() => UpdateMaterialSchema.parse({ ...validUpdate, isBookmarked: false })).not.toThrow();
    });

    it('rejects non-boolean isBookmarked', () => {
      expect(() => UpdateMaterialSchema.parse({ ...validUpdate, isBookmarked: 'true' })).toThrow();
      expect(() => UpdateMaterialSchema.parse({ ...validUpdate, isBookmarked: 1 })).toThrow();
    });

    it('accepts null collectionId', () => {
      const validUpdateWithNull = {
        ...validUpdate,
        collectionId: null,
      };
      expect(() => UpdateMaterialSchema.parse(validUpdateWithNull)).not.toThrow();
    });

    it('accepts string collectionId', () => {
      const validUpdateWithCollection = {
        ...validUpdate,
        collectionId: 'collection-123',
      };
      expect(() => UpdateMaterialSchema.parse(validUpdateWithCollection)).not.toThrow();
    });

    it('accepts tagIds array within max size', () => {
      const validUpdateWithTags = {
        ...validUpdate,
        tagIds: Array(50).fill('tag'),
      };
      expect(() => UpdateMaterialSchema.parse(validUpdateWithTags)).not.toThrow();
    });

    it('rejects tagIds array exceeding max size', () => {
      const invalidUpdate = {
        ...validUpdate,
        tagIds: Array(51).fill('tag'),
      };
      expect(() => UpdateMaterialSchema.parse(invalidUpdate)).toThrow();
    });

    it('rejects missing toolId', () => {
      expect(() => UpdateMaterialSchema.parse({ title: 'Test' })).toThrow();
    });

    it('rejects extra fields due to strict mode', () => {
      const invalidUpdate = {
        ...validUpdate,
        extraField: 'not allowed',
      };
      expect(() => UpdateMaterialSchema.parse(invalidUpdate)).toThrow();
    });
  });
});
