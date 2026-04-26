// ============================================================================
// API ROUTE: Safe Web Search for Education
// Kid-friendly filtered search using Bing Safe Search
// ============================================================================

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { pipe, withSentry } from "@/lib/api/middlewares";

// Blocked domains that are inappropriate for educational context

export const revalidate = 0;
const BLOCKED_DOMAINS = [
  "reddit.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "4chan.org",
  "discord.com",
  "twitch.tv",
];

// Blocked keywords in queries (Italian + English)
const BLOCKED_KEYWORDS = [
  "adult",
  "xxx",
  "porn",
  "sex",
  "nude",
  "naked",
  "drugs",
  "droga",
  "cannabis",
  "cocaine",
  "violence",
  "violenza",
  "gore",
  "death",
  "gambling",
  "scommesse",
  "casino",
  "weapon",
  "arma",
  "gun",
  "pistola",
  "suicide",
  "suicidio",
  "self-harm",
  "hack",
  "crack",
  "pirate",
  "torrent",
];

// Educational domains to prioritize
const EDUCATIONAL_DOMAINS = [
  "wikipedia.org",
  "britannica.com",
  "treccani.it",
  "khanacademy.org",
  "edu.it",
  ".edu",
  "sciencedirect.com",
  "nature.com",
  "nationalgeographic.com",
  "smithsonianmag.com",
  "bbc.co.uk/bitesize",
  "rai.it/raiscuola",
  "focus.it",
  "sapere.it",
];

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  isEducational: boolean;
}

