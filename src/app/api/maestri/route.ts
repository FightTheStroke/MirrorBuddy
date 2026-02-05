import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { maestri } from "@/data/index";
import { getOrCompute, CACHE_TTL } from "@/lib/cache";
import { generateMaestroGreeting } from "@/lib/greeting/greeting-generator";
import type { SupportedLanguage } from "@/app/api/chat/types";

const VALID_LOCALES = ["it", "en", "fr", "de", "es"];

/**
 * GET /api/maestri?locale=it
 * Returns all maestri data with locale-aware greetings
 */
export const GET = pipe(withSentry("/api/maestri"))(async (ctx) => {
  const locale = ctx.req.nextUrl.searchParams.get("locale") || "it";
  const lang = (
    VALID_LOCALES.includes(locale) ? locale : "it"
  ) as SupportedLanguage;
  const cacheKey = `maestri:list:${lang}`;

  const result = await getOrCompute(
    cacheKey,
    () =>
      maestri.map((m) => ({
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        subject: m.subject,
        specialty: m.specialty,
        voice: m.voice,
        voiceInstructions: m.voiceInstructions,
        teachingStyle: m.teachingStyle,
        systemPrompt: m.systemPrompt,
        greeting: generateMaestroGreeting(m.id, m.displayName, lang),
      })),
    { ttl: CACHE_TTL.MAESTRI },
  );

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
