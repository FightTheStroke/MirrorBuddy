import { waitUntil } from '@vercel/functions';
import { prometheusPushService } from './prometheus-push-service';

type KeepAlive = (promise: Promise<unknown>) => void;

/**
 * Push per-instance metrics after the current response, when due. The push is
 * handed to the request's waitUntil so the instance is not suspended with the
 * upload in flight (#1158).
 */
export function schedulePushAfterResponse(keepAlive: KeepAlive = waitUntil): void {
  const pending = prometheusPushService.pushIfDue();
  if (pending) keepAlive(pending);
}
