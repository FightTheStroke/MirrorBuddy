/**
 * What a spoken minute actually costs.
 *
 * Until now the answer was unknowable: `voiceMinutes` was never recorded
 * anywhere, so every voice cost in the database was zero. Wall-clock minutes
 * would not have been the right unit anyway — Azure bills the Realtime API by
 * token, and audio tokens are charged at a very different rate from text, in
 * both directions. Silence is cheap; a talkative maestro is not.
 *
 * So we price what Azure prices: the usage block it sends back on every
 * `response.done`.
 *
 * Rates are USD per 1M tokens, from Azure OpenAI public pricing (verified
 * 2026-08). They can be overridden with AZURE_VOICE_RATES_JSON without a
 * deploy, because published prices change more often than releases do.
 */

export interface TokenUsage {
  audioInputTokens: number;
  audioOutputTokens: number;
  textInputTokens: number;
  textOutputTokens: number;
  cachedInputTokens: number;
}

export interface ModelRates {
  audioIn: number;
  audioOut: number;
  textIn: number;
  textOut: number;
  cachedIn: number;
}

/** USD per 1M tokens. */
const DEFAULT_RATES: Record<string, ModelRates> = {
  'gpt-realtime': { audioIn: 32, audioOut: 64, textIn: 4, textOut: 16, cachedIn: 0.4 },
  'gpt-realtime-mini': { audioIn: 10, audioOut: 20, textIn: 0.6, textOut: 2.4, cachedIn: 0.06 },
  'gpt-realtime-15': { audioIn: 32, audioOut: 64, textIn: 4, textOut: 16, cachedIn: 0.4 },
  'gpt-realtime-2': { audioIn: 32, audioOut: 64, textIn: 4, textOut: 16, cachedIn: 0.4 },
};

/**
 * Unknown deployments are priced at the most expensive known rate rather than
 * zero. A new model must never make the bill look like it disappeared.
 */
const FALLBACK_MODEL = 'gpt-realtime';

export const USD_PER_EUR = 1.08;

function overrides(): Record<string, ModelRates> {
  const raw = process.env.AZURE_VOICE_RATES_JSON;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, ModelRates>)
      : {};
  } catch {
    return {}; // A malformed override must not take pricing down with it.
  }
}

/** Matches a deployment name to its rate card, tolerating suffixes and casing. */
export function ratesFor(model: string): ModelRates {
  const name = (model || '').trim().toLowerCase();
  const table = { ...DEFAULT_RATES, ...overrides() };
  if (table[name]) return table[name];
  const known = Object.keys(table)
    .filter((candidate) => name.startsWith(candidate))
    .sort((a, b) => b.length - a.length)[0];
  return table[known ?? FALLBACK_MODEL] ?? DEFAULT_RATES[FALLBACK_MODEL];
}

export interface PricedUsage {
  audioInputCostEur: number;
  audioOutputCostEur: number;
  textCostEur: number;
  totalCostEur: number;
}

const round6 = (value: number): number => Math.round(value * 1e6) / 1e6;

/**
 * Prices one usage block. Negative or non-finite counts are treated as zero:
 * a corrupted event must never credit money back to a user's total.
 */
export function priceUsage(model: string, usage: Partial<TokenUsage>): PricedUsage {
  const rates = ratesFor(model);
  const safe = (value: number | undefined): number =>
    Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0;

  const perToken = (tokens: number, usdPerMillion: number): number =>
    (tokens / 1_000_000) * (usdPerMillion / USD_PER_EUR);

  const audioInputCostEur = perToken(safe(usage.audioInputTokens), rates.audioIn);
  const audioOutputCostEur = perToken(safe(usage.audioOutputTokens), rates.audioOut);
  const textCostEur =
    perToken(safe(usage.textInputTokens), rates.textIn) +
    perToken(safe(usage.textOutputTokens), rates.textOut) +
    perToken(safe(usage.cachedInputTokens), rates.cachedIn);

  return {
    audioInputCostEur: round6(audioInputCostEur),
    audioOutputCostEur: round6(audioOutputCostEur),
    textCostEur: round6(textCostEur),
    totalCostEur: round6(audioInputCostEur + audioOutputCostEur + textCostEur),
  };
}

/**
 * Reads the usage block Azure sends on `response.done`.
 *
 * The shape has changed across API versions — `input_token_details` has been
 * seen both nested under `usage` and flattened — so both are accepted, and an
 * unrecognised shape yields zeros rather than throwing inside the event loop.
 */
export function parseRealtimeUsage(raw: unknown): TokenUsage {
  const empty: TokenUsage = {
    audioInputTokens: 0,
    audioOutputTokens: 0,
    textInputTokens: 0,
    textOutputTokens: 0,
    cachedInputTokens: 0,
  };
  if (typeof raw !== 'object' || raw === null) return empty;

  const usage = raw as Record<string, unknown>;
  const details = (key: string): Record<string, unknown> => {
    const nested = usage[key];
    return typeof nested === 'object' && nested !== null ? (nested as Record<string, unknown>) : {};
  };
  const num = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

  const input = details('input_token_details');
  const output = details('output_token_details');
  const cachedDetails =
    typeof input.cached_tokens_details === 'object' && input.cached_tokens_details !== null
      ? (input.cached_tokens_details as Record<string, unknown>)
      : {};

  return {
    audioInputTokens: num(input.audio_tokens),
    audioOutputTokens: num(output.audio_tokens),
    textInputTokens: num(input.text_tokens),
    textOutputTokens: num(output.text_tokens),
    cachedInputTokens: num(input.cached_tokens) || num(cachedDetails.audio_tokens),
  };
}
