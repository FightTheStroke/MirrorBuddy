import { getAllMaestri } from '../../apps/web/src/data/maestri';
import { enhanceSystemPrompt } from '../../apps/web/src/lib/conversation/prompt-enhancer';
import { missingSafetyInvariants } from './prompt-contracts';

// Run under the real server condition: prompt enhancement imports server-only
// memory modules. No DB calls are made for empty memory, and no module is mocked.
export function collectCharacterSafety(): Record<string, string[]> {
  return Object.fromEntries(
    getAllMaestri().map((maestro) => [
      maestro.id,
      missingSafetyInvariants(
        enhanceSystemPrompt({
          basePrompt: maestro.systemPrompt,
          memory: { recentSummary: null, keyFacts: [], topics: [], lastSessionDate: null },
          safetyOptions: { role: 'maestro', characterId: maestro.id },
        }),
      ),
    ]),
  );
}

if (process.argv.includes('--compliance-runtime')) {
  // Imported server modules own background timers; this read-only CLI has no
  // pending work once its result has been flushed.
  process.stdout.write(`COMPLIANCE_SAFETY=${JSON.stringify(collectCharacterSafety())}\n`, () => {
    process.exit(0);
  });
}
