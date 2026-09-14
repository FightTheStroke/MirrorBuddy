import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const repository = process.cwd();
const roots: string[] = [];

export function selectorFixture(files: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'mirrorbuddy-selection-'));
  roots.push(root);
  for (const name of ['scripts', 'bin', 'elsewhere']) mkdirSync(join(root, name));
  for (const script of ['smart-test.sh', 'test-affected.sh']) {
    copyFileSync(join(repository, 'scripts', script), join(root, 'scripts', script));
  }
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    if (!existsSync(join(root, file))) writeFileSync(join(root, file), '');
  }
  writeFileSync(join(root, 'changes'), files.length ? `${files.join('\0')}\0` : '');
  writeFileSync(
    join(root, 'bin/git'),
    `#!/usr/bin/env bash
if [[ "\${GIT_FAIL:-0}" != 0 ]]; then echo "git failure" >&2; exit 37; fi
case "$1" in
rev-parse) echo feature ;;
diff)
  if [[ " $* " == *" -z "* ]]; then cat "$CHANGES"; else tr '\\0' '\\n' < "$CHANGES"; fi
  ;;
ls-files) ;;
*) exit 2 ;;
esac
`,
    { mode: 0o755 },
  );
  const command = `#!/usr/bin/env bash
pwd > "$COMMAND_CWD"
printf '%s\\0' "$@" >> "$COMMAND_LOG"
printf '\\n' >> "$COMMAND_LOG"
if [[ "\${EMPTY_RELATED:-0}" == 1 && "$2" == related ]]; then
  for arg in "$@"; do
    if [[ "$arg" == --outputFile=* ]]; then
      printf '%s' '{"numTotalTestSuites":0,"numTotalTests":0,"numFailedTests":0,"numFailedTestSuites":0,"success":false,"testResults":[]}' > "\${arg#--outputFile=}"
    fi
  done
  echo 'No test files found, exiting with code 1'
  if [[ "\${RUNTIME_ERROR:-0}" == 1 ]]; then echo 'Unhandled Error: failed worker' >&2; fi
  exit "\${STUB_STATUS:-1}"
fi
exit "\${STUB_STATUS:-0}"
`;
  for (const binary of ['npm', 'npx'])
    writeFileSync(join(root, 'bin', binary), command, { mode: 0o755 });
  const env = {
    ...process.env,
    PATH: `${join(root, 'bin')}:${process.env.PATH}`,
    CHANGES: join(root, 'changes'),
    COMMAND_CWD: join(root, 'cwd'),
    COMMAND_LOG: join(root, 'commands'),
  };
  return {
    root,
    env,
    run(script: string, args: string[] = [], extra: Record<string, string> = {}) {
      return spawnSync('bash', [join(root, 'scripts', script), ...args], {
        cwd: join(root, 'elsewhere'),
        encoding: 'utf8',
        env: { ...env, ...extra },
      });
    },
    calls(): string[][] {
      const path = join(root, 'commands');
      return existsSync(path)
        ? readFileSync(path, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((line) => line.split('\0').filter(Boolean))
        : [];
    },
  };
}

export function cleanupSelectorFixtures() {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
}
