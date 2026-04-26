/**
 * Streaming Sanitizer
 * Sanitizer for streaming AI responses
 *
 * Related: #30 Safety Guardrails Issue, S-03 Task
 */

import type { SanitizeCategory } from './types';
import { sanitizeOutput, needsSanitization } from './sanitizer';

/**
 * Sanitize a stream of text chunks (for streaming responses)
 * Accumulates text and sanitizes when a complete sentence is detected
 */
export class StreamingSanitizer {
  private buffer: string = '';
  private totalIssues: number = 0;
  private categories: Set<SanitizeCategory> = new Set();

  /**
   * Process a chunk of streamed text
   * @returns Sanitized text safe to display (may be partial)
   */
  processChunk(chunk: string): string {
    this.buffer += chunk;

    // Check for sentence boundaries to flush
    const sentenceEnd = /[.!?]\s*$/;
    if (sentenceEnd.test(this.buffer)) {
      const result = sanitizeOutput(this.buffer);
      this.totalIssues += result.issuesFound;
      result.categories.forEach((c) => this.categories.add(c));
      this.buffer = '';
      return result.text;
    }

    // For incomplete sentences, do a quick safety check
    // Only return if no immediate red flags
    if (needsSanitization(this.buffer)) {
      // Hold the buffer until we have more context
      return '';
    }

    // Return the current buffer and clear it
    const output = this.buffer;
    this.buffer = '';
    return output;
  }

  /**
   * Flush any remaining buffer at end of stream
   */
  flush(): string {
    if (!this.buffer) return '';
    const result = sanitizeOutput(this.buffer);
    this.totalIssues += result.issuesFound;
    result.categories.forEach((c) => this.categories.add(c));
    this.buffer = '';
    return result.text;
  }

  /**
   * Get summary of all issues found during streaming
   */
  getSummary(): { totalIssues: number; categories: SanitizeCategory[] } {
    return {
      totalIssues: this.totalIssues,
      categories: Array.from(this.categories),
    };
  }

  /**
   * Reset the sanitizer for a new stream
   */
  reset(): void {
    this.buffer = '';
    this.totalIssues = 0;
    this.categories.clear();
  }
}
