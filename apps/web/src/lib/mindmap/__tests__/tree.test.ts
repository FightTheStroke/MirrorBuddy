import { describe, expect, it } from 'vitest';
import { applyMindmapCommand, normalizeMindmap } from '../tree';
import { commandSchema, identitySchema } from '../protocol';

const source = {
  title: 'Biology',
  nodes: [
    {
      id: 'root',
      label: 'Cells',
      color: '#ef4444',
      children: [{ id: 'child', label: 'Nucleus', icon: 'atom', children: [] }],
    },
    { id: 'other', label: 'Water', children: [] },
  ],
};
const command = (name: string, args: Record<string, unknown>) =>
  commandSchema.parse({
    sessionId: 'voice-1',
    toolId: 'map-1',
    operationId: 'op-1',
    baseRevision: 0,
    command: name,
    args,
  });

describe('authoritative mindmap tree', () => {
  it('normalizes flat legacy content without changing IDs, color or hierarchy', () => {
    const result = normalizeMindmap({
      title: 'Biology',
      nodes: [
        { id: 'child', label: 'Nucleus', parentId: 'root', color: '#123456' },
        { id: 'root', label: 'Cells', parentId: null },
      ],
    });
    expect(result.nodes).toEqual([
      {
        id: 'root',
        label: 'Cells',
        children: [{ id: 'child', label: 'Nucleus', color: '#123456', children: [] }],
      },
    ]);
  });

  it('preserves nested content including optional icons and colors', () => {
    expect(normalizeMindmap(source).nodes).toEqual(source.nodes);
  });

  it('uses the stored Material title when legacy content has only nodes', () => {
    expect(normalizeMindmap({ nodes: source.nodes }, 'Stored title').title).toBe('Stored title');
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'rejects reserved map identity %s',
    (toolId) => {
      expect(identitySchema.safeParse({ sessionId: 's', toolId }).success).toBe(false);
    },
  );

  it('assigns stable IDs once to legacy markdown', () => {
    const result = normalizeMindmap({
      title: 'Biology',
      markdown: '# Biology\n## Cells\n### Nucleus',
    });
    expect(result.nodes[0].id).toBeTruthy();
    expect(result.nodes[0].children[0].label).toBe('Nucleus');
    expect(normalizeMindmap(result)).toEqual(result);
  });

  it.each([
    null,
    undefined,
    {},
    { title: ' ' },
    { title: 'X', nodes: [{ id: 'x', label: '' }] },
    {
      title: 'X',
      nodes: [
        { id: 'x', label: 'A' },
        { id: 'x', label: 'B' },
      ],
    },
    { title: 'X', nodes: [{ id: 'x', label: 'A', parentId: 'missing' }] },
    {
      title: 'X',
      nodes: [
        { id: 'x', label: 'A', parentId: 'y' },
        { id: 'y', label: 'B', parentId: 'x' },
      ],
    },
    { title: 'X', markdown: 'unsupported content' },
  ])('rejects malformed or lossy source: %j', (input) => {
    expect(() => normalizeMindmap(input)).toThrow();
  });

  it('adds only on the server and does not mutate the previous snapshot', () => {
    const before = normalizeMindmap(source);
    const after = applyMindmapCommand(
      before,
      command('mindmap_add_node', { concept: 'Membrane', parentNode: 'root' }),
    );
    expect(after.nodes[0].children).toHaveLength(2);
    expect(after.nodes[0].children[1]).toMatchObject({ label: 'Membrane', children: [] });
    expect(after.nodes[0].children[1].id).toBeTruthy();
    expect(before.nodes).toEqual(source.nodes);
  });

  it('rejects missing parent instead of silently adding a root', () => {
    expect(() =>
      applyMindmapCommand(
        normalizeMindmap(source),
        command('mindmap_add_node', { concept: 'X', parentNode: 'absent' }),
      ),
    ).toThrow();
  });

  it('rejects ambiguous labels but accepts an exact node ID', () => {
    const map = normalizeMindmap({
      title: 'X',
      nodes: [
        { id: 'a', label: 'Same' },
        { id: 'b', label: 'Same' },
      ],
    });
    expect(() =>
      applyMindmapCommand(map, command('mindmap_delete_node', { node: 'Same' })),
    ).toThrow();
    expect(applyMindmapCommand(map, command('mindmap_delete_node', { node: 'a' })).nodes).toEqual([
      { id: 'b', label: 'Same', children: [] },
    ]);
  });

  it('moves an entire subtree preserving IDs and colors', () => {
    const after = applyMindmapCommand(
      normalizeMindmap(source),
      command('mindmap_connect_nodes', { nodeA: 'other', nodeB: 'root' }),
    );
    expect(after.nodes).toEqual([{ id: 'other', label: 'Water', children: [source.nodes[0]] }]);
  });

  it.each([
    ['root', 'root'],
    ['child', 'root'],
  ])('rejects cyclic moves %s/%s', (nodeA, nodeB) => {
    expect(() =>
      applyMindmapCommand(
        normalizeMindmap(source),
        command('mindmap_connect_nodes', { nodeA, nodeB }),
      ),
    ).toThrow();
  });

  it('expands with supplied content, never fabricated localized placeholders', () => {
    const after = applyMindmapCommand(
      normalizeMindmap(source),
      command('mindmap_expand_node', { node: 'child', suggestions: ['DNA', 'RNA'] }),
    );
    expect(after.nodes[0].children[0].children.map((node) => node.label)).toEqual(['DNA', 'RNA']);
    expect(() => command('mindmap_expand_node', { node: 'child' })).toThrow();
  });

  it('changes color without losing the subtree', () => {
    const after = applyMindmapCommand(
      normalizeMindmap(source),
      command('mindmap_set_color', { node: 'root', color: 'blue' }),
    );
    expect(after.nodes[0]).toEqual({ ...source.nodes[0], color: '#3b82f6' });
  });

  it('supports complete local edit/undo snapshots with explicit versions', () => {
    expect(
      applyMindmapCommand(normalizeMindmap(source), command('mindmap_replace', { content: source }))
        .nodes,
    ).toEqual(source.nodes);
  });

  it.each([
    null,
    {},
    { sessionId: 's', toolId: 'm', command: 'mindmap_delete_node', args: { node: 'root' } },
  ])('rejects an unversioned command: %j', (input) => {
    expect(commandSchema.safeParse(input).success).toBe(false);
  });
});
