/**
 * Classify Node process warnings that reach Sentry through console capture.
 *
 * Node writes process warnings with console.error, so captureConsole reports
 * them as errors although they are not failures. The one production message
 * dropped here comes from the platform's function loader, not from
 * MirrorBuddy code or dependencies (#1162); the stderr line still reaches the
 * Vercel runtime logs. Every other Node warning is kept, at warning level.
 */

const NODE_PREFIX = /^\(node:\d+\) /;
const DEPRECATION_CODE = /^\[[A-Z0-9]+\] /;
const WARNING_TYPE = /^([A-Za-z]*Warning): /;

function nodeWarningType(text: string): string | null {
  const prefix = NODE_PREFIX.exec(text);
  if (!prefix) return null;
  let rest = text.slice(prefix[0].length);
  const code = DEPRECATION_CODE.exec(rest);
  if (code) rest = rest.slice(code[0].length);
  return WARNING_TYPE.exec(rest)?.[1] ?? null;
}

const PROVEN_HARMLESS = [
  /^\(node:\d+\) ExperimentalWarning: vm\.USE_MAIN_CONTEXT_DEFAULT_LOADER is an experimental feature/,
];

interface ConsoleLikeEvent {
  logger?: string;
  message?: string;
  extra?: { arguments?: unknown[] };
}

export type NodeWarningClassification = { drop: true } | { drop: false; warningType: string };

export function classifyNodeProcessWarning(
  event: ConsoleLikeEvent | null | undefined,
): NodeWarningClassification | null {
  if (event?.logger !== 'console') return null;
  const first = event.extra?.arguments?.[0];
  const text = typeof first === 'string' ? first : event.message;
  if (typeof text !== 'string') return null;
  const warningType = nodeWarningType(text);
  if (!warningType) return null;
  if (PROVEN_HARMLESS.some((pattern) => pattern.test(text))) return { drop: true };
  return { drop: false, warningType };
}
