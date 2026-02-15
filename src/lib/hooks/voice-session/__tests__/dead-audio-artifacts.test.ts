import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dead voice audio artifacts', () => {
  it('removes unused queue playback modules from WebRTC flow', () => {
    const root = process.cwd();
    const removedFiles = [
      'src/lib/hooks/voice-session/audio-playback.ts',
      'src/lib/hooks/voice-session/audio-playback-types.ts',
      'src/lib/hooks/voice-session/ring-buffer.ts',
    ];

    for (const relativeFile of removedFiles) {
      expect(fs.existsSync(path.join(root, relativeFile))).toBe(false);
    }
  });
});
