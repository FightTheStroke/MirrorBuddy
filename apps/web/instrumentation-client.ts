import * as Sentry from '@sentry/nextjs';
import './sentry.client.config';

// Required by @sentry/nextjs to instrument navigations (Next.js App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
