import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import { extractUserIdWithCoppaCheck } from '@/app/api/chat/auth-handler';
import { checkAndIncrementTrialToolUsage } from '@/app/api/chat/trial-handler';
import { getActiveProvider } from '@/lib/ai/server';
import { TRIAL_CONSENT_COOKIE, VISITOR_COOKIE_NAME } from '@/lib/auth/cookie-constants';
import { canUseAttachmentTool } from '@/lib/conversation/attachments/server';
import {
  MAX_OCR_REQUEST_CHARS,
  OcrError,
  extractImageText,
  ocrRequestSchema,
  validateImageDataUrl,
} from '@/lib/conversation/attachments/ocr';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';
import { isTrialEmailVerified } from '@/lib/trial/trial-service';
import { findOwnedTrialSession, hasTrialConsent } from '@/lib/trial/trial-request';

export const revalidate = 0;

function fail(status: number, code: string): Response {
  return NextResponse.json({ error: code, code }, { status });
}

async function authorizeTrialVisitor(): Promise<Response | null> {
  const cookieStore = await cookies();
  if (!hasTrialConsent(cookieStore.get(TRIAL_CONSENT_COOKIE)?.value)) {
    return fail(403, 'trial_consent_required');
  }
  const session = await findOwnedTrialSession(cookieStore.get(VISITOR_COOKIE_NAME)?.value);
  if (!session) return fail(401, 'trial_session_required');
  if (!isTrialEmailVerified(session)) return fail(403, 'trial_verification_required');
  const usage = await checkAndIncrementTrialToolUsage(session.id);
  if (!usage.allowed) return fail(429, 'trial_limit_reached');
  return null;
}

export const POST = pipe(
  withSentry('/api/chat/attachments/analyze'),
  withCSRF,
)(async (ctx) => {
  const access = await extractUserIdWithCoppaCheck();
  if (!access.allowed) return fail(403, 'coppa_blocked');

  const rate = checkRateLimit(
    `attachment-ocr:${getClientIdentifier(ctx.req)}`,
    RATE_LIMITS.HOMEWORK,
  );
  if (!rate.success) return rateLimitResponse(rate);

  const raw = await ctx.req.text().catch(() => '');
  if (!raw || raw.length > MAX_OCR_REQUEST_CHARS) return fail(413, 'ocr_payload_too_large');
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, 'ocr_invalid_request');
  }
  const parsed = ocrRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, 'ocr_invalid_request');

  const tool = parsed.data.source === 'pdf' ? 'pdf' : 'webcam';
  if (!(await canUseAttachmentTool(access.userId ?? null, tool))) {
    return fail(403, 'attachment_tool_not_allowed');
  }

  try {
    validateImageDataUrl(parsed.data.image);
    if (!access.userId) {
      const denied = await authorizeTrialVisitor();
      if (denied) return denied;
    }
    const text = await extractImageText(parsed.data.image, getActiveProvider());
    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof OcrError) return fail(error.status, error.code);
    throw error;
  }
});
