// ============================================================================
// DEBUG API: Show configuration status (NO secrets exposed)
// DELETE this endpoint before production!
// ============================================================================

import { NextResponse } from 'next/server';
import { isAzureConfigured, getActiveProvider, getRealtimeProvider } from '@/lib/ai/providers';

export async function GET() {
  // Only in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug logging disabled in production' }, { status: 403 });
  }

  // Chat provider config check
  const chatProvider = getActiveProvider();
  const realtimeProvider = getRealtimeProvider();

  return NextResponse.json({
    timestamp: new Date().toISOString(),

    // Chat API configuration (for /api/chat)
    chat: {
      provider: chatProvider?.provider ?? 'none',
      model: chatProvider?.model ?? 'none',
      endpoint: chatProvider?.endpoint ? `${chatProvider.endpoint.substring(0, 40)}...` : 'not set',
      hasApiKey: !!chatProvider?.apiKey,
      azureConfigured: isAzureConfigured(),
    },

    // Voice/Realtime API configuration (for WebSocket proxy)
    realtime: {
      provider: realtimeProvider?.provider ?? 'none',
      model: realtimeProvider?.model ?? 'none',
      endpoint: realtimeProvider?.endpoint ? `${realtimeProvider.endpoint.substring(0, 40)}...` : 'not set',
      hasApiKey: !!realtimeProvider?.apiKey,
    },

    // Environment variable status (names only, NO values)
    envVars: {
      // Chat
      AZURE_OPENAI_ENDPOINT: !!process.env.AZURE_OPENAI_ENDPOINT,
      AZURE_OPENAI_API_KEY: !!process.env.AZURE_OPENAI_API_KEY,
      AZURE_OPENAI_CHAT_DEPLOYMENT: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || '(default: gpt-4o)',
      AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION || '(default: 2024-08-01-preview)',

      // Realtime
      AZURE_OPENAI_REALTIME_ENDPOINT: !!process.env.AZURE_OPENAI_REALTIME_ENDPOINT,
      AZURE_OPENAI_REALTIME_API_KEY: !!process.env.AZURE_OPENAI_REALTIME_API_KEY,
      AZURE_OPENAI_REALTIME_DEPLOYMENT: process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || '(not set)',

      // Ollama fallback
      OLLAMA_URL: process.env.OLLAMA_URL || '(default: http://localhost:11434)',
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || '(default: llama3.2)',
    },

    // Quick diagnosis
    diagnosis: getDiagnosis(),
  });
}

function getDiagnosis(): string[] {
  const issues: string[] = [];

  // Check chat configuration
  if (!process.env.AZURE_OPENAI_ENDPOINT) {
    issues.push('❌ AZURE_OPENAI_ENDPOINT not set - Chat will fall back to Ollama');
  }
  if (!process.env.AZURE_OPENAI_API_KEY) {
    issues.push('❌ AZURE_OPENAI_API_KEY not set - Chat will fall back to Ollama');
  }
  if (process.env.AZURE_OPENAI_ENDPOINT && !process.env.AZURE_OPENAI_CHAT_DEPLOYMENT) {
    issues.push('⚠️ AZURE_OPENAI_CHAT_DEPLOYMENT not set - using default "gpt-4o"');
  }

  // Check realtime configuration
  if (!process.env.AZURE_OPENAI_REALTIME_ENDPOINT) {
    issues.push('❌ AZURE_OPENAI_REALTIME_ENDPOINT not set - Voice not available');
  }
  if (!process.env.AZURE_OPENAI_REALTIME_API_KEY) {
    issues.push('❌ AZURE_OPENAI_REALTIME_API_KEY not set - Voice not available');
  }
  if (!process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT) {
    issues.push('❌ AZURE_OPENAI_REALTIME_DEPLOYMENT not set - Voice not available');
  }

  // Check if using same endpoint for both (common setup)
  const chatEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const realtimeEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  if (chatEndpoint && realtimeEndpoint && chatEndpoint !== realtimeEndpoint) {
    issues.push('ℹ️ Chat and Realtime use different Azure endpoints');
  }

  if (issues.length === 0) {
    issues.push('✅ All Azure configuration looks good!');
  }

  return issues;
}
