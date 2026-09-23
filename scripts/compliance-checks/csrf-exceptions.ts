import { createHash } from 'node:crypto';

interface CsrfException {
  method: 'POST' | 'PATCH';
  authority: string;
  sha256: string;
}

// Exact, reviewed routes only. A source change invalidates the exception and
// requires rechecking authority and its behavior tests, not refreshing hashes blindly.
// Cookie-independent is not synonymous with secure against every form of abuse.
export const CSRF_EXCEPTIONS: Record<string, CsrfException> = {
  '/api/devices/pair': {
    method: 'POST',
    authority: 'One-time robot pairing code passed to redeemPairingCode; no browser identity.',
    sha256: 'd613f28b58ffb6e0c6938c67420ed595db67deec64c468007fda174c0e953bc8',
  },
  '/api/coppa/verify': {
    method: 'POST',
    authority:
      'Email verification code authorizes approve/deny; authenticated GET is a separate method.',
    sha256: 'd301beb2dd6c879313e5af425b005008c91a935b3b361ff1dfbc1c9c11f49823',
  },
  '/api/email/preferences': {
    method: 'POST',
    authority: 'Unsubscribe token resolves the preference owner; cookies never select the user.',
    sha256: 'b78af07ebc7d9c38152d7f8b2bded2366f5dcd8e2dbb64f1ca88f055cd9c46d0',
  },
  '/api/contact': {
    method: 'POST',
    authority: 'Body supplies a new contact submission, not an existing cookie-owned resource.',
    sha256: '698ceb075dcba28431126e48027b8a5019e236439bb9633641fc8737b399ec7b',
  },
  '/api/trial/verify': {
    method: 'POST',
    authority:
      'Body sessionId plus email code selects verification; no ambient visitor/user lookup.',
    sha256: '47a8858e02545acc86b27567ab15628176d288e2e8885f659f1dc8bbf6811cd2',
  },
  '/api/search': {
    method: 'POST',
    authority:
      'Body query drives a rate-limited search with server credentials; no cookie-owned state.',
    sha256: '2b51e4d2ebd040a311022bd6b653b537e9f889f79bb8320b4882c2ee53fbc4c0',
  },
  '/api/homework/analyze': {
    method: 'POST',
    authority:
      'Body image drives rate-limited analysis; provider selection uses configuration, not cookies.',
    sha256: '7cc46b768c98dfbe127ece8e077aa79c7f00df4acb23eb3d18e217504f3a0900',
  },
  '/api/invites/request': {
    method: 'POST',
    authority:
      'Body selects the new invite; visitor cookie is funnel attribution only, never resource authorization.',
    sha256: '1049c5f1dddab09cbc1ebd597e516045b999702f185c966fbfaf23ff30af0a43',
  },
  '/api/debug/log': {
    method: 'POST',
    authority:
      'Development-only body log ingestion; production rejects before parsing and no cookie identity is used.',
    sha256: '245e71e0926fbf2f6cff2ab1354395cf9911f20c14031df4c6af87ab0f67b909',
  },
  '/api/waitlist/signup': {
    method: 'POST',
    authority: 'Body email and explicit consent create a new entry; no ambient account ownership.',
    sha256: '0685dbb6ff4754bdd4329e82c00d8df455f1f00c9aefee11b9aa54af1f0f88b2',
  },
  '/api/auth/login': {
    method: 'POST',
    authority:
      'Password verification authorizes session issuance; presented cookie is used only for rotation.',
    sha256: 'c07590ed17ae7f89e9cdbb9163fbf31e0fa550bfd8b3a1f0e13a4fe39b12fc2a',
  },
  '/api/auth/forgot-password': {
    method: 'POST',
    authority:
      'Body email initiates reset delivery; no account access is authorized by ambient cookies.',
    sha256: 'a8a769848b0a4350f72c92ff480caa1fdc360973dd99f83ce9c87f43eb1bead2',
  },
  '/api/auth/reset-password': {
    method: 'POST',
    authority:
      'Single-use password reset token authorizes the change, not an existing session cookie.',
    sha256: '5147270e8c962714786c884fb412e73bd3e61c39250ec4e7f2edebd270f5784e',
  },
  '/api/webhooks/resend': {
    method: 'POST',
    authority:
      'Verified Svix signature over raw body authorizes webhook events before any DB writes.',
    sha256: '6618dfdbd13c179ec18fb9b35a30d444c0eb952c4ad55940955803bf94ec3856',
  },
  '/api/webhooks/stripe': {
    method: 'POST',
    authority:
      'Stripe constructWebhookEvent verifies the raw body signature before dispatching mutations.',
    sha256: '97947646667a3a4cb59eab3e501adbf811f1cdc4d7b9322131ac96c987f42235',
  },
};

export function isReviewedCsrfException(
  route: string | null | undefined,
  method: string | null | undefined,
  source: string | null | undefined,
): boolean {
  if (!route || !method || !source) return false;
  const exception = CSRF_EXCEPTIONS[route];
  return (
    !!exception &&
    exception.method === method &&
    exception.sha256 === createHash('sha256').update(source).digest('hex')
  );
}
