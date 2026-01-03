/**
 * API Route: Study Kits List
 * GET /api/study-kit
 *
 * List all study kits for the current user
 * Wave 2: Study Kit Generator
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { StudyKit } from '@/types/study-kit';

// Inline type for StudyKit record from Prisma
interface StudyKitRecord {
  id: string;
  userId: string;
  sourceFile: string;
  title: string;
  summary: string | null;
  mindmap: string | null;
  demo: string | null;
  quiz: string | null;
  status: string;
  errorMessage: string | null;
  subject: string | null;
  pageCount: number | null;
  wordCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/study-kit
 * List study kits for current user
 */
export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const subject = searchParams.get('subject');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (status && ['processing', 'ready', 'error'].includes(status)) {
      where.status = status;
    }
    if (subject) {
      where.subject = subject;
    }

    // Get study kits
    const [studyKits, total] = await Promise.all([
      prisma.studyKit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.studyKit.count({ where }),
    ]);

    // Parse JSON fields
    const parsedKits: StudyKit[] = studyKits.map((kit: StudyKitRecord) => ({
      id: kit.id,
      userId: kit.userId,
      sourceFile: kit.sourceFile,
      title: kit.title,
      summary: kit.summary || undefined,
      mindmap: kit.mindmap ? JSON.parse(kit.mindmap) : undefined,
      demo: kit.demo ? JSON.parse(kit.demo) : undefined,
      quiz: kit.quiz ? JSON.parse(kit.quiz) : undefined,
      status: kit.status as 'processing' | 'ready' | 'error',
      errorMessage: kit.errorMessage || undefined,
      subject: kit.subject || undefined,
      pageCount: kit.pageCount || undefined,
      wordCount: kit.wordCount || undefined,
      createdAt: kit.createdAt,
      updatedAt: kit.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      studyKits: parsedKits,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to list study kits', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to list study kits' },
      { status: 500 }
    );
  }
}
