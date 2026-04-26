/**
 * Email Preference Service
 *
 * Manages user email communication preferences and unsubscribe functionality.
 * Provides opt-in/opt-out controls for different email categories.
 *
 * Features:
 * - Get/update user email preferences
 * - Create default preferences (opt-in by default)
 * - Token-based unsubscribe (secure, no authentication required)
 * - Category-specific unsubscribe support
 * - canSendTo() check for compliance with user preferences
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Email category types
 * Maps to boolean fields in EmailPreference model
 */
export type EmailCategory =
  | "productUpdates"
  | "educationalNewsletter"
  | "announcements";

/**
 * Email preference structure
 */
export interface EmailPreferences {
  id: string;
  userId: string;
  productUpdates: boolean;
  educationalNewsletter: boolean;
  announcements: boolean;
  unsubscribeToken: string;
  consentedAt: Date;
  updatedAt: Date;
}

/**
 * Partial preferences for updates (only modifiable fields)
 */
export interface EmailPreferenceUpdate {
  productUpdates?: boolean;
  educationalNewsletter?: boolean;
  announcements?: boolean;
}

/**
 * Get email preferences for a user
 *
 * @param userId - User ID
 * @returns EmailPreferences or null if not found
 */
export async function getPreferences(
  userId: string,
): Promise<EmailPreferences | null> {
  try {
    const preferences = await prisma.emailPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      return null;
    }

    return preferences;
  } catch (error) {
    logger.error("Error fetching email preferences", {
      userId,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Update email preferences for a user
 *
 * @param userId - User ID
 * @param prefs - Partial preferences to update
 * @returns Updated EmailPreferences
 */
export async function updatePreferences(
  userId: string,
  prefs: EmailPreferenceUpdate,
): Promise<EmailPreferences> {
  try {
    // Ensure preferences exist, create if not
    const existing = await getPreferences(userId);
    if (!existing) {
      // Create with updated values
      return await createDefaultPreferences(userId, prefs);
    }

    // Update existing preferences
    const updated = await prisma.emailPreference.update({
      where: { userId },
      data: prefs,
    });

    logger.info("Email preferences updated", { userId, changes: prefs });

    return updated;
  } catch (error) {
    logger.error("Error updating email preferences", {
      userId,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Create default email preferences for a user
 * All categories are opt-in by default
 *
 * @param userId - User ID
 * @param overrides - Optional overrides to default preferences
 * @returns Created EmailPreferences
 */
export async function createDefaultPreferences(
  userId: string,
  overrides?: EmailPreferenceUpdate,
): Promise<EmailPreferences> {
  try {
    const preferences = await prisma.emailPreference.create({
      data: {
        userId,
        productUpdates: overrides?.productUpdates ?? true,
        educationalNewsletter: overrides?.educationalNewsletter ?? true,
        announcements: overrides?.announcements ?? true,
        unsubscribeToken: crypto.randomUUID(),
      },
    });

    logger.info("Default email preferences created", { userId });

    return preferences;
  } catch (error) {
    logger.error("Error creating default email preferences", {
      userId,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Get email preferences by unsubscribe token
 * Used for token-based unsubscribe (no authentication required)
 *
 * @param token - Unsubscribe token
 * @returns EmailPreferences or null if token not found
 */
export async function getPreferencesByToken(
  token: string,
): Promise<EmailPreferences | null> {
  try {
    const preferences = await prisma.emailPreference.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!preferences) {
      logger.warn("Unsubscribe token not found", { token });
      return null;
    }

    return preferences;
  } catch (error) {
    logger.error("Error fetching preferences by token", {
      token,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Unsubscribe from emails using token
 * If category is provided, unsubscribe from that category only
 * If no category, unsubscribe from all categories
 *
 * @param token - Unsubscribe token
 * @param category - Optional specific category to unsubscribe from
 * @returns Updated EmailPreferences or null if token not found
 */
export async function unsubscribeByToken(
  token: string,
  category?: EmailCategory,
): Promise<EmailPreferences | null> {
  try {
    const preferences = await getPreferencesByToken(token);

    if (!preferences) {
      return null;
    }

    // Determine which fields to update
    const updates: EmailPreferenceUpdate = category
      ? { [category]: false }
      : {
          productUpdates: false,
          educationalNewsletter: false,
          announcements: false,
        };

    const updated = await prisma.emailPreference.update({
      where: { unsubscribeToken: token },
      data: updates,
    });

    logger.info("User unsubscribed via token", {
      userId: preferences.userId,
      category: category || "all",
      token,
    });

    return updated;
  } catch (error) {
    logger.error("Error unsubscribing by token", {
      token,
      category,
      error: String(error),
    });
    throw error;
  }
}

/**
 * Check if email can be sent to a user for a specific category
 * Creates default preferences (opt-in) if they don't exist
 *
 * @param userId - User ID
 * @param category - Email category
 * @returns true if email can be sent, false otherwise
 */
export async function canSendTo(
  userId: string,
  category: EmailCategory,
): Promise<boolean> {
  try {
    let preferences = await getPreferences(userId);

    // If no preferences exist, create default (opt-in)
    if (!preferences) {
      preferences = await createDefaultPreferences(userId);
    }

    // Check if category is enabled
    return preferences[category];
  } catch (error) {
    logger.error("Error checking if can send email", {
      userId,
      category,
      error: String(error),
    });
    // Fail closed: if error, don't send email
    return false;
  }
}
