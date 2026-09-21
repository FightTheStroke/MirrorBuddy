import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { csrfFetch, setClientIdentity } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { addBreadcrumb } from '@/lib/sentry';
import { saveMaterialToAPI, saveMaterialToAPIWithId } from './api';

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  csrfFetch: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));
vi.mock('@/lib/sentry', () => ({ addBreadcrumb: vi.fn() }));

beforeEach(() => {
  setClientIdentity({
    status: 'authenticated',
    userId: 'owner',
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  });
});
afterEach(() => {
  setClientIdentity({ status: 'pending' });
  vi.resetAllMocks();
});

const save = () => saveMaterialToAPI('owner', 'quiz', 'Title', { questions: [] });
const saveWithId = () =>
  saveMaterialToAPIWithId('owner', 'tool', 'quiz', 'Title', { questions: [] });

describe.each([save, saveWithId])('material save validation (%s)', (attempt) => {
  it.each([
    { error: 'Missing required fields', required: ['toolId', 'toolType', 'title', 'content'] },
    { error: 'Missing or invalid material fields' },
  ])('returns a visible failure result for HTTP 400 without error reporting', async (body) => {
    vi.mocked(csrfFetch).mockResolvedValue(new Response(JSON.stringify(body), { status: 400 }));
    await expect(attempt()).resolves.toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
    expect(addBreadcrumb).toHaveBeenCalledWith('materials', 'Material save rejected', {
      status: 400,
      toolType: 'quiz',
    });
  });

  it('preserves error reporting for server failures', async () => {
    vi.mocked(csrfFetch).mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(attempt()).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('external material payloads', () => {
  it.each([
    '{}',
    '{"title":null,"content":{}}',
    '{"title":"","content":{}}',
    '{"title":"Title"}',
    '{"title":"Title","content":null}',
  ])('rejects missing required data before either POST: %s', async (json) => {
    const input: { title: string; content: Record<string, unknown> } = JSON.parse(json);
    vi.mocked(csrfFetch).mockResolvedValue(new Response('{}', { status: 400 }));
    await expect(
      saveMaterialToAPI('owner', 'quiz', input.title, input.content),
    ).resolves.toBeNull();
    await expect(
      saveMaterialToAPIWithId('owner', 'tool', 'quiz', input.title, input.content),
    ).resolves.toBeNull();
    expect(csrfFetch).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(addBreadcrumb).toHaveBeenCalled();
  });
});
