import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { policyTestDatabaseEnabled } from './policy-test-environment';

type Environment = Readonly<Record<string, string | undefined>>;

export function readOnlyTestDatabaseConfig(env: Environment | null = process.env) {
  if (!policyTestDatabaseEnabled(env) || !env?.TEST_DATABASE_URL) {
    throw new Error('Read-only test database requires explicit validated local opt-in');
  }
  return {
    connectionString: env.TEST_DATABASE_URL,
    options: '-c default_transaction_read_only=on',
    max: 2,
  };
}

export function createReadOnlyTestDatabase(env: Environment | null = process.env) {
  // The adapter owns this pool; disconnect never touches the application singleton.
  const adapter = new PrismaPg(readOnlyTestDatabaseConfig(env));
  const prisma = new PrismaClient({ adapter });
  return { prisma, close: () => prisma.$disconnect() };
}
