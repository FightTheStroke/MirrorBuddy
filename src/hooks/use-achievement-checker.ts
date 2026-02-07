/**
 * useAchievementChecker - Poll for newly unlocked achievements
 * Used for showing achievement toast notifications after study sessions
 */

import { useState, useEffect } from "react";

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  points: number;
  isSecret: boolean;
}

interface AchievementCheckResponse {
  success: boolean;
  newAchievements: Achievement[];
}

interface UseAchievementCheckerOptions {
  enabled?: boolean;
}

interface UseAchievementCheckerReturn {
  newAchievements: Achievement[];
  error: Error | null;
}

const POLL_INTERVAL = 30000; // 30 seconds

export function useAchievementChecker(
  options: UseAchievementCheckerOptions = {},
): UseAchievementCheckerReturn {
  const { enabled = true } = options;
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchAchievements = async () => {
      try {
        const response = await fetch("/api/gamification/check");

        if (!response.ok) {
          throw new Error("Failed to fetch achievements");
        }

        const data: AchievementCheckResponse = await response.json();

        if (data.success && data.newAchievements.length > 0) {
          setNewAchievements(data.newAchievements);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      }
    };

    // Fetch immediately on mount
    fetchAchievements();

    // Set up polling interval
    const intervalId = setInterval(fetchAchievements, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [enabled]);

  return { newAchievements, error };
}
