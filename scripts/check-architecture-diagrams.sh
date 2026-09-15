#!/bin/bash
# Read-only structural audit. Human review establishes diagram/implementation truth.
set -euo pipefail
cd "$(dirname "$0")/.."

node <<'NODE'
const { readFileSync, readdirSync } = require('node:fs');
let failures = 0;
const fail = (message) => { console.error(`FAIL: ${message}`); failures++; };
const pass = (message) => console.log(`PASS: ${message}`);
function read(file) {
  try { return readFileSync(file, 'utf8'); }
  catch { throw new Error(`Required architecture input missing or unreadable: ${file}`); }
}
function check(condition, message) {
  if (condition) pass(message);
  else fail(message);
}
try {
  const file = 'ARCHITECTURE-DIAGRAMS.md';
  const document = read(file);
  const version = read('VERSION').trim();
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) {
    throw new Error('VERSION must contain a release version; contents withheld');
  }
  const headers = [...document.matchAll(/^\*\*Version\*\*:[ \t]*(.+)$/gm)];
  const footers = [...document.matchAll(/^_Version:[ \t]*(.+)_$/gm)];
  check(headers.length === 1 && footers.length === 1 &&
    headers[0][1].trim() === version && footers[0][1].trim() === version,
    `Architecture header/footer must match VERSION (${version})`);

  for (let section = 1; section <= 29; section++) {
    check(new RegExp(`^## ${section}\\. .+`, 'm').test(document), `Section ${section} present`);
  }
  const compliance = document.match(/^## 19\. Compliance[\s\S]*?(?=^## 20\.)/m)?.[0] ?? '';
  for (let section = 1; section <= 21; section++) {
    check(new RegExp(`^### 19\\.${section} .+`, 'm').test(compliance),
      `Compliance subsection 19.${section} present`);
  }

  let fence = null;
  let diagrams = 0;
  let complianceDiagrams = 0;
  let inCompliance = false;
  for (const line of document.split(/\r?\n/)) {
    if (/^## 19\. /.test(line)) inCompliance = true;
    else if (/^## \d+\. /.test(line)) inCompliance = false;
    if (!line.startsWith('```')) continue;
    if (fence === null) {
      fence = line.trim();
      if (fence === '```mermaid') {
        diagrams++;
        if (inCompliance) complianceDiagrams++;
      } else if (fence.startsWith('```mermaid')) fail('Malformed Mermaid opening fence');
    } else if (line.trim() === '```') {
      fence = null;
    } else {
      fail('Code block opened before the previous closing fence');
    }
  }
  check(fence === null, 'All code fences closed');
  check(diagrams >= 40, `${diagrams} Mermaid diagrams (minimum 40)`);
  check(complianceDiagrams >= 21, `${complianceDiagrams} compliance diagrams (minimum 21)`);

  let adrFiles;
  try { adrFiles = readdirSync('docs/adr').filter((name) => /^\d{4}-.+\.md$/.test(name)); }
  catch { throw new Error('ADR directory missing or unreadable: docs/adr'); }
  check(adrFiles.length > 0, 'ADR directory contains decision records');
  const numbers = new Set();
  for (const name of adrFiles.sort()) {
    const number = name.slice(0, 4);
    read(`docs/adr/${name}`);
    if (numbers.has(number)) fail(`Duplicate ADR number ${number}`);
    numbers.add(number);
    check(new RegExp(`\\bADR[ -]?${number}(?!\\d)`).test(document),
      `ADR ${number} referenced (${name})`);
  }
  console.log(`ARCHITECTURE DIAGRAMS: ${failures ? 'FAIL' : 'PASS'} (${failures} issues)`);
  console.log('Read-only check: review relevant diagrams and ADR rationale manually; no automatic coverage insertion.');
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Architecture audit failed');
  process.exitCode = 1;
}
NODE
