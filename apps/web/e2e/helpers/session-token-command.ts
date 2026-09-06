// Runs under Node's react-server condition, like the repository's `pnpm script`.
import { createSessionToken } from '../../src/lib/auth/session-token';

process.stdout.write(JSON.stringify(createSessionToken()));
