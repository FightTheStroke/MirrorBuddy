/**
 * Turns the light Markdown that AI tutors write (**bold**, *italic*, `code`,
 * "### heading", "- bullet") into a tree of plain strings and inline marks.
 *
 * Output is data, never HTML: callers render it as React text nodes, so text
 * from the model cannot inject markup. Anything that is not clearly a mark
 * (5*3*2, file_name.pdf, an unclosed **) stays as written.
 */
export type ReplyMark = 'strong' | 'em' | 'code';
export type ReplyNode = string | { type: ReplyMark; children: ReplyNode[] };

interface InlineRule {
  type: ReplyMark;
  pattern: RegExp;
}

const INLINE_RULES: InlineRule[] = [
  { type: 'code', pattern: /`([^`]+)`/g },
  { type: 'strong', pattern: /\*\*(?=\S)(.*?\S)\*\*(?!\*)/g },
  { type: 'strong', pattern: /(?<!\w)__(?=\S)(.*?\S)__(?!\w)/g },
  { type: 'em', pattern: /(?<![\w*])\*(?![\s*])(.*?[^\s*])\*(?![\w*])/g },
  { type: 'em', pattern: /(?<!\w)_(?![\s_])(.*?[^\s_])_(?!\w)/g },
];

// Real replies nest two or three marks; deeper nesting is degenerate output kept as text.
const MAX_DEPTH = 8;
const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;
const BULLET = /^(\s*)[-*+]\s+/;

function pushText(nodes: ReplyNode[], text: string): void {
  if (!text) return;
  const last = nodes[nodes.length - 1];
  if (typeof last === 'string') nodes[nodes.length - 1] = last + text;
  else nodes.push(text);
}

function parseInline(text: string, depth = 0): ReplyNode[] {
  const nodes: ReplyNode[] = [];
  if (depth >= MAX_DEPTH) return text ? [text] : nodes;
  let position = 0;
  while (position < text.length) {
    let best: { rule: InlineRule; match: RegExpExecArray } | null = null;
    for (const rule of INLINE_RULES) {
      rule.pattern.lastIndex = position;
      const match = rule.pattern.exec(text);
      if (match && (!best || match.index < best.match.index)) best = { rule, match };
    }
    if (!best) break;
    pushText(nodes, text.slice(position, best.match.index));
    const inner = best.match[1];
    nodes.push({
      type: best.rule.type,
      children: best.rule.type === 'code' ? [inner] : parseInline(inner, depth + 1),
    });
    position = best.match.index + best.match[0].length;
  }
  pushText(nodes, text.slice(position));
  return nodes;
}

export function parseReplyText(text: string): ReplyNode[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const nodes: ReplyNode[] = [];
  text.split('\n').forEach((line, index) => {
    if (index > 0) pushText(nodes, '\n');
    const heading = HEADING.exec(line);
    if (heading) {
      nodes.push({ type: 'strong', children: parseInline(heading[1]) });
      return;
    }
    for (const node of parseInline(line.replace(BULLET, '$1• '))) {
      if (typeof node === 'string') pushText(nodes, node);
      else nodes.push(node);
    }
  });
  return nodes;
}

function flatten(nodes: ReplyNode[]): string {
  return nodes.map((node) => (typeof node === 'string' ? node : flatten(node.children))).join('');
}

/** The same reply without formatting marks, for speech and other plain-text uses. */
export function plainReplyText(text: string): string {
  return flatten(parseReplyText(text)).replace(/^(\s*)• /gm, '$1');
}
