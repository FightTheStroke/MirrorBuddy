import { createHash } from 'node:crypto';
import { Socket } from 'node:net';
import Module from 'node:module';

// This preload exists only in the child-test process. No production module reads it.
const record = (phase) => process.stderr.write(`RECOVERY_FIXTURE_${phase}\n`);
const connect = Socket.prototype.connect;
Socket.prototype.connect = function (...args) {
  const target = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof target === 'string' || (target && typeof target.path === 'string'))
    return connect.apply(this, args);
  record('NETWORK_BLOCKED');
  throw new Error('fixture forbids TCP');
};
globalThis.fetch = async () => {
  record('NETWORK_BLOCKED');
  throw new Error('fixture forbids HTTP');
};

const load = Module._load;
Module._load = function (id, ...args) {
  if (id !== '@prisma/client') return load.call(this, id, ...args);
  record('PRISMA_IMPORT');
  if (process.env.RECOVERY_FIXTURE_MODE === 'import-failure')
    throw new Error('synthetic-private-import-canary');
  const real = load.call(this, id, ...args);
  class FixturePrismaClient {
    $extends() {
      return this;
    }
    async $disconnect() {
      record('DISCONNECT');
      if (process.env.RECOVERY_FIXTURE_MODE === 'disconnect-failure')
        throw new Error('synthetic-private-import-canary');
    }
    async $transaction(work) {
      record('TRANSACTION');
      if (process.env.RECOVERY_FIXTURE_MODE === 'operation-failure') throw undefined;
      const account = (email, role) => ({
        id: role,
        emailHash: createHash('sha256').update(email).digest('hex'),
        role,
        disabled: false,
        mustChangePassword: role === 'ADMIN_READONLY',
        passwordHash: process.env.RECOVERY_FIXTURE_HASH,
        authVersion: 2,
      });
      const owner = account(process.env.ADMIN_EMAIL, 'ADMIN');
      const readonly = account(process.env.ADMIN_READONLY_EMAIL, 'ADMIN_READONLY');
      if (process.env.RECOVERY_FIXTURE_MODE === 'owner-rejected') owner.disabled = true;
      if (process.env.RECOVERY_FIXTURE_MODE === 'account-rejected') readonly.disabled = true;
      return work({
        user: {
          findMany: async ({ where }) =>
            where.OR[0].emailHash === owner.emailHash ? [owner] : [readonly],
        },
        $queryRaw: async (_sql, id) => [{ id }],
      });
    }
  }
  return { ...real, PrismaClient: FixturePrismaClient };
};
