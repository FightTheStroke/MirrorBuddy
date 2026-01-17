/**
 * Admin Authorization Middleware (F-26)
 *
 * Validates user has ADMIN role for protected endpoints.
 * Use in API routes that require administrative access.
 *
 * @example
 * // In an API route:
 * import { requireAdmin, extractUserId } from '@/lib/auth';
 *
 * export async function GET(request: NextRequest) {
 *   const userId = await extractUserId();
 *   if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *
 *   const adminCheck = await requireAdmin(userId);
 *   if (!adminCheck.authorized) {
 *     return NextResponse.json({ error: adminCheck.error }, { status: 403 });
 *   }
 *
 *   // User is admin, proceed with privileged operation
 * }
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface AdminCheckResult {
  authorized: boolean;
  error?: string;
}

/**
 * Check if user has ADMIN role
 * @param userId - User ID to check
 * @returns Authorization result with error message if denied
 */
export async function requireAdmin(userId: string): Promise<AdminCheckResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      logger.warn('Admin check failed: user not found', { userId });
      return { authorized: false, error: 'User not found' };
    }

    if (user.role !== 'ADMIN') {
      logger.warn('Admin access denied', { userId, role: user.role });
      return { authorized: false, error: 'Forbidden: admin access required' };
    }

    logger.debug('Admin access granted', { userId });
    return { authorized: true };
  } catch (error) {
    logger.error('Admin check error', { userId, error: String(error) });
    return { authorized: false, error: 'Authorization check failed' };
  }
}

/**
 * Quick check if user is admin without logging
 * For conditional UI rendering in server components
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  } catch {
    return false;
  }
}
