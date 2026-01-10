/**
 * HOMEWORK ANALYZE API
 * Analyzes homework images using AI vision to extract problem structure
 * Returns maieutic steps for guided learning
 */

import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import {
  analyzeHomeworkWithAzure,
} from './helpers';

/**
 * POST - Analyze homework image
 */
export async function POST(request: Request) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`homework:${clientId}`, RATE_LIMITS.HOMEWORK);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/homework/analyze' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const { image, systemPrompt } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    const provider = getActiveProvider();
    if (!provider) {
      return NextResponse.json(
        { error: 'No AI provider configured' },
        { status: 503 }
      );
    }

    if (provider.provider === 'azure') {
      const result = await analyzeHomeworkWithAzure(image, systemPrompt, provider);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json(result.analysis);
    }

    return NextResponse.json(
      { error: 'Vision analysis requires Azure OpenAI with GPT-4o. Ollama does not support image analysis.' },
      { status: 501 }
    );
  } catch (error) {
    logger.error('Homework analyze error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to analyze homework' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if vision is available
 */
export async function GET() {
  const provider = getActiveProvider();

  if (!provider) {
    return NextResponse.json({
      available: false,
      reason: 'No AI provider configured',
    });
  }

  if (provider.provider === 'ollama') {
    return NextResponse.json({
      available: false,
      reason: 'Ollama does not support image analysis. Use Azure OpenAI with GPT-4o.',
    });
  }

  return NextResponse.json({
    available: true,
    provider: provider.provider,
    model: process.env.AZURE_OPENAI_VISION_DEPLOYMENT || provider.model,
  });
}
