/**
 * Test mock helpers for the MirrorBuddy monorepo.
 *
 * Context (W3 — #365): packages extracted into `@mirrorbuddy/X` can be consumed
 * either via the shim at `@/lib/X` (app code) or directly via `@mirrorbuddy/X`
 * (other workspace packages). When a test mocks one path, it does NOT
 * automatically intercept imports via the other path — module identities differ.
 *
 * For extractions that use a FORWARD shim (canonical impl in packages/X,
 * re-exported by src/lib/X), prefer `mockPackageAndLib` to dual-register.
 *
 * For extractions that adopt the REVERSED shim pattern recommended in
 * CONTRIBUTING-MONOREPO.md §Test-arch, a single `vi.mock('@/lib/X', …)` in the
 * test is sufficient — no helper needed.
 */
import { vi } from 'vitest';

type MockFactory = () => Record<string, unknown> | Promise<Record<string, unknown>>;

/**
 * Register `vi.mock` for both the app-path shim and the package entry, sharing
 * one factory so test expectations can assert against a single mock surface.
 *
 * Usage:
 *   mockPackageAndLib('@/lib/logger', '@mirrorbuddy/logger', () => ({
 *     logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
 *   }));
 *
 * MUST be called at module top-level BEFORE `import` statements of the code
 * under test (vitest hoists `vi.mock` calls).
 */
export function mockPackageAndLib(libPath: string, pkgPath: string, factory: MockFactory): void {
  vi.mock(libPath, factory);
  vi.mock(pkgPath, factory);
}
