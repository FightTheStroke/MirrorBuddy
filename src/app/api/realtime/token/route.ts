// ============================================================================
// API ROUTE: Provide Azure OpenAI Realtime connection info
// Returns proxy WebSocket URL - API key stays server-side
// SECURITY: API key is NEVER exposed to client
// ============================================================================

import { NextResponse } from 'next/server';

// WebSocket proxy port (must match instrumentation.ts)
const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || '3001', 10);

export async function GET() {
  // Azure OpenAI Realtime configuration (required)
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  // Validate Azure configuration
  const missingConfig: string[] = [];
  if (!azureEndpoint) missingConfig.push('AZURE_OPENAI_REALTIME_ENDPOINT');
  if (!azureApiKey) missingConfig.push('AZURE_OPENAI_REALTIME_API_KEY');
  if (!azureDeployment) missingConfig.push('AZURE_OPENAI_REALTIME_DEPLOYMENT');

  if (missingConfig.length > 0 || !azureEndpoint || !azureApiKey || !azureDeployment) {
    return NextResponse.json(
      {
        error: 'Azure OpenAI not configured',
        missingVariables: missingConfig,
        message: 'Configure Azure OpenAI settings in the app or add environment variables',
      },
      { status: 503 }
    );
  }

  // Return proxy WebSocket URL - client connects here, NOT directly to Azure
  // API key is used server-side only in the proxy (see instrumentation.ts)
  return NextResponse.json({
    provider: 'azure',
    proxyPort: WS_PROXY_PORT,
    configured: true,
    // SECURITY: apiKey is NOT included - stays server-side
  });
}

// Check configuration status (for settings page)
export async function HEAD() {
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  if (!azureEndpoint || !azureApiKey || !azureDeployment) {
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 200 });
}
