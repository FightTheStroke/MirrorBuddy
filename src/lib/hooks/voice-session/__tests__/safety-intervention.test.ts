/**
 * Tests for voice session safety intervention flow
 * Related: Plan 148 W2 T2-06 - Safe-response redirect flow
 *
 * Tests the implementation of:
 * 1. response.cancel via data channel
 * 2. response.create with safe educational redirect
 * 3. VCE-004 compliance event logging
 * 4. UI warning state update
 * 5. Feature flag guard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerSafetyIntervention } from '../safety-intervention';
import type { SafetyWarningState } from '../safety-intervention';
import type { TranscriptSafetyResult } from '../transcript-safety';
import type { FeatureFlagCheckResult } from '@/lib/feature-flags/types';

// Mock dependencies - must be hoisted, so use factory functions
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/feature-flags/client', () => ({
  isFeatureEnabled: vi.fn(),
}));

const mockFlagEnabled = {
  enabled: true,
  reason: 'enabled',
  flag: { name: 'voice_transcript_safety', status: 'enabled' },
} as unknown as FeatureFlagCheckResult;

const mockFlagDisabled = {
  enabled: false,
  reason: 'disabled',
  flag: { name: 'voice_transcript_safety', status: 'disabled' },
} as unknown as FeatureFlagCheckResult;

describe('triggerSafetyIntervention', () => {
  let mockDataChannel: {
    send: ReturnType<typeof vi.fn>;
    readyState: string;
  };

  let mockSetWarningState: (state: SafetyWarningState) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { isFeatureEnabled } = await import('@/lib/feature-flags/client');
    vi.mocked(isFeatureEnabled).mockReturnValue(mockFlagEnabled);

    mockDataChannel = {
      send: vi.fn(),
      readyState: 'open',
    };

    mockSetWarningState = vi.fn();
  });

  describe('when feature flag is disabled', () => {
    it('should skip intervention when voice_transcript_safety is disabled', async () => {
      const { isFeatureEnabled } = await import('@/lib/feature-flags/client');
      vi.mocked(isFeatureEnabled).mockReturnValue(mockFlagDisabled);

      const safetyResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['explicit'],
        actionTaken: 'block',
        checkDurationMs: 5,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-1',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      expect(mockDataChannel.send).not.toHaveBeenCalled();
      expect(mockSetWarningState).not.toHaveBeenCalled();
    });
  });

  describe('when feature flag is enabled', () => {
    it('should cancel current response via data channel', () => {
      const safetyResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['explicit'],
        actionTaken: 'block',
        checkDurationMs: 5,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-2',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      const calls = mockDataChannel.send.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);

      const cancelCall = calls.find((call) => {
        const msg = JSON.parse(call[0] as string);
        return msg.type === 'response.cancel';
      });

      expect(cancelCall).toBeDefined();
    });

    it('should create safe redirect response with educational message', () => {
      const safetyResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['violence'],
        actionTaken: 'block',
        checkDurationMs: 8,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-3',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      const calls = mockDataChannel.send.mock.calls;
      const createCall = calls.find((call) => {
        const msg = JSON.parse(call[0] as string);
        return msg.type === 'response.create';
      });

      expect(createCall).toBeDefined();
      const createMessage = JSON.parse(createCall![0] as string);
      expect(createMessage.response).toBeDefined();
      expect(createMessage.response.instructions).toMatch(
        /sicurezza|content policy|violazione|violenza/i,
      );
    });

    it('should update UI warning state', () => {
      const safetyResult: TranscriptSafetyResult = {
        severity: 'medium',
        flaggedPatterns: ['profanity'],
        actionTaken: 'warn',
        checkDurationMs: 3,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-4',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      expect(mockSetWarningState).toHaveBeenCalledWith(
        expect.objectContaining({
          active: true,
          severity: safetyResult.severity,
          flaggedPatterns: safetyResult.flaggedPatterns,
        }),
      );
    });

    it('should log VCE-004 compliance event', async () => {
      const { clientLogger } = await import('@/lib/logger/client');

      const safetyResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['explicit', 'violence'],
        actionTaken: 'block',
        checkDurationMs: 12,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-5',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      expect(clientLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SafetyIntervention]'),
        expect.objectContaining({
          component: 'voice-safety-intervention',
          eventId: 'VCE-004',
          eventName: 'Safety Intervention Activated',
          sessionId: 'test-session-5',
          interventionReason: expect.any(String),
          flaggedPatterns: ['explicit', 'violence'],
        }),
      );
    });

    it('should map flagged patterns to intervention reason', async () => {
      const { clientLogger } = await import('@/lib/logger/client');

      const safetyResult: TranscriptSafetyResult = {
        severity: 'critical',
        flaggedPatterns: ['crisis'],
        actionTaken: 'escalate',
        checkDurationMs: 6,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-6',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      expect(clientLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          interventionReason: 'crisis_detected',
        }),
      );
    });

    it('should handle closed data channel gracefully', () => {
      mockDataChannel.readyState = 'closed';

      const safetyResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['explicit'],
        actionTaken: 'block',
        checkDurationMs: 5,
      };

      expect(() =>
        triggerSafetyIntervention({
          sessionId: 'test-session-7',
          safetyResult,
          dataChannel: mockDataChannel as unknown as RTCDataChannel,
          setWarningState: mockSetWarningState,
        }),
      ).not.toThrow();

      expect(mockDataChannel.send).not.toHaveBeenCalled();
    });

    it('should handle null data channel gracefully', () => {
      const safetyResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['explicit'],
        actionTaken: 'block',
        checkDurationMs: 5,
      };

      expect(() =>
        triggerSafetyIntervention({
          sessionId: 'test-session-8',
          safetyResult,
          dataChannel: null,
          setWarningState: mockSetWarningState,
        }),
      ).not.toThrow();
    });

    it('should only intervene for non-allow actions', () => {
      const safetyResult: TranscriptSafetyResult = {
        severity: 'none',
        flaggedPatterns: [],
        actionTaken: 'allow',
        checkDurationMs: 2,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-9',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      expect(mockDataChannel.send).not.toHaveBeenCalled();
      expect(mockSetWarningState).not.toHaveBeenCalled();
    });

    it('should customize redirect message based on flagged pattern', () => {
      const violenceResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['violence'],
        actionTaken: 'block',
        checkDurationMs: 5,
      };

      triggerSafetyIntervention({
        sessionId: 'test-session-10',
        safetyResult: violenceResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      const createCall = mockDataChannel.send.mock.calls.find((call) => {
        const msg = JSON.parse(call[0] as string);
        return msg.type === 'response.create';
      });

      expect(createCall).toBeDefined();
      const createMessage = JSON.parse(createCall![0] as string);
      expect(createMessage.response.instructions.toLowerCase()).toMatch(/violenza|violence/);
    });

    it('should include session metadata in VCE-004 log', async () => {
      const { clientLogger } = await import('@/lib/logger/client');

      const safetyResult: TranscriptSafetyResult = {
        severity: 'high',
        flaggedPatterns: ['bias'],
        actionTaken: 'block',
        checkDurationMs: 7,
      };

      const timestamp = Date.now();

      triggerSafetyIntervention({
        sessionId: 'test-session-11',
        safetyResult,
        dataChannel: mockDataChannel as unknown as RTCDataChannel,
        setWarningState: mockSetWarningState,
      });

      expect(clientLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.any(Number),
          detectedSeverity: 'high',
        }),
      );

      const logCall = vi
        .mocked(clientLogger.warn)
        .mock.calls.find(
          (call: unknown[]) => (call[1] as Record<string, unknown>)?.eventId === 'VCE-004',
        );
      expect((logCall![1] as Record<string, unknown>).timestamp).toBeGreaterThanOrEqual(timestamp);
    });
  });
});
