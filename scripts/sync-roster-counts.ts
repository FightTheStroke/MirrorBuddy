#!/usr/bin/env tsx
/**
 * Keeps every hand-written "27 Maestri" in the product honest.
 *
 * The roster lives in `apps/web/src/data/`, but the *number* of characters was
 * restated by hand across dozens of files: translations for five locales,
 * compliance docs, the robot package and the published app store page. Adding
 * Loto as the 27th maestro left all of them claiming 26 — including the EU AI
 * Act Article 50 disclosure — and nothing failed.
 *
 * This derives the counts from the roster itself and reports (or fixes) every
 * place that disagrees.
 *
 *   npm run roster:check   # fails on drift, used in CI
 *   npm run roster:sync    # rewrites the stale numbers in place
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { globSync } from 'tinyglobby';

import { readRosterCounts } from './lib/roster-counts';

const REPO_ROOT = process.cwd();
const ROSTER = readRosterCounts(REPO_ROOT);

/**
 * Counts describing a *subset* of the roster are legitimate and must be left
 * alone: the Trial tier really does offer 3 maestri. Only claims about the
 * roster as a whole have to match.
 */
const TIER_SCOPED =
  /(tierComparison\.tiers\.(trial|base)|quickStart\.trial|trialLimits|common\.trial|tierSystem\.(trial|base)|tldrItems\.free|pricing\.(plans\.)?(trial|base|free))/i;

/**
 * The same applies in prose, where there is no key to inspect — a line that
 * breaks the roster down by tier, or scopes it to "the other 19 maestri" of a
 * study cohort, is describing a part and not the whole.
 */
const SUBSET_PROSE =
  /(\+|\b(trial|base|free|gratuito|other|others|altri|optional|opzionali|remaining|sample|cohort|coorte)\b)/i;

/** Phrasings used for each roster across the five shipped locales. */
const NOUNS: Record<keyof typeof ROSTER, string[]> = {
  maestri: [
    'Maestri',
    'maestri',
    'Maestros',
    'maestros',
    'Professori',
    'professori',
    'Professors',
    'professors',
    'Professoren',
    'professoren',
    'Profesores',
    'profesores',
    'Professeurs',
    'professeurs',
    'AI professors',
    'AI Professors',
    // Multi-word forms from the meta descriptions and the JSON-LD schema,
    // where the noun does not sit directly after the number.
    'historical Maestros',
    'historical maestros',
    'historic professors',
    'historic Professors',
    'virtual maestri',
    'maestri storici',
    'maestros históricos',
    'maîtres historiques',
    'Maîtres',
    'maîtres',
    'historische Meister',
    // German declines in the dative ("mit 17 historischen Meistern"), so the
    // inflected forms need listing or the check passes while the copy is wrong.
    'historischen Meistern',
    'Meistern',
    'Meister',
    'meister',
  ],
  coaches: [
    'Coach',
    'coach',
    'Coaches',
    'coaches',
    'Coachs',
    'coachs',
    'Entrenadores',
    'entrenadores',
    'entraîneurs',
    'Trainer',
    'trainer',
    'Trainern',
    'trainern',
    // Italian "insegnanti" names the coaches, not the maestri. Listing it
    // under maestri would rewrite a correct 6 into the maestri count.
    'insegnanti',
    'Insegnanti',
  ],
  buddies: [
    'Buddy',
    'buddy',
    'Buddies',
    'buddies',
    'compagni',
    'Compagni',
    'copains',
    'Kumpel',
    'compañeros',
    'Lernpartner',
    'Lernpartnern',
  ],
};

interface Finding {
  file: string;
  jsonPath: string;
  expected: number;
  snippet: string;
}

function buildPattern(nouns: string[]): RegExp {
  // Longest first so "AI professors" wins over "professors".
  const alt = [...new Set(nouns)].sort((a, b) => b.length - a.length).join('|');
  // The lookbehind keeps "### 4.2 Maestri & Tools" from reading as "2 Maestri".
  return new RegExp(`(?<![\\d.])(\\d{1,3})(\\s+|&nbsp;)(${alt})\\b`, 'g');
}

/**
 * The grand total is its own drift risk: "28 Maestri + 6 Coaches + 6 Buddies
 * (39 total)" was wrong by one and still read as correct, because each
 * individual count checked out.
 *
 * It has to be matched by the full breakdown, not by the word "total" alone:
 * a bare "(12 total)" turns up in unrelated tables, and the breakdown's own
 * plus signs make the subset heuristic skip the line. So the pattern requires
 * the three rosters to be present and rewrites only the trailing sum.
 */
const TOTAL_CHARACTERS = ROSTER.maestri + ROSTER.coaches + ROSTER.buddies;
const BREAKDOWN_TOTAL_PATTERN = new RegExp(
  String.raw`(\d{1,3}\s+\S*\s*(?:Maestri|maestri|Maestros)\b[^\n]*?\bBudd(?:y|ies)\b[^\n]*?\()(\d{1,3})(\s+total\b)`,
  'g',
);

const PATTERNS = Object.entries(NOUNS).map(
  ([key, nouns]) => [key as keyof typeof ROSTER, buildPattern(nouns)] as const,
);

/**
 * How much text before a number is inspected to decide whether the number is
 * scoped to a subset. A whole sentence is too much: the Pro tier description
 * says "all 28 maestri" and then mentions the Base tier further along, and
 * skipping the line for that lets a real claim drift.
 */
