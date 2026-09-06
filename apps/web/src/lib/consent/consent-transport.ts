import { csrfFetch } from '@/lib/auth';
import {
  cookieAcknowledgementSchema,
  termsAcknowledgementSchema,
  type ConsentDecision,
  type ConsentPurpose,
  type ConsentIdentity,
} from './unified-consent';
import {
  ConsentSyncError,
  confirmAnalyticsPermission,
  confirmConsent,
  currentRevision,
  getConsentIdentity,
  failConsent,
} from './consent-sync-state';

export interface ConsentIntent {
  purpose: ConsentPurpose;
  decision: ConsentDecision;
  revision: number;
  identity: ConsentIdentity;
}
let queue: Promise<void> = Promise.resolve();

async function sendIntent(intent: ConsentIntent): Promise<void> {
  const { purpose, decision, revision } = intent;
  if (typeof decision.accepted !== 'boolean') throw new ConsentSyncError('invalid-intent');
  if (currentRevision(purpose) !== revision) throw new ConsentSyncError('superseded');
  if (intent.identity !== getConsentIdentity()) throw new ConsentSyncError('superseded');
  if (purpose === 'terms' && (intent.identity.account === null || decision.accepted === false)) {
    confirmConsent(purpose, decision, revision, 'local');
    return;
  }
  const account = intent.identity.account !== null;
  let response: Response;
  try {
    response = await csrfFetch(purpose === 'terms' ? '/api/tos' : '/api/user/consent', {
      method: 'POST',
      body: JSON.stringify(
        purpose === 'terms'
          ? { version: decision.version }
          : {
              version: decision.version,
              acceptedAt: decision.acceptedAt,
              essential: true,
              analytics: decision.accepted,
              marketing: false,
            },
      ),
    });
  } catch {
    throw new ConsentSyncError('network');
  }
  if (!response.ok) throw new ConsentSyncError('http', response.status);
  if (intent.identity !== getConsentIdentity()) throw new ConsentSyncError('superseded');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ConsentSyncError('invalid-response');
  }
  if (intent.identity !== getConsentIdentity()) throw new ConsentSyncError('superseded');
  if (purpose === 'terms') {
    const parsed = termsAcknowledgementSchema.safeParse(body);
    if (!parsed.success || parsed.data.version !== decision.version) {
      throw new ConsentSyncError('invalid-response');
    }
    confirmConsent(purpose, decision, revision, 'persisted', parsed.data.acceptedAt);
  } else {
    const parsed = cookieAcknowledgementSchema.safeParse(body);
    if (
      !parsed.success ||
      parsed.data.consent.analytics !== decision.accepted ||
      parsed.data.consent.version !== decision.version ||
      parsed.data.consent.acceptedAt !== decision.acceptedAt ||
      (account && !parsed.data.persisted)
    ) {
      throw new ConsentSyncError('invalid-response');
    }
    confirmAnalyticsPermission(intent.identity, parsed.data.analyticsAllowed);
    confirmConsent(purpose, decision, revision, parsed.data.persisted ? 'persisted' : 'received');
  }
}

/** Serialize writes so an older acceptance cannot overwrite a later refusal on the server. */
export function deliverConsent(intent: ConsentIntent): Promise<void> {
  const run = async () => {
    try {
      await sendIntent(intent);
    } catch (error) {
      const failure = error instanceof ConsentSyncError ? error : new ConsentSyncError('network');
      if (currentRevision(intent.purpose) === intent.revision && failure.code !== 'superseded')
        failConsent(failure, intent.purpose);
      throw failure;
    }
  };
  const operation = queue.then(run, run);
  queue = operation;
  return operation;
}
