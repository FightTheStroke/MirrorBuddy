/**
 * API Route: Parent Dashboard Safety Events
 * F-05, F-07: Parent notification for crisis events
 *
 * GET: Returns crisis safety events for authenticated user (parent view)
 * POST: Marks a specific event as viewed by parent
 */

import { NextResponse, type NextRequest } from 'next/server';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

export const revalidate = 0;

const SEVERITY_LABELS = {
  critical: { label: 'Critical', color: 'red' },
  alert: { label: 'Alert', color: 'orange' },
  warning: { label: 'Warning', color: 'yellow' },
} as const;

const CRISIS_DESCRIPTIONS: Record<string, string> = {
  crisis_self_harm_detected: 'Crisis support triggered - self-harm indicators',
  crisis_suicide_detected: 'Crisis support triggered - urgent concern',
  crisis_distress_detected: 'High emotional distress detected',
  crisis_detected: 'Crisis support protocol activated',
  default: 'Safety protocol activated for student wellbeing',
};

const HELPLINE_NUMBERS = {
  italy: {
    name: 'Telefono Azzurro',
    number: '19696',
    description: '24/7 support for children and families',
  },
  international: {
    name: 'International Crisis Hotline',
    number: '+39 02 29524362',
    description: 'Multilingual crisis support',
  },
};

const RECOMMENDED_ACTIONS = [
  'Talk with your child in a calm, supportive environment',
  'Contact their school counselor or trusted professional',
  'Reach out to the helpline numbers provided below',
  'Monitor their wellbeing and maintain open communication',
];

export const GET = pipe(
  withSentry('/api/parent-dashboard/safety-events'),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const events = await prisma.safetyEvent.findMany({
    where: {
      userId,
      category: 'crisis',
    },
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      severity: true,
      type: true,
      timestamp: true,
      metadata: true,
      parentNotified: true,
      parentNotifiedAt: true,
      // NEVER select contentSnippet or conversationId (privacy)
    },
  });

  const safeEvents = events.map((event) => {
    const description = CRISIS_DESCRIPTIONS[event.type] || CRISIS_DESCRIPTIONS.default;
    const severityInfo =
      SEVERITY_LABELS[event.severity as keyof typeof SEVERITY_LABELS] || SEVERITY_LABELS.alert;
    const metadata = event.metadata as { reason?: string } | null;
    const genericReason = metadata?.reason ? 'Additional context available' : undefined;

    return {
      id: event.id,
      severity: event.severity,
      severityLabel: severityInfo.label,
      severityColor: severityInfo.color,
      timestamp: event.timestamp.toISOString(),
      description,
      genericReason,
      viewed: event.parentNotified,
      viewedAt: event.parentNotifiedAt?.toISOString() || null,
      helplineNumbers: Object.values(HELPLINE_NUMBERS),
      recommendedActions: RECOMMENDED_ACTIONS,
    };
  });

  const unreadCount = safeEvents.filter((e) => !e.viewed).length;

  return NextResponse.json({ events: safeEvents, unreadCount });
});

export const POST = pipe(
  withSentry('/api/parent-dashboard/safety-events'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const request = ctx.request as NextRequest;
  const body = await request.json();
  const { eventId } = body;

  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 });
  }

  await prisma.safetyEvent.update({
    where: { id: eventId, userId },
    data: {
      parentNotified: true,
      parentNotifiedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
});
