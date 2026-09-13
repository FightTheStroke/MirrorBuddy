import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { useUserListSelection } from '../use-user-list-selection';
import { parseUserListQuery } from '@/lib/admin/user-list-query';

const query = parseUserListQuery({ pageSize: '2' });
const users = Array.from({ length: 3 }, (_, index) => ({
  id: `user-${index}`,
  username: `person${index}`,
  email: `person${index}@example.com`,
  role: 'USER',
  disabled: false,
  isTestData: false,
  createdAt: '2026-01-01T00:00:00Z',
  subscription: null,
}));
const response = () =>
  Response.json({
    query: { ...query, pageSize: 100 },
    users,
    collection: {
      cursor: null,
      nextCursor: null,
      candidateCount: 3,
      scanned: 3,
      processed: 3,
      complete: true,
    },
  });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('all-matching selection remains available with bounded requests', () => {
  it('includes matching users outside the current page while retaining only selection fields', async () => {
    const read = vi.fn().mockResolvedValue(response());
    vi.stubGlobal('fetch', read);
    const { result } = renderHook(() => useUserListSelection(query));
    await act(async () => {
      await result.current.selectMatching();
    });
    expect(result.current.selected.size).toBe(3);
    expect(Object.keys(result.current.selected.get('user-2') ?? {}).sort()).toEqual([
      'email',
      'id',
      'username',
    ]);
    expect(new URL(read.mock.calls[0][0], 'http://localhost').searchParams.get('pageSize')).toBe(
      '100',
    );
  });

  it('does not apply a delayed old-filter selection after the query changes', async () => {
    let complete: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            complete = resolve;
          }),
      ),
    );
    const { result, rerender } = renderHook(({ current }) => useUserListSelection(current), {
      initialProps: { current: query },
    });
    act(() => {
      void result.current.selectMatching();
    });
    rerender({ current: parseUserListQuery({ tab: 'disabled' }) });
    await act(async () => {
      complete?.(response());
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.selected.size).toBe(0);
    expect(result.current.error).toBe(false);
  });
});
