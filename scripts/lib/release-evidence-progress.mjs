/* eslint-disable security/detect-non-literal-fs-filename -- Only fixed logs inside the validated private evidence directory are read. */
import { execFileSync } from 'node:child_process';
import { closeSync, fstatSync, openSync, readSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { artifact, evidenceDirectory, root } from './release-evidence-store.mjs';

export function browserProgress(text, tracked) {
  const files = [...new Set(tracked)].filter((file) => file.startsWith('apps/web/e2e/')).sort();
  const clean = String(text ?? '').replace(/\u001b\[[0-9;]*m/g, '');
  const events = [
    ...clean.matchAll(
      /^\s*[\u2713\u2718\u00d7-]\s+(\d+)\s+\[[^\]\r\n]+\]\s+\u203a\s+([^\r\n]+?\.spec\.[jt]sx?):(\d+):\d+\s+\u203a/gm,
    ),
  ];
  const last = events.at(-1);
  if (!last) return { completed: 0, file: 0, line: 0 };
  const completed = Number(last[1]);
  const line = Number(last[3]);
  const path = last[2].replace(/^(?:apps\/web\/)?e2e\//, '');
  const file = files.indexOf(`apps/web/e2e/${path}`) + 1;
  return {
    completed: Number.isSafeInteger(completed) ? completed : 0,
    file,
    line: file && Number.isSafeInteger(line) ? line : 0,
  };
}

function progress(input) {
  try {
    statSync(input);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    console.log('__NATIVE_PROGRESS__ kind=0 bytes=0 completed=0 file=0 line=0');
    return;
  }
  const directory = evidenceDirectory(input);
  const phases = ['policy', 'pre-release', 'e2e', 'unit', 'audit'];
  let latest;
  for (const [index, phase] of phases.entries()) {
    const file = artifact(directory, `${phase}.log`);
    try {
      const stat = statSync(file);
      if (!latest || stat.mtimeMs > latest.modified)
        latest = { file, kind: index + 1, modified: stat.mtimeMs };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  let bytes = 0;
  let position = { completed: 0, file: 0, line: 0 };
  if (latest) {
    const descriptor = openSync(latest.file, 'r');
    try {
      bytes = fstatSync(descriptor).size;
      if (latest.kind === 3) {
        const buffer = Buffer.alloc(Math.min(bytes, 128 * 1024));
        const length = readSync(descriptor, buffer, 0, buffer.length, bytes - buffer.length);
        const tracked = execFileSync('git', ['ls-files', '-z', '--', 'apps/web/e2e'], {
          cwd: root,
          encoding: 'utf8',
          timeout: 5000,
          maxBuffer: 8 * 1024 * 1024,
        }).split('\0');
        position = browserProgress(buffer.subarray(0, length).toString('utf8'), tracked);
      }
    } finally {
      closeSync(descriptor);
    }
  }
  console.log(
    `__NATIVE_PROGRESS__ kind=${latest?.kind ?? 0} bytes=${bytes} completed=${position.completed} file=${position.file} line=${position.line}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3 || !process.argv[2])
      throw new Error('Evidence directory required');
    progress(process.argv[2]);
  } catch {
    console.error('Native progress diagnostics unavailable; raw logs remain private.');
    process.exitCode = 1;
  }
}
