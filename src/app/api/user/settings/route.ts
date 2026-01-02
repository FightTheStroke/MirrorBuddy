// ============================================================================
// API ROUTE: User settings
// GET: Get current settings
// PUT: Update settings
// #92: Added Zod validation for type safety
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getOrCompute, del, CACHE_TTL } from '@/lib/cache';

// #92: Zod schema for settings validation
const SettingsUpdateSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().max(10).optional(),
  accentColor: z.string().max(20).optional(),
  provider: z.enum(['azure', 'ollama']).optional(),  // #89: Only valid providers
  model: z.string().max(50).optional(),
  budgetLimit: z.number().min(0).max(10000).optional(),
  totalSpent: z.number().min(0).optional(),  // #88: Now accepted
  // Accessibility
  fontSize: z.enum(['small', 'medium', 'large', 'extra-large']).optional(),
  highContrast: z.boolean().optional(),
  dyslexiaFont: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
  simplifiedLanguage: z.boolean().optional(),
  adhdMode: z.boolean().optional(),
}).strict();  // Reject unknown fields

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    // WAVE 3: Cache user settings for performance
    const settings = await getOrCompute(
      `settings:${userId}`,
      async () => {
        let userSettings = await prisma.settings.findUnique({
          where: { userId },
        });

        if (!userSettings) {
          // Create default settings
          userSettings = await prisma.settings.create({
            data: { userId },
          });
        }

        return userSettings;
      },
      { ttl: CACHE_TTL.SETTINGS }
    );

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Settings GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('convergio-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const body = await request.json();

    // #92: Validate with Zod before writing to DB
    const validation = SettingsUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid settings data',
          details: validation.error.issues.map(i => i.message),
        },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: validation.data,
      create: { userId, ...validation.data },
    });

    // WAVE 3: Invalidate cache when settings are updated
    del(`settings:${userId}`);

    return NextResponse.json(settings);
  } catch (error) {
    logger.error('Settings PUT error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
