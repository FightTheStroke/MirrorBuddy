import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { getAllMaestri } from '../../apps/web/src/data/maestri';
import { FORMAL_PROFESSORS } from '../../packages/greeting/src/templates';
import { CheckResult, fileExists, readFile, resolve } from './types';
import { z } from 'zod';

const CAT = 'Character Prompts';

// Maestri IDs from the index (source of truth)
const MAESTRI_DIR = 'src/data/maestri';

// Pre-1900 figures that must use formal address (ADR 0064)
const EXPECTED_FORMAL = [
  'manzoni',
  'shakespeare',
  'galileo',
  'leonardo',
  'omero',
  'erodoto',
  'euclide',
  'ippocrate',
  'cicerone',
  'socrate',
  'mozart',
  'smith',
  'darwin',
  'humboldt',
  'cervantes',
  'moliere',
  'goethe',
];

export function missingFormalProfessors(members: readonly string[] | null | undefined): string[] {
  return EXPECTED_FORMAL.filter((id) => !members?.includes(id));
}

export async function runCharacterPromptsChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  function add(name: string, status: CheckResult['status'], message: string): void {
    results.push({ name, status, message, category: CAT });
  }

  // --- Safety guidelines module ---
  const sgPath = `${MAESTRI_DIR}/safety-guidelines.ts`;
  if (!fileExists(sgPath)) {
    add('Safety guidelines', 'FAIL', `Missing: ${sgPath}`);
  } else {
    const content = readFile(sgPath) || '';
    if (!content.includes('SAFETY_GUIDELINES')) {
      add(
        'Safety guidelines export',
        'FAIL',
        'safety-guidelines.ts missing SAFETY_GUIDELINES export',
      );
    } else {
      add('Safety guidelines export', 'PASS', 'SAFETY_GUIDELINES exported from maestri');
    }
  }

  const maestri = getAllMaestri();
  if (maestri.length === 0) {
    add('Maestro files', 'FAIL', 'No maestro definition files found');
    return results;
  }

  add('Maestro count', 'PASS', `Found ${maestri.length} registered maestro definitions`);

  let safety: Record<string, string[]>;
  try {
    const output = execFileSync(
      process.execPath,
      [
        '--conditions=react-server',
        '--import',
        'tsx',
        resolve('scripts/compliance-checks/character-runtime.ts'),
        '--compliance-runtime',
      ],
      {
        cwd: resolve(''),
        encoding: 'utf8',
        timeout: 30_000,
        env: { ...process.env, TSX_TSCONFIG_PATH: path.join(resolve(''), 'tsconfig.json') },
      },
    );
    const line = output.split('\n').find((entry) => entry.startsWith('COMPLIANCE_SAFETY='));
    safety = z
      .record(z.string(), z.array(z.string()))
      .parse(JSON.parse(line?.slice('COMPLIANCE_SAFETY='.length) ?? 'null'));
  } catch (error) {
    add(
      'Maestro safety content',
      'FAIL',
      `Cannot execute server prompt composition: ${String(error)}`,
    );
    return results;
  }

  let emptyPrompts = 0;
  let missingSafety = 0;
  let missingA11y = 0;
  const emptyList: string[] = [];
  const safetyList: string[] = [];
  const a11yList: string[] = [];

  for (const maestro of maestri) {
    const name = maestro.id;
    if (!maestro.systemPrompt?.trim()) {
      emptyPrompts++;
      if (emptyList.length < 5) emptyList.push(name);
      continue;
    }

    const missing = safety[name] ?? ['missing runtime result'];
    if (missing.length) {
      missingSafety++;
      safetyList.push(`${name} (${missing.join(', ')})`);
    }

    // Check accessibility section
    if (
      !maestro.excludeFromGamification &&
      !/^#{1,2}\s*(Accessibility(?: Adaptations)?|Adattamenti per l'Accessibilità)\s*$/im.test(
        maestro.systemPrompt,
      )
    ) {
      missingA11y++;
      a11yList.push(name);
    }
  }

  // Report systemPrompt presence
  if (emptyPrompts > 0) {
    add(
      'Maestro systemPrompt',
      'FAIL',
      `${emptyPrompts} maestro(s) lack systemPrompt: ${emptyList.join(', ')}`,
    );
  } else {
    add('Maestro systemPrompt', 'PASS', 'All maestri have systemPrompt defined');
  }

  // Report safety content
  if (missingSafety > 0) {
    add(
      'Maestro safety content',
      'WARN',
      `${missingSafety} composed maestro prompt(s) lack safety instructions: ${safetyList.join(', ')}`,
    );
  } else {
    add('Maestro safety content', 'PASS', 'All composed maestro prompts satisfy safety invariants');
  }

  // Report accessibility
  if (missingA11y > 0) {
    add(
      'Maestro accessibility',
      'WARN',
      `${missingA11y} maestro prompt(s) lack accessibility section: ${a11yList.join(', ')}`,
    );
  } else {
    add('Maestro accessibility', 'PASS', 'All maestro prompts have accessibility section');
  }

  // --- Formal professors check ---
  {
    const missingFormal = missingFormalProfessors(FORMAL_PROFESSORS);
    if (missingFormal.length > 0) {
      add(
        'Formal professors list',
        'WARN',
        `Pre-1900 figures missing from FORMAL_PROFESSORS: ${missingFormal.join(', ')}`,
      );
    } else {
      add('Formal professors list', 'PASS', 'All pre-1900 figures in FORMAL_PROFESSORS');
    }
  }

  return results;
}
