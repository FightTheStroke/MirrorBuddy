/**
 * @vitest-environment node
 * Tests for GET /api/admin/email-templates (list) and POST /api/admin/email-templates (create)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock template service
const mockListTemplates = vi.fn();
const mockCreateTemplate = vi.fn();
vi.mock('@/lib/email/template-service', () => ({
  listTemplates: (...args: unknown[]) => mockListTemplates(...args),
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
}));

// Mock audit service
const mockLogAdminAction = vi.fn();
const mockGetClientIp = vi.fn();
vi.mock('@/lib/admin/audit-service', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

// Mock CSRF
vi.mock('@/lib/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/security')>();
  return { ...actual, requireCSRF: vi.fn().mockReturnValue(true) };
});

// Mock auth
const mockValidateAdminAuth = vi.fn();
vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAdminAuth: () => mockValidateAdminAuth(),
    validateAdminReadOnlyAuth: async () => {
      const r = await mockValidateAdminAuth();
      return { ...r, canAccessAdminReadOnly: r?.isAdmin ?? false };
    },
  };
});

describe('GET /api/admin/email-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('127.0.0.1');
  });

  it('returns 401 if not authenticated', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'GET',
    });
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 if not admin', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
      userId: 'user-1',
    });
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'GET',
    });
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toBe('Forbidden: admin access required');
  });

  it('returns all templates when no filter is provided', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    const mockTemplates = [
      {
        id: 'tpl-1',
        name: 'Welcome',
        category: 'onboarding',
        variables: ['name'],
        isActive: true,
      },
      {
        id: 'tpl-2',
        name: 'Reset',
        category: 'auth',
        variables: ['email'],
        isActive: true,
      },
    ];
    mockListTemplates.mockResolvedValueOnce(mockTemplates);
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'GET',
    });
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.templates).toEqual(mockTemplates);
    expect(mockListTemplates).toHaveBeenCalledWith(undefined);
  });

  it('returns filtered templates by category', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    const mockTemplates = [
      {
        id: 'tpl-1',
        name: 'Welcome',
        category: 'onboarding',
        variables: ['name'],
        isActive: true,
      },
    ];
    mockListTemplates.mockResolvedValueOnce(mockTemplates);
    const req = new NextRequest(
      'http://localhost:3000/api/admin/email-templates?category=onboarding',
      {
        method: 'GET',
      },
    );
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.templates).toEqual(mockTemplates);
    expect(mockListTemplates).toHaveBeenCalledWith({ category: 'onboarding' });
  });

  it('handles service errors gracefully', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    mockListTemplates.mockRejectedValueOnce(new Error('Database error'));
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'GET',
    });
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toContain('Failed to list email templates');
  });
});

describe('POST /api/admin/email-templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('127.0.0.1');
  });

  it('returns 401 if not authenticated', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 if not admin', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
      userId: 'user-1',
    });
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toBe('Forbidden: admin access required');
  });

  it('returns 400 if required fields are missing', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('returns 400 if request body is invalid JSON', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'POST',
      body: 'invalid-json',
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid JSON in request body');
  });

  it('creates a template successfully', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    const newTemplate = {
      id: 'tpl-123',
      name: 'Welcome Email',
      subject: 'Welcome to MirrorBuddy',
      htmlBody: '<p>Hello {{name}}</p>',
      textBody: 'Hello {{name}}',
      category: 'onboarding',
      variables: ['name'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateTemplate.mockResolvedValueOnce(newTemplate);
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Welcome Email',
        subject: 'Welcome to MirrorBuddy',
        htmlBody: '<p>Hello {{name}}</p>',
        textBody: 'Hello {{name}}',
        category: 'onboarding',
        variables: ['name'],
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.template).toMatchObject({
      id: 'tpl-123',
      name: 'Welcome Email',
      subject: 'Welcome to MirrorBuddy',
      htmlBody: '<p>Hello {{name}}</p>',
      textBody: 'Hello {{name}}',
      category: 'onboarding',
      variables: ['name'],
      isActive: true,
    });
    expect(mockCreateTemplate).toHaveBeenCalledWith({
      name: 'Welcome Email',
      subject: 'Welcome to MirrorBuddy',
      htmlBody: '<p>Hello {{name}}</p>',
      textBody: 'Hello {{name}}',
      category: 'onboarding',
      variables: ['name'],
    });
  });

  it('logs admin action on successful creation', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    const newTemplate = {
      id: 'tpl-123',
      name: 'Welcome Email',
      subject: 'Welcome',
      htmlBody: '<p>Hi</p>',
      textBody: 'Hi',
      category: 'onboarding',
      variables: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreateTemplate.mockResolvedValueOnce(newTemplate);
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Welcome Email',
        subject: 'Welcome',
        htmlBody: '<p>Hi</p>',
        textBody: 'Hi',
        category: 'onboarding',
        variables: [],
      }),
    });
    await POST(req);
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: 'CREATE_EMAIL_TEMPLATE',
      entityType: 'EmailTemplate',
      entityId: 'tpl-123',
      adminId: 'admin-1',
      details: { name: 'Welcome Email', category: 'onboarding' },
      ipAddress: '127.0.0.1',
    });
  });

  it('handles service errors gracefully', async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: 'admin-1',
    });
    mockCreateTemplate.mockRejectedValueOnce(new Error('Database error'));
    const req = new NextRequest('http://localhost:3000/api/admin/email-templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        textBody: 'Test',
        category: 'test',
        variables: [],
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toContain('Failed to create email template');
  });
});
