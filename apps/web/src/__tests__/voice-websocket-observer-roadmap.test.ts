import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('voice websocket observer roadmap', () => {
  it('documents feasibility and compliance plan for audit recording', () => {
    const root = process.cwd();
    const roadmapPath = path.join(root, 'docs/voice/websocket-observer-compliance-roadmap.md');

    expect(fs.existsSync(roadmapPath)).toBe(true);

    const roadmap = fs.readFileSync(roadmapPath, 'utf8');
    expect(roadmap).toContain('EU AI Act');
    expect(roadmap).toContain('WebRTC data channel');
    expect(roadmap).toContain('Not implemented');
  });
});
