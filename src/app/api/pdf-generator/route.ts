/**
 * API Route: PDF Generator
 * POST /api/pdf-generator
 *
 * Generate accessible PDFs for students with DSA
 * Supports 7 DSA profiles: dyslexia, dyscalculia, dysgraphia, dysorthography, adhd, dyspraxia, stuttering
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  generateAccessiblePDF,
  isValidProfile,
  getAvailableProfiles,
} from '@/lib/pdf-generator';
import type { DSAProfile, PDFGeneratorRequest } from '@/lib/pdf-generator/types';

/**
 * POST /api/pdf-generator
 * Generate an accessible PDF from a Study Kit
 *
 * Request body:
 * {
 *   kitId: string;          // Study Kit ID
 *   materialId?: string;    // Optional: specific material only
 *   profile: DSAProfile;    // DSA profile type
 *   format?: 'A4' | 'Letter';
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   downloadUrl?: string;
 *   filename?: string;
 *   size?: number;
 *   savedToZaino?: boolean;
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { kitId, materialId, profile, format = 'A4' } = body as PDFGeneratorRequest;

    // Validate required fields
    if (!kitId) {
      return NextResponse.json(
        { success: false, error: 'Missing kitId' },
        { status: 400 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Missing profile' },
        { status: 400 }
      );
    }

    if (!isValidProfile(profile)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid profile: ${profile}. Valid profiles: dyslexia, dyscalculia, dysgraphia, dysorthography, adhd, dyspraxia, stuttering`,
        },
        { status: 400 }
      );
    }

    // Verify study kit exists and belongs to user
    const studyKit = await prisma.studyKit.findFirst({
      where: { id: kitId, userId },
    });

    if (!studyKit) {
      return NextResponse.json(
        { success: false, error: 'Study Kit not found' },
        { status: 404 }
      );
    }

    if (studyKit.status !== 'ready') {
      return NextResponse.json(
        { success: false, error: 'Study Kit is not ready for export' },
        { status: 400 }
      );
    }

    logger.info('Generating accessible PDF', {
      userId,
      kitId,
      profile,
      format,
    });

    // Prepare study kit data for PDF generation (avoid fetch in server-side)
    const studyKitData = {
      id: studyKit.id,
      title: studyKit.title,
      subject: studyKit.subject,
      summary: studyKit.summary,
      mindmap: studyKit.mindmap ? JSON.parse(studyKit.mindmap) : null,
      demo: studyKit.demo ? JSON.parse(studyKit.demo) : null,
      quiz: studyKit.quiz ? JSON.parse(studyKit.quiz) : null,
    };

    // Generate PDF - pass studyKit directly to avoid fetch
    const { buffer, filename, size } = await generateAccessiblePDF({
      kitId,
      materialId,
      profile: profile as DSAProfile,
      format,
      studentId: userId,
      studyKit: studyKitData, // Pass directly to avoid server-side fetch
    });

    // Save metadata to Zaino (student's materials)
    // Note: PDF binary is returned directly, not stored in DB
    let savedToZaino = false;
    try {
      await prisma.material.create({
        data: {
          userId,
          toolId: `pdf-${kitId}-${profile}-${Date.now()}`,
          toolType: 'pdf-export',
          title: filename,
          content: JSON.stringify({
            sourceKitId: kitId,
            sourceMaterialId: materialId,
            dsaProfile: profile,
            format,
            size,
            generatedAt: new Date().toISOString(),
          }),
          subject: studyKit.subject || undefined,
          preview: `PDF accessibile per ${profile}`,
        },
      });
      savedToZaino = true;
    } catch (saveError) {
      logger.warn('Failed to save PDF metadata to Zaino', { error: String(saveError) });
      // Continue - PDF generation succeeded, just saving failed
    }

    // Return PDF as download response
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Content-Length', size.toString());
    headers.set('X-Saved-To-Zaino', savedToZaino.toString());

    logger.info('PDF generated successfully', {
      userId,
      kitId,
      profile,
      filename,
      size,
      savedToZaino,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    logger.error('PDF generation failed', { error: String(error) });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pdf-generator
 * Get available DSA profiles for UI display
 */
export async function GET() {
  try {
    const profiles = getAvailableProfiles();
    return NextResponse.json({
      success: true,
      profiles,
    });
  } catch (error) {
    logger.error('Failed to get profiles', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to get profiles' },
      { status: 500 }
    );
  }
}
