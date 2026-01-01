/**
 * Text-to-Speech API endpoint
 *
 * Converts text to speech using OpenAI TTS.
 * Supports both Azure OpenAI and direct OpenAI API.
 * Used for onboarding voice narration and accessibility features.
 *
 * @module api/tts
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// OpenAI TTS voices
type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface TTSRequest {
  text: string;
  voice?: TTSVoice;
}

/**
 * Check which TTS provider is configured
 */
function getTTSProvider(): 'azure' | 'openai' | null {
  // Check for Azure OpenAI TTS deployment
  if (
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_TTS_DEPLOYMENT
  ) {
    return 'azure';
  }

  // Check for direct OpenAI API
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }

  return null;
}

/**
 * Generate speech using Azure OpenAI TTS
 */
async function generateAzureTTS(text: string, voice: TTSVoice): Promise<ArrayBuffer> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
  const deployment = process.env.AZURE_OPENAI_TTS_DEPLOYMENT!;

  const url = `${endpoint}/openai/deployments/${deployment}/audio/speech?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: deployment,
      input: text,
      voice: voice,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[TTS] Azure API error', { status: response.status, error: errorText });
    throw new Error(`Azure TTS failed: ${response.status}`);
  }

  return response.arrayBuffer();
}

/**
 * Generate speech using direct OpenAI API
 */
async function generateOpenAITTS(text: string, voice: TTSVoice): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENAI_API_KEY!;

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[TTS] OpenAI API error', { status: response.status, error: errorText });
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
export async function POST(request: NextRequest) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`tts:${clientId}`, RATE_LIMITS.TTS);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const provider = getTTSProvider();

    if (!provider) {
      return NextResponse.json(
        { error: 'TTS not configured. Set OPENAI_API_KEY or AZURE_OPENAI_TTS_DEPLOYMENT', fallback: true },
        { status: 503 }
      );
    }

    const body = (await request.json()) as TTSRequest;
    const { text, voice = 'shimmer' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Limit text length to prevent abuse
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text too long (max 4096 characters)' },
        { status: 400 }
      );
    }

    let audioData: ArrayBuffer;

    if (provider === 'azure') {
      audioData = await generateAzureTTS(text, voice);
    } else {
      audioData = await generateOpenAITTS(text, voice);
    }

    return new NextResponse(audioData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    logger.error('[TTS] Error', { error });
    return NextResponse.json(
      { error: 'Internal server error', fallback: true },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tts
 *
 * Check if TTS is available.
 */
export async function GET() {
  const provider = getTTSProvider();

  return NextResponse.json({
    available: provider !== null,
    provider: provider,
    voices: provider ? ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] : [],
  });
}
