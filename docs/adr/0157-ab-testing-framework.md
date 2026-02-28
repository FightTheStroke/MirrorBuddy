# ADR 0157: A/B Testing Framework

**Status**: Accepted
**Date**: 2026-02-26
**Plan**: 224
**References**: F-09, F-10, F-11

## Context

MirrorBuddy needs a deterministic, low-overhead A/B testing framework for research and controlled rollout decisions. The framework must keep assignment stable across sessions, support runtime bucket reconfiguration from the database, attach experiment context to conversation data for analysis, and avoid repeated configuration reads.

## Decision

### 1. Bucketing Algorithm: FNV-1a (Deterministic)

- Use **FNV-1a 32-bit hashing** over a stable key (`experimentKey:userIdOrVisitorId`).
- Convert hash to a percentile bucket (`0-99`) and map to configured variant ranges.
- This provides deterministic bucketing (same identity + experiment => same assignment), fast runtime cost, and language/runtime portability.

### 2. Per-Bucket DB Configuration Model

- Store experiments in `ABExperiment` and bucket ranges in `ABBucketConfig`.
- Each bucket row includes:
  - `experimentId` (FK)
  - `bucketLabel` (for example `control`, `variantA`)
  - `startPercent` / `endPercent` (inclusive range)
  - optional rollout flags (`isEnabled`, `priority`, timestamps)
- Runtime assignment resolves experiment config from DB and matches the deterministic bucket index to a single bucket row.

### 3. Session Metadata Injection Point

- Inject `abExperimentId` and `abBucketLabel` at **conversation/session creation time**, before first model response is persisted.
- Persist these values on `Conversation` metadata fields so downstream analytics, benchmark reporting, and admin research dashboards can segment by experiment and bucket without re-computing assignment.

### 4. Cache Strategy

- Use in-process cache keyed by experiment slug/id for bucket configs.
- Recommended defaults:
  - TTL-based cache invalidation (short TTL for safe rollout updates)
  - explicit invalidation on admin update/publish actions
  - stale cache miss fallback to DB read
- Cache only configuration; do not cache user-specific assignment results beyond deterministic recomputation.

## Consequences

### Positive

- Stable deterministic bucketing across web sessions and retries.
- Dynamic rollout control through DB updates without redeploy.
- Reliable attribution of outcomes by persisted session metadata.
- Reduced DB read pressure through bounded config caching.

### Trade-offs

- FNV-1a is non-cryptographic (acceptable for distribution, not for security guarantees).
- Cache invalidation logic must stay aligned with admin experiment update flows.

## Implementation Complete

- CRUD admin UI is implemented for A/B experiment management (create, list, update, delete flows).
- Cache invalidation is explicit on admin mutation paths to avoid stale experiment/bucket configuration.
- Status transition guards are implemented on update/delete paths to prevent invalid lifecycle changes.
