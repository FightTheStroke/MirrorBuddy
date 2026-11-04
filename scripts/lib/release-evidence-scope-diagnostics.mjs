/* eslint-disable security/detect-non-literal-fs-filename -- Fixed files in a validated private directory; contents never published. */
import { closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

// Public classes: 0=unknown, 1=heap/worker OOM, 2=worker/IPC failure,
// 3=module resolution, 4=config/setup, 5=syntax/transform, 6=collection,
// 7=permission, 8=missing environment. Only these numeric IDs are returned.
export function classifyScopeFailure(text, root, tracked = []) {
  const patterns = [
    /heap out of memory|Reached heap limit|ERR_WORKER_OUT_OF_MEMORY|exceeded memory limit/i,
    /Worker exited unexpectedly|Worker terminated|ERR_IPC_CHANNEL_CLOSED|Channel closed/i,
    /ERR_MODULE_NOT_FOUND|Cannot find module|Cannot find package|Failed to resolve import|Failed to load url|ERR_PACKAGE_PATH_NOT_EXPORTED/i,
    /failed to load config|error[^\n]*setupFiles|failed[^\n]*setup file/i,
    /Transform failed|SyntaxError|Parse failure|Unexpected token/i,
    /No test suite found|Test suite failed to run|unhandled errors during test collection|Collect Error/i,
    /EACCES|EPERM|permission denied/i,
    /Missing required environment variable|Environment variable not found/i,
  ];
  const category = patterns.findIndex((pattern) => pattern.test(text)) + 1;
  const files = [...new Set(tracked)]
    .filter(
      (file) =>
        /^(?:apps\/web\/src\/|scripts\/__tests__\/|apps\/web\/scripts\/__tests__\/)/.test(file) &&
        /\.(?:test\.tsx?|spec\.ts)$/.test(file),
    )
    .sort();
  const matches = files.flatMap((file, index) => {
    const candidates = [join(root, file), file];
    if (file.startsWith('apps/web/')) candidates.push(file.slice('apps/web/'.length));
    const found = candidates.some((candidate) => {
      let offset = text.indexOf(candidate);
      while (offset !== -1) {
        const before = text[offset - 1] ?? '';
        const after = text[offset + candidate.length] ?? '';
        if ((!before || !/[A-Za-z0-9_./-]/.test(before)) && (!after || /[\s:\"\x27)]/.test(after)))
          return true;
        offset = text.indexOf(candidate, offset + 1);
      }
      return false;
    });
    return found ? [index + 1] : [];
  });
  return { category, file: matches.length === 1 ? matches[0] : 0, related: matches.slice(0, 8) };
}

export function openScopeCapture(directory, kindId, stage) {
  if (realpathSync(directory) !== resolve(directory) || lstatSync(directory).mode & 0o077)
    throw new Error('Private scope capture directory required');
  const paths = ['stdout', 'stderr'].map((stream) =>
    join(directory, `scope-${kindId}-${stage}.${stream}.log`),
  );
  const descriptors = [];
  try {
    for (const path of paths) descriptors.push(openSync(path, 'wx', 0o600));
  } catch (error) {
    for (const descriptor of descriptors) closeSync(descriptor);
    throw error;
  }
  return {
    paths,
    descriptors,
    close() {
      for (const descriptor of descriptors) closeSync(descriptor);
    },
  };
}

function boundedText(path) {
  const descriptor = openSync(path, 'r');
  try {
    const size = fstatSync(descriptor).size;
    const limit = 512 * 1024;
    const read = (offset, length) => {
      const buffer = Buffer.alloc(length);
      return buffer.subarray(0, readSync(descriptor, buffer, 0, length, offset)).toString('utf8');
    };
    const first = read(0, Math.min(size, limit));
    return size > limit
      ? first + '\n' + read(Math.max(limit, size - limit), Math.min(limit, size - limit))
      : first;
  } finally {
    closeSync(descriptor);
  }
}

export function summarizeScopeCapture(capture, root) {
  try {
    const text = capture.paths.map(boundedText).join('\n');
    let tracked = [];
    try {
      tracked = execFileSync(
        'git',
        [
          '-C',
          root,
          'ls-files',
          '-z',
          '--',
          'apps/web/src',
          'scripts/__tests__',
          'apps/web/scripts/__tests__',
        ],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 5000,
          maxBuffer: 8 * 1024 * 1024,
        },
      ).split('\0');
    } catch {
      /* No trustworthy public index: report zero, never a path. */
    }
    return classifyScopeFailure(text, root, tracked);
  } catch {
    return { category: 0, file: 0, related: [] };
  }
}
