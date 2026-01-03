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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit';
import {
  generateStudentProfile,
  type MaestroInsightInput,
} from '@/lib/profile/profile-generator';
import type { ObservationCategory } from '@/types';

// Rate limit for generation (expensive operation)
const GENERATE_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 5 per minute
};

/**
 * POST /api/profile/generate
 * Generates a student insight profile from all Learning data
 */
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`profile-gen:${clientId}`, GENERATE_RATE_LIMIT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/profile/generate' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { userId, forceRegenerate = false } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if recent profile exists and forceRegenerate is false
    if (!forceRegenerate) {
      const existingProfile = await prisma.studentInsightProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        const hoursSinceUpdate =
          (Date.now() - existingProfile.updatedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 24) {
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
    }

    // Get user profile for name
    const userProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    const studentName = userProfile?.name || 'Studente';

    // Collect all Learning entries for this user
    const learnings = await prisma.learning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (learnings.length === 0) {
      return NextResponse.json(
        {
          error: 'No learning data',
          message: 'No conversation insights found. The student needs to interact with Maestri first.',
        },
        { status: 404 }
      );
    }

    // Get session statistics
    const sessions = await prisma.studySession.findMany({
      where: { userId },
    });

    const totalMinutes = sessions.reduce((sum: number, s) => sum + (s.duration || 0), 0);
    const maestriInteracted = [...new Set(sessions.map((s) => s.maestroId).filter((id): id is string => id !== null))];

    // Convert Learning entries to MaestroInsightInput format
    const insights: MaestroInsightInput[] = learnings.map((learning) => ({
      maestroId: learning.maestroId || 'unknown',
      maestroName: getMaestroDisplayName(learning.maestroId || 'unknown'),
      category: mapCategoryFromLearning(learning.category),
      content: learning.insight,
      isStrength: learning.confidence >= 0.7,
      confidence: learning.confidence,
      createdAt: learning.createdAt,
    }));

    // Generate the profile
    const generatedProfile = generateStudentProfile(
      userId,
      studentName,
      insights,
      {
        totalSessions: sessions.length,
        totalMinutes,
        maestriInteracted,
      }
    );

    // Save to database
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
  } catch (error) {
    logger.error('Profile generation error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Maps maestro ID to display name
 */
function getMaestroDisplayName(maestroId: string): string {
  const names: Record<string, string> = {
    'euclide-matematica': 'Euclide',
    'feynman-fisica': 'Richard Feynman',
    'curie-chimica': 'Marie Curie',
    'darwin-biologia': 'Charles Darwin',
    'erodoto-storia': 'Erodoto',
    'humboldt-geografia': 'Alexander von Humboldt',
    'manzoni-italiano': 'Alessandro Manzoni',
    'shakespeare-inglese': 'William Shakespeare',
    'leonardo-arte': 'Leonardo da Vinci',
    'mozart-musica': 'Wolfgang Mozart',
    'montessori-civica': 'Maria Montessori',
    'smith-economia': 'Adam Smith',
    'socrate-filosofia': 'Socrate',
  };
  return names[maestroId] || maestroId;
}

/**
 * Maps Learning category to ObservationCategory
 */
function mapCategoryFromLearning(category: string): ObservationCategory {
  const mapping: Record<string, ObservationCategory> = {
    math: 'logical_reasoning',
    mathematics: 'logical_reasoning',
    logic: 'logical_reasoning',
    physics: 'scientific_curiosity',
    chemistry: 'experimental_approach',
    biology: 'scientific_curiosity',
    history: 'historical_understanding',
    geography: 'spatial_memory',
    italian: 'linguistic_ability',
    english: 'linguistic_ability',
    art: 'artistic_sensitivity',
    music: 'artistic_sensitivity',
    philosophy: 'philosophical_depth',
    study_method: 'study_method',
    organization: 'study_method',
    expression: 'verbal_expression',
    creativity: 'creativity',
    collaboration: 'collaborative_spirit',
  };

  return mapping[category.toLowerCase()] || 'study_method';
}

/**
 * Calculates overall confidence score for the profile
 */
function calculateConfidenceScore(insights: MaestroInsightInput[]): number {
  if (insights.length === 0) return 0;

  // More insights = higher confidence (up to a point)
  const quantityScore = Math.min(insights.length / 20, 1) * 0.4;

  // Average confidence of individual insights
  const avgConfidence =
    insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  const qualityScore = avgConfidence * 0.4;

  // Diversity of sources (maestri)
  const uniqueMaestri = new Set(insights.map((i) => i.maestroId)).size;
  const diversityScore = Math.min(uniqueMaestri / 5, 1) * 0.2;

  return quantityScore + qualityScore + diversityScore;
}
