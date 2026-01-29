/**
 * Haptic Feedback Module
 * Provides mobile haptic feedback for celebrations and achievements
 */

import { useAccessibilityStore } from "@/lib/accessibility";

/**
 * Pattern types for haptic feedback
 */
export type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

/**
 * Vibration duration in milliseconds
 */
const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [20, 10, 20], // Three short pulses
  error: [30, 15, 30, 15, 30], // Three longer pulses with gaps
};

/**
 * Check if vibration is supported in the browser
 */
function isVibrationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("vibrate" in navigator || "webkitVibrate" in navigator)
  );
}

/**
 * Trigger haptic feedback with the specified pattern
 * Respects accessibility settings - disabled for users with motor impairments or reduced motion
 */
export function triggerHaptic(pattern: HapticPattern = "medium"): void {
  // Don't trigger if vibration is not supported
  if (!isVibrationSupported()) {
    return;
  }

  // Check accessibility settings
  const store = useAccessibilityStore.getState();
  const settings = store.settings;

  // Respect prefers-reduced-motion
  if (settings.reducedMotion) {
    return;
  }

  // Respect motor impairment profile (keyboard navigation mode)
  if (settings.keyboardNavigation) {
    return;
  }

  // Get vibration pattern
  const vibrationPattern = VIBRATION_PATTERNS[pattern];

  // Trigger vibration
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(vibrationPattern);
    } else if ("webkitVibrate" in navigator) {
      const nav = navigator as Navigator & {
        webkitVibrate: (pattern: number | number[]) => boolean;
      };
      nav.webkitVibrate(vibrationPattern);
    }
  } catch (error) {
    // Silently fail if vibration is not available or causes an error
    console.debug("Haptic feedback unavailable:", error);
  }
}

/**
 * Trigger success vibration pattern (celebration)
 */
export function celebrationVibrate(): void {
  triggerHaptic("success");
}

/**
 * Trigger error/warning vibration pattern
 */
export function warningVibrate(): void {
  triggerHaptic("error");
}

/**
 * Trigger light haptic feedback (subtle acknowledgment)
 */
export function lightVibrate(): void {
  triggerHaptic("light");
}
