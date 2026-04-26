/**
 * @file azure-errors.ts
 * @brief Shared Azure OpenAI error types and helpers
 *
 * Used by both azure.ts (non-streaming) and azure-streaming.ts (streaming).
 */

export type TokenParamName = 'max_completion_tokens' | 'max_tokens';

export type ParsedAzureError = {
  code?: string;
  message?: string;
};

export class AzureHttpError extends Error {
  public readonly status: number;
  public readonly errorText: string;
  public readonly code?: string;

  constructor(status: number, errorText: string, code?: string) {
    super(`Azure OpenAI error (${status}): ${errorText}`);
    this.status = status;
    this.errorText = errorText;
    this.code = code;
  }
}

/**
 * Extract HTTP status from error message or custom property
 */
export function extractStatusFromError(error: Error): number | null {
  // Check for status in error message (format: "Azure OpenAI error (500): ...")
  const match = error.message.match(/Azure OpenAI error \((\d+)\):/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Check for custom status property (if fetch throws with status)
  const errorWithStatus = error as Error & { status?: number };
  return errorWithStatus.status ?? null;
}

export function parseAzureError(errorText: string): ParsedAzureError {
  try {
    const data = JSON.parse(errorText) as { error?: { code?: string; message?: string } };
    return {
      code: data.error?.code,
      message: data.error?.message,
    };
  } catch {
    return {};
  }
}

export function isDeploymentNotFound(status: number, errorText: string): boolean {
  if (status !== 404) return false;
  const parsed = parseAzureError(errorText);
  if (parsed.code === 'DeploymentNotFound') return true;
  return (
    errorText.includes('DeploymentNotFound') ||
    (parsed.message?.includes('DeploymentNotFound') ?? false)
  );
}

export function isUnsupportedTokenParam(status: number, errorText: string): TokenParamName | null {
  if (status !== 400) return null;
  if (errorText.includes("Unsupported parameter: 'max_tokens'")) return 'max_tokens';
  if (errorText.includes("Unsupported parameter: 'max_completion_tokens'"))
    return 'max_completion_tokens';
  return null;
}

/**
 * Determine if an error is retryable based on HTTP status
 * F-06: Retry on 429 (rate limit) and 5xx (server errors)
 */
export function isRetryableAzureError(error: Error): boolean {
  const status = extractStatusFromError(error);
  if (!status) return false;

  // Retry on rate limit (429) or server errors (5xx)
  return status === 429 || (status >= 500 && status < 600);
}
