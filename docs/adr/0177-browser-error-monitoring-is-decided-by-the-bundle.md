# ADR 0177 — Browser error monitoring is decided by the bundle, not by the environment

- **Status**: ACCEPTED
- **Date**: 2026-08-30
- **Supersedes**: nothing
- **Related**: ADR 0175 (env vars on Vercel), ADR 0176 (notification recipients)

## Context

The live site had been reporting **no browser errors at all** for months. The
console on <https://www.mirrorbuddy.org> printed:

```
[Sentry Client] enabled=false env=production
```

The client bootstrap decided whether to report by reading
`NEXT_PUBLIC_VERCEL_ENV`. That variable was set on the Vercel **production**
environment — but production is not built there. We ship by **promoting a build
made in the preview environment**, where the variable was absent.

`NEXT_PUBLIC_*` values are inlined at **build** time. So the bundle that reaches
production was compiled with `NEXT_PUBLIC_VERCEL_ENV` undefined, and carried
`enabled=false` baked into it. Setting the variable on the production
environment could never have changed the shipped bundle.

Worse, the unit suite asserted the broken behaviour
(`calls init with enabled=false when not on Vercel`), so the defect was green.

This is the same class of failure as ADR 0175: a runtime signal was being used to
decide something that had already been frozen earlier in the pipeline.

## Decision

Client-side error monitoring activates on properties of the **bundle itself**,
never on a deployment-environment variable:

1. a DSN must be present (`NEXT_PUBLIC_SENTRY_DSN`), and
2. the force flag wins if set (`NEXT_PUBLIC_SENTRY_FORCE_ENABLE`), otherwise
3. `NODE_ENV === 'production'` — i.e. this is a production build — and
4. the page is **not** being served from `localhost` / `127.0.0.1` / `[::1]`.

Rule 4 is the only runtime check, and it exists solely so that a developer
running `next build && next start` on their own machine does not pollute the
live project. It is a browser check (`window.location.hostname`) and therefore
cannot be affected by any environment configuration.

Server and edge runtimes are unchanged: they still key off `process.env.VERCEL`,
which is a genuine runtime value there and is not inlined at build time.

Consequence: **no environment setting can silently switch browser error
monitoring off again.** Turning it off now requires removing the DSN from the
build or shipping a non-production build.

## Consequences

- Preview deployments now report too. That is deliberate — a preview is a
  production build of the app, and errors there are worth seeing. They are
  distinguishable by release SHA and by `environment`.
- `npm run build && npm start` locally stays quiet, verified by test.
- The three test files that encoded the old rule were rewritten to the new
  contract rather than deleted, so the regression is guarded:
  - `apps/web/src/lib/sentry/env.test.ts`
  - `apps/web/src/lib/__tests__/sentry-config.test.ts`
  - `apps/web/src/__tests__/sentry-client-bootstrap.test.ts`

## Verification

After the release reaches production, the browser console on the live site must
print `[Sentry Client] enabled=true`. That single line is the acceptance check;
if it ever reads `false` again in production, this decision has been broken.

## Notes

The general lesson, now hit twice: **anything inlined at build time must be
decided at build time.** If a value is `NEXT_PUBLIC_*`, setting it on the
environment that _serves_ the app is meaningless when that app was compiled
elsewhere and promoted.
