'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  InteractiveMarkMapRenderer,
  type InteractiveMarkMapHandle,
  type InteractiveMarkMapRendererProps,
} from './interactive-markmap';
import { useMindmapEditor } from '@/lib/hooks/use-mindmap-editor';
import { Button } from '@/components/ui/button';
import type { MindmapNode } from './markmap';
import type { MindmapContent } from '@/lib/mindmap/protocol';

export interface LiveMindmapProps extends Omit<InteractiveMarkMapRendererProps, 'ref'> {
  toolId?: string;
  sessionId: string | null;
  listenForEvents?: boolean;
  onModification?: (command: string, args: Record<string, unknown>) => void;
}

export function LiveMindmap(props: LiveMindmapProps) {
  const [generatedId] = useState(() => crypto.randomUUID());
  return (
    <DurableMindmap
      key={props.toolId ?? generatedId}
      {...props}
      toolId={props.toolId ?? generatedId}
    />
  );
}

function DurableMindmap({
  toolId,
  sessionId,
  listenForEvents = true,
  title,
  initialNodes,
  initialMarkdown,
  className,
}: LiveMindmapProps & { toolId: string }) {
  const t = useTranslations('tools.mindmapRecovery');
  const renderer = useRef<InteractiveMarkMapHandle>(null);
  const section = useRef<HTMLElement>(null);
  const [concept, setConcept] = useState('');
  const [selected, setSelected] = useState('');
  const focus = useCallback(
    (id: string) => {
      setSelected(id);
      const visual = section.current?.querySelector<SVGGElement>(
        `[data-mindmap-id="${CSS.escape(id)}"]`,
      );
      if (visual) visual.focus();
      else document.getElementById(`mindmap-node-${toolId}-${id}`)?.focus();
    },
    [toolId],
  );
  const { editor, state, recovery, retry, activate, active } = useMindmapEditor({
    toolId,
    sessionId,
    content: { title, nodes: initialNodes, markdown: initialMarkdown },
    enabled: listenForEvents,
    focus,
  });
  const snapshot = state?.snapshot;
  const canMutate = active && !!state?.canMutate;
  const status = state?.pending ? 'pending' : recovery.status;
  useEffect(() => {
    if (!state?.pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state?.pending]);
  const nodes = snapshot?.content.nodes ?? [];
  const flattened: Array<{ id: string; label: string }> = [];
  const visit = (items: MindmapNode[]) =>
    items.forEach((node) => {
      flattened.push(node);
      visit(node.children ?? []);
    });
  visit(nodes);
  const replace = (next: MindmapNode[]) => {
    if (!canMutate || !snapshot) return;
    const content: MindmapContent = {
      ...snapshot.content,
      nodes: next.map(function normalize(node): MindmapContent['nodes'][number] {
        return { ...node, children: (node.children ?? []).map(normalize) };
      }),
    };
    void editor?.replace(content);
  };
  return (
    <section
      ref={section}
      tabIndex={0}
      aria-label={title}
      onFocusCapture={activate}
      onPointerDown={activate}
      className={className}
      data-testid="durable-mindmap"
      data-tool-id={toolId}
      data-revision={snapshot?.revision}
      aria-busy={state?.busy || recovery.status === 'connecting'}
    >
      <div className="flex flex-wrap items-center gap-2 p-3 text-sm">
        <p role="status" aria-live="polite" aria-atomic="true">
          {t(status)}
        </p>
        {(state?.pending || recovery.status === 'denied' || recovery.status === 'exhausted') && (
          <Button variant="outline" onClick={retry} disabled={state?.busy}>
            {t('retry')}
          </Button>
        )}
      </div>
      {state?.error && (
        <p role="alert" className="px-3 text-sm text-red-700 dark:text-red-300">
          {t(state.error === 'REVISION_CONFLICT' ? 'conflict' : 'error')}
        </p>
      )}
      {state?.pending && (
        <details className="px-3 text-sm">
          <summary>{t('pending')}</summary>
          <pre className="overflow-auto whitespace-pre-wrap">
            {JSON.stringify(state.pending.command.args, null, 2)}
          </pre>
        </details>
      )}
      {snapshot && (
        <>
          <form
            className="flex flex-wrap items-end gap-2 px-3 pb-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canMutate || !concept.trim()) return;
              void editor
                ?.command('mindmap_add_node', {
                  concept: concept.trim(),
                  ...(selected ? { parentNode: selected } : {}),
                })
                .then((result) => {
                  if (result.success) setConcept('');
                });
            }}
          >
            <label className="flex flex-col gap-1">
              {t('node')}
              <input
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                disabled={!canMutate}
                className="rounded border border-slate-400 bg-transparent p-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              {t('parent')}
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                disabled={!canMutate}
                className="rounded border border-slate-400 bg-transparent p-2"
              >
                <option value="">{t('root')}</option>
                {flattened.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={!canMutate || !concept.trim()}>
              {t('add')}
            </Button>
          </form>
          <InteractiveMarkMapRenderer
            ref={renderer}
            title={snapshot.content.title}
            authoritativeNodes={nodes}
            onNodesChange={replace}
            canUndo={canMutate && state?.canUndo}
            onUndo={() => {
              void editor?.undo();
            }}
          />
          <ul className="sr-only" aria-label={snapshot.content.title}>
            {flattened.map((node) => (
              <li key={node.id} id={`mindmap-node-${toolId}-${node.id}`} tabIndex={-1}>
                {node.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export type { MindmapNode, InteractiveMarkMapHandle };
