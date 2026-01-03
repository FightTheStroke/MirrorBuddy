/**
 * API Route: Study Kit by ID
 * GET /api/study-kit/[id]
 *
 * Get study kit status and generated materials
 * Wave 2: Study Kit Generator
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { StudyKit } from '@/types/study-kit';

/**
 * GET /api/study-kit/[id]
 * Get study kit by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get study kit
    const studyKit = await prisma.studyKit.findUnique({
      where: { id },
    });

    if (!studyKit) {
      return NextResponse.json(
        { error: 'Study kit not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (studyKit.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse JSON fields
    const response: StudyKit = {
      id: studyKit.id,
      userId: studyKit.userId,
      sourceFile: studyKit.sourceFile,
      title: studyKit.title,
      summary: studyKit.summary || undefined,
      mindmap: studyKit.mindmap ? JSON.parse(studyKit.mindmap) : undefined,
      demo: studyKit.demo ? JSON.parse(studyKit.demo) : undefined,
      quiz: studyKit.quiz ? JSON.parse(studyKit.quiz) : undefined,
      status: studyKit.status as 'processing' | 'ready' | 'error',
      errorMessage: studyKit.errorMessage || undefined,
      subject: studyKit.subject || undefined,
      pageCount: studyKit.pageCount || undefined,
      wordCount: studyKit.wordCount || undefined,
      createdAt: studyKit.createdAt,
      updatedAt: studyKit.updatedAt,
    };

    return NextResponse.json({
      success: true,
      studyKit: response,
    });
  } catch (error) {
    logger.error('Failed to get study kit', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get study kit' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-kit/[id]
 * Delete a study kit
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get study kit to verify ownership
    const studyKit = await prisma.studyKit.findUnique({
      where: { id },
    });

    if (!studyKit) {
      return NextResponse.json(
        { error: 'Study kit not found' },
        { status: 404 }
      );
    }

    if (studyKit.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete study kit
    await prisma.studyKit.delete({
      where: { id },
    });

    logger.info('Study kit deleted', { studyKitId: id, userId });

    return NextResponse.json({
      success: true,
      message: 'Study kit deleted',
    });
  } catch (error) {
    logger.error('Failed to delete study kit', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete study kit' },
      { status: 500 }
    );
  }
}
