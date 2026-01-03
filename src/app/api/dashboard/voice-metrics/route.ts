// ============================================================================
// API ROUTE: Voice Metrics Analytics
// GET: Voice session statistics for dashboard
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateAuth } from '@/lib/auth/session-auth';

// Inline types for telemetry event data
interface TelemetryEventData {
  action?: string | null;
  value: number | null;
  timestamp: Date;
}

export async function GET(request: Request) {
  try {
    // Require authentication for admin dashboard
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '7', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get voice-related events from telemetry
    const [voiceEvents, ttsEvents, realtimeEvents] = await Promise.all([
      // Voice input/transcription events
      prisma.telemetryEvent.findMany({
        where: {
          category: 'voice',
          timestamp: { gte: startDate },
        },
        select: {
          action: true,
          value: true,
          timestamp: true,
        },
      }),
      // TTS events
      prisma.telemetryEvent.findMany({
        where: {
          category: 'ai',
          action: 'tts_generation',
          timestamp: { gte: startDate },
        },
        select: {
          value: true,
          timestamp: true,
        },
      }),
      // Realtime session events
      prisma.telemetryEvent.findMany({
        where: {
          category: 'realtime',
          timestamp: { gte: startDate },
        },
        select: {
          action: true,
          value: true,
          timestamp: true,
        },
      }),
    ]);

    // Calculate metrics
    const voiceSessions = voiceEvents.filter((e: TelemetryEventData) => e.action === 'session_started').length;
    const voiceMinutes = voiceEvents
      .filter((e: TelemetryEventData) => e.action === 'session_duration')
      .reduce((sum: number, e: TelemetryEventData) => sum + (e.value || 0), 0) / 60;

    const ttsGenerations = ttsEvents.length;
    const ttsCharacters = ttsEvents.reduce((sum: number, e: TelemetryEventData) => sum + (e.value || 0), 0);

    const realtimeSessions = realtimeEvents.filter((e: TelemetryEventData) => e.action === 'session_started').length;
    const realtimeMinutes = realtimeEvents
      .filter((e: TelemetryEventData) => e.action === 'session_duration')
      .reduce((sum: number, e: TelemetryEventData) => sum + (e.value || 0), 0) / 60;

    // Daily breakdown
    const dailySessions: Record<string, number> = {};
    for (const event of [...voiceEvents, ...realtimeEvents]) {
      if (event.action === 'session_started') {
        const day = event.timestamp.toISOString().split('T')[0];
        dailySessions[day] = (dailySessions[day] || 0) + 1;
      }
    }

    return NextResponse.json({
      period: { days, startDate: startDate.toISOString() },
      voice: {
        totalSessions: voiceSessions,
        totalMinutes: Math.round(voiceMinutes * 10) / 10,
        avgSessionMinutes: voiceSessions > 0 ? Math.round((voiceMinutes / voiceSessions) * 10) / 10 : 0,
      },
      tts: {
        totalGenerations: ttsGenerations,
        totalCharacters: ttsCharacters,
        avgCharactersPerGeneration: ttsGenerations > 0 ? Math.round(ttsCharacters / ttsGenerations) : 0,
      },
      realtime: {
        totalSessions: realtimeSessions,
        totalMinutes: Math.round(realtimeMinutes * 10) / 10,
      },
      dailySessions,
    });
  } catch (error) {
    logger.error('Dashboard voice-metrics error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch voice metrics' },
      { status: 500 }
    );
  }
}
