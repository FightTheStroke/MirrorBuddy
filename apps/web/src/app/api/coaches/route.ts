import { NextResponse } from 'next/server';
import { pipe, withSentry } from '@/lib/api/middlewares';
import { getAllSupportTeachers } from '@/data/support-teachers';
import { getOrCompute, CACHE_TTL } from '@/lib/cache';

export const revalidate = 0;
const VALID_LOCALES = ['it', 'en', 'fr', 'de', 'es'];

/**
 * GET /api/coaches?locale=it
 *
 * The learning coaches (Melissa, Roberto, Chiara, Andrea, Favij, Laura) were only
 * reachable through the chat internals, so surfaces outside the web app — the
 * Reachy Mini robot in particular — could not offer them at all. This mirrors the
 * shape of /api/maestri so a client can consume both rosters identically.
 */
export const GET = pipe(withSentry('/api/coaches'))(async (ctx) => {
  const requested = ctx.req.nextUrl.searchParams.get('locale') || 'it';
  const lang = VALID_LOCALES.includes(requested) ? requested : 'it';

  const result = await getOrCompute(
    `coaches:list:${lang}`,
    () =>
      getAllSupportTeachers().map((c) => ({
        id: c.id,
        name: c.name,
        displayName: c.name,
        // Clients group by subject; coaches teach method, not a school subject.
        subject: 'coaching',
        specialty: c.personality,
        role: c.role,
        voice: c.voice,
        voiceInstructions: c.voiceInstructions,
        teachingStyle: c.personality,
        systemPrompt: c.systemPrompt,
        greeting: c.greeting,
        avatar: c.avatar,
        color: c.color,
      })),
    { ttl: CACHE_TTL.MAESTRI },
  );

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
});
