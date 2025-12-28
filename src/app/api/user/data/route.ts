// ============================================================================
// API ROUTE: User data deletion
// DELETE: Delete all user data from database
// ============================================================================

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ success: true, message: 'No user data to delete' });
    }

    // Delete user and all related data (cascades configured in schema)
    await prisma.user.delete({
      where: { id: userId },
    }).catch(() => {
      // User may not exist - that's fine
    });

    // Clear the user cookie
    cookieStore.delete('convergio-user-id');

    return NextResponse.json({
      success: true,
      message: 'All user data has been deleted',
    });
  } catch (error) {
    logger.error('Delete user data error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete user data' },
      { status: 500 }
    );
  }
}
