/**
 * API Route: Profile Export
 *
 * GET /api/profile/export - Export profile as JSON or trigger PDF generation
 *
 * Supports:
 * - JSON export (immediate)
 * - PDF export (basic HTML-to-PDF)
 *
 * GDPR: Right of access - data portability
 *
 * Related: Issue #31 Collaborative Student Profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit';
import type { MaestroObservation, LearningStrategy, LearningStyleProfile } from '@/types';

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
    const format = searchParams.get('format') || 'json'; // json or pdf

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Fetch profile with access logs
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
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check consent
    if (!profile.parentConsent) {
      return NextResponse.json(
        { error: 'Consent required to export profile' },
        { status: 403 }
      );
    }

    // Log the export
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

    // Parse stored JSON
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
      // Generate HTML for PDF
      const html = generateProfileHTML(parsedProfile);

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="profilo-${profile.studentName}-${new Date().toISOString().split('T')[0]}.html"`,
        },
      });
    }

    // Default: JSON export
    return NextResponse.json({
      success: true,
      exportDate: new Date().toISOString(),
      format: 'json',
      data: parsedProfile,
    }, {
      headers: {
        'Content-Disposition': `attachment; filename="profilo-${profile.studentName}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error('Profile export error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generates HTML representation of the profile (for PDF printing)
 */
function generateProfileHTML(profile: {
  studentName: string;
  lastUpdated: Date;
  insights: {
    strengths: MaestroObservation[];
    growthAreas: MaestroObservation[];
    strategies: LearningStrategy[];
    learningStyle: LearningStyleProfile;
  };
  statistics: {
    sessionCount: number;
    confidenceScore: number;
  };
}): string {
  const { studentName, lastUpdated, insights, statistics } = profile;

  const strengthsList = insights.strengths
    .map(
      (s) => `
      <div class="observation strength">
        <h4>${s.maestroName}</h4>
        <p>${s.observation}</p>
        <span class="confidence">Confidenza: ${Math.round(s.confidence * 100)}%</span>
      </div>
    `
    )
    .join('');

  const growthList = insights.growthAreas
    .map(
      (g) => `
      <div class="observation growth">
        <h4>${g.maestroName}</h4>
        <p>${g.observation}</p>
        <span class="confidence">Confidenza: ${Math.round(g.confidence * 100)}%</span>
      </div>
    `
    )
    .join('');

  const strategiesList = insights.strategies
    .map(
      (s) => `
      <div class="strategy">
        <h4>${s.title}</h4>
        <p>${s.description}</p>
        <span class="priority ${s.priority}">${s.priority === 'high' ? 'Alta Priorità' : s.priority === 'medium' ? 'Media Priorità' : 'Bassa Priorità'}</span>
      </div>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profilo Studente - ${studentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #4F46E5;
    }
    h1 { color: #4F46E5; margin-bottom: 0.5rem; }
    .meta { color: #666; font-size: 0.9rem; }
    section {
      margin-bottom: 2rem;
    }
    h2 {
      color: #4F46E5;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #E5E7EB;
    }
    .observation, .strategy {
      background: #F9FAFB;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .observation.strength { border-color: #10B981; }
    .observation.growth { border-color: #F59E0B; }
    .strategy { border-color: #6366F1; }
    .observation h4, .strategy h4 {
      margin-bottom: 0.5rem;
      color: #1F2937;
    }
    .confidence {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: #6B7280;
    }
    .priority {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      margin-top: 0.5rem;
    }
    .priority.high { background: #FEE2E2; color: #991B1B; }
    .priority.medium { background: #FEF3C7; color: #92400E; }
    .priority.low { background: #D1FAE5; color: #065F46; }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .stat {
      background: #EEF2FF;
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #4F46E5;
    }
    .stat-label {
      color: #6B7280;
      font-size: 0.9rem;
    }
    .learning-style {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .learning-style-item {
      background: #F0FDF4;
      padding: 1rem;
      border-radius: 8px;
    }
    .learning-style-item strong { color: #065F46; }
    footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #9CA3AF;
      font-size: 0.8rem;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Profilo di Apprendimento</h1>
    <p class="name" style="font-size: 1.5rem; font-weight: bold;">${studentName}</p>
    <p class="meta">Generato il ${new Date(lastUpdated).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </header>

  <section>
    <h2>Statistiche</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${statistics.sessionCount}</div>
        <div class="stat-label">Sessioni di Studio</div>
      </div>
      <div class="stat">
        <div class="stat-value">${Math.round(statistics.confidenceScore * 100)}%</div>
        <div class="stat-label">Affidabilità Profilo</div>
      </div>
    </div>
  </section>

  <section>
    <h2>Punti di Forza</h2>
    ${strengthsList || '<p class="empty">Nessun punto di forza identificato ancora.</p>'}
  </section>

  <section>
    <h2>Aree di Crescita</h2>
    ${growthList || '<p class="empty">Nessuna area di crescita identificata ancora.</p>'}
  </section>

  <section>
    <h2>Strategie Consigliate</h2>
    ${strategiesList || '<p class="empty">Nessuna strategia disponibile.</p>'}
  </section>

  <section>
    <h2>Stile di Apprendimento</h2>
    <div class="learning-style">
      <div class="learning-style-item">
        <strong>Canale Preferito:</strong><br>
        ${insights.learningStyle?.preferredChannel || 'Non determinato'}
      </div>
      <div class="learning-style-item">
        <strong>Durata Sessione Ottimale:</strong><br>
        ${insights.learningStyle?.optimalSessionDuration || 30} minuti
      </div>
      <div class="learning-style-item">
        <strong>Momento Preferito:</strong><br>
        ${insights.learningStyle?.preferredTimeOfDay === 'morning' ? 'Mattina' : insights.learningStyle?.preferredTimeOfDay === 'afternoon' ? 'Pomeriggio' : 'Sera'}
      </div>
      <div class="learning-style-item">
        <strong>Motivatori:</strong><br>
        ${insights.learningStyle?.motivators?.join(', ') || 'Non determinati'}
      </div>
    </div>
  </section>

  <footer>
    <p>Questo profilo è stato generato da MirrorBuddy</p>
    <p>La Scuola Che Vorrei - Supporto personalizzato per studenti con differenze di apprendimento</p>
  </footer>
</body>
</html>
  `.trim();
}
