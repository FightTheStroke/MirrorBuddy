/**
 * Regenerate Python regex tables directly from the web source, or evaluate
 * JSON-lines inputs against the actual TypeScript functions for differential tests.
 * Node >=22.13 required only for regeneration/parity; runtime is pure Python.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const safety = 'apps/web/src/lib/safety/';
const voice = 'apps/web/src/lib/hooks/voice-session/';
// Paths below are fixed repository source paths, never caller-supplied input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const read = (path) => readFileSync(resolve(root, path), 'utf8');
function load(path, names, dependencies = {}) {
  const js = stripTypeScriptTypes(read(path))
    .replace(/import[\s\S]*?from\s*['"][^'"]+['"];?/g, '')
    .replace(/\bexport\s+/g, '');
  return Function(
    ...Object.keys(dependencies),
    `${js}\nreturn {${names.join(',')}};`,
  )(...Object.values(dependencies));
}
const filterNames = [
  'PROFANITY_IT',
  'PROFANITY_EN',
  'JAILBREAK_PATTERNS',
  'EXPLICIT_PATTERNS',
  'VIOLENCE_PATTERNS',
  'HACKING_PATTERNS',
  'PII_PATTERNS',
];
const weightedNames = [
  'ROLE_OVERRIDE_PATTERNS',
  'INSTRUCTION_IGNORE_PATTERNS',
  'SYSTEM_EXTRACTION_PATTERNS',
  'HYPOTHETICAL_PATTERNS',
  'EMOTIONAL_PATTERNS',
  'AUTHORITY_PATTERNS',
  'PROMPT_LEAKING_PATTERNS',
  'SYSTEM_FORGERY_PATTERNS',
  'CODE_INJECTION_PATTERNS',
  'OUTPUT_HIJACKING_PATTERNS',
  'CRESCENDO_PATTERNS',
];
const filters = load(safety + 'content-filter-patterns.ts', [...filterNames, 'SAFE_RESPONSES']);
const { IT_CONTENT_PATTERNS } = load(safety + 'safety-patterns.ts', ['IT_CONTENT_PATTERNS']);
const crisis = load(safety + 'crisis-detection.ts', ['containsCrisisKeywords']);
const weighted = load(safety + 'jailbreak-detector/patterns.ts', weightedNames);
const utils = load(safety + 'jailbreak-detector/utils.ts', [
  'detectEncoding',
  'calculateThreatScore',
]);
const { filterInput } = load(safety + 'content-filter-core.ts', ['filterInput'], {
  ...filters,
  ...crisis,
  IT_CONTENT_PATTERNS,
});
const { detectJailbreak } = load(safety + 'jailbreak-detector/detector.ts', ['detectJailbreak'], {
  ...weighted,
  ...utils,
});
const transcripts = load(
  voice + 'transcript-safety.ts',
  ['checkUserTranscript', 'checkAssistantTranscript'],
  {
    filterInput,
    detectJailbreak,
    isFeatureEnabled: () => ({ enabled: true }),
    logger: { debug() {}, info() {} },
  },
);
const { getRedirectMessage } = load(voice + 'safety-intervention.ts', ['getRedirectMessage']);
const spec = (regex) => [regex.source, regex.flags];
const crisisArray = read(safety + 'crisis-detection.ts').match(
  /const crisisRegex: RegExp\[\] = (\[[\s\S]*?\n  \]);/,
);
if (!crisisArray) throw new Error('Crisis source changed: review generator');
const crisisPatterns = Function(`return ${crisisArray[1]}`)();
const redirects = Object.fromEntries(
  ['violence', 'crisis', 'explicit', 'bias', 'jailbreak', 'profanity', 'default'].map(
    (category) => [category, getRedirectMessage([category])],
  ),
);

if (process.argv.includes('--generate')) {
  const header =
    '"""Generated web safety constants; regenerate with tests/transcript_safety_generate.mjs.\n' +
    'Do not edit patterns by hand. JavaScript source and flags are retained verbatim.\n"""\n\n';
  const py = (value) => JSON.stringify(value);
  const rows = (name, values) =>
    `${name} = (\n${values.map((v) => `    ${py(v)},`).join('\n')}\n)\n\n`;
  let content = header;
  for (const name of filterNames) content += rows(name, filters[name].map(spec));
  content += rows('CRISIS_PATTERNS', crisisPatterns.map(spec));
  content += rows('SEVERE', IT_CONTENT_PATTERNS.severe);
  writeFileSync(
    resolve(root, 'robot/reachy_mini_mirrorbuddy/transcript_safety_patterns.py'),
    content.trimEnd() + '\n',
  );
  let advanced = header + 'WEIGHTED_PATTERNS = (\n';
  for (const name of weightedNames) {
    advanced += `    # ${name}\n    (\n`;
    for (const { pattern, weight } of weighted[name]) {
      advanced += `        ${py([...spec(pattern), weight])},\n`;
    }
    advanced += '    ),\n';
  }
  advanced += ')\n';
  writeFileSync(
    resolve(root, 'robot/reachy_mini_mirrorbuddy/transcript_safety_weights.py'),
    advanced,
  );
  writeFileSync(
    resolve(root, 'robot/reachy_mini_mirrorbuddy/transcript_safety_redirects.py'),
    header + 'REDIRECTS = ' + JSON.stringify(redirects, null, 4) + '\n',
  );
  console.log(
    JSON.stringify({
      content: filterNames.map((name) => [name, filters[name].length]),
      crisis: crisisPatterns.length,
      severe: IT_CONTENT_PATTERNS.severe.length,
      weighted: weightedNames.map((name) => [name, weighted[name].length]),
    }),
  );
} else if (process.argv.includes('--metadata')) {
  process.stdout.write(
    JSON.stringify({
      filters: Object.fromEntries(filterNames.map((name) => [name, filters[name].map(spec)])),
      crisis: crisisPatterns.map(spec),
      severe: IT_CONTENT_PATTERNS.severe,
      weighted: weightedNames.map((name) =>
        weighted[name].map(({ pattern, weight }) => [...spec(pattern), weight]),
      ),
      redirects,
    }),
  );
} else {
  const texts = JSON.parse(readFileSync(0, 'utf8'));
  const results = texts.map((text) => {
    const user = transcripts.checkUserTranscript('parity', text ?? '');
    const assistant = transcripts.checkAssistantTranscript('parity', text ?? '');
    delete user.checkDurationMs;
    delete assistant.checkDurationMs;
    return { user, assistant, jailbreak: detectJailbreak(text ?? '') };
  });
  process.stdout.write(JSON.stringify(results));
}
