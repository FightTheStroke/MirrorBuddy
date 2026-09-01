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
  param?: string;
};

/**
 * What an upstream failure is ALLOWED to say once it leaves the point of read.
 *
 * An Azure error body is not a diagnostic string: it can quote the prompt back,
 * and the prompt is a child's homework. So the body is read once, reduced to
 * this, and dropped. Everything here is either a number, an enum-like token
 * Azure defines, or a filter category name - never free text the upstream chose.
 */
export type UpstreamErrorCategory =
  | 'content_filter'
  | 'deployment_not_found'
  | 'auth'
  | 'rate_limit'
  | 'unsupported_parameter'
  | 'bad_request'
  | 'server'
  | 'unknown';

export type SanitizedUpstreamError = {
  status: number;
  category: UpstreamErrorCategory;
  /** Azure's own `error.code`, only when it looks like a code and not a sentence. */
  code?: string;
  /** Content-filter categories that actually fired, when the failure is one. */
  filteredCategories?: string[];
  /** Which token parameter the deployment refused, when that is the failure. */
  tokenParam?: TokenParamName;
  /** The deployment accepts only its default temperature (GPT-5 class reasoning models). */
  unsupportedTemperature?: boolean;
};

/** Azure codes are enum-like. Anything longer or stranger is free text wearing a code's name. */
const CODE_SHAPE = /^[A-Za-z0-9_.-]{1,64}$/;

function safeCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return CODE_SHAPE.test(code) ? code : undefined;
}

function categorize(
  status: number,
  code: string | undefined,
  errorText: string,
): UpstreamErrorCategory {
  if (code === 'content_filter') return 'content_filter';
  if (isDeploymentNotFound(status, errorText)) return 'deployment_not_found';
  if (isUnsupportedTokenParam(status, errorText)) return 'unsupported_parameter';
  if (isUnsupportedTemperature(status, errorText)) return 'unsupported_parameter';
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500 && status < 600) return 'server';
  if (status >= 400 && status < 500) return 'bad_request';
  return 'unknown';
}

/**
 * Read an upstream failure once and keep only what is safe to carry.
 *
 * The raw body is deliberately NOT returned and NOT stored: a value that exists
 * is a value that ends up in a log line, a stack trace or a stream eventually.
 */
export function sanitizeUpstreamError(status: number, errorText: string): SanitizedUpstreamError {
  const parsed = parseAzureError(errorText);
  const code = safeCode(parsed.code);
  const sanitized: SanitizedUpstreamError = {
    status,
    category: categorize(status, parsed.code, errorText),
    ...(code ? { code } : {}),
  };

  if (sanitized.category === 'content_filter') {
    const filterResult = extractContentFilterResult(errorText);
    if (filterResult) sanitized.filteredCategories = filteredCategoryNames(filterResult);
  }

  if (sanitized.category === 'unsupported_parameter') {
    const tokenParam = isUnsupportedTokenParam(status, errorText);
    if (tokenParam) sanitized.tokenParam = tokenParam;
    if (isUnsupportedTemperature(status, errorText)) sanitized.unsupportedTemperature = true;
  }

  return sanitized;
}

/** The one string form a sanitized error may take. Safe for logs, streams and browsers. */
export function describeUpstreamError(error: SanitizedUpstreamError): string {
  const parts = [`Azure OpenAI error (${error.status})`, `[${error.category}]`];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.filteredCategories?.length)
    parts.push(`filtered=${error.filteredCategories.join(',')}`);
  return parts.join(' ');
}

type ContentFilterResult = Record<string, { filtered?: boolean }>;

export function extractContentFilterResult(errorText: string): ContentFilterResult | null {
  try {
    const data = JSON.parse(errorText) as {
      error?: { innererror?: { content_filter_result?: ContentFilterResult } };
    };
    return data.error?.innererror?.content_filter_result ?? null;
  } catch {
    return null;
  }
}

/** Only the names Azure defines, and only the ones that actually fired. */
export function filteredCategoryNames(result: ContentFilterResult): string[] {
  return Object.entries(result)
    .filter(([, value]) => value?.filtered === true)
    .map(([name]) => name)
    .filter((name) => CODE_SHAPE.test(name));
}

export class AzureHttpError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly category: UpstreamErrorCategory;
  public readonly filteredCategories?: string[];
  public readonly tokenParam?: TokenParamName;
  public readonly unsupportedTemperature?: boolean;

  constructor(sanitized: SanitizedUpstreamError) {
    super(describeUpstreamError(sanitized));
    this.name = 'AzureHttpError';
    this.status = sanitized.status;
    this.code = sanitized.code;
    this.category = sanitized.category;
    this.filteredCategories = sanitized.filteredCategories;
    this.tokenParam = sanitized.tokenParam;
    this.unsupportedTemperature = sanitized.unsupportedTemperature;
  }

  /** What may be attached to a log line. Never spread the raw error into metadata. */
  public toMetadata(): SanitizedUpstreamError {
    return {
      status: this.status,
      category: this.category,
      ...(this.code ? { code: this.code } : {}),
      ...(this.filteredCategories ? { filteredCategories: this.filteredCategories } : {}),
      ...(this.tokenParam ? { tokenParam: this.tokenParam } : {}),
      ...(this.unsupportedTemperature ? { unsupportedTemperature: true } : {}),
    };
  }
}

/**
 * Extract HTTP status from error message or custom property
 */
export function extractStatusFromError(error: Error): number | null {
  // Check for status in error message (format: "Azure OpenAI error (500) ...")
  const match = error.message.match(/Azure OpenAI error \((\d+)\)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Check for custom status property (if fetch throws with status)
  const errorWithStatus = error as Error & { status?: number };
  return errorWithStatus.status ?? null;
}

export function parseAzureError(errorText: string): ParsedAzureError {
  try {
    const data = JSON.parse(errorText) as {
      error?: { code?: string; message?: string; param?: string };
    };
    return {
      code: data.error?.code,
      message: data.error?.message,
      param: data.error?.param,
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
 * GPT-5 class deployments accept only their default temperature and answer a
 * custom one with 400 `unsupported_value`. The wording is upstream free text —
 * it is matched here but never carried out of this module.
 */
export function isUnsupportedTemperature(status: number, errorText: string): boolean {
  if (status !== 400) return false;
  const parsed = parseAzureError(errorText);
  if (parsed.param === 'temperature' && parsed.code === 'unsupported_value') return true;
  return errorText.includes("Unsupported value: 'temperature'");
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
