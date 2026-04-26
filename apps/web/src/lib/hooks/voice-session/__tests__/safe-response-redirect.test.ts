import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('voice safe response redirect', () => {
  it('defines safeResponse redirect flow with response.cancel in use-voice-session', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/hooks/voice-session/use-voice-session.ts'),
      'utf8',
    );

    expect(source).toContain('safeResponse');
    expect(source).toContain('response.cancel');
  });
});
