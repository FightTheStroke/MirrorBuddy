/**
 * Logger Tests
 *
 * IMPORTANT: These tests document the correct way to log errors.
 * The logger.error signature is: (message, context?, error?)
 *
 * CORRECT:   logger.error('Failed', { userId: '123' }, error)
 * CORRECT:   logger.error('Failed', undefined, error)
 * WRONG:     logger.error('Failed', { error })  // Error becomes {}
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Helper to safely set NODE_ENV in tests
function setNodeEnv(value: string) {
  (process.env as { NODE_ENV: string }).NODE_ENV = value;
}

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setNodeEnv('development');
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    setNodeEnv(originalEnv || 'test');
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    vi.resetModules();
  });

  describe('error serialization', () => {
    it('should properly serialize Error when passed as third argument', async () => {
      const { logger } = await import('../index');

      const testError = new Error('Test error message');
      testError.name = 'TestError';

      logger.error('Operation failed', undefined, testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(logOutput).toContain('Operation failed');
    });

    it('should properly serialize Error with context', async () => {
      const { logger } = await import('../index');

      const testError = new Error('Database connection failed');
      const context = { userId: 'user-123', operation: 'save' };

      logger.error('DB Error', context, testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;

      expect(logOutput).toContain('DB Error');
      expect(logOutput).toContain('user-123');
    });

    /**
     * REGRESSION TEST: Documents the WRONG pattern that causes { error: {} }
     */
    it('should NOT put Error objects inside context - they serialize to empty object', async () => {
      const testError = new Error('This will be lost');
      const badContext = { error: testError };
      const serialized = JSON.stringify(badContext);

      // This is the BUG we're preventing
      expect(serialized).toBe('{"error":{}}');
      expect(serialized).not.toContain('This will be lost');
    });

    it('should serialize non-Error objects in context correctly', async () => {
      const context = {
        errorCode: 'E001',
        errorMessage: 'Something went wrong',
        metadata: { retries: 3 },
      };

      const serialized = JSON.stringify(context);

      expect(serialized).toContain('E001');
      expect(serialized).toContain('Something went wrong');
      expect(serialized).toContain('"retries":3');
    });
  });

  describe('formatError internal behavior', () => {
    it('should extract name, message from Error instances', async () => {
      setNodeEnv('production');
      vi.resetModules();

      const { logger } = await import('../index');

      const testError = new Error('Connection timeout');
      testError.name = 'TimeoutError';

      logger.error('Request failed', undefined, testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(logOutput);

      expect(parsed.error).toBeDefined();
      expect(parsed.error.name).toBe('TimeoutError');
      expect(parsed.error.message).toBe('Connection timeout');
      expect(parsed.error.stack).toBeUndefined();
    });

    it('should handle non-Error thrown values', async () => {
      setNodeEnv('production');
      vi.resetModules();

      const { logger } = await import('../index');
      const weirdError = 'Something broke';

      logger.error('Unexpected error', undefined, weirdError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(logOutput);

      expect(parsed.error).toBeDefined();
      expect(parsed.error.name).toBe('Unknown');
      expect(parsed.error.message).toBe('Something broke');
    });
  });

  describe('child logger', () => {
    it('should properly pass error to child logger', async () => {
      setNodeEnv('production');
      vi.resetModules();

      const { logger } = await import('../index');

      const childLogger = logger.child({ component: 'ChatHandler' });
      const testError = new Error('Chat failed');

      childLogger.error('Message send error', { messageId: 'msg-1' }, testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0]?.[0] as string;
      const parsed = JSON.parse(logOutput);

      expect(parsed.context?.component).toBe('ChatHandler');
      expect(parsed.context?.messageId).toBe('msg-1');
      expect(parsed.error?.message).toBe('Chat failed');
    });
  });
});
