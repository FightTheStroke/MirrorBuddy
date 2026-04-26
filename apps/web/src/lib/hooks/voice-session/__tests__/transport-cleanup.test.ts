import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('voice transport cleanup', () => {
  it('keeps use-voice-session and connection on WebRTC-only wording', () => {
    const root = process.cwd();
    const useVoiceSessionPath = path.join(root, 'src/lib/hooks/voice-session/use-voice-session.ts');
    const connectionPath = path.join(root, 'src/lib/hooks/voice-session/connection.ts');

    const useVoiceSessionSource = fs.readFileSync(useVoiceSessionPath, 'utf8');
    const connectionSource = fs.readFileSync(connectionPath, 'utf8');

    expect(useVoiceSessionSource).not.toContain('WebSocket');
    expect(connectionSource).not.toContain('VOICE_TRANSPORT');
    expect(connectionSource).not.toContain('kept as fallback');
  });
});
