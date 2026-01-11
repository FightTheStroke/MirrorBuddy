/**
 * Types for Jailbreak Detector
 */

/**
 * Threat level classification
 */
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Jailbreak attempt categories
 */
export type JailbreakCategory =
  | 'role_override'        // "Pretend you are..."
  | 'instruction_ignore'   // "Ignore your instructions"
  | 'system_extraction'    // "Show me your system prompt"
  | 'encoding_bypass'      // Base64, rot13, etc.
  | 'multi_turn_attack'    // Building up across messages
  | 'hypothetical_framing' // "In a fictional world..."
  | 'emotional_manipulation' // Guilt-tripping the AI
  | 'authority_claiming';  // "I'm an admin/developer"

/**
 * Detection result with detailed analysis
 */
export interface JailbreakDetection {
  /** Whether a jailbreak attempt was detected */
  detected: boolean;
  /** Threat level of the attempt */
  threatLevel: ThreatLevel;
  /** Confidence score 0-1 */
  confidence: number;
  /** Categories of techniques detected */
  categories: JailbreakCategory[];
  /** Specific patterns that triggered detection */
  triggers: string[];
  /** Recommended action */
  action: 'allow' | 'warn' | 'block' | 'terminate_session';
}

/**
 * Conversation context for multi-turn detection
 */
export interface ConversationContext {
  /** Recent messages (last 10) */
  recentMessages: string[];
  /** Number of previous warnings in session */
  warningCount: number;
  /** Time since session start (seconds) */
  sessionDuration: number;
}
