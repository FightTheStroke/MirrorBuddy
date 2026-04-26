/**
 * Voice Transcript Safety Checker
 * Validates user transcript text from voice sessions for content safety
 *
 * Related: Plan 148 W2 T2-04 - User transcript safety check
 * Compliance: VCE-002 logging checkpoint (EU AI Act Art. 13, 29)
 */

'use client';

import { filterInput } from '@/lib/safety';
import type { FilterSeverity, FilterAction } from '@/lib/safety';
import { isFeatureEnabled } from '@/lib/feature-flags/client';
import { clientLogger as logger } from '@/lib/logger/client';

/**
 * VCE-002 compliant safety check result
 * Maps to compliance logging checkpoint from plan-147-notes.md
 */
export interface TranscriptSafetyResult {
  /** Detected severity level */
  severity: FilterSeverity;
  /** Flagged pattern categories */
  flaggedPatterns: string[];
  /** Action to take based on safety assessment */
  actionTaken: 'allow' | 'warn' | 'block' | 'escalate';
  /** Duration of safety check in milliseconds */
  checkDurationMs: number;
}

/**
 * Check user transcript for safety violations
 * Guards behind voice_transcript_safety feature flag
 *
 * @param sessionId - Voice session ID for logging correlation
 * @param transcriptText - User's transcribed speech
 * @returns VCE-002 compliant safety result
 *
 * @example
 * const result = checkUserTranscript(sessionId, 'Can you help with math?');
 * if (result.actionTaken === 'block') {
 *   // Trigger safety intervention (T2-06)
 * }
 */
export function checkUserTranscript(
  sessionId: string,
  transcriptText: string,
): TranscriptSafetyResult {
  const startTime = performance.now();

  // Check feature flag
  const flagResult = isFeatureEnabled('voice_transcript_safety');
  if (!flagResult.enabled) {
    logger.debug('[TranscriptSafety] Feature disabled, skipping check', { sessionId });
    return {
      severity: 'none',
      flaggedPatterns: [],
      actionTaken: 'allow',
      checkDurationMs: performance.now() - startTime,
    };
  }

  // Early return for empty input
  const normalized = transcriptText.trim();
  if (!normalized) {
    return {
      severity: 'none',
      flaggedPatterns: [],
      actionTaken: 'allow',
      checkDurationMs: performance.now() - startTime,
    };
  }

  // Run content filter
  const filterResult = filterInput(transcriptText);
  const checkDurationMs = performance.now() - startTime;

  // Map filter action to VCE-002 action
  const actionTaken = mapFilterAction(filterResult.action);

  // Extract flagged patterns
  const flaggedPatterns: string[] = [];
  if (filterResult.category) {
    flaggedPatterns.push(filterResult.category);
  }

  const result: TranscriptSafetyResult = {
    severity: filterResult.severity,
    flaggedPatterns,
    actionTaken,
    checkDurationMs,
  };

  // Log safety check (VCE-002 checkpoint)
  if (actionTaken !== 'allow') {
    logger.info('[TranscriptSafety] Safety check flagged user transcript', {
      component: 'voice-transcript-safety',
      eventId: 'VCE-002',
      eventName: 'Transcript Safety Check (Input)',
      sessionId,
      detectedSeverity: result.severity,
      flaggedPatterns: result.flaggedPatterns,
      actionTaken: result.actionTaken,
      checkDurationMs: result.checkDurationMs,
      // Do NOT log transcriptText in production (GDPR Art. 25)
    });
  } else {
    logger.debug('[TranscriptSafety] User transcript passed safety check', {
      sessionId,
      checkDurationMs: result.checkDurationMs,
    });
  }

  return result;
}

/**
 * VCE-003 compliant assistant transcript safety check result
 * Maps to compliance logging checkpoint from plan-147-notes.md
 */
