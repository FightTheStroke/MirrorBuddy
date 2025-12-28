// ============================================================================
// PROVIDER STATUS API
// Returns detailed configuration status for AI providers
// Shows which environment variables are configured
// ============================================================================

import { NextResponse } from 'next/server';

interface EnvVarStatus {
  name: string;
  configured: boolean;
  displayValue?: string; // Masked value for display
}

interface ProviderStatus {
  activeProvider: 'azure' | 'ollama' | null;
  azure: {
    configured: boolean;
    model: string | null;
    realtimeConfigured: boolean;
    realtimeModel: string | null;
    envVars: EnvVarStatus[];
  };
  ollama: {
    configured: boolean;
    url: string;
    model: string;
    envVars: EnvVarStatus[];
  };
}

function maskValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

export async function GET() {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
  const azureModel = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;
  const azureRealtimeEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureRealtimeApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureRealtimeDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

  const azureConfigured = !!(azureEndpoint && azureApiKey);
  const azureRealtimeConfigured = !!(azureRealtimeEndpoint && azureRealtimeApiKey && azureRealtimeDeployment);

  // Determine active provider
  let activeProvider: 'azure' | 'ollama' | null = null;
  if (azureConfigured) {
    activeProvider = 'azure';
  } else {
    // Check if Ollama is running
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) {
        activeProvider = 'ollama';
      }
    } catch {
      // Ollama not running
    }
  }

  const status: ProviderStatus = {
    activeProvider,
    azure: {
      configured: azureConfigured,
      model: azureModel || null,
      realtimeConfigured: azureRealtimeConfigured,
      realtimeModel: azureRealtimeDeployment || null,
      envVars: [
        {
          name: 'AZURE_OPENAI_ENDPOINT',
          configured: !!azureEndpoint,
          displayValue: azureEndpoint ? maskValue(azureEndpoint) : undefined
        },
        {
          name: 'AZURE_OPENAI_API_KEY',
          configured: !!azureApiKey,
          displayValue: azureApiKey ? '****' : undefined
        },
        {
          name: 'AZURE_OPENAI_CHAT_DEPLOYMENT',
          configured: !!azureModel,
          displayValue: azureModel
        },
        {
          name: 'AZURE_OPENAI_REALTIME_ENDPOINT',
          configured: !!azureRealtimeEndpoint,
          displayValue: azureRealtimeEndpoint ? maskValue(azureRealtimeEndpoint) : undefined
        },
        {
          name: 'AZURE_OPENAI_REALTIME_API_KEY',
          configured: !!azureRealtimeApiKey,
          displayValue: azureRealtimeApiKey ? '****' : undefined
        },
        {
          name: 'AZURE_OPENAI_REALTIME_DEPLOYMENT',
          configured: !!azureRealtimeDeployment,
          displayValue: azureRealtimeDeployment
        },
      ],
    },
    ollama: {
      configured: activeProvider === 'ollama',
      url: ollamaUrl,
      model: ollamaModel,
      envVars: [
        {
          name: 'OLLAMA_URL',
          configured: !!process.env.OLLAMA_URL,
          displayValue: ollamaUrl
        },
        {
          name: 'OLLAMA_MODEL',
          configured: !!process.env.OLLAMA_MODEL,
          displayValue: ollamaModel
        },
      ],
    },
  };

  return NextResponse.json(status);
}
