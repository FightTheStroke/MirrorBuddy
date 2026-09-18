import { randomUUID } from 'node:crypto';
import { COLOR_MAP } from '@/components/tools/interactive-markmap/types';
import {
  MindmapError,
  type MindmapCommand,
  type MindmapContent,
  type MindmapNode,
} from './protocol';
import { normalizeMindmap, withMarkdown } from './normalize';
export { normalizeMindmap } from './normalize';

function locate(nodes: MindmapNode[], target: string) {
  const matches: { node: MindmapNode; siblings: MindmapNode[] }[] = [];
  const visit = (siblings: MindmapNode[]) => {
    for (const node of siblings) {
      if (node.id === target || node.label.toLowerCase() === target.toLowerCase())
        matches.push({ node, siblings });
      visit(node.children);
    }
  };
  visit(nodes);
  const byId = matches.find(({ node }) => node.id === target);
  if (byId) return byId;
  if (matches.length !== 1)
    throw new MindmapError(matches.length ? 'AMBIGUOUS_NODE' : 'NODE_NOT_FOUND', 400);
  return matches[0];
}

export function resolveMindmapFocus(content: MindmapContent, target: string) {
  const { node } = locate(content.nodes, target);
  return { nodeId: node.id, label: node.label };
}

/** A single server-side operation produces the next immutable, canonical tree. */
export function applyMindmapCommand(
  content: MindmapContent,
  command: MindmapCommand,
): MindmapContent {
  if (command.command === 'mindmap_replace') return normalizeMindmap(command.args.content);
  const nodes = structuredClone(content.nodes);
  switch (command.command) {
    case 'mindmap_add_node': {
      const { concept, parentNode } = command.args;
      const children = parentNode ? locate(nodes, parentNode).node.children : nodes;
      children.push({ id: randomUUID(), label: concept, children: [] });
      break;
    }
    case 'mindmap_expand_node': {
      const { node, suggestions } = command.args;
      locate(nodes, node).node.children.push(
        ...suggestions.map((label) => ({
          id: randomUUID(),
          label,
          children: [],
        })),
      );
      break;
    }
    case 'mindmap_delete_node': {
      const { node, siblings } = locate(nodes, command.args.node);
      siblings.splice(siblings.indexOf(node), 1);
      break;
    }
    case 'mindmap_set_color': {
      const { node, color } = command.args;
      locate(nodes, node).node.color = COLOR_MAP[color.toLowerCase()] ?? color;
      break;
    }
    case 'mindmap_connect_nodes': {
      const parent = locate(nodes, command.args.nodeA).node;
      const { node, siblings } = locate(nodes, command.args.nodeB);
      const contains = (candidate: MindmapNode): boolean =>
        candidate.id === parent.id || candidate.children.some(contains);
      if (contains(node)) throw new MindmapError('CYCLIC_TREE', 400);
      siblings.splice(siblings.indexOf(node), 1);
      parent.children.push(node);
      break;
    }
  }
  return normalizeMindmap(withMarkdown(content.title, nodes));
}
