// ============================================================================
// UNIFIED CHAT VIEW TYPES - Contract interface for unified character chat
// ============================================================================

/**
 * Character type discriminator for routing and rendering
 * Re-exported from characters.ts for convenience
 */
export type { CharacterType } from './characters';

/**
 * Message rendering strategy based on character type
 *
 * - standard: Academic, knowledge-focused (Maestro)
 * - supportive: Coaching, method-oriented (Coach)
 * - peer: Friendly, empathetic (Buddy)
 */
export type MessageRenderStrategy = 'standard' | 'supportive' | 'peer';

/**
 * Feature toggles for chat capabilities
 * Controlled by tier and character type
 */
export interface ChatFeatureToggles {
  /** Educational tools (mindmap, quiz, flashcards) */
  tools: boolean;

  /** RAG-based knowledge retrieval from documents */
  rag: boolean;

  /** Personalized learning path progression */
  learningPath: boolean;

  /** Video/webcam vision capabilities */
  webcam: boolean;
}

/**
 * Unified Chat View Contract
 *
 * Defines the interface for a unified chat component that can render
 * conversations with Maestri, Coaches, and Buddies using a shared shell.
 *
 * Key Design Principles:
 * - Character type determines message rendering style
 * - Voice enablement based on tier (trial=false, base/pro=true)
 * - Handoff enabled between coaches and buddies, disabled for maestri
 * - Feature toggles per character type and tier
 *
 * Usage Example:
 * ```typescript
 * const maestroConfig: UnifiedChatViewContract = {
 *   characterType: 'maestro',
 *   characterId: 'newton',
 *   voiceEnabled: tier === 'pro',
 *   handoffEnabled: false,
 *   featureToggles: {
 *     tools: true,
 *     rag: true,
 *     learningPath: false,
 *     webcam: false,
 *   },
 *   messageRenderer: 'standard',
 * };
 * ```
 */
export interface UnifiedChatViewContract {
  /**
   * Type of character (maestro | coach | buddy)
   * Determines routing, prompt selection, and UI behavior
   */
  characterType: 'maestro' | 'coach' | 'buddy';

  /**
   * Unique identifier for the character instance
   * Examples: 'newton', 'melissa', 'mario'
   */
  characterId: string;

  /**
   * Voice chat enablement flag
   *
   * Business Rules:
   * - Trial tier: always false
   * - Base tier: true (with time limits)
   * - Pro tier: true (unlimited)
   */
  voiceEnabled: boolean;

  /**
   * Handoff capability between characters
   *
   * Business Rules:
   * - Maestro: false (subject-specific, no handoff)
   * - Coach: true (can hand off to buddy for emotional support)
   * - Buddy: true (can hand off to coach for study methods)
   */
  handoffEnabled: boolean;

  /**
   * Feature toggles based on character type and tier
   *
   * Maestro (subject teaching):
   * - tools: true (base+), rag: true (base+), learningPath: false, webcam: false
   *
   * Coach (study methods):
   * - tools: true (base+), rag: false, learningPath: true (base+), webcam: false
   *
   * Buddy (emotional support):
   * - tools: false, rag: false, learningPath: false, webcam: false (pro only)
   */
  featureToggles: ChatFeatureToggles;

  /**
   * Message rendering strategy
   *
   * - standard: Formal academic tone (Maestro)
   * - supportive: Coaching, methodological (Coach)
   * - peer: Friendly, empathetic (Buddy)
   */
  messageRenderer: MessageRenderStrategy;
}

/**
 * Factory helper to create config from tier and character
 * (Implementation in future tasks)
 */
export type UnifiedChatConfigFactory = (params: {
  characterType: 'maestro' | 'coach' | 'buddy';
  characterId: string;
  tierName: 'trial' | 'base' | 'pro';
}) => UnifiedChatViewContract;
