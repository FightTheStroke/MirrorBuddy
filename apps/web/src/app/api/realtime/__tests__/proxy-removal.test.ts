import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The WebSocket realtime proxy is gone. This file is what stops it coming back.
 *
 * The previous version of this test asserted that a directory
 * `src/server/realtime-proxy` did not exist. It never did: the proxy lived in
 * `src/server/realtime-proxy-provider.ts` and `-types.ts`, as SIBLING files.
 * So the test passed while the thing it claimed to have removed was still on
 * disk, and `/api/realtime/token` still offered `transport: 'websocket'`
 * pointing a child's browser at a `proxyPort` nothing listened on.
 *
 * A test that names the wrong path is worse than no test: it is a green tick
 * answering a question nobody asked.
 */
describe('realtime proxy cleanup', () => {
  // apps/web/src/app/api/realtime/__tests__ → apps/web
  const root = path.resolve(__dirname, '../../../../..');

  it('leaves no proxy module on disk, under any of its names', () => {
    const serverDir = path.join(root, 'src/server');
    const survivors = fs.existsSync(serverDir)
      ? fs.readdirSync(serverDir).filter((name) => name.includes('realtime-proxy'))
      : [];

    expect(survivors).toEqual([]);
    expect(fs.existsSync(path.join(root, 'src/server/realtime-proxy'))).toBe(false);
  });

  it('leaves no import of it anywhere in the app', () => {
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.next') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        if (full.endsWith('proxy-removal.test.ts')) continue;
        if (fs.readFileSync(full, 'utf8').includes('realtime-proxy')) {
          offenders.push(path.relative(root, full));
        }
      }
    };
    walk(path.join(root, 'src'));

    expect(offenders).toEqual([]);
  });

  it('offers exactly one transport, and never a port', () => {
    const tokenRoute = fs.readFileSync(
      path.join(root, 'src/app/api/realtime/token/route.ts'),
      'utf8',
    );

    expect(tokenRoute).not.toContain('WS_PROXY_PORT');
    expect(tokenRoute).not.toContain('proxyPort');
    // The env switch is gone: an operator cannot ask for a transport that does
    // not exist and be answered with a 200 describing it.
    expect(tokenRoute).not.toContain('VOICE_TRANSPORT');
  });

  it('leaves no client still waiting for a proxy port', () => {
    for (const relative of [
      'src/app/[locale]/welcome/types.ts',
      'src/app/welcome/types.ts',
      'src/app/[locale]/welcome/hooks/use-voice-connection.ts',
      'src/app/welcome/hooks/use-voice-connection.ts',
    ]) {
      expect(fs.readFileSync(path.join(root, relative), 'utf8')).not.toContain('proxyPort');
    }
  });
});
