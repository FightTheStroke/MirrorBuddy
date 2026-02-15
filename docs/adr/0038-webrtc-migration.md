# ADR 0038: WebRTC Migration to GA Realtime Protocol

## Status

Accepted

## Decision

MirrorBuddy migrates voice transport to the GA realtime protocol and keeps preview compatibility behind feature flags for rollback.

## Consequences

- GA endpoint and auth flow are the default for production.
- Preview guidance is removed from primary runbooks and retained only in rollback notes.
