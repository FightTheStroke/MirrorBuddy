/**
 * API Route: Generate Student Profile
 *
 * POST /api/profile/generate - Triggers profile generation from Learning insights
 *
 * This endpoint collects all Learning entries from conversations with Maestri
 * and synthesizes them into a StudentInsights profile.
 *
 * Related: Issue #31 Collaborative Student Profile
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit';
import { validateRequest, formatValidationErrors } from '@/lib/validation/middleware';
import { ProfileGenerateSchema } from '@/lib/validation/schemas/profile';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { generateStudentProfile, type MaestroInsightInput } from '@/lib/profile/profile-generator';
import {
  getMaestroDisplayName,
  mapCategoryFromLearning,
  calculateConfidenceScore,
  isProfileUpToDate,
} from './helpers';

const GENERATE_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000,
};

/**
 * POST - Generate student insight profile from all Learning data
 */
export const POST = pipe(
  withSentry('/api/profile/generate'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`profile-gen:${clientId}`, GENERATE_RATE_LIMIT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', {
      clientId,
      endpoint: '/api/profile/generate',
    });
    return rateLimitResponse(rateLimit);
  }

  const body = await ctx.req.json();

  const validation = validateRequest(ProfileGenerateSchema, body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: formatValidationErrors(validation.error),
      },
      { status: 400 },
    );
  }

  const { userId: bodyUserId, forceRegenerate = false } = validation.data;
  const userId = ctx.userId!;

  if (bodyUserId !== userId) {
    return NextResponse.json(
      { error: 'Cannot generate profile for another user' },
      { status: 403 },
    );
  }

  // Check if recent profile exists and forceRegenerate is false
  if (!forceRegenerate) {
    const existingProfile = await prisma.studentInsightProfile.findUnique({
      where: { userId },
    });

    if (existingProfile && isProfileUpToDate(existingProfile.updatedAt)) {
      return NextResponse.json({
        success: true,
        message: 'Profile is up to date (less than 24h old)',
        data: {
          id: existingProfile.id,
          lastUpdated: existingProfile.updatedAt,
          useForceRegenerate: true,
        },
      });
    }
  }

  const userProfile = await prisma.profile.findUnique({
    where: { userId },
  });

  const studentName = userProfile?.name || 'Studente';

  const learnings = await prisma.learning.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  if (learnings.length === 0) {
    return NextResponse.json(
      {
        error: 'No learning data',
        message:
          'No conversation insights found. The student needs to interact with Maestri first.',
      },
      { status: 404 },
    );
  }

  const sessions = await prisma.studySession.findMany({
    where: { userId },
    take: 1000,
  });

  const totalMinutes = sessions.reduce((sum: number, s) => sum + (s.duration || 0), 0);
  const maestriInteracted = [
    ...new Set(sessions.map((s) => s.maestroId).filter((id): id is string => id !== null)),
  ];

  const insights: MaestroInsightInput[] = learnings.map((learning) => ({
    maestroId: learning.maestroId || 'unknown',
    maestroName: getMaestroDisplayName(learning.maestroId || 'unknown'),
    category: mapCategoryFromLearning(learning.category),
    content: learning.insight,
    isStrength: learning.confidence >= 0.7,
    confidence: learning.confidence,
    createdAt: learning.createdAt,
  }));

  const generatedProfile = generateStudentProfile(userId, studentName, insights, {
    totalSessions: sessions.length,
    totalMinutes,
    maestriInteracted,
  });

  const savedProfile = await prisma.studentInsightProfile.upsert({
    where: { userId },
    create: {
      userId,
      studentName,
      insights: JSON.stringify(insights),
      strengths: JSON.stringify(generatedProfile.strengths),
      growthAreas: JSON.stringify(generatedProfile.growthAreas),
      strategies: JSON.stringify(generatedProfile.strategies),
      learningStyle: JSON.stringify(generatedProfile.learningStyle),
      sessionCount: sessions.length,
      confidenceScore: calculateConfidenceScore(insights),
    },
    update: {
      studentName,
      insights: JSON.stringify(insights),
      strengths: JSON.stringify(generatedProfile.strengths),
      growthAreas: JSON.stringify(generatedProfile.growthAreas),
      strategies: JSON.stringify(generatedProfile.strategies),
      learningStyle: JSON.stringify(generatedProfile.learningStyle),
      sessionCount: sessions.length,
      confidenceScore: calculateConfidenceScore(insights),
      updatedAt: new Date(),
    },
  });

  logger.info('Profile generated', {
    userId,
    insightsCount: insights.length,
    strengthsCount: generatedProfile.strengths.length,
    growthAreasCount: generatedProfile.growthAreas.length,
  });

  return NextResponse.json({
    success: true,
    message: 'Profile generated successfully',
    data: {
      id: savedProfile.id,
      updatedAt: savedProfile.updatedAt,
      stats: {
        insightsProcessed: insights.length,
        strengthsIdentified: generatedProfile.strengths.length,
        growthAreasIdentified: generatedProfile.growthAreas.length,
        strategiesSuggested: generatedProfile.strategies.length,
        sessionsAnalyzed: sessions.length,
        maestriContributing: maestriInteracted.length,
      },
    },
  });
});
