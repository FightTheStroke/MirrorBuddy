/**
 * Tests for Mindmap Import Helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn();
vi.stubGlobal('crypto', { randomUUID: mockRandomUUID });

describe('mindmap-import helpers', () => {
  beforeEach(() => {
    mockRandomUUID.mockReturnValue('12345678-1234-1234-1234-123456789abc');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  describe('generateId', () => {
    it('generates ID with timestamp and UUID prefix', async () => {
      const { generateId } = await import('../helpers');
      const id = generateId();

      expect(id).toMatch(/^node_\d+_[a-f0-9]{8}$/);
    });

    it('generates unique IDs on each call', async () => {
      mockRandomUUID
        .mockReturnValueOnce('11111111-1111-1111-1111-111111111111')
        .mockReturnValueOnce('22222222-2222-2222-2222-222222222222');

      const { generateId } = await import('../helpers');
      const id1 = generateId();
      vi.advanceTimersByTime(1);
      const id2 = generateId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('ensureNodeIds', () => {
    it('adds ID to node without ID', async () => {
      const { ensureNodeIds } = await import('../helpers');
      const node = { text: 'Test Node' } as { text: string; id?: string };

      ensureNodeIds(node as ReturnType<typeof import('../helpers')>['ensureNodeIds'] extends (n: infer T) => void ? T : never);

      expect(node.id).toBeDefined();
      expect(node.id).toMatch(/^node_\d+_[a-f0-9]{8}$/);
    });

    it('preserves existing ID', async () => {
      const { ensureNodeIds } = await import('../helpers');
      const node = { id: 'existing-id', text: 'Test Node' };

      ensureNodeIds(node as ReturnType<typeof import('../helpers')>['ensureNodeIds'] extends (n: infer T) => void ? T : never);

      expect(node.id).toBe('existing-id');
    });

    it('recursively adds IDs to children', async () => {
      const { ensureNodeIds } = await import('../helpers');
      const node = {
        text: 'Parent',
        children: [
          { text: 'Child 1' },
          { text: 'Child 2', id: 'keep-this' },
        ],
      };

      ensureNodeIds(node as ReturnType<typeof import('../helpers')>['ensureNodeIds'] extends (n: infer T) => void ? T : never);

      expect(node.children[0].id).toBeDefined();
      expect(node.children[1].id).toBe('keep-this');
    });

    it('handles deeply nested children', async () => {
      const { ensureNodeIds } = await import('../helpers');
      const node = {
        text: 'Root',
        children: [
          {
            text: 'Level 1',
            children: [
              {
                text: 'Level 2',
                children: [{ text: 'Level 3' }],
              },
            ],
          },
        ],
      };

      ensureNodeIds(node as ReturnType<typeof import('../helpers')>['ensureNodeIds'] extends (n: infer T) => void ? T : never);

      expect(node.children[0].children[0].children[0].id).toBeDefined();
    });

    it('handles node with empty children array', async () => {
      const { ensureNodeIds } = await import('../helpers');
      const node = { text: 'Node', children: [] };

      // Should not throw
      expect(() => ensureNodeIds(node as ReturnType<typeof import('../helpers')>['ensureNodeIds'] extends (n: infer T) => void ? T : never)).not.toThrow();
    });
  });
});
