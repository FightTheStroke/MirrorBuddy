/**
 * API Route: Profile Export
 * GET /api/profile/export - Export profile as JSON or trigger PDF generation
 * GDPR: Right of access - data portability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit';
import type { MaestroObservation, LearningStrategy, LearningStyleProfile } from '@/types';
import { generateProfileHTML } from './helpers';

// Rate limit for exports (prevent abuse)
const EXPORT_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 per minute
};

/**
 * GET /api/profile/export
 * Export the student profile in JSON or PDF format
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`export:${clientId}`, EXPORT_RATE_LIMIT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/profile/export' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const format = searchParams.get('format') || 'json';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const profile = await prisma.studentInsightProfile.findUnique({
      where: { userId },
      include: {
        accessLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.parentConsent) {
      return NextResponse.json(
        { error: 'Consent required to export profile' },
        { status: 403 }
      );
    }

    await prisma.profileAccessLog.create({
      data: {
        profileId: profile.id,
        userId: clientId,
        action: 'download',
        details: `Exported as ${format.toUpperCase()}`,
        ipAddress: clientId,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    const parsedProfile = {
      studentId: profile.userId,
      studentName: profile.studentName,
      createdAt: profile.createdAt,
      lastUpdated: profile.updatedAt,
      consent: {
        parentConsent: profile.parentConsent,
        studentConsent: profile.studentConsent,
        consentDate: profile.consentDate,
      },
      insights: {
        strengths: JSON.parse(profile.strengths) as MaestroObservation[],
        growthAreas: JSON.parse(profile.growthAreas) as MaestroObservation[],
        strategies: JSON.parse(profile.strategies) as LearningStrategy[],
        learningStyle: JSON.parse(profile.learningStyle) as LearningStyleProfile,
      },
      statistics: {
        sessionCount: profile.sessionCount,
        confidenceScore: profile.confidenceScore,
      },
      accessHistory: profile.accessLogs.map((log: { action: string; timestamp: Date; details: string | null }) => ({
        action: log.action,
        timestamp: log.timestamp,
        details: log.details,
      })),
    };

    if (format === 'pdf') {
      const html = generateProfileHTML(parsedProfile);

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="profilo-${profile.studentName}-${new Date().toISOString().split('T')[0]}.html"`,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        exportDate: new Date().toISOString(),
        format: 'json',
        data: parsedProfile,
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="profilo-${profile.studentName}-${new Date().toISOString().split('T')[0]}.json"`,
        },
      }
    );
  } catch (error) {
    logger.error('Profile export error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
