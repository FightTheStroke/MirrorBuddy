import { prisma, dbPool } from '@/lib/db';
import { modifyMindmap, readMindmap } from '../../service';
import { ownerSchema } from '../../storage';
import { z } from 'zod';

async function main() {
  if (process.env.DATABASE_URL !== 'postgresql://Roberdan@localhost:5432/mirrorbuddy_test')
    throw new Error('This fixture only runs against the explicit local test database');
  const request = z
    .object({
      action: z.enum(['read', 'modify']),
      owner: ownerSchema,
      input: z.unknown(),
    })
    .parse(JSON.parse(process.argv[2]));
  const value =
    request.action === 'read'
      ? await readMindmap(request.owner, request.input)
      : await modifyMindmap(request.owner, request.input);
  console.log(`MINDMAP_RESULT ${JSON.stringify({ pid: process.pid, value })}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Worker failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await dbPool.end();
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Worker cleanup failed');
    process.exitCode = 1;
  });
