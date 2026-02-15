/**
 * Realtime Proxy Provider Configuration
 * Handles Azure OpenAI and OpenAI Realtime API setup
 */

import { logger } from '@/lib/logger';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';
import type { ProviderConfig, CharacterType } from './realtime-proxy-types';

/**
 * Get provider configuration for Realtime API
 *
 * @deprecated WebSocket proxy is deprecated. Use WebRTC transport instead.
 * Set VOICE_TRANSPORT=webrtc in environment to enable WebRTC.
 * This proxy will be removed in a future release.
 * See: src/lib/hooks/voice-session/ for WebRTC implementation.
 */
export async function getProviderConfig(
  characterType: CharacterType = 'maestro',
): Promise<ProviderConfig | null> {
  // Priority 1: Azure OpenAI (GDPR compliant, configured for this project)
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureDeploymentPremium = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;
  const azureDeploymentMini = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI;

  // Cost optimization: Use mini model by default, premium only for MirrorBuddy
  // MirrorBuddy (buddy type) needs premium model for emotional detection quality
  const usePremium = characterType === 'buddy';
  const azureDeployment = usePremium
    ? azureDeploymentPremium
    : azureDeploymentMini || azureDeploymentPremium;

  if (azureEndpoint && azureApiKey && azureDeployment) {
    const normalized = azureEndpoint
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');
    const url = new URL(normalized);

    // Log which deployment is being used
    const modelTier = usePremium ? 'PREMIUM' : 'MINI';
    logger.debug(
      `Using ${modelTier} deployment: ${azureDeployment} for characterType: ${characterType}`,
    );

    // =========================================================================
    // AZURE REALTIME API: Preview vs GA
    // =========================================================================
    // CRITICAL: Azure has TWO different API formats that use different:
    //   1. URL paths
    //   2. Query parameters
    //   3. Event names (response.audio.delta vs response.output_audio.delta)
    //
    // Preview API (gpt-4o-realtime-preview):
    //   - Path: /openai/realtime
    //   - Query: api-version=2025-04-01-preview
    //   - Events: response.audio.delta, response.audio_transcript.delta
    //
    // GA API (gpt-realtime):
    //   - Path: /openai/v1/realtime
    //   - Query: NO api-version (T1-04)
    //   - Events: response.output_audio.delta, response.output_audio_transcript.delta
    //
    // See: docs/AZURE_REALTIME_API.md for full documentation
    // =========================================================================
    const useGAProtocol = await isFeatureEnabled('voice_ga_protocol');

    if (useGAProtocol.enabled) {
      // GA API format: /openai/v1/realtime with model, NO api-version (T1-04)
      url.pathname = '/openai/v1/realtime';
      url.searchParams.set('model', azureDeployment);
      url.searchParams.set('api-key', azureApiKey);
    } else {
      // Preview API format: /openai/realtime with api-version and deployment
      url.pathname = '/openai/realtime';
      url.searchParams.set('api-version', '2025-04-01-preview');
      url.searchParams.set('deployment', azureDeployment);
      url.searchParams.set('api-key', azureApiKey);
    }

    return {
      provider: 'azure',
      wsUrl: url.toString(),
      headers: {}, // No headers needed - api-key is in URL
    };
  }

  return null;
}
