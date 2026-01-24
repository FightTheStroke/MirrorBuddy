/**
 * Video Vision Guard - Pro-only feature access control
 *
 * Provides:
 * - canUseVideoVision(userId): Check if user has access to video vision
 * - requireVideoVision(userId): Assert user has access or throw error
 *
 * Video Vision is a Pro-tier only feature for webcam/video interactions
 * Anonymous users (null userId) default to Trial tier, which doesn't include this feature
 */

import { TierService } from "./tier-service";

const tierService = new TierService();

/**
 * Check if a user can use the video vision feature
 *
 * @param userId - User ID (null for anonymous users)
 * @returns true if user has access to video vision (Pro tier), false otherwise
 */
export async function canUseVideoVision(
  userId: string | null,
): Promise<boolean> {
  return await tierService.checkFeatureAccess(userId, "video_vision");
}

/**
 * Require that a user has access to the video vision feature
 *
 * @param userId - User ID (null for anonymous users)
 * @throws Error if user doesn't have access to video vision
 */
export async function requireVideoVision(userId: string | null): Promise<void> {
  const hasAccess = await canUseVideoVision(userId);

  if (!hasAccess) {
    throw new Error(
      "Video vision feature is available only in the Pro tier. Please upgrade your subscription to use video and webcam features.",
    );
  }
}