export interface AssistantTranscriptSafetyResult {
  /** Detected severity level */
  severity: FilterSeverity;
  /** Flagged pattern categories */
  flaggedPatterns: string[];
  /** Action to take based on safety assessment */
  actionTaken: 'allow' | 'sanitize' | 'reject';
  /** Duration of safety check in milliseconds */
  checkDurationMs: number;
}

/**
 * Check assistant transcript for safety violations
 * Guards behind voice_transcript_safety feature flag
 *
 * @param sessionId - Voice session ID for logging correlation
 * @param transcriptText - Assistant's generated speech
 * @returns VCE-003 compliant safety result
 *
 * @example
 * const result = checkAssistantTranscript(sessionId, 'Let me help you with that problem.');
 * if (result.actionTaken === 'reject') {
 *   // Log to audit, escalate for review
 * }
 */
export function checkAssistantTranscript(
  sessionId: string,
  transcriptText: string,
): AssistantTranscriptSafetyResult {
  const startTime = performance.now();

  // Check feature flag
  const flagResult = isFeatureEnabled('voice_transcript_safety');
  if (!flagResult.enabled) {
    logger.debug('[TranscriptSafety] Feature disabled, skipping assistant check', { sessionId });
    return {
      severity: 'none',
      flaggedPatterns: [],
      actionTaken: 'allow',
      checkDurationMs: performance.now() - startTime,
    };
  }

  // Early return for empty input
  const normalized = transcriptText.trim();
  if (!normalized) {
    return {
      severity: 'none',
      flaggedPatterns: [],
      actionTaken: 'allow',
      checkDurationMs: performance.now() - startTime,
    };
  }

  // Run content filter on assistant output
  const filterResult = filterInput(transcriptText);
  const checkDurationMs = performance.now() - startTime;

  // Map filter action to VCE-003 action taxonomy
  const actionTaken = mapAssistantFilterAction(filterResult.action);

  // Extract flagged patterns
  const flaggedPatterns: string[] = [];
  if (filterResult.category) {
    flaggedPatterns.push(filterResult.category);
  }

  const result: AssistantTranscriptSafetyResult = {
    severity: filterResult.severity,
    flaggedPatterns,
    actionTaken,
    checkDurationMs,
  };

  // Log safety check (VCE-003 checkpoint)
  if (actionTaken !== 'allow') {
    logger.warn('[TranscriptSafety] Safety check flagged assistant transcript', {
      component: 'voice-transcript-safety',
      eventId: 'VCE-003',
      eventName: 'Transcript Safety Check (Output)',
      sessionId,
      detectedSeverity: result.severity,
      flaggedPatterns: result.flaggedPatterns,
      actionTaken: result.actionTaken,
      checkDurationMs: result.checkDurationMs,
      // Do NOT log transcriptText in production (GDPR Art. 25)
    });
  } else {
    logger.debug('[TranscriptSafety] Assistant transcript passed safety check', {
      sessionId,
      checkDurationMs: result.checkDurationMs,
    });
  }

  return result;
}

/**
 * Map content filter action to VCE-002 action taxonomy
 * Aligns with compliance logging checkpoint from plan-147-notes.md
 */
function mapFilterAction(filterAction: FilterAction): 'allow' | 'warn' | 'block' | 'escalate' {
  switch (filterAction) {
    case 'allow':
      return 'allow';
    case 'warn':
      return 'warn';
    case 'block':
      return 'block';
    case 'redirect':
      // redirect (crisis) escalates to human oversight
      return 'escalate';
    default:
      return 'block';
  }
}

/**
 * Map content filter action to VCE-003 action taxonomy for assistant output
 * Assistant violations are treated more strictly: reject vs sanitize
 */
function mapAssistantFilterAction(filterAction: FilterAction): 'allow' | 'sanitize' | 'reject' {
  switch (filterAction) {
    case 'allow':
      return 'allow';
    case 'warn':
      // Warnings on assistant output -> sanitize (log but allow)
      return 'sanitize';
    case 'block':
    case 'redirect':
      // Assistant should never produce content requiring block/redirect
      return 'reject';
    default:
      return 'reject';
  }
}
