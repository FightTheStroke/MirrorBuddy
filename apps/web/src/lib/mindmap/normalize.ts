import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { MindmapError, type MindmapContent, type MindmapNode } from './protocol';

const legacyNode = z.object({
  id: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1),
  color: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  children: z.array(z.unknown()).optional(),
});

export function withMarkdown(title: string, nodes: MindmapNode[]): MindmapContent {
  const lines = [`# ${title}`];
  const visit = (node: MindmapNode, level: number) => {
    lines.push(`${'#'.repeat(level)} ${node.label}`);
    node.children.forEach((child) => visit(child, level + 1));
  };
  nodes.forEach((node) => visit(node, 2));
  return { title, nodes, markdown: lines.join('\n') };
}

function fromMarkdown(markdown: string): unknown[] {
  const roots: MindmapNode[] = [];
  const stack: { node: MindmapNode; depth: number }[] = [];
  for (const line of markdown.split('\n').filter((item) => item.trim())) {
    const match = /^(#+)\s+(.+)$/.exec(line);
    if (!match) throw new MindmapError('UNSUPPORTED_MARKDOWN', 400);
    const depth = match[1].length;
    if (depth === 1) continue;
    const node: MindmapNode = { id: randomUUID(), label: match[2].trim(), children: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack.at(-1);
    (parent ? parent.node.children : roots).push(node);
    stack.push({ node, depth });
  }
  if (!roots.length) throw new MindmapError('EMPTY_MARKDOWN', 400);
  return roots;
}

/** Converts legacy flat/nested trees once; rejects ambiguous or orphaned nodes. */
export function normalizeMindmap(input: unknown, storedTitle?: string): MindmapContent {
  const parsed = z
    .object({
      title: z.string().trim().optional(),
      nodes: z.array(z.unknown()).optional(),
      markdown: z.string().optional(),
    })
    .parse(input);
  const title = z
    .string()
    .trim()
    .min(1)
    .parse(parsed.title || storedTitle);
  const raw = parsed.nodes ?? (parsed.markdown ? fromMarkdown(parsed.markdown) : undefined);
  if (!raw) throw new MindmapError('MISSING_NODES', 400);
  const ids = new Set<string>();
  let count = 0;
  const convert = (value: unknown, depth = 0): MindmapNode => {
    if (depth > 64 || ++count > 5000) throw new MindmapError('TREE_TOO_LARGE', 400);
    const node = legacyNode.parse(value);
    const id = node.id ?? randomUUID();
    if (ids.has(id)) throw new MindmapError('DUPLICATE_NODE_ID', 400);
    ids.add(id);
    return {
      id,
      label: node.label,
      ...(node.color ? { color: node.color } : {}),
      ...(node.icon ? { icon: node.icon } : {}),
      children: (node.children ?? []).map((child) => convert(child, depth + 1)),
    };
  };
  const legacy = raw.map((node) => legacyNode.parse(node));
  const nodes = raw.map((node) => convert(node));
  const isFlat = legacy.some((node) => node.parentId && node.parentId !== 'null');
  if (!isFlat) return withMarkdown(title, nodes);
  if (legacy.some((node) => node.children?.length))
    throw new MindmapError('MIXED_TREE_REPRESENTATION', 400);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots: MindmapNode[] = [];
  const parents = new Map<string, string>();
  legacy.forEach((node, index) => {
    const parentId = node.parentId;
    if (!parentId || parentId === 'null') roots.push(nodes[index]);
    else {
      const parent = byId.get(parentId);
      if (!parent) throw new MindmapError('MISSING_PARENT', 400);
      parents.set(nodes[index].id, parentId);
      parent.children.push(nodes[index]);
    }
  });
  for (const node of nodes) {
    const seen = new Set<string>();
    let id: string | undefined = node.id;
    while (id) {
      if (seen.has(id)) throw new MindmapError('CYCLIC_TREE', 400);
      if (seen.size > 64) throw new MindmapError('TREE_TOO_LARGE', 400);
      seen.add(id);
      id = parents.get(id);
    }
  }
  return withMarkdown(title, roots);
}
