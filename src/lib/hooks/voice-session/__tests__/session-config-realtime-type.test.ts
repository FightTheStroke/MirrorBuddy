import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('session config realtime type', () => {
  it('includes session.type=\"realtime\" in session.update payload', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/hooks/voice-session/session-config.ts'),
      'utf8',
    );

    expect(source).toContain('type: "realtime"');
  });
});
