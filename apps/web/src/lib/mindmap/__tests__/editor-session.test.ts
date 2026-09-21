import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { createMapEditor } from '../editor-session';
import { commandSchema } from '../protocol';
import { clearCSRFToken } from '@/lib/auth';
const csrfFetch = vi.fn<typeof fetch>();
beforeEach(() => {
  clearCSRFToken();
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) =>
    url === '/api/session'
      ? Promise.resolve(Response.json({ csrfToken: 'test' }))
      : csrfFetch(url, init),
  );
});
const identity = { toolId: 'map', sessionId: 'source' };
const content = (label: string) => ({
  title: 'Map',
  nodes: [{ id: 'root', label, children: [] }],
  markdown: `# Map\n## ${label}`,
});
const snapshot = (revision: number, label = 'Root') => ({
  ...identity,
  revision,
  content: content(label),
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  clearCSRFToken();
});
describe('durable editor intent and undo', () => {
  it('does not leak snapshot content or revision into the strict command envelope', async () => {
    const editor = createMapEditor(snapshot(0), vi.fn());
    editor.accept(snapshot(0));
    editor.ready(true);
    csrfFetch.mockImplementation(async (_url, init) => {
      const parsed = commandSchema.parse(JSON.parse(String(init?.body)));
      return Response.json({ toolId: 'map', operationId: parsed.operationId, revision: 1 });
    });
    expect((await editor.command('mindmap_add_node', { concept: 'Cell' })).success).toBe(true);
  });
  it('does not let undo overwrite another writer after a later revision', async () => {
    const editor = createMapEditor(identity, vi.fn());
    editor.accept(snapshot(0));
    editor.ready(true);
    csrfFetch.mockImplementation(async (_url, init) => {
      const command = JSON.parse(String(init?.body));
      return Response.json({ toolId: 'map', operationId: command.operationId, revision: 1 });
    });
    await editor.replace(content('Mine'));
    editor.accept(snapshot(1, 'Mine'));
    expect(editor.state().canUndo).toBe(true);
    editor.accept(snapshot(2, 'Someone else'));
    expect(editor.state().canUndo).toBe(false);
    expect((await editor.undo()).success).toBe(false);
  });
  it('does not echo snapshots into writes or undo history', () => {
    const editor = createMapEditor(identity, vi.fn());
    editor.accept(snapshot(0));
    editor.accept(snapshot(1, 'External'));
    expect(csrfFetch).not.toHaveBeenCalled();
    expect(editor.state().canUndo).toBe(false);
  });
  it('retains ambiguous operation and pending content across recovery and retries exactly that envelope', async () => {
    const editor = createMapEditor(identity, vi.fn());
    editor.accept(snapshot(0));
    editor.ready(true);
    vi.mocked(csrfFetch).mockRejectedValueOnce(new Error('Lost response'));
    await editor.replace(content('Edited'));
    const first = JSON.parse(String(vi.mocked(csrfFetch).mock.calls[0][1]?.body));
    expect(editor.state().pending?.command).toEqual(first);
    expect(editor.state().canMutate).toBe(false);
    editor.accept(snapshot(1, 'Edited'));
    editor.ready(true);
    expect(editor.state().pending).not.toBeNull();
    vi.mocked(csrfFetch).mockResolvedValueOnce(
      Response.json({ toolId: 'map', operationId: first.operationId, revision: 1 }),
    );
    await editor.retry();
    expect(JSON.parse(String(vi.mocked(csrfFetch).mock.calls[1][1]?.body))).toEqual(first);
    expect(editor.state().pending).toBeNull();
    expect(editor.state().canUndo).toBe(true);
  });
  it('undo is another versioned operation and snapshot delivery never overwrites a pending intent', async () => {
    const editor = createMapEditor(identity, vi.fn());
    editor.accept(snapshot(0));
    editor.ready(true);
    vi.mocked(csrfFetch).mockImplementation(async (_url, init) => {
      const command = JSON.parse(String(init?.body));
      return Response.json({
        toolId: 'map',
        operationId: command.operationId,
        revision: command.baseRevision + 1,
      });
    });
    await editor.replace(content('Edited'));
    expect(editor.state().canMutate).toBe(false);
    editor.accept(snapshot(1, 'Edited'));
    await editor.undo();
    const undo = JSON.parse(String(vi.mocked(csrfFetch).mock.calls[1][1]?.body));
    expect(undo).toMatchObject({
      baseRevision: 1,
      command: 'mindmap_replace',
      args: { content: content('Root') },
    });
    editor.accept(snapshot(2));
    expect(editor.state().canUndo).toBe(false);
  });
  it('does not write during recovery or discard a conflict', async () => {
    const editor = createMapEditor(identity, vi.fn());
    editor.accept(snapshot(0));
    expect((await editor.replace(content('Blocked'))).success).toBe(false);
    expect(csrfFetch).not.toHaveBeenCalled();
    editor.ready(true);
    vi.mocked(csrfFetch).mockResolvedValueOnce(
      Response.json({ error: 'REVISION_CONFLICT' }, { status: 409 }),
    );
    expect((await editor.replace(content('Pending'))).success).toBe(false);
    expect(editor.state()).toMatchObject({
      error: 'REVISION_CONFLICT',
      pending: { command: { baseRevision: 0 } },
    });
  });
});
