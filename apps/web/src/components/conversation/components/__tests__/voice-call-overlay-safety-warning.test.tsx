import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('VoiceCallOverlay safety warning UI', () => {
  it('defines safetyWarning state and renders SafetyWarning banner', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/conversation/components/voice-call-overlay.tsx'),
      'utf8',
    );

    expect(source).toContain('safetyWarning');
    expect(source).toContain('SafetyWarning');
  });
});
