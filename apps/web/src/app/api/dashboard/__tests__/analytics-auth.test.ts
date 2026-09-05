// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { autoImplementMethods } from 'next/dist/server/route-modules/app-route/helpers/auto-implement-methods';
import type { HTTP_METHOD } from 'next/dist/server/web/http';
import {
  dataReads,
  mocks,
  routes,
  setCaller,
  setCookie,
  type Caller,
} from './analytics-auth-fixtures';
import { signCookieValue } from '@/lib/auth/server';

const callers: Caller[] = [null, 'USER', 'ADMIN_READONLY', 'ADMIN'];

describe.each(routes)('$path authorization through exported handlers', ({ path, handlers }) => {
  async function callMethod(method: HTTP_METHOD): Promise<Response> {
    const methods = autoImplementMethods({
      ...handlers,
      GET: (req) => handlers.GET(req),
    });
    const response = await methods[method](
      new NextRequest(`http://localhost${path}`, { method }),
      {},
    );
    if (!(response instanceof Response)) {
      throw new Error(`Expected a Response from Next.js for ${method}`);
    }
    return response;
  }

  function expectNoDataReads() {
    for (const read of dataReads) expect(read).not.toHaveBeenCalled();
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  }

  it('exports GET only, without adding or removing an existing mutation', () => {
    expect(Object.keys(handlers).sort()).toEqual(['GET', 'revalidate']);
    expect(handlers.revalidate).toBe(0);
  });

  it.each([
    ['absent', undefined],
    ['unsigned', 'analytics-operator'],
    ['invalid signature', `analytics-operator.${'0'.repeat(64)}`],
  ])('rejects %s credentials before reading data', async (_label, cookie) => {
    setCookie(cookie);
    const response = await handlers.GET(new NextRequest(`http://localhost${path}`));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mocks.findUser).not.toHaveBeenCalled();
    expectNoDataReads();
  });

  it('does not disclose whether the signed-cookie user still exists', async () => {
    setCookie(signCookieValue('missing-analytics-user').signed);
    mocks.findUser.mockResolvedValue(null);
    const response = await handlers.GET(new NextRequest(`http://localhost${path}`));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expectNoDataReads();
  });

  it('rejects an ordinary user even when platform data is available', async () => {
    setCaller('USER');
    const response = await handlers.GET(new NextRequest(`http://localhost${path}`));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden: admin access required' });
    expectNoDataReads();
  });

  it.each(['', '?days=1', '?days=not-a-date'])(
    'rejects an ordinary user before parameter parsing or service access: %s',
    async (query) => {
      setCaller('USER');
      for (const read of dataReads) read.mockRejectedValue(new Error('private service details'));
      const response = await handlers.GET(new NextRequest(`http://localhost${path}${query}`));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Forbidden: admin access required' });
      expect(mocks.findUser).toHaveBeenLastCalledWith({
        where: { id: 'analytics-operator' },
        select: { role: true },
      });
      expectNoDataReads();
    },
  );

  it.each([null, undefined, { role: null }, { role: 'USER' }])(
    'fails closed when the role lookup returns %j',
    async (roleRecord) => {
      setCaller('ADMIN');
      mocks.findUser.mockResolvedValueOnce({ id: 'analytics-operator' });
      mocks.findUser.mockResolvedValueOnce(roleRecord);
      const response = await handlers.GET(new NextRequest(`http://localhost${path}`));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Forbidden: admin access required' });
      expectNoDataReads();
    },
  );

  it('fails closed on role lookup failure without exposing the database error', async () => {
    setCaller('ADMIN');
    mocks.findUser.mockResolvedValueOnce({ id: 'analytics-operator' });
    mocks.findUser.mockRejectedValueOnce(new Error('private role database details'));
    const response = await handlers.GET(new NextRequest(`http://localhost${path}`));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden: admin access required' });
    expectNoDataReads();
  });

  it.each(['ADMIN_READONLY', 'ADMIN'] as const)(
    'allows the existing %s read capability',
    async (role) => {
      setCaller(role);
      const response = await handlers.GET(new NextRequest(`http://localhost${path}`));
      expect(response.status).toBe(200);
      expect(mocks.findUser).toHaveBeenLastCalledWith({
        where: { id: 'analytics-operator' },
        select: { role: true },
      });
      expect(mocks.upsertUser).not.toHaveBeenCalled();
    },
  );

  it.each(callers)('applies the same authorization to automatic HEAD for %s', async (role) => {
    setCaller(role);
    const response = await callMethod('HEAD');
    expect(response.status).toBe(role === null ? 401 : role === 'USER' ? 403 : 200);
    if (role === null || role === 'USER') expectNoDataReads();
  });

  describe.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)('%s is not supported', (method) => {
    it.each(callers)(
      'rejects %s without authentication or analytics side effects',
      async (role) => {
        setCaller(role);
        const response = await callMethod(method);
        expect(response.status).toBe(405);
        expect(await response.text()).toBe('');
        expect(mocks.cookies).not.toHaveBeenCalled();
        expect(mocks.findUser).not.toHaveBeenCalled();
        expectNoDataReads();
      },
    );
  });

  it.each(callers)('OPTIONS advertises only existing reads for %s, without data', async (role) => {
    setCaller(role);
    const response = await callMethod('OPTIONS');
    expect(response.status).toBe(204);
    expect(response.headers.get('Allow')).toBe('GET, HEAD, OPTIONS');
    expect(await response.text()).toBe('');
    expect(mocks.findUser).not.toHaveBeenCalled();
    expectNoDataReads();
  });
});
