/**
 * Tests for the anonymization boundary in the vector store.
 *
 * Anonymization keeps user PII out of the vector DB (C-06). System-authored
 * didactic content is exempt because the PII heuristics rewrite the historical
 * names the content is *about* ("Il metodo Feynman" -> "Il metodo [NOME]").
 *
 * These tests exist to keep that exemption narrow: it must apply only when both
 * the owner and the source type are the system corpus, so no user-owned row can
 * ever reach the unanonymized path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const create = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    contentEmbedding: {
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

vi.mock('@/lib/privacy', () => ({
  anonymizeConversationMessage: (s: string) => `ANONYMIZED:${s}`,
}));

vi.mock('./pgvector-utils', () => ({
  checkPgvectorStatus: vi.fn().mockResolvedValue({ available: false }),
  nativeVectorSearch: vi.fn(),
  updateNativeVector: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

const { storeEmbedding, SYSTEM_KB_USER_ID } = await import('./vector-store');

const VECTOR = new Array(1536).fill(0.1);
const CONTENT = 'Il metodo Feynman spiegato da Richard Feynman';

function storedContent(): string {
  return create.mock.calls[0][0].data.content as string;
}

describe('storeEmbedding anonymization boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: 'emb_1' });
  });

  it('stores system-authored maestro knowledge verbatim', async () => {
    await storeEmbedding({
      userId: SYSTEM_KB_USER_ID,
      sourceType: 'maestro_knowledge',
      sourceId: 'feynman',
      content: CONTENT,
      vector: VECTOR,
    });

    expect(storedContent()).toBe(CONTENT);
  });

  it('anonymizes user content even when the source type matches', async () => {
    await storeEmbedding({
      userId: 'user_123',
      sourceType: 'maestro_knowledge',
      sourceId: 'feynman',
      content: CONTENT,
      vector: VECTOR,
    });

    expect(storedContent()).toBe(`ANONYMIZED:${CONTENT}`);
  });

  it('anonymizes system-owned rows of any other source type', async () => {
    await storeEmbedding({
      userId: SYSTEM_KB_USER_ID,
      sourceType: 'message',
      sourceId: 'conv_1',
      content: CONTENT,
      vector: VECTOR,
    });

    expect(storedContent()).toBe(`ANONYMIZED:${CONTENT}`);
  });

  it('anonymizes ordinary user messages', async () => {
    await storeEmbedding({
      userId: 'user_123',
      sourceType: 'message',
      sourceId: 'conv_1',
      content: 'Mi chiamo Marco e vivo a Milano',
      vector: VECTOR,
    });

    expect(storedContent()).toBe('ANONYMIZED:Mi chiamo Marco e vivo a Milano');
  });
});
