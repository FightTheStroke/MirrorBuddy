/**
 * Tests for Tool Plugin Initialization
 * Verifies singleton registry creation during app bootstrap
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeToolRegistry } from '../init';
import { ToolRegistry } from '../registry';

describe('initializeToolRegistry', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset singleton before each test (using type assertion for private property)
    (ToolRegistry as unknown as { instance: ToolRegistry | null })['instance'] = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv);
    vi.restoreAllMocks();
    // Reset singleton
    (ToolRegistry as unknown as { instance: ToolRegistry | null })['instance'] = null;
  });

  it('should return a ToolRegistry instance', () => {
    const registry = initializeToolRegistry();
    expect(registry).toBeInstanceOf(ToolRegistry);
  });

  it('should return the same singleton instance on multiple calls', () => {
    const registry1 = initializeToolRegistry();
    const registry2 = initializeToolRegistry();
    expect(registry1).toBe(registry2);
  });

  it('should log debug message in development mode', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    initializeToolRegistry();

    expect(consoleSpy).toHaveBeenCalledWith('ToolRegistry initialized');
  });

  it('should not log in production mode', () => {
    // Reset singleton FIRST before changing env
    (ToolRegistry as unknown as { instance: ToolRegistry | null })['instance'] = null;
    vi.stubEnv('NODE_ENV', 'production');
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    initializeToolRegistry();

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should export as default', async () => {
    const defaultExport = await import('../init');
    expect(defaultExport.default).toBe(initializeToolRegistry);
  });
});
