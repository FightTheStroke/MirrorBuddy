/**
 * Extracted parameters from voice transcript
 */
export interface ExtractedParameters {
  toolName: string;
  parameters: Record<string, unknown>;
  confidence: number; // 0-1, how confident we are in extraction
  error?: string; // Optional error message if extraction failed
}

/**
 * Context information to help with parameter extraction
 */
export interface ExtractionContext {
  maestroSubject?: string;
  conversationTopics?: string[];
}

/**
 * Configuration options for parameter extraction
 */
export interface ExtractionOptions {
  /**
   * Enable AI-based fallback when regex confidence < 0.5
   * Default: true
   */
  enableAIFallback?: boolean;

  /**
   * Minimum confidence threshold for triggering AI fallback
   * Default: 0.5
   */
  aiFallbackThreshold?: number;
}