interface SafeSearchResponse {
  results: SearchResult[];
  query: string;
  filtered: boolean;
  safeSearchEnabled: boolean;
}

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- public search endpoint, uses rate limiting
export const POST = pipe(withSentry("/api/search"))(async (ctx) => {
  // Rate limit check
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`search:${clientId}`, RATE_LIMITS.SEARCH);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await ctx.req.json();
    const { query, subject, maxResults = 5 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Check for blocked keywords
    const lowerQuery = query.toLowerCase();
    const hasBlockedKeyword = BLOCKED_KEYWORDS.some((keyword) =>
      lowerQuery.includes(keyword),
    );

    if (hasBlockedKeyword) {
      return NextResponse.json(
        {
          error: "Query contains inappropriate content",
          results: [],
          filtered: true,
          safeSearchEnabled: true,
        },
        { status: 400 },
      );
    }

    // Build educational context query
    let searchQuery = query;
    if (subject) {
      searchQuery = `${query} ${subject} educational`;
    }

    // Use Bing Search API with SafeSearch=Strict
    const bingApiKey = process.env.BING_SEARCH_API_KEY;

    if (!bingApiKey) {
      // Fallback: Return curated educational results based on subject
      return NextResponse.json({
        results: getFallbackResults(query, subject),
        query,
        filtered: true,
        safeSearchEnabled: true,
        message:
          "Using curated educational sources (search API not configured)",
      });
    }

    const bingUrl = new URL("https://api.bing.microsoft.com/v7.0/search");
    bingUrl.searchParams.set("q", searchQuery);
    bingUrl.searchParams.set("count", String(Math.min(maxResults, 10)));
    bingUrl.searchParams.set("safeSearch", "Strict"); // Maximum safety
    bingUrl.searchParams.set("mkt", "it-IT"); // Italian market
    bingUrl.searchParams.set("freshness", "Month"); // Recent but not too recent

    const response = await fetch(bingUrl.toString(), {
      headers: {
        "Ocp-Apim-Subscription-Key": bingApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter and process results
    const results: SearchResult[] = (data.webPages?.value || [])
      .filter((result: { url: string }) => {
        const url = result.url.toLowerCase();
        // Block inappropriate domains
        return !BLOCKED_DOMAINS.some((domain) => url.includes(domain));
      })
      .slice(0, maxResults)
      .map((result: { name: string; url: string; snippet: string }) => ({
        title: result.name,
        url: result.url,
        snippet: result.snippet,
        isEducational: EDUCATIONAL_DOMAINS.some((domain) =>
          result.url.toLowerCase().includes(domain),
        ),
      }));

    // Sort: educational domains first
    results.sort((a, b) => {
      if (a.isEducational && !b.isEducational) return -1;
      if (!a.isEducational && b.isEducational) return 1;
      return 0;
    });

    return NextResponse.json({
      results,
      query,
      filtered: true,
      safeSearchEnabled: true,
    } as SafeSearchResponse);
  } catch (error) {
    logger.error("Safe search error", { error: String(error) });
    return NextResponse.json(
      { error: "Search failed", message: String(error) },
      { status: 500 },
    );
  }
});

// Fallback results when no API key is configured
function getFallbackResults(query: string, subject?: string): SearchResult[] {
  const subjectResources: Record<string, SearchResult[]> = {
    matematica: [
      {
        title: "Khan Academy - Matematica",
        url: "https://it.khanacademy.org/math",
        snippet: "Corsi gratuiti di matematica per tutti i livelli",
        isEducational: true,
      },
      {
        title: "Treccani - Matematica",
        url: "https://www.treccani.it/enciclopedia/matematica/",
        snippet: "Enciclopedia della matematica",
        isEducational: true,
      },
    ],
    storia: [
      {
        title: "Treccani - Storia",
        url: "https://www.treccani.it/enciclopedia/storia/",
        snippet: "Enciclopedia storica italiana",
        isEducational: true,
      },
      {
        title: "RAI Scuola - Storia",
        url: "https://www.raiscuola.rai.it/storia",
        snippet: "Video e lezioni di storia",
        isEducational: true,
      },
    ],
    scienze: [
      {
        title: "Focus Junior - Scienze",
        url: "https://www.focusjunior.it/scienza/",
        snippet: "Scienze per ragazzi",
        isEducational: true,
      },
      {
        title: "National Geographic Italia",
        url: "https://www.nationalgeographic.it/scienza",
        snippet: "Articoli scientifici e scoperte",
        isEducational: true,
      },
    ],
    italiano: [
      {
        title: "Treccani - Lingua Italiana",
        url: "https://www.treccani.it/vocabolario/",
        snippet: "Vocabolario e grammatica italiana",
        isEducational: true,
      },
      {
        title: "Accademia della Crusca",
        url: "https://accademiadellacrusca.it/",
        snippet: "La lingua italiana",
        isEducational: true,
      },
    ],
    inglese: [
      {
        title: "BBC Learning English",
        url: "https://www.bbc.co.uk/learningenglish/",
        snippet: "Learn English with BBC",
        isEducational: true,
      },
      {
        title: "Cambridge Dictionary",
        url: "https://dictionary.cambridge.org/",
        snippet: "English dictionary and grammar",
        isEducational: true,
      },
    ],
    arte: [
      {
        title: "Treccani - Arte",
        url: "https://www.treccani.it/enciclopedia/arte/",
        snippet: "Storia dell'arte",
        isEducational: true,
      },
      {
        title: "Google Arts & Culture",
        url: "https://artsandculture.google.com/",
        snippet: "Musei e opere d'arte virtuali",
        isEducational: true,
      },
    ],
    musica: [
      {
        title: "Treccani - Musica",
        url: "https://www.treccani.it/enciclopedia/musica/",
        snippet: "Storia della musica",
        isEducational: true,
      },
      {
        title: "Teoria Musicale",
        url: "https://www.teoria.com/",
        snippet: "Lezioni di teoria musicale",
        isEducational: true,
      },
    ],
    geografia: [
      {
        title: "National Geographic Italia",
        url: "https://www.nationalgeographic.it/",
        snippet: "Geografia e viaggi",
        isEducational: true,
      },
      {
        title: "Treccani - Geografia",
        url: "https://www.treccani.it/enciclopedia/geografia/",
        snippet: "Enciclopedia geografica",
        isEducational: true,
      },
    ],
  };

  // Return subject-specific results if available
  if (subject) {
    const subjectLower = subject.toLowerCase();
    for (const [key, results] of Object.entries(subjectResources)) {
      if (subjectLower.includes(key)) {
        return results;
      }
    }
  }

  // Default educational resources
  return [
    {
      title: `Wikipedia - ${query}`,
      url: `https://it.wikipedia.org/wiki/${encodeURIComponent(query)}`,
      snippet: "Enciclopedia libera",
      isEducational: true,
    },
    {
      title: `Treccani - ${query}`,
      url: `https://www.treccani.it/enciclopedia/ricerca/${encodeURIComponent(query)}/`,
      snippet: "Enciclopedia italiana",
      isEducational: true,
    },
    {
      title: "Khan Academy",
      url: "https://it.khanacademy.org/",
      snippet: "Corsi gratuiti per tutti",
      isEducational: true,
    },
  ];
}
