/**
 * Trigger Detection System
 * Detects tool triggers from voice transcripts and matches them to plugins
 * Enables voice-based tool invocation (F-04)
 *
 * Security: Implements max transcript length to prevent DoS attacks
 */

import { ToolRegistry } from './registry';
import { MAX_TRANSCRIPT_LENGTH } from './constants';

/**
 * DetectedTrigger - Result of trigger detection in voice transcript
 * Contains matched tool, trigger keyword, and confidence score
 */
export interface DetectedTrigger {
  toolId: string;
  trigger: string;
  confidence: number;
}

/**
 * TriggerDetector - Detects tool triggers in user speech transcripts
 * Matches voice input against registered plugin triggers for voice-based tool invocation
 * Supports confidence scoring for better matching
 */
export class TriggerDetector {
  private registry: ToolRegistry;

  /**
   * Initialize trigger detector with a tool registry
   * @param registry - ToolRegistry instance containing registered plugins
   */
  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Detect all triggers in a transcript
   * Tokenizes transcript and matches tokens against all plugin triggers
   * Returns matches with confidence scores
   *
   * Security: Truncates transcripts exceeding MAX_TRANSCRIPT_LENGTH to prevent DoS
   *
   * @param transcript - The voice transcript to analyze
   * @returns Array of DetectedTrigger objects, highest confidence first
   */
  detectTriggers(transcript: string): DetectedTrigger[] {
    if (!transcript || transcript.trim().length === 0) {
      return [];
    }

    // Security: Truncate excessively long transcripts to prevent DoS
    const safeTranscript = transcript.length > MAX_TRANSCRIPT_LENGTH
      ? transcript.slice(0, MAX_TRANSCRIPT_LENGTH)
      : transcript;

    const tokens = this.tokenize(safeTranscript);
    const detected: DetectedTrigger[] = [];

    // Get all plugins from registry
    const plugins = this.registry.getAll();

    // Check each plugin's triggers
    for (const plugin of plugins) {
      if (!plugin.triggers || plugin.triggers.length === 0) {
        continue;
      }

      for (const pluginTrigger of plugin.triggers) {
        const confidence = this.calculateConfidence(
          tokens,
          pluginTrigger,
        );

        if (confidence > 0) {
          detected.push({
            toolId: plugin.id,
            trigger: pluginTrigger,
            confidence,
          });
        }
      }
    }

    // Sort by confidence descending
    detected.sort((a, b) => b.confidence - a.confidence);
    return detected;
  }

  /**
   * Get the best matching trigger from a list of detected triggers
   * Returns the trigger with highest confidence, or null if empty
   *
   * @param triggers - Array of DetectedTrigger objects
   * @returns The highest confidence trigger, or null if no matches
   */
  getBestMatch(triggers: DetectedTrigger[]): DetectedTrigger | null {
    if (!triggers || triggers.length === 0) {
      return null;
    }
    return triggers[0]; // Already sorted by detectTriggers
  }

  /**
   * Tokenize transcript into lowercase words
   * Removes punctuation and splits on whitespace
   *
   * @param transcript - The text to tokenize
   * @returns Array of lowercase words
   */
  private tokenize(transcript: string): string[] {
    return transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate confidence score for a trigger match
   * Returns 1.0 for exact full match, partial score for word match
   *
   * @param tokens - Tokenized words from transcript
   * @param trigger - The trigger keyword to match
   * @returns Confidence score 0.0 to 1.0
   */
  private calculateConfidence(tokens: string[], trigger: string): number {
    const triggerTokens = trigger.toLowerCase().split(/\s+/);
    const triggerLength = triggerTokens.length;

    // Check for exact trigger match (all trigger tokens consecutive in transcript)
    for (let i = 0; i <= tokens.length - triggerLength; i++) {
      const slice = tokens.slice(i, i + triggerLength);
      if (slice.join(' ') === triggerTokens.join(' ')) {
        return 1.0; // Exact match
      }
    }

    // Check for partial matches (all trigger tokens present)
    const allMatch = triggerTokens.every(triggerToken =>
      tokens.some(token => token === triggerToken),
    );

    if (allMatch) {
      // Partial match: confidence based on word density
      const matchRatio = triggerTokens.length / Math.max(tokens.length, 1);
      return Math.min(0.9, matchRatio); // Cap at 0.9 for partial matches
    }

    return 0;
  }
}

export default TriggerDetector;
