import fs from 'fs';
import os from 'os';
import path from 'path';
import { test, expect } from 'vitest';

const ciKnowledgePath = path.join(
  os.homedir(),
  '.claude',
  'data',
  'ci-knowledge',
  'mirrorbuddy.md',
);

test.skipIf(!fs.existsSync(ciKnowledgePath))(
  'mirrorbuddy ci knowledge file exists with sufficient content',
  () => {
    const content = fs.readFileSync(ciKnowledgePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    expect(lines.length).toBeGreaterThanOrEqual(20);
  },
);
