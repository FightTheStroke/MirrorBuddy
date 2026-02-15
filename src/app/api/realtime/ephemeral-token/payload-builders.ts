// ============================================================================
// Ephemeral token payload builders for GA and preview Azure Realtime protocols
// ============================================================================

// GA response: { value, expires_at, session: { id, model, ... } }
export interface AzureGAResponse {
  value: string;
  expires_at: number;
  session: { id: string; model: string };
}

// Preview response: { client_secret: { value, expires_at }, id }
export interface AzurePreviewResponse {
  client_secret: { value: string; expires_at: number };
  id: string;
}

export interface EphemeralTokenResponse {
  token: string;
  expiresAt: number;
  sessionId: string;
}

/**
 * Build GA protocol payload.
 * GA wraps config in { session: { type: "realtime", model, audio, ... } }
 */
export function buildGAPayload(
  deployment: string,
  requestBody: Record<string, unknown>,
): Record<string, unknown> {
  const sessionConfig: Record<string, unknown> = {
    type: 'realtime',
    model: deployment,
  };

  const voice = (requestBody.voice as string) || 'alloy';
  sessionConfig.audio = {
    output: { voice },
    input: {
      transcription: requestBody.input_audio_transcription || null,
      turn_detection: requestBody.turn_detection || undefined,
    },
  };

  if (requestBody.instructions) {
    sessionConfig.instructions = requestBody.instructions;
  }

  return { session: sessionConfig };
}

/**
 * Build preview protocol payload.
 * Preview uses flat { model } format.
 */
export function buildPreviewPayload(deployment: string): Record<string, unknown> {
  return { model: deployment };
}

/**
 * Parse GA response into EphemeralTokenResponse.
 * Returns null if the response is invalid.
 */
export function parseGAResponse(data: AzureGAResponse): EphemeralTokenResponse | null {
  if (!data.value || !data.expires_at) {
    return null;
  }
  return {
    token: data.value,
    expiresAt: data.expires_at,
    sessionId: data.session?.id || '',
  };
}

/**
 * Parse preview response into EphemeralTokenResponse.
 * Returns null if the response is invalid.
 */
export function parsePreviewResponse(data: AzurePreviewResponse): EphemeralTokenResponse | null {
  if (!data.client_secret?.value || !data.client_secret?.expires_at) {
    return null;
  }
  return {
    token: data.client_secret.value,
    expiresAt: data.client_secret.expires_at,
    sessionId: data.id || '',
  };
}
