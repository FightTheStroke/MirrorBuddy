/**
 * Text-to-Speech API endpoint
 *
 * Converts text to speech using OpenAI TTS.
 * Supports both Azure OpenAI and direct OpenAI API.
 * Used for onboarding voice narration and accessibility features.
 *
 * @module api/tts
 */

import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { pipe } from "@/lib/api/pipe";
import { withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { isFeatureEnabled } from "@/lib/feature-flags/feature-flags-service";

// OpenAI TTS voices

export const revalidate = 0;
type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
type TTSProviderType = "azure-audio-1.5" | "azure" | "openai" | null;

interface TTSRequest {
  text: string;
  voice?: TTSVoice;
}

/**
 * Check which TTS provider is configured
 * Fallback chain: gpt-audio-1.5 → tts-hd → OpenAI TTS
 */
function getTTSProvider(): TTSProviderType {
  // Check for gpt-audio-1.5 (behind feature flag)
  const useAudio15 = isFeatureEnabled('tts_audio_15')?.enabled ?? false;
  if (
    useAudio15 &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT
  ) {
    return "azure-audio-1.5";
  }

  // Check for Azure OpenAI TTS deployment (tts-hd)
  if (
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_TTS_DEPLOYMENT
  ) {
    return "azure";
  }

  // Check for direct OpenAI API
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return null;
}

/**
 * Generate speech using Azure OpenAI TTS
 */
async function generateAzureTTS(
  text: string,
  voice: TTSVoice,
): Promise<ArrayBuffer> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
  const deployment = process.env.AZURE_OPENAI_TTS_DEPLOYMENT!;

  const url = `${endpoint}/openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: deployment,
      input: text,
      voice: voice,
      response_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("[TTS] Azure API error", {
      status: response.status,
      errorMessage: errorText,
    });
    throw new Error(`Azure TTS failed: ${response.status}`);
  }

  return response.arrayBuffer();
}

/**
 * Generate speech using Azure OpenAI gpt-audio-1.5 (Chat Completions API)
 * Different from tts-hd: uses modalities: ["text", "audio"] and returns base64
 */
async function generateAzureAudio15TTS(
  text: string,
  voice: TTSVoice,
): Promise<ArrayBuffer> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
  const deployment = process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT!;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: deployment,
      modalities: ["text", "audio"],
      audio: { voice, format: "mp3" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("[TTS] Azure Audio 1.5 API error", {
      status: response.status,
      errorMessage: errorText,
    });
    throw new Error(`Azure Audio 1.5 TTS failed: ${response.status}`);
  }

  const json = await response.json();
  const base64Audio = json.choices?.[0]?.message?.audio?.data;
  if (!base64Audio) {
    throw new Error("Azure Audio 1.5: no audio data in response");
  }

  const buffer = Buffer.from(base64Audio, "base64");
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

/**
 * Generate speech using direct OpenAI API
 */
async function generateOpenAITTS(
  text: string,
  voice: TTSVoice,
): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENAI_API_KEY!;

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: voice,
      response_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("[TTS] OpenAI API error", {
      status: response.status,
      errorMessage: errorText,
    });
    throw new Error(`OpenAI TTS failed: ${response.status}`);
  }

  return response.arrayBuffer();
}

/**
 * POST /api/tts
 *
 * Generate speech from text using OpenAI TTS.
 * Returns audio/mpeg stream.
 */
export const POST = pipe(
  withSentry("/api/tts"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  // Rate limit check (before heavy processing)
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`tts:${clientId}`, RATE_LIMITS.TTS);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  const provider = getTTSProvider();

  if (!provider) {
    return NextResponse.json(
      {
        error:
          "TTS not configured. Set OPENAI_API_KEY or AZURE_OPENAI_TTS_DEPLOYMENT",
        fallback: true,
      },
      { status: 503 },
    );
  }

  const body = (await ctx.req.json()) as TTSRequest;
  const { text, voice = "shimmer" } = body;

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  // Limit text length to prevent abuse
  if (text.length > 4096) {
    return NextResponse.json(
      { error: "Text too long (max 4096 characters)" },
      { status: 400 },
    );
  }

  let audioData: ArrayBuffer;

  if (provider === "azure-audio-1.5") {
    audioData = await generateAzureAudio15TTS(text, voice);
  } else if (provider === "azure") {
    audioData = await generateAzureTTS(text, voice);
  } else {
    audioData = await generateOpenAITTS(text, voice);
  }

  return new NextResponse(audioData, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioData.byteLength.toString(),
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
});

/**
 * GET /api/tts
 *
 * Check if TTS is available.
 */
export const GET = pipe(withSentry("/api/tts"))(async () => {
  const provider = getTTSProvider();

  return NextResponse.json({
    available: provider !== null,
    provider: provider,
    voices: provider
      ? ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
      : [],
  });
});
