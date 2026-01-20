/**
 * API Route: Notifications
 *
 * GET /api/notifications - Get user notifications
 * POST /api/notifications - Create notification (internal use)
 * PATCH /api/notifications - Mark notifications as read
 * DELETE /api/notifications - Delete notifications
 */

import { apiHandler } from "@/lib/api";
import * as handlers from "./handlers";

/**
 * GET /api/notifications
 * Returns notifications for a user
 */
export const GET = apiHandler(handlers.GET);

/**
 * POST /api/notifications
 * Create a notification
 */
export const POST = apiHandler(handlers.POST);

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export const PATCH = apiHandler(handlers.PATCH);

/**
 * DELETE /api/notifications
 * Delete or dismiss notifications
 */
export const DELETE = apiHandler(handlers.DELETE);
