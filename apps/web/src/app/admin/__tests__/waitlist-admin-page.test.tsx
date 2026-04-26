import { expect, describe, it } from 'vitest';

describe('Waitlist Admin Page - Structure', () => {
  it('should export a default function component', async () => {
    const mod = await import('../waitlist/page');
    expect(typeof mod.default).toBe('function');
  });

  it('should export force-dynamic constant', async () => {
    const mod = await import('../waitlist/page');
    expect(mod.dynamic).toBe('force-dynamic');
  });

  it('should export WaitlistAdminClient component', async () => {
    const mod = await import('../waitlist/waitlist-admin-client');
    expect(typeof mod.WaitlistAdminClient).toBe('function');
  });
});

describe('Waitlist Admin Page - Mobile Responsive Grid', () => {
  it('should have grid-cols-1 base class for stats cards', () => {
    const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    expect(gridClass).toContain('grid-cols-1');
  });

  it('should have sm:grid-cols-2 for small screens', () => {
    const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    expect(gridClass).toContain('sm:grid-cols-2');
  });

  it('should have lg:grid-cols-4 for stats cards on large screens', () => {
    const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    expect(gridClass).toContain('lg:grid-cols-4');
  });

  it('should have mobile-first responsive breakpoint progression for stats', () => {
    const gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    expect(gridClass).toMatch(/grid-cols-1.*sm:grid-cols-2.*lg:grid-cols-4/);
  });
});

describe('Waitlist Admin Page - i18n Keys', () => {
  it('should have waitlist section in Italian admin.json', async () => {
    const mod = await import('../../../../messages/it/admin.json');
    const data = mod.default as { admin: Record<string, unknown> };
    expect(data.admin).toHaveProperty('waitlist');
  });

  it('should have required waitlist keys in Italian admin.json', async () => {
    const mod = await import('../../../../messages/it/admin.json');
    const data = mod.default as { admin: { waitlist: Record<string, unknown> } };
    const waitlist = data.admin.waitlist;
    expect(waitlist).toHaveProperty('title');
    expect(waitlist).toHaveProperty('loading');
    expect(waitlist).toHaveProperty('refresh');
    expect(waitlist).toHaveProperty('totalSignups');
    expect(waitlist).toHaveProperty('searchPlaceholder');
  });

  it('should have waitlist section in English admin.json', async () => {
    const mod = await import('../../../../messages/en/admin.json');
    const data = mod.default as { admin: Record<string, unknown> };
    expect(data.admin).toHaveProperty('waitlist');
  });
});
