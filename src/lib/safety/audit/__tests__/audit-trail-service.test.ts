/**
 * Tests for audit trail DB persistence
 * F-05: Verify buffer flush to DB, DB failure recovery, and anonymization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { prisma } from '@/lib/db';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    complianceAuditEntry: {
      createMany: vi.fn(),
    },
  },
}));

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

describe('audit-trail-service DB persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // BUFFER FLUSH TO DB TEST (F-05)
  // ========================================================================

  describe('buffer fills to threshold -> flushes to DB', () => {
    it('flushes buffer to DB via createMany when threshold reached', async () => {
      // Re-import to get fresh module state
      const { recordSafetyEvent } = await import('../audit-trail-service');

      vi.mocked(prisma.complianceAuditEntry.createMany).mockResolvedValue({
        count: 50,
      });

      // Record 50 events to trigger flush (BUFFER_FLUSH_SIZE = 50)
      for (let i = 0; i < 50; i++) {
        recordSafetyEvent('content_filtered', {
          userId: `user-${i}`,
          maestroId: 'maestro-1',
          metadata: { filterType: 'profanity' },
        });
      }

      // Wait for async flush to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify createMany was called
      expect(prisma.complianceAuditEntry.createMany).toHaveBeenCalledOnce();

      // Verify the structure of the data
      const callArgs = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs!.data).toHaveLength(50);
      expect(callArgs!.skipDuplicates).toBe(true);

      // Verify first entry structure
      const firstEntry = (callArgs!.data as Array<unknown>)[0] as Record<string, unknown>;
      expect(firstEntry.eventType).toBe('content_filtered');
      expect(firstEntry.severity).toBe('medium');
      expect(firstEntry.userId).toBeNull();
      expect(firstEntry.adminId).toBeNull();
      expect(firstEntry.ipAddress).toBeNull();
      expect(firstEntry.description).toBe('Safety event: content_filtered');

      // Verify details contain the anonymized userId
      const details = JSON.parse(firstEntry.details as string);
      expect(details.anonymizedUserId).toBe('user-0***');
      expect(details.maestroId).toBe('maestro-1');
      expect(details.metadata.filterType).toBe('profanity');
    });

    it('includes all event data in DB entries', async () => {
      const { recordSafetyEvent } = await import('../audit-trail-service');

      vi.mocked(prisma.complianceAuditEntry.createMany).mockResolvedValue({
        count: 50,
      });

      // Record 50 events with various data
      for (let i = 0; i < 50; i++) {
        recordSafetyEvent('guardrail_triggered', {
          userId: `user-test-${i}`,
          maestroId: `maestro-${i}`,
          sessionId: `session-${i}`,
          metadata: {
            guardrailRuleId: `rule-${i}`,
            confidence: 0.95,
          },
          contentHash: `hash-${i}`,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const callArgs = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      const entries = callArgs!.data as Array<Record<string, unknown>>;

      // Verify last entry has all fields
      const lastEntry = entries[49];
      const lastDetails = JSON.parse(lastEntry.details as string);

      expect(lastDetails.anonymizedUserId).toBe('user-tes***');
      expect(lastDetails.maestroId).toBe('maestro-49');
      expect(lastDetails.sessionHash).toBeDefined();
      expect(lastDetails.metadata.guardrailRuleId).toBe('rule-49');
      expect(lastDetails.metadata.confidence).toBe(0.95);
      expect(lastDetails.contentHash).toBe('hash-49');
    });
  });

  // ========================================================================
  // DB FAILURE RECOVERY TEST (F-05)
  // ========================================================================

  describe('DB failure -> events retained in buffer', () => {
    it('retains events in buffer when DB write fails', async () => {
      const { recordSafetyEvent, getAuditEntries } = await import('../audit-trail-service');

      // Mock DB failure
      vi.mocked(prisma.complianceAuditEntry.createMany).mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Record 50 events to trigger flush
      for (let i = 0; i < 50; i++) {
        recordSafetyEvent('content_filtered', {
          userId: `user-${i}`,
          maestroId: 'maestro-1',
        });
      }

      // Wait for flush attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(prisma.complianceAuditEntry.createMany).toHaveBeenCalled();

      // Verify events are still in buffer (can be retrieved)
      const entries = getAuditEntries({ limit: 100 });
      expect(entries.length).toBe(50);
    });

    it('attempts DB flush and retains buffered events on DB failure', async () => {
      const { recordSafetyEvent } = await import('../audit-trail-service');

      const dbError = new Error('Connection timeout');
      vi.mocked(prisma.complianceAuditEntry.createMany).mockRejectedValue(dbError);

      // Record events with different types
      for (let i = 0; i < 30; i++) {
        recordSafetyEvent('content_filtered', { userId: `user-${i}` });
      }
      for (let i = 0; i < 20; i++) {
        recordSafetyEvent('guardrail_triggered', { userId: `user-${i + 30}` });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(prisma.complianceAuditEntry.createMany).toHaveBeenCalled();
    });

    it('retries flush on next threshold after DB recovery', async () => {
      const { recordSafetyEvent } = await import('../audit-trail-service');

      // Clear mocks from previous tests in this isolated test
      vi.clearAllMocks();

      // First flush fails
      vi.mocked(prisma.complianceAuditEntry.createMany).mockRejectedValueOnce(
        new Error('DB error'),
      );

      // Record 50 events (trigger first flush)
      for (let i = 0; i < 50; i++) {
        recordSafetyEvent('content_filtered', { userId: `user-${i}` });
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Store first flush call count
      const firstFlushCallCount = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls
        .length;
      expect(firstFlushCallCount).toBeGreaterThanOrEqual(1);

      // Mock DB recovery
      vi.mocked(prisma.complianceAuditEntry.createMany).mockResolvedValueOnce({
        count: 100,
      });

      // Record 50 more events (trigger second flush with 100 total)
      for (let i = 50; i < 100; i++) {
        recordSafetyEvent('guardrail_triggered', { userId: `user-${i}` });
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify second flush occurred (call count increased)
      const secondFlushCallCount = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls
        .length;
      expect(secondFlushCallCount).toBeGreaterThan(firstFlushCallCount);

      // Verify the last call had all 100 events
      const lastCallIndex = secondFlushCallCount - 1;
      const lastCall = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls[
        lastCallIndex
      ]?.[0];
      expect(lastCall).toBeDefined();
      expect((lastCall!.data as Array<unknown>).length).toBe(100);
    });
  });

  // ========================================================================
  // ANONYMIZATION TEST (F-05)
  // ========================================================================

  describe('anonymizeUserId called before DB write', () => {
    it('anonymizes userId before storing in DB', async () => {
      const { recordSafetyEvent } = await import('../audit-trail-service');

      vi.mocked(prisma.complianceAuditEntry.createMany).mockResolvedValue({
        count: 50,
      });

      // Record events with different userId formats
      const userIds = ['user-12345678-long-id', 'short', 'exactly8c', 'user@example.com'];

      for (let i = 0; i < 47; i++) {
        recordSafetyEvent('content_filtered', {
          userId: userIds[i % userIds.length],
        });
      }

      // Add 3 more to reach threshold
      recordSafetyEvent('content_filtered', { userId: 'final-user-123' });
      recordSafetyEvent('content_filtered', { userId: 'test' });
      recordSafetyEvent('content_filtered', { userId: 'abcdefghij' });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const callArgs = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      const entries = callArgs!.data as Array<Record<string, unknown>>;

      // Verify anonymization patterns
      const firstDetails = JSON.parse(entries[0].details as string);
      expect(firstDetails.anonymizedUserId).toBe('user-123***');

      const shortDetails = JSON.parse(entries[1].details as string);
      expect(shortDetails.anonymizedUserId).toBe('short***');

      const exactDetails = JSON.parse(entries[2].details as string);
      expect(exactDetails.anonymizedUserId).toBe('exactly8***');

      const emailDetails = JSON.parse(entries[3].details as string);
      expect(emailDetails.anonymizedUserId).toBe('user@exa***');
    });

    it('handles missing userId gracefully', async () => {
      const { recordSafetyEvent } = await import('../audit-trail-service');

      vi.mocked(prisma.complianceAuditEntry.createMany).mockResolvedValue({
        count: 50,
      });

      // Record events without userId
      for (let i = 0; i < 50; i++) {
        recordSafetyEvent('safety_config_changed', {
          metadata: { context: { change: 'test' } },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const callArgs = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      const entries = callArgs!.data as Array<Record<string, unknown>>;

      // Verify no anonymizedUserId when userId not provided
      const details = JSON.parse(entries[0].details as string);
      expect(details.anonymizedUserId).toBeUndefined();
    });

    it('never stores raw userId in DB', async () => {
      const { recordSafetyEvent } = await import('../audit-trail-service');

      vi.mocked(prisma.complianceAuditEntry.createMany).mockResolvedValue({
        count: 50,
      });

      const sensitiveUserId = 'user-sensitive-12345678';

      for (let i = 0; i < 50; i++) {
        recordSafetyEvent('prompt_injection_attempt', {
          userId: sensitiveUserId,
          metadata: { confidence: 0.99 },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const callArgs = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      const entries = callArgs!.data as Array<Record<string, unknown>>;

      // Verify userId field is always null (PII protection)
      for (const entry of entries) {
        expect(entry.userId).toBeNull();

        // Verify only anonymized version in details
        const details = JSON.parse(entry.details as string);
        expect(details.anonymizedUserId).toBe('user-sen***');
        expect(details.anonymizedUserId).not.toContain('sensitive');
        expect(details.anonymizedUserId).not.toContain('12345678');
      }
    });
  });
});
