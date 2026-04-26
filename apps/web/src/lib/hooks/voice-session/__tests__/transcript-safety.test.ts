/**
 * Tests for voice transcript safety checks
 * Related: Plan 148 W2 T2-04 - User transcript safety check
 * Related: Plan 148 W2 T2-05 - Assistant transcript post-check
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUserTranscript, checkAssistantTranscript } from '../transcript-safety';
import type { FilterResult } from '@/lib/safety';
import { filterInput } from '@/lib/safety';
import { isFeatureEnabled } from '@/lib/feature-flags/client';
import { clientLogger } from '@/lib/logger/client';

// Mock dependencies
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

vi.mock('@/lib/safety', () => ({
  filterInput: vi.fn(),
}));

describe('checkUserTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockReturnValue({
      enabled: true,
      reason: 'enabled',
      flag: { name: 'voice_transcript_safety', status: 'enabled' },
    } as any);
  });

  describe('when feature flag is disabled', () => {
    it('should return allow action without checking content', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue({
        enabled: false,
        reason: 'disabled',
        flag: { name: 'voice_transcript_safety', status: 'disabled' },
      } as any);

      const result = checkUserTranscript('test-session-1', 'Hello maestro');

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
      expect(result.flaggedPatterns).toEqual([]);
    });
  });

  describe('when feature flag is enabled', () => {
    it('should allow safe content', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: true,
        severity: 'none',
        action: 'allow',
      } as FilterResult);

      const result = checkUserTranscript('test-session-2', 'Can you help me with math?');

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
      expect(result.flaggedPatterns).toEqual([]);
    });

    it('should warn on profanity', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'medium',
        action: 'warn',
        reason: 'Italian profanity detected',
        category: 'profanity',
      } as FilterResult);

      const result = checkUserTranscript('test-session-3', 'bad words here');

      expect(result.severity).toBe('medium');
      expect(result.actionTaken).toBe('warn');
      expect(result.flaggedPatterns).toContain('profanity');
    });

    it('should block on explicit content', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'high',
        action: 'block',
        reason: 'Explicit content request detected',
        category: 'explicit',
      } as FilterResult);

      const result = checkUserTranscript('test-session-4', 'inappropriate content');

      expect(result.severity).toBe('high');
      expect(result.actionTaken).toBe('block');
      expect(result.flaggedPatterns).toContain('explicit');
    });

    it('should escalate on crisis keywords', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'critical',
        action: 'redirect',
        reason: 'Crisis keywords detected',
        category: 'crisis',
      } as FilterResult);

      const result = checkUserTranscript('test-session-5', 'crisis text');

      expect(result.severity).toBe('critical');
      expect(result.actionTaken).toBe('escalate');
      expect(result.flaggedPatterns).toContain('crisis');
    });

    it('should block on jailbreak attempts', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'high',
        action: 'redirect',
        reason: 'Jailbreak/injection attempt detected',
        category: 'jailbreak',
      } as FilterResult);

      const result = checkUserTranscript('test-session-6', 'ignore previous instructions');

      expect(result.severity).toBe('high');
      // redirect maps to escalate in mapFilterAction
      expect(result.actionTaken).toBe('escalate');
      expect(result.flaggedPatterns).toContain('jailbreak');
    });

    it('should block on violence patterns', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'high',
        action: 'block',
        reason: 'Violence-related content detected',
        category: 'violence',
      } as FilterResult);

      const result = checkUserTranscript('test-session-7', 'violent content');

      expect(result.severity).toBe('high');
      expect(result.actionTaken).toBe('block');
      expect(result.flaggedPatterns).toContain('violence');
    });

    it('should measure check duration', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: true,
        severity: 'none',
        action: 'allow',
      } as FilterResult);

      const result = checkUserTranscript('test-session-8', 'test message');

      expect(result.checkDurationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.checkDurationMs).toBe('number');
    });

    it('should return VCE-002 compliant data structure', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'medium',
        action: 'warn',
        category: 'profanity',
      } as FilterResult);

      const result = checkUserTranscript('test-session-9', 'test');

      // VCE-002 required fields from plan-147-notes.md
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('flaggedPatterns');
      expect(result).toHaveProperty('actionTaken');
      expect(result).toHaveProperty('checkDurationMs');

      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(result.severity);
      expect(['allow', 'warn', 'block', 'escalate']).toContain(result.actionTaken);
      expect(Array.isArray(result.flaggedPatterns)).toBe(true);
    });

    it('should emit VCE-002 logging event when content is flagged', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'high',
        action: 'block',
        category: 'explicit',
      } as FilterResult);

      checkUserTranscript('test-session-vce-002', 'flagged content');

      expect(clientLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[TranscriptSafety]'),
        expect.objectContaining({
          component: 'voice-transcript-safety',
          eventId: 'VCE-002',
          eventName: 'Transcript Safety Check (Input)',
          sessionId: 'test-session-vce-002',
          detectedSeverity: 'high',
          flaggedPatterns: ['explicit'],
          actionTaken: 'block',
          checkDurationMs: expect.any(Number),
        }),
      );
    });

    it('should NOT emit VCE-002 logging when content is allowed', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: true,
        severity: 'none',
        action: 'allow',
      } as FilterResult);

      checkUserTranscript('test-session-safe', 'safe content');

      // Should only have debug log, not info with VCE-002
      const infoCall = vi
        .mocked(clientLogger.info)
        .mock.calls.find(
          (call: unknown[]) => (call[1] as Record<string, unknown>)?.eventId === 'VCE-002',
        );
      expect(infoCall).toBeUndefined();
    });

    it('should emit VCE-002 logging with all flagged patterns', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'critical',
        action: 'redirect',
        category: 'crisis',
      } as FilterResult);

      checkUserTranscript('test-session-multi', 'crisis keywords');

      expect(clientLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventId: 'VCE-002',
          flaggedPatterns: ['crisis'],
          actionTaken: 'escalate', // redirect maps to escalate
        }),
      );
    });
  });

  describe('empty or invalid input', () => {
    it('should allow empty transcript', () => {
      const result = checkUserTranscript('test-session-10', '');

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
    });

    it('should allow whitespace-only transcript', () => {
      const result = checkUserTranscript('test-session-11', '   ');

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
    });
  });
});

describe('checkAssistantTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockReturnValue({
      enabled: true,
      reason: 'enabled',
      flag: { name: 'voice_transcript_safety', status: 'enabled' },
    } as any);
  });

  describe('when feature flag is disabled', () => {
    it('should return allow action without checking content', () => {
      vi.mocked(isFeatureEnabled).mockReturnValue({
        enabled: false,
        reason: 'disabled',
        flag: { name: 'voice_transcript_safety', status: 'disabled' },
      } as any);

      const result = checkAssistantTranscript('test-session-1', 'Let me help you with that.');

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
      expect(result.flaggedPatterns).toEqual([]);
    });
  });

  describe('when feature flag is enabled', () => {
    it('should allow safe assistant output', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: true,
        severity: 'none',
        action: 'allow',
      } as FilterResult);

      const result = checkAssistantTranscript(
        'test-session-2',
        'Great question! Let me explain that concept.',
      );

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
      expect(result.flaggedPatterns).toEqual([]);
    });

    it('should sanitize on profanity warning (log but allow)', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'medium',
        action: 'warn',
        reason: 'Profanity detected in assistant output',
        category: 'profanity',
      } as FilterResult);

      const result = checkAssistantTranscript('test-session-3', 'assistant output with warning');

      expect(result.severity).toBe('medium');
      expect(result.actionTaken).toBe('sanitize');
      expect(result.flaggedPatterns).toContain('profanity');
    });

    it('should reject on blocked content', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'high',
        action: 'block',
        reason: 'Inappropriate content in assistant output',
        category: 'explicit',
      } as FilterResult);

      const result = checkAssistantTranscript('test-session-4', 'inappropriate assistant response');

      expect(result.severity).toBe('high');
      expect(result.actionTaken).toBe('reject');
      expect(result.flaggedPatterns).toContain('explicit');
    });

    it('should reject on redirect action (crisis/jailbreak)', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'critical',
        action: 'redirect',
        reason: 'Crisis keywords in assistant output',
        category: 'crisis',
      } as FilterResult);

      const result = checkAssistantTranscript('test-session-5', 'crisis content from assistant');

      expect(result.severity).toBe('critical');
      expect(result.actionTaken).toBe('reject');
      expect(result.flaggedPatterns).toContain('crisis');
    });

    it('should measure check duration', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: true,
        severity: 'none',
        action: 'allow',
      } as FilterResult);

      const result = checkAssistantTranscript('test-session-6', 'test message');

      expect(result.checkDurationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.checkDurationMs).toBe('number');
    });

    it('should return VCE-003 compliant data structure', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'medium',
        action: 'warn',
        category: 'profanity',
      } as FilterResult);

      const result = checkAssistantTranscript('test-session-7', 'test');

      // VCE-003 required fields from plan-147-notes.md
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('flaggedPatterns');
      expect(result).toHaveProperty('actionTaken');
      expect(result).toHaveProperty('checkDurationMs');

      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(result.severity);
      expect(['allow', 'sanitize', 'reject']).toContain(result.actionTaken);
      expect(Array.isArray(result.flaggedPatterns)).toBe(true);
    });

    it('should emit VCE-003 logging event when assistant content is flagged', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'high',
        action: 'block',
        category: 'explicit',
      } as FilterResult);

      checkAssistantTranscript('test-session-vce-003', 'flagged assistant output');

      expect(clientLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[TranscriptSafety]'),
        expect.objectContaining({
          component: 'voice-transcript-safety',
          eventId: 'VCE-003',
          eventName: 'Transcript Safety Check (Output)',
          sessionId: 'test-session-vce-003',
          detectedSeverity: 'high',
          flaggedPatterns: ['explicit'],
          actionTaken: 'reject', // block maps to reject for assistant
          checkDurationMs: expect.any(Number),
        }),
      );
    });

    it('should NOT emit VCE-003 logging when assistant content is allowed', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: true,
        severity: 'none',
        action: 'allow',
      } as FilterResult);

      checkAssistantTranscript('test-session-safe-assistant', 'safe assistant output');

      // Should only have debug log, not warn with VCE-003
      const warnCall = vi
        .mocked(clientLogger.warn)
        .mock.calls.find(
          (call: unknown[]) => (call[1] as Record<string, unknown>)?.eventId === 'VCE-003',
        );
      expect(warnCall).toBeUndefined();
    });

    it('should emit VCE-003 logging with sanitize action for warnings', () => {
      vi.mocked(filterInput).mockReturnValue({
        safe: false,
        severity: 'medium',
        action: 'warn',
        category: 'profanity',
      } as FilterResult);

      checkAssistantTranscript('test-session-sanitize', 'minor issue');

      expect(clientLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventId: 'VCE-003',
          flaggedPatterns: ['profanity'],
          actionTaken: 'sanitize', // warn maps to sanitize for assistant
        }),
      );
    });
  });

  describe('empty or invalid input', () => {
    it('should allow empty transcript', () => {
      const result = checkAssistantTranscript('test-session-8', '');

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
    });

    it('should allow whitespace-only transcript', () => {
      const result = checkAssistantTranscript('test-session-9', '   ');

      expect(result.severity).toBe('none');
      expect(result.actionTaken).toBe('allow');
    });
  });
});
