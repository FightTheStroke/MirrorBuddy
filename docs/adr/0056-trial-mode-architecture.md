# ADR-0056: Trial Mode Architecture

**Status**: Accepted
**Date**: 18 January 2026
**Author**: ISE Team

## Context

MirrorBuddy requires a trial mode to validate market demand and demonstrate value to potential users. Trial users have limited access to resources while maintaining the full feature breadth to evaluate product fit. We must prevent abuse (multiple accounts, repeated trials via cookie clearing) while controlling infrastructure costs through a global monthly budget cap.

## Decision

We implement trial mode with the following architecture:

### Session Tracking

- Combine IP hash + visitor cookie (stored in localStorage, never transmitted to server)
- Server validates IP hash matches on each request
- Cookie persists across sessions; clearing requires IP change
- Prevents cookie-clearing bypass

### Trial Limits (Per Session)

- Chat messages: 10
- Documents: 1
- Maestri (AI agents): 3
- Coach sessions: 1
- Tools: whitelist only (no expensive integrations)

### Global Budget Cap

- Redis-backed €100/month limit (hard cap, not per-user)
- Track cumulative cost across all trials
- When exceeded, all new trials rejected with clear messaging
- Resets on calendar month boundary

### Anti-Abuse Scoring

- Points for suspicious behavior: IP changes (5), rapid requests (3), document deletion/recreation (2)
- Score threshold: ≥15 points → session blocked (24-hour cooldown)
- Transparent to users (score displayed in debug panel)

### Privacy & Compliance

- GDPR consent required before trial activation
- Privacy policy explicitly states trial data retention: 30 days
- No cross-device tracking
- IP hash uses sha256(IP + salt), salt rotated monthly

## Consequences

**Benefits**:

- Simple, auditable anti-abuse without user friction
- Cost predictable and bounded
- Privacy-first approach (no device fingerprinting)
- Prevents most attack vectors (cookie clearing, multi-account)

**Tradeoffs**:

- VPN/proxy users may be unfairly blocked (shared IP)
- Legitimate users on same IP compete for limits (office networks)
- Global budget cap may deny trial access during peak usage

**Mitigation**:

- Allow manual appeal via support (verify email domain)
- Dashboard shows remaining budget; notify at 70%, 90% thresholds
- Score transparency enables user understanding of blocks
