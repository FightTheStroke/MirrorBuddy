/**
 * Usage Tracker
 * Reference: Amodei "The Adolescence of Technology" (2026)
 */

import { prisma } from "@/lib/db";
import { UsageMetrics } from "./types";
import { analyzeMessage } from "./emotional-detector";

function getTodayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 6;
}

export async function recordSessionStart(userId: string): Promise<void> {
  const today = getTodayDate();
  await prisma.usagePattern.upsert({
    where: { userId_date: { userId, date: today } },
    update: { sessionCount: { increment: 1 } },
    create: {
      userId,
      date: today,
      sessionCount: 1,
      totalMinutes: 0,
      messageCount: 0,
      emotionalVentCount: 0,
      aiPreferenceCount: 0,
      nightMinutes: 0,
    },
  });
}

export async function recordMessage(
  userId: string,
  messageContent: string,
): Promise<void> {
  const today = getTodayDate();
  const analysis = analyzeMessage(messageContent);
  await prisma.usagePattern.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      messageCount: { increment: 1 },
      emotionalVentCount: analysis.hasEmotionalVenting
        ? { increment: 1 }
        : undefined,
      aiPreferenceCount: analysis.hasAIPreference
        ? { increment: 1 }
        : undefined,
    },
    create: {
      userId,
      date: today,
      sessionCount: 0,
      totalMinutes: 0,
      messageCount: 1,
      emotionalVentCount: analysis.hasEmotionalVenting ? 1 : 0,
      aiPreferenceCount: analysis.hasAIPreference ? 1 : 0,
      nightMinutes: 0,
    },
  });
}

export async function recordUsageTime(
  userId: string,
  minutes: number,
): Promise<void> {
  const today = getTodayDate();
  const nightMinutesIncrement = isNightTime() ? minutes : 0;
  await prisma.usagePattern.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      totalMinutes: { increment: minutes },
      nightMinutes: { increment: nightMinutesIncrement },
    },
    create: {
      userId,
      date: today,
      sessionCount: 0,
      totalMinutes: minutes,
      messageCount: 0,
      emotionalVentCount: 0,
      aiPreferenceCount: 0,
      nightMinutes: nightMinutesIncrement,
    },
  });
}

export async function getUsageMetrics(
  userId: string,
  date?: Date,
): Promise<UsageMetrics | null> {
  const targetDate = date ?? getTodayDate();
  const pattern = await prisma.usagePattern.findUnique({
    where: { userId_date: { userId, date: targetDate } },
  });
  if (!pattern) return null;
  return {
    userId: pattern.userId,
    date: pattern.date,
    sessionCount: pattern.sessionCount,
    totalMinutes: pattern.totalMinutes,
    messageCount: pattern.messageCount,
    emotionalVentCount: pattern.emotionalVentCount,
    aiPreferenceCount: pattern.aiPreferenceCount,
    nightMinutes: pattern.nightMinutes,
  };
}

export async function getUsageHistory(
  userId: string,
  days: number = 7,
): Promise<UsageMetrics[]> {
  const endDate = getTodayDate();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  const patterns = await prisma.usagePattern.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: "asc" },
  });
  return patterns.map((p) => ({
    userId: p.userId,
    date: p.date,
    sessionCount: p.sessionCount,
    totalMinutes: p.totalMinutes,
    messageCount: p.messageCount,
    emotionalVentCount: p.emotionalVentCount,
    aiPreferenceCount: p.aiPreferenceCount,
    nightMinutes: p.nightMinutes,
  }));
}
