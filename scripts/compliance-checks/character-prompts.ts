import fs from 'fs';
import path from 'path';
import { CheckResult, fileExists, readFile, resolve } from './types';

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

// Keywords that indicate safety content in a prompt
const SAFETY_KEYWORDS = ['Safety', 'Security', 'Ethics', 'safe', 'Anti-Cheating', 'Role Adherence'];

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

  // --- Scan each maestro file for systemPrompt ---
  const maestriDir = resolve(MAESTRI_DIR);
  if (!fs.existsSync(maestriDir)) {
    add('Maestri directory', 'FAIL', `Missing: ${MAESTRI_DIR}/`);
    return results;
  }

  const maestroFiles = fs
    .readdirSync(maestriDir)
    .filter(
      (f) =>
        f.endsWith('.ts') &&
        !f.includes('knowledge') &&
        !f.includes('safety') &&
        !f.includes('types') &&
        !f.includes('index') &&
        !f.includes('quotes') &&
        !f.includes('.test.') &&
        !f.startsWith('__'),
    );

  if (maestroFiles.length === 0) {
    add('Maestro files', 'FAIL', 'No maestro definition files found');
    return results;
  }

  add('Maestro count', 'PASS', `Found ${maestroFiles.length} maestro definitions`);

  let emptyPrompts = 0;
  let missingSafety = 0;
  let missingA11y = 0;
  const emptyList: string[] = [];
  const safetyList: string[] = [];
  const a11yList: string[] = [];

  for (const file of maestroFiles) {
    const filePath = path.join(MAESTRI_DIR, file);
    const content = readFile(filePath);
    if (!content) continue;

    const name = file.replace('.ts', '');

    // Skip non-educational characters (excludeFromGamification = comedy/special)
    if (content.includes('excludeFromGamification')) continue;

    // Check systemPrompt exists and is non-empty
    if (!content.includes('systemPrompt')) {
      emptyPrompts++;
      if (emptyList.length < 5) emptyList.push(name);
      continue;
    }

    // Resolve the full prompt content: inline or from prompts/ file
    let promptContent = content;
    const importMatch = content.match(/import\s+\{[^}]*\}\s+from\s+["']\.\/prompts\/([^"']+)["']/);
    if (importMatch) {
      const promptFile = readFile(path.join(MAESTRI_DIR, 'prompts', importMatch[1] + '.ts'));
      if (promptFile) promptContent = content + promptFile;
    }

    // Check safety content in prompt
    const hasSafety = SAFETY_KEYWORDS.some((kw) => promptContent.includes(kw));
    if (!hasSafety) {
      missingSafety++;
      if (safetyList.length < 5) safetyList.push(name);
    }

    // Check accessibility section
    if (!promptContent.includes('Accessibility') && !promptContent.includes('accessibility')) {
      missingA11y++;
      if (a11yList.length < 5) a11yList.push(name);
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
      `${missingSafety} maestro prompt(s) lack safety keywords: ${safetyList.join(', ')}`,
    );
  } else {
    add('Maestro safety content', 'PASS', 'All maestro prompts contain safety content');
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
  const formalPath = 'src/lib/greeting/templates/index.ts';
  if (!fileExists(formalPath)) {
    add('Formal professors', 'WARN', `Missing: ${formalPath}`);
  } else {
    const formalContent = readFile(formalPath) || '';
    const missingFormal = EXPECTED_FORMAL.filter((p) => !formalContent.includes(`"${p}"`));
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
