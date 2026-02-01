// ============================================================================
// API ROUTE: Voice Metrics Analytics
// GET: Voice session statistics for dashboard
// SECURITY: Requires authentication
// ============================================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/dashboard/voice-metrics"),
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const days = parseInt(searchParams.get("days") ?? "7", 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // F-06: Exclude test data from voice metrics statistics
  // Get voice-related events from telemetry
  const [voiceEvents, ttsEvents, realtimeEvents] = await Promise.all([
    // Voice input/transcription events (exclude test data)
    prisma.telemetryEvent.findMany({
      where: {
        category: "voice",
        timestamp: { gte: startDate },
        isTestData: false,
      },
      select: {
        action: true,
        value: true,
        timestamp: true,
      },
    }),
    // TTS events (exclude test data)
    prisma.telemetryEvent.findMany({
      where: {
        category: "ai",
        action: "tts_generation",
        timestamp: { gte: startDate },
        isTestData: false,
      },
      select: {
        value: true,
        timestamp: true,
      },
    }),
    // Realtime session events (exclude test data)
    prisma.telemetryEvent.findMany({
      where: {
        category: "realtime",
        timestamp: { gte: startDate },
        isTestData: false,
      },
      select: {
        action: true,
        value: true,
        timestamp: true,
      },
    }),
  ]);

  // Calculate metrics
  const voiceSessions = voiceEvents.filter(
    (e) => e.action === "session_started",
  ).length;
  const voiceMinutes =
    voiceEvents
      .filter((e) => e.action === "session_duration")
      .reduce((sum, e) => sum + (e.value || 0), 0) / 60;

  const ttsGenerations = ttsEvents.length;
  const ttsCharacters = ttsEvents.reduce((sum, e) => sum + (e.value || 0), 0);

  const realtimeSessions = realtimeEvents.filter(
    (e) => e.action === "session_started",
  ).length;
  const realtimeMinutes =
    realtimeEvents
      .filter((e) => e.action === "session_duration")
      .reduce((sum, e) => sum + (e.value || 0), 0) / 60;

  // Daily breakdown
  const dailySessions: Record<string, number> = {};
  for (const event of [...voiceEvents, ...realtimeEvents]) {
    if (event.action === "session_started") {
      const day = event.timestamp.toISOString().split("T")[0];
      dailySessions[day] = (dailySessions[day] || 0) + 1;
    }
  }

  return NextResponse.json({
    period: { days, startDate: startDate.toISOString() },
    voice: {
      totalSessions: voiceSessions,
      totalMinutes: Math.round(voiceMinutes * 10) / 10,
      avgSessionMinutes:
        voiceSessions > 0
          ? Math.round((voiceMinutes / voiceSessions) * 10) / 10
          : 0,
    },
    tts: {
      totalGenerations: ttsGenerations,
      totalCharacters: ttsCharacters,
      avgCharactersPerGeneration:
        ttsGenerations > 0 ? Math.round(ttsCharacters / ttsGenerations) : 0,
    },
    realtime: {
      totalSessions: realtimeSessions,
      totalMinutes: Math.round(realtimeMinutes * 10) / 10,
    },
    dailySessions,
  });
});
