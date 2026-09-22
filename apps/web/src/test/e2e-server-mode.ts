/**
 * Which server the browser tests are served from.
 *
 * This used to be decided by `process.env.CI`, which also decides project
 * selection, workers, retries, timeouts and `forbidOnly`. Serving the built
 * production server therefore meant changing all of them at once.
 *
 * `E2E_SERVER_MODE` separates the two concerns and nothing else. When it is
 * unset the result is exactly what the previous `process.env.CI` ternary
 * produced, so every existing invocation keeps its behaviour.
 */

export const DEV_SERVER_COMMAND = 'npm run dev';
export const STANDALONE_SERVER_COMMAND = 'node .next/standalone/apps/web/server.js';

export type E2EServerMode = 'production' | 'development';

export interface E2EServerSelection {
  mode: E2EServerMode;
  /** Passed to Playwright's `webServer.command`. */
  command: string;
  /** Passed to the served child process only - never to the test runner. */
  nodeEnv: E2EServerMode;
}

export interface E2EServerModeEnvironment {
  E2E_SERVER_MODE?: string | null;
  CI?: string | null;
  /** Accepts a whole `process.env` without claiming to read anything else from it. */
  [key: string]: string | null | undefined;
}

const SELECTIONS: Record<E2EServerMode, E2EServerSelection> = {
  production: {
    mode: 'production',
    command: STANDALONE_SERVER_COMMAND,
    nodeEnv: 'production',
  },
  development: {
    mode: 'development',
    command: DEV_SERVER_COMMAND,
    nodeEnv: 'development',
  },
};

function isSupported(value: string): value is E2EServerMode {
  return value === 'production' || value === 'development';
}

/**
 * Resolves the server selection from an explicit environment object.
 *
 * The environment is an argument rather than a read of `process.env` so that a
 * caller - including a test - can never influence it by accident.
 *
 * @throws when `E2E_SERVER_MODE` is present but is not exactly `production` or
 * `development`. A misspelled mode silently falling back to the dev server is
 * the failure this contract exists to prevent, so it is refused loudly instead.
 */
export function resolveE2EServerMode(environment: E2EServerModeEnvironment): E2EServerSelection {
  const configured = environment.E2E_SERVER_MODE;

  if (configured === undefined || configured === null) {
    // Unset: reproduce the previous CI ternary, truthiness included.
    return environment.CI ? SELECTIONS.production : SELECTIONS.development;
  }

  if (!isSupported(configured)) {
    throw new Error(
      `E2E_SERVER_MODE must be exactly "production" or "development", received ${JSON.stringify(
        configured,
      )}. ` +
        `Leave it unset to keep the default behaviour: the built production server under CI, ` +
        `the development server otherwise.`,
    );
  }

  return SELECTIONS[configured];
}
