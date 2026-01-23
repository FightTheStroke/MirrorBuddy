// ============================================================================
// ADAPTIVE VAD CONFIGURATION
// Profile-aware Voice Activity Detection settings for DSA students
// ADR-0065: Adaptive VAD for Accessibility Profiles
// ============================================================================

import type { A11yProfileId } from "@/lib/accessibility";

/**
 * Noise reduction type for Azure Realtime API
 * - near_field: Optimized for headphones/close microphone
 * - far_field: Optimized for laptop speaker/distant microphone
 */
export type NoiseReductionType = "near_field" | "far_field";

/**
 * VAD (Voice Activity Detection) configuration for Azure Realtime API
 */
export interface VadConfig {
  /** Audio energy threshold (0-1). Lower = more sensitive to quiet speech */
  threshold: number;
  /** Milliseconds of silence before considering turn complete */
  silence_duration_ms: number;
  /** Milliseconds of audio to include before speech detection */
  prefix_padding_ms: number;
  /** Noise reduction optimization */
  noise_reduction: NoiseReductionType;
}

/**
 * Default VAD configuration (neurotypical baseline)
 * Optimized for quick, responsive conversations
 */
export const DEFAULT_VAD_CONFIG: VadConfig = {
  threshold: 0.6,
  silence_duration_ms: 700,
  prefix_padding_ms: 300,
  noise_reduction: "near_field",
};

/**
 * VAD profiles optimized for each DSA type
 *
 * Research basis:
 * - Dyslexia: Word retrieval delays, longer pauses during formulation
 * - ADHD: Distraction-induced pauses, thought interruptions
 * - Autism: Atypical prosody, processing time needs
 * - Motor: Articulation difficulties, breath control challenges
 * - Visual: Standard timing (visual, not speech-related)
 * - Auditory: Standard timing (hearing, not speech production)
 * - Cerebral Palsy: Combined motor + processing delays
 */
export const VAD_PROFILES: Record<NonNullable<A11yProfileId>, VadConfig> = {
  dyslexia: {
    threshold: 0.55, // More sensitive to catch hesitant speech
    silence_duration_ms: 1500, // 2x longer for word retrieval
    prefix_padding_ms: 400, // Capture speech onset better
    noise_reduction: "near_field", // Standard noise reduction
  },

  adhd: {
    threshold: 0.6, // Standard sensitivity
    silence_duration_ms: 1800, // Tolerates distraction pauses
    prefix_padding_ms: 350, // Slight buffer for restart
    noise_reduction: "far_field", // Better for fidgety movement
  },

  autism: {
    threshold: 0.5, // More sensitive for atypical prosody
    silence_duration_ms: 1400, // Processing time allowance
    prefix_padding_ms: 500, // Larger buffer for varied onset
    noise_reduction: "near_field", // Consistent environment preferred
  },

  motor: {
    threshold: 0.45, // Very sensitive for weak voice
    silence_duration_ms: 2000, // Articulation time
    prefix_padding_ms: 600, // Capture breath before speech
    noise_reduction: "far_field", // May use assistive devices
  },

  visual: {
    // Visual impairment doesn't affect speech timing
    threshold: 0.6,
    silence_duration_ms: 700,
    prefix_padding_ms: 300,
    noise_reduction: "near_field",
  },

  auditory: {
    // Auditory impairment may affect speech rhythm slightly
    threshold: 0.55,
    silence_duration_ms: 900,
    prefix_padding_ms: 350,
    noise_reduction: "far_field", // May use hearing aids
  },

  cerebral: {
    // Combined motor + cognitive considerations
    threshold: 0.4, // Very sensitive
    silence_duration_ms: 2500, // Maximum patience
    prefix_padding_ms: 700, // Large buffer
    noise_reduction: "far_field", // May use assistive devices
  },
};

/**
 * Get VAD configuration based on active accessibility profile
 *
 * @param activeProfile - Current accessibility profile (null = default)
 * @param adaptiveEnabled - Whether adaptive VAD is enabled in settings
 * @returns VAD configuration object for Azure Realtime API
 *
 * @example
 * const vadConfig = getAdaptiveVadConfig('dyslexia', true);
 * // Returns: { threshold: 0.55, silence_duration_ms: 1500, prefix_padding_ms: 400 }
 */
export function getAdaptiveVadConfig(
  activeProfile: A11yProfileId,
  adaptiveEnabled: boolean = true,
): VadConfig {
  // If adaptive VAD is disabled, always use default
  if (!adaptiveEnabled) {
    return DEFAULT_VAD_CONFIG;
  }

  // If no profile is active, use default
  if (!activeProfile) {
    return DEFAULT_VAD_CONFIG;
  }

  // Return profile-specific config
  return VAD_PROFILES[activeProfile];
}

/**
 * Format VAD config for logging/debugging
 */
export function formatVadConfigForLogging(
  config: VadConfig,
  profile: A11yProfileId,
): string {
  const profileName = profile ?? "default";
  return `VAD[${profileName}]: threshold=${config.threshold}, silence=${config.silence_duration_ms}ms, prefix=${config.prefix_padding_ms}ms`;
}

/**
 * Validate VAD config values are within acceptable ranges
 */
export function isValidVadConfig(config: VadConfig): boolean {
  const validNoiseReduction =
    config.noise_reduction === "near_field" ||
    config.noise_reduction === "far_field";

  return (
    config.threshold >= 0.1 &&
    config.threshold <= 1.0 &&
    config.silence_duration_ms >= 200 &&
    config.silence_duration_ms <= 5000 &&
    config.prefix_padding_ms >= 100 &&
    config.prefix_padding_ms <= 1000 &&
    validNoiseReduction
  );
}
