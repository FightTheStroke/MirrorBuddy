import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeVoiceTool } from './executors';
import { csrfFetch } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
const post = vi.mocked(csrfFetch);
afterEach(() => vi.resetAllMocks());

describe('durable voice network envelopes', () => {
  it('uses the caller identity for creation, including repeated delivery', async () => {
    post.mockResolvedValue(Response.json({ toolId: 'call-1', sessionId: 'source', revision: 0 }));
    for (let index = 0; index < 2; index++) {
      const result = await executeVoiceTool(
        'source',
        'euclide',
        'create_mindmap',
        { title: 'Map', nodes: [] },
        { operationId: 'call-1' },
      );
      expect(result).toMatchObject({
        success: true,
        toolId: 'call-1',
        sessionId: 'source',
        revision: 0,
      });
      // Each fetch response has an independent consumable body.
      post.mockResolvedValue(Response.json({ toolId: 'call-1', sessionId: 'source', revision: 0 }));
    }
    expect(post).toHaveBeenCalledTimes(2);
    for (const [, init] of post.mock.calls)
      expect(JSON.parse(String(init?.body))).toMatchObject({
        toolId: 'call-1',
        sessionId: 'source',
      });
  });

  it('refuses modification without an explicit active map instead of guessing', async () => {
    const result = await executeVoiceTool('source', 'euclide', 'mindmap_delete_node', {
      node: 'root',
    });
    expect(result).toMatchObject({ success: false, error: 'active_mindmap_required' });
    expect(post).not.toHaveBeenCalled();
  });

  it('preserves operation, revision and source after response loss; never retries itself', async () => {
    post.mockRejectedValueOnce(new Error('Connection lost'));
    const context = {
      operationId: 'call-2',
      activeMindmap: { toolId: 'map', sessionId: 'owned-source', revision: 7 },
    };
    expect(
      (
        await executeVoiceTool(
          'other-session',
          'euclide',
          'mindmap_set_color',
          { node: 'root', color: 'blue' },
          context,
        )
      ).success,
    ).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(post.mock.calls[0][1]?.body))).toEqual({
      toolId: 'map',
      sessionId: 'owned-source',
      operationId: 'call-2',
      baseRevision: 7,
      command: 'mindmap_set_color',
      args: { node: 'root', color: 'blue' },
    });
  });

  it('returns conflict errors and focus outcomes without inventing a revision', async () => {
    const context = {
      operationId: 'call-3',
      activeMindmap: { toolId: 'map', sessionId: 'source', revision: 7 },
    };
    post.mockResolvedValueOnce(Response.json({ error: 'REVISION_CONFLICT' }, { status: 409 }));
    expect(
      await executeVoiceTool('source', 'euclide', 'mindmap_focus_node', { node: 'root' }, context),
    ).toMatchObject({ success: false, error: 'REVISION_CONFLICT' });
    post.mockResolvedValueOnce(
      Response.json({
        toolId: 'map',
        revision: 7,
        operationId: 'call-3',
        focus: { nodeId: 'root', label: 'Root' },
      }),
    );
    expect(
      await executeVoiceTool('source', 'euclide', 'mindmap_focus_node', { node: 'root' }, context),
    ).toMatchObject({ success: true, revision: 7, focus: { nodeId: 'root' } });
  });
});
