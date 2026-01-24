// ============================================================================
// TIER & SUBSCRIPTION TYPES - Core types, enums, and basic definitions
// ============================================================================

/**
 * Available tier levels in the subscription system
 */
export type TierName = "trial" | "base" | "pro";

/**
 * Subscription status states
 */
export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "suspended";

/**
 * Feature keys available across tiers
 */
export type FeatureKey =
  | "chat"
  | "voice"
  | "tools"
  | "documents"
  | "maestri"
  | "coaches"
  | "buddies"
  | "mindmap"
  | "quiz"
  | "flashcards"
  | "homework"
  | "formula"
  | "chart"
  | "summary"
  | "pdf"
  | "webcam"
  | "parent_dashboard"
  | "learning_path"
  | "analytics";

/**
 * Usage tracking types for tier limits
 */
export type UsageType =
  | "chat_messages"
  | "voice_seconds"
  | "tool_uses"
  | "document_uploads"
  | "monthly_api_calls"
  | "storage_gb";

/**
 * Tier limits configuration
 */
export interface TierLimits {
  /** Maximum text chat messages per month (or unlimited if null) */
  chatMessagesPerMonth: number | null;

  /** Maximum voice chat seconds per month */
  voiceSecondsPerMonth: number | null;

  /** Maximum tool uses per month (mindmap, quiz, summary, etc.) */
  toolUsesPerMonth: number | null;

  /** Maximum document uploads per month */
  documentUploadsPerMonth: number | null;

  /** Number of accessible maestri */
  maestriCount: number | null;

  /** Number of accessible coaches */
  coachCount: number | null;

  /** Number of accessible buddies */
  buddyCount: number | null;

  /** Monthly API call limit */
  apiCallsPerMonth: number | null;

  /** Storage quota in GB */
  storageQuotaGb: number;

  /** Concurrent sessions allowed */
  concurrentSessions: number;

  /** Request rate limit (requests per second) */
  requestsPerSecond: number;
}

/**
 * AI models available for each tier
 */
export interface TierAIModels {
  /** Primary chat/text generation model */
  chatModel: string;

  /** Voice/speech model for audio interactions */
  voiceModel: string;

  /** Vision/image understanding model (if supported) */
  visionModel?: string;

  /** Embedding model for RAG/semantic search */
  embeddingModel: string;
}

/**
 * Feature availability per tier
 */
export interface TierFeatureConfig {
  /** Record of feature enablement per tier feature key */
  features: Record<FeatureKey, boolean>;

  /** Whether real-time collaboration is supported */
  realtimeCollaboration: boolean;

  /** Whether offline mode is supported */
  offlineMode: boolean;

  /** Whether custom themes are allowed */
  customThemes: boolean;

  /** Whether API access is granted */
  apiAccess: boolean;

  /** Whether priority support is included */
  prioritySupport: boolean;

  /** Whether advanced analytics dashboard is included */
  advancedAnalytics: boolean;

  /** Whether custom branding is allowed (for coaches/organizations) */
  customBranding: boolean;
}

/**
 * Pricing information for a tier
 */
export interface TierPricing {
  /** Monthly price in EUR */
  monthlyPriceEur: number;

  /** Annual price in EUR */
  annualPriceEur: number;

  /** Setup or one-time cost */
  setupCostEur?: number;

  /** Currency code (e.g., 'EUR', 'USD') */
  currency: string;

  /** Discount percentage for annual billing (0-100) */
  annualDiscountPercent: number;
}
