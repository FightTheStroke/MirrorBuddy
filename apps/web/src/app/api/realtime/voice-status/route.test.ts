/**
 * @vitest-environment node
 *
 * Unit tests for GET /api/realtime/voice-status
 *
 * Auth: 401 unauthenticated | 403 non-admin | 200 admin
 * Response: configured, missingVars, redacted endpoint, region, deployment, liveCheck
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

vi.mock('@/lib/logger', () => {
  const child = vi.fn();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child };
  child.mockReturnValue(logger);
  return { logger };
});

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: vi.fn().mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-001',
    }),
  };
});

import { GET } from './route';
import { validateAdminAuth } from '@/lib/auth/server';

const mockValidateAdminAuth = validateAdminAuth as ReturnType<typeof vi.fn>;

const ALL_VARS = {
  AZURE_OPENAI_REALTIME_API_KEY: 'secret-key',
  AZURE_OPENAI_REALTIME_ENDPOINT: 'https://my-resource.openai.azure.com/realtime-endpoint',
  AZURE_OPENAI_REALTIME_REGION: 'eastus',
  AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-4o-realtime-preview',
  AZURE_OPENAI_REALTIME_API_VERSION: '2025-04-01-preview',
};

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/realtime/voice-status', { method: 'GET' });
}

function setEnvVars(vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
}

function clearEnvVars(): void {
  for (const key of Object.keys(ALL_VARS)) {
    delete process.env[key];
  }
}

describe('GET /api/realtime/voice-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEnvVars();
    mockValidateAdminAuth.mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-001',
    });
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
      userId: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 403 when authenticated but not admin', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
      userId: 'user-999',
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with configured=true when all vars are set', async () => {
    setEnvVars(ALL_VARS);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.configured).toBe(true);
    expect(body.missingVars).toHaveLength(0);
    expect(body.region).toBe('eastus');
    expect(body.deployment).toBe('gpt-4o-realtime-preview');
    expect(body.liveCheck).toBe('skipped');
  });

  it('redacts endpoint to first 30 chars', async () => {
    setEnvVars(ALL_VARS);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.endpoint).toBe('https://my-resource.openai.azu...');
    expect(body.endpoint).not.toContain('secret-key');
  });

  it('never exposes the API key in the response', async () => {
    setEnvVars(ALL_VARS);

    const res = await GET(makeRequest());
    const raw = await res.text();

    expect(raw).not.toContain('secret-key');
  });

  // ── Missing vars ──────────────────────────────────────────────────────────

  it('returns configured=false and lists missing vars when some are absent', async () => {
    setEnvVars({
      AZURE_OPENAI_REALTIME_ENDPOINT: 'https://res.openai.azure.com',
      AZURE_OPENAI_REALTIME_REGION: 'eastus',
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.configured).toBe(false);
    expect(body.missingVars).toContain('AZURE_OPENAI_REALTIME_API_KEY');
    expect(body.missingVars).toContain('AZURE_OPENAI_REALTIME_DEPLOYMENT');
    expect(body.missingVars).toContain('AZURE_OPENAI_REALTIME_API_VERSION');
  });

  it('returns null for endpoint/region/deployment when vars are absent', async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.endpoint).toBeNull();
    expect(body.region).toBeNull();
    expect(body.deployment).toBeNull();
  });
});
