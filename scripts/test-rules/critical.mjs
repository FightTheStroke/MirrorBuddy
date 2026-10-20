// Critical-path declaration (roberdan-os docs/testing-template.md section 2).
// usage: node scripts/test-rules/critical.mjs [base]   (default origin/main)
// Prints `critical=true|false`, then one `match: <file> <- <glob>  # <reason>` line per hit.
// With no .test-critical or no resolvable base the answer is true: no declaration means the whole repo is critical.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      source += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (char === '*') source += '[^/]*';
    else source += char.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

export function parseCritical(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [glob, ...reason] = line.split(/\s+#\s+/);
      return { glob: glob.trim(), reason: reason.join(' # '), pattern: globToRegExp(glob.trim()) };
    });
}

export function criticalMatches(entries, files) {
  return files.flatMap((file) =>
    entries.filter((entry) => entry.pattern.test(file)).map((entry) => ({ file, entry })),
  );
}

function changedFiles(base) {
  const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRD', `${base}...HEAD`], {
    encoding: 'utf8',
  });
  return out.split('\n').filter(Boolean);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const base = process.argv[2] ?? 'origin/main';
  if (!existsSync('.test-critical')) {
    console.log('critical=true');
    console.log('match: no .test-critical declared, the whole repo is critical');
    process.exit(0);
  }
  let files;
  try {
    files = changedFiles(base);
  } catch {
    console.log('critical=true');
    console.log(`match: cannot diff against ${base}, treating the push as critical`);
    process.exit(0);
  }
  const hits = criticalMatches(parseCritical(readFileSync('.test-critical', 'utf8')), files);
  console.log(`critical=${hits.length > 0}`);
  for (const { file, entry } of hits) console.log(`match: ${file} <- ${entry.glob}  # ${entry.reason}`);
}
