/**
 * @vitest-environment node
 *
 * The reachability guard exists because 273 production files were built and never
 * wired to anything: mirrored filenames meant "the same edit landed twice and only
 * counted once". These tests describe the guard's contract:
 *
 *   1. A newly-added unreachable production file FAILS the check.
 *   2. Wiring it in (knip no longer reports it) PASSES.
 *   3. Deleting it (knip no longer reports it) PASSES.
 *   4. Declaring it in the manifest PASSES.
 *   5. Editing a file already on the baseline that is still unreachable FAILS
 *      (the exact bug that created the mess).
 *   6. The baseline must shrink, never silently grow: entries that are no longer
 *      unreachable are surfaced for removal.
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeReachability,
  loadManifestFiles,
  type ManifestEntry,
  type ReachabilityInput,
} from '../reachability/core';

const BASELINE = ['apps/web/src/old/dead-a.ts', 'apps/web/src/old/dead-b.ts'];

function input(overrides: Partial<ReachabilityInput> = {}): ReachabilityInput {
  return {
    unreachable: [...BASELINE],
    baseline: [...BASELINE],
    declared: [],
    changedFiles: [],
    editModeFail: true,
    ...overrides,
  };
}

describe('analyzeReachability', () => {
  it('passes when the current unreachable set equals the baseline', () => {
    const r = analyzeReachability(input());
    expect(r.ok).toBe(true);
    expect(r.errorCount).toBe(0);
    expect(r.newlyUnreachable).toEqual([]);
  });

  it('FAILS on a newly-added unreachable production file', () => {
    const fresh = 'apps/web/src/feature/never-wired.tsx';
    const r = analyzeReachability(input({ unreachable: [...BASELINE, fresh] }));
    expect(r.ok).toBe(false);
    expect(r.newlyUnreachable).toContain(fresh);
    expect(r.errorCount).toBeGreaterThan(0);
  });

  it('PASSES once the new file is wired in (knip stops reporting it)', () => {
    // "wired in" == the analyser no longer lists it as unreachable.
    const r = analyzeReachability(input({ unreachable: [...BASELINE] }));
    expect(r.ok).toBe(true);
  });

  it('PASSES once the new file is deleted (absent from unreachable and baseline)', () => {
    const r = analyzeReachability(input({ unreachable: [...BASELINE], baseline: [...BASELINE] }));
    expect(r.ok).toBe(true);
  });

  it('PASSES once the new file is declared in the manifest', () => {
    const fresh = 'apps/web/src/feature/dynamic-entry.ts';
    const r = analyzeReachability(input({ unreachable: [...BASELINE, fresh], declared: [fresh] }));
    expect(r.ok).toBe(true);
    expect(r.newlyUnreachable).not.toContain(fresh);
  });

  it('FAILS when a baseline file is edited and is still unreachable', () => {
    const edited = BASELINE[0];
    const r = analyzeReachability(input({ changedFiles: [edited] }));
    expect(r.ok).toBe(false);
    expect(r.editedStillUnreachable).toContain(edited);
  });

  it('downgrades the edited-still-unreachable case to a warning when configured', () => {
    const edited = BASELINE[0];
    const r = analyzeReachability(input({ changedFiles: [edited], editModeFail: false }));
    expect(r.editedStillUnreachable).toContain(edited);
    expect(r.ok).toBe(true);
    expect(r.warningCount).toBeGreaterThan(0);
  });

  it('does not fail on an edited baseline file that has become reachable', () => {
    const edited = BASELINE[0];
    // edited AND no longer unreachable -> the developer fixed it.
    const r = analyzeReachability(input({ unreachable: [BASELINE[1]], changedFiles: [edited] }));
    expect(r.editedStillUnreachable).not.toContain(edited);
    expect(r.ok).toBe(true);
  });

  it('surfaces stale baseline entries so the baseline can shrink', () => {
    // dead-b.ts is now reachable -> should be proposed for removal from baseline.
    const r = analyzeReachability(input({ unreachable: [BASELINE[0]] }));
    expect(r.staleBaseline).toContain(BASELINE[1]);
  });

  it('treats a declared-but-reachable manifest entry as redundant, not an error', () => {
    const r = analyzeReachability(
      input({ unreachable: [...BASELINE], declared: ['apps/web/src/live/thing.ts'] }),
    );
    expect(r.redundantDeclared).toContain('apps/web/src/live/thing.ts');
    expect(r.ok).toBe(true);
  });
});

describe('loadManifestFiles', () => {
  const valid: ManifestEntry[] = [
    {
      file: 'apps/web/src/a.ts',
      consumer: 'instrumentation.ts dynamic import',
      reason: 'loaded at boot',
    },
  ];

  it('returns the declared file paths when every entry names a consumer and reason', () => {
    expect(loadManifestFiles(valid)).toEqual(['apps/web/src/a.ts']);
  });

  it('rejects an entry missing its non-static consumer', () => {
    const bad = [{ file: 'apps/web/src/a.ts', consumer: '', reason: 'x' }] as ManifestEntry[];
    expect(() => loadManifestFiles(bad)).toThrow();
  });

  it('rejects an entry missing its reason', () => {
    const bad = [{ file: 'apps/web/src/a.ts', consumer: 'x', reason: '' }] as ManifestEntry[];
    expect(() => loadManifestFiles(bad)).toThrow();
  });
});
