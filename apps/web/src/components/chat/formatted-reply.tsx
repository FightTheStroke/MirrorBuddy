import type { ReactNode } from 'react';
import { parseReplyText, type ReplyNode } from '@/lib/text/inline-markdown';

function renderNodes(nodes: ReplyNode[], key = 'r'): ReactNode[] {
  return nodes.map((node, index) => {
    if (typeof node === 'string') return node;
    const id = `${key}-${index}`;
    const children = renderNodes(node.children, id);
    if (node.type === 'strong') return <strong key={id}>{children}</strong>;
    if (node.type === 'em') return <em key={id}>{children}</em>;
    return (
      <code key={id} className="rounded bg-black/5 px-1 font-mono text-[0.95em] dark:bg-white/10">
        {children}
      </code>
    );
  });
}

/**
 * Shows an AI reply with its bold, italic and code marks applied instead of
 * raw asterisks. Inline only, so it can sit inside the existing paragraph;
 * text is rendered as React text nodes, never as HTML.
 */
export function FormattedReply({ text }: { text: string }) {
  return <>{renderNodes(parseReplyText(text))}</>;
}
