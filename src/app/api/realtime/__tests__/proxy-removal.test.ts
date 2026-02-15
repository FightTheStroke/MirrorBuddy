import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('realtime proxy cleanup', () => {
  it('removes deprecated WebSocket proxy directory and API imports', () => {
    const root = process.cwd();
    const proxyDir = path.join(root, 'src/server/realtime-proxy');
    const startRoute = fs.readFileSync(
      path.join(root, 'src/app/api/realtime/start/route.ts'),
      'utf8',
    );
    const statusRoute = fs.readFileSync(
      path.join(root, 'src/app/api/realtime/status/route.ts'),
      'utf8',
    );

    expect(fs.existsSync(proxyDir)).toBe(false);
    expect(startRoute).not.toContain('server/realtime-proxy');
    expect(statusRoute).not.toContain('server/realtime-proxy');
  });
});