const SCOPE_WINDOW = 45;

/** Rewrite stale counts in one line of text, recording anything that disagreed. */
function reconcileLine(line: string, file: string, jsonPath: string, findings: Finding[]): string {
  if (TIER_SCOPED.test(jsonPath)) return line;

  let out = line;
  for (const [key, pattern] of PATTERNS) {
    const expected = ROSTER[key];
    out = out.replace(
      pattern,
      (whole, digits: string, gap: string, noun: string, offset: number, whole_: string) => {
        const lead = whole_.slice(Math.max(0, offset - SCOPE_WINDOW), offset);
        if (SUBSET_PROSE.test(lead)) return whole;
        if (Number(digits) === expected) return whole;
        findings.push({ file, jsonPath, expected, snippet: whole });
        return `${expected}${gap}${noun}`;
      },
    );
  }

  out = out.replace(
    BREAKDOWN_TOTAL_PATTERN,
    (whole, lead: string, digits: string, tail: string) => {
      if (Number(digits) === TOTAL_CHARACTERS) return whole;
      findings.push({ file, jsonPath, expected: TOTAL_CHARACTERS, snippet: `${digits}${tail}` });
      return `${lead}${TOTAL_CHARACTERS}${tail}`;
    },
  );

  return out;
}

/**
 * Scope the subset check to a single line: a document that legitimately breaks
 * the roster down in one paragraph must still be corrected in the next.
 */
function reconcile(text: string, file: string, jsonPath: string, findings: Finding[]): string {
  return text
    .split('\n')
    .map((line) => reconcileLine(line, file, jsonPath, findings))
    .join('\n');
}

/** Walk a parsed messages file, reconciling every string leaf. */
function reconcileJson(node: unknown, file: string, path: string, findings: Finding[]): unknown {
  if (typeof node === 'string') return reconcile(node, file, path, findings);
  if (Array.isArray(node)) {
    return node.map((item, i) => reconcileJson(item, file, `${path}[${i}]`, findings));
  }
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [
        k,
        reconcileJson(v, file, path ? `${path}.${k}` : k, findings),
      ]),
    );
  }
  return node;
}

const TARGETS = [
  'apps/web/messages/*/*.json',
  // Meta descriptions are copy too: they reach Google and social cards.
  'apps/web/src/app/layout.tsx',
  'apps/web/src/lib/i18n/get-og-metadata.ts',
  // The Organization JSON-LD is what Google actually reads for rich results,
  // so a stale count here is published to search whether we notice or not.
  'apps/web/src/components/structured-data/json-ld-organization.ts',
  'docs/**/*.md',
  'robot/**/*.py',
  'robot/**/*.html',
  'robot/**/*.md',
  'README.md',
];

const IGNORED = [
  '**/node_modules/**',
  // ADRs, plans and archives are dated records of what was true when written.
  // Rewriting history to match today's roster would be a lie, not a fix.
  'docs/adr/**',
  'docs/plans/**',
  'docs/archive/**',
  // Dated financial analyses. A January valuation modelled the roster of that
  // January; restating it with today's number would misreport the analysis.
  'docs/busplan/**',
  // Verbatim transcripts of simulated user sessions: a record of what was
  // said, not a claim the product makes.
  'docs/focus-group/**',
  // A dated audit states the roster it actually examined. Rewriting its
  // evidence to today's count would claim maestri were audited who did not
  // exist on the day the audit ran.
  'docs/compliance/BIAS-AUDIT-REPORT.md',
  // Point-in-time verification reports, dated in the filename. They record the
  // roster that was actually verified on that date.
  'docs/**/*-[0-9][0-9][0-9][0-9]-[0-9][0-9].md',
];

function main(): void {
  const fix = process.argv.includes('--fix');
  const files = globSync(TARGETS, { cwd: REPO_ROOT, ignore: IGNORED, absolute: true });
  const findings: Finding[] = [];
  let changed = 0;

  for (const abs of files) {
    const rel = relative(REPO_ROOT, resolve(abs));
    const original = readFileSync(abs, 'utf8');
    let updated: string;

    if (rel.endsWith('.json')) {
      const before = findings.length;
      const data = reconcileJson(JSON.parse(original), rel, '', findings);
      updated = findings.length === before ? original : `${JSON.stringify(data, null, 2)}\n`;
    } else {
      updated = reconcile(original, rel, '', findings);
    }

    if (updated !== original) {
      changed += 1;
      if (fix) writeFileSync(abs, updated);
    }
  }

  const label = `${ROSTER.maestri} maestri, ${ROSTER.coaches} coaches, ${ROSTER.buddies} buddies`;

  if (findings.length === 0) {
    console.log(`✅ roster counts consistent across ${files.length} files (${label})`);
    return;
  }

  for (const f of findings) {
    const where = f.jsonPath ? `${f.file} → ${f.jsonPath}` : f.file;
    console.log(`  ${where}\n     "${f.snippet}" should say ${f.expected}`);
  }

  if (fix) {
    console.log(`\n🔧 fixed ${findings.length} stale count(s) in ${changed} file(s) (${label})`);
    return;
  }

  console.error(
    `\n❌ ${findings.length} stale roster count(s) in ${changed} file(s).` +
      `\n   The roster is ${label}. Run \`npm run roster:sync\` to fix.`,
  );
  process.exit(1);
}

main();
