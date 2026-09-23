/**
 * Regression for #1162 (Sentry MIRRORBUDDY-36, ~250 "errors" a day).
 *
 * Node prints process warnings through console.error, so the console capture
 * turned them into error events. The one seen in production,
 * "vm.USE_MAIN_CONTEXT_DEFAULT_LOADER is an experimental feature", comes from
 * the platform's function loader: no MirrorBuddy dependency references that
 * API (ripgrep over node_modules, 2026-09-23). That exact message is dropped;
 * every other Node warning stays visible, at warning level.
 */
import { describe, it, expect } from 'vitest';
import { classifyNodeProcessWarning } from './node-process-warning';

const platformWarning =
  '(node:4) ExperimentalWarning: vm.USE_MAIN_CONTEXT_DEFAULT_LOADER is an experimental feature and might change at any time\n(Use `node --trace-warnings ...` to show where the warning was created)';

function consoleEvent(message: string) {
  return { logger: 'console', level: 'error', message, extra: { arguments: [message] } };
}

describe('classifyNodeProcessWarning', () => {
  it('drops the platform loader ExperimentalWarning', () => {
    expect(classifyNodeProcessWarning(consoleEvent(platformWarning))).toEqual({ drop: true });
  });

  it('keeps any other Node warning, downgraded from error to warning', () => {
    const deprecation =
      '(node:4) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.';
    expect(classifyNodeProcessWarning(consoleEvent(deprecation))).toEqual({
      drop: false,
      warningType: 'DeprecationWarning',
    });
    const otherExperimental =
      '(node:9) ExperimentalWarning: Type Stripping is an experimental feature';
    expect(classifyNodeProcessWarning(consoleEvent(otherExperimental))).toEqual({
      drop: false,
      warningType: 'ExperimentalWarning',
    });
  });

  it('leaves application errors and non-console events alone', () => {
    expect(classifyNodeProcessWarning(consoleEvent('Database unreachable'))).toBeNull();
    expect(classifyNodeProcessWarning({ message: platformWarning })).toBeNull();
    expect(classifyNodeProcessWarning({ logger: 'console' })).toBeNull();
  });
});
