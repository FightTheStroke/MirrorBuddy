// @mirrorbuddy/tier — reversed-shim entry.
// Canonical implementation lives at src/lib/tier during W3 migration (see
// CONTRIBUTING-MONOREPO.md §Test-arch). Tests mocking @/lib/tier paths
// propagate transparently to consumers of @mirrorbuddy/tier because both
// resolve to the same module identity at src/lib/tier.
export * from '../../../apps/web/src/lib/tier';
