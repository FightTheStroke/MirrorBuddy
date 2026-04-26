/**
 * MIRRORBUDDY - Use Upgrade Prompt Hook
 *
 * Tracks user consumption vs limits and triggers upgrade prompts
 * when usage reaches 80% threshold.
 *
 * Features:
 * - Fetches current usage from /api/user/usage
 * - Calculates threshold (80% of limit)
 * - Shows prompt when any resource exceeds threshold
 * - Allows dismissal (stored in sessionStorage)
 * - Resets dismissal per session
 */

import { useState, useEffect } from "react";

const UPGRADE_THRESHOLD = 80; // Percentage
const DISMISSAL_KEY = "mirrorbuddy-upgrade-prompt-dismissed";

interface ResourceUsage {
  used: number;
  limit: number;
  percentage: number;
}

interface VoiceUsage extends ResourceUsage {
  unit: string;
}

interface UsageData {
  chat: ResourceUsage;
  voice: VoiceUsage;
  tools: ResourceUsage;
  docs: ResourceUsage;
}

interface UseUpgradePromptReturn {
  shouldShowPrompt: boolean;
  triggerReason: string | null;
  dismissPrompt: () => void;
  currentUsage: UsageData | null;
  isLoading: boolean;
}

/**
 * Hook to track usage and show upgrade prompts at 80% threshold
 */
export function useUpgradePrompt(): UseUpgradePromptReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUsage, setCurrentUsage] = useState<UsageData | null>(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    // Initialize from sessionStorage
    return sessionStorage.getItem(DISMISSAL_KEY) === "true";
  });

  // Fetch usage data
  useEffect(() => {
    let isMounted = true;

    async function fetchUsage() {
      try {
        const response = await fetch("/api/user/usage");

        if (!response.ok) {
          if (isMounted) {
            setCurrentUsage(null);
            setIsLoading(false);
          }
          return;
        }

        const data = await response.json();

        if (isMounted) {
          setCurrentUsage(data);
          setIsLoading(false);
        }
      } catch (_error) {
        if (isMounted) {
          setCurrentUsage(null);
          setIsLoading(false);
        }
      }
    }

    fetchUsage();

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate if we should show the prompt
  const shouldShowPrompt =
    !isLoading &&
    !isDismissed &&
    currentUsage !== null &&
    checkThreshold(currentUsage);

  // Determine which resource triggered the threshold
  const triggerReason =
    currentUsage && !isDismissed ? getTriggerReason(currentUsage) : null;

  // Dismiss the prompt
  const dismissPrompt = () => {
    sessionStorage.setItem(DISMISSAL_KEY, "true");
    setIsDismissed(true);
  };

  return {
    shouldShowPrompt,
    triggerReason,
    dismissPrompt,
    currentUsage,
    isLoading,
  };
}

/**
 * Check if any resource exceeds the upgrade threshold
 */
function checkThreshold(usage: UsageData): boolean {
  return (
    usage.chat.percentage >= UPGRADE_THRESHOLD ||
    usage.voice.percentage >= UPGRADE_THRESHOLD ||
    usage.tools.percentage >= UPGRADE_THRESHOLD ||
    usage.docs.percentage >= UPGRADE_THRESHOLD
  );
}

/**
 * Get which resource triggered the threshold (first one found)
 */
function getTriggerReason(usage: UsageData): string | null {
  if (usage.chat.percentage >= UPGRADE_THRESHOLD) {
    return "chat";
  }
  if (usage.voice.percentage >= UPGRADE_THRESHOLD) {
    return "voice";
  }
  if (usage.tools.percentage >= UPGRADE_THRESHOLD) {
    return "tools";
  }
  if (usage.docs.percentage >= UPGRADE_THRESHOLD) {
    return "docs";
  }
  return null;
}
