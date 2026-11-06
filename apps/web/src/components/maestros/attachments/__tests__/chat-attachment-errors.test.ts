import { describe, expect, it } from 'vitest';
import {
  attachmentCodeKey,
  attachmentErrorKey,
  chatTurnError,
  isRetryableAttachmentError,
} from '../chat-attachment-fields';

describe('attachment request error recovery', () => {
  it.each([
    [404, 'attachment_not_found', 'notFound'],
    [403, 'attachment_tool_not_allowed', 'notAllowed'],
    [400, 'attachment_unsafe', 'unsafe'],
    [400, 'attachment_invalid', 'invalid'],
    [500, 'attachment_data_invalid', 'invalid'],
    [404, 'conversation_not_found', 'conversationFailed'],
    [401, 'attachment_auth_required', 'sessionExpired'],
    [413, 'ATTACHMENT_CONTEXT_TOO_LARGE', 'contextTooLarge'],
  ])('provides actionable recovery for HTTP %s, %s', async (status, code, key) => {
    const response = new Response(JSON.stringify({ error: code, code }), { status });
    expect(attachmentErrorKey(await chatTurnError(response))).toBe(key);
  });

  it.each([undefined, 'toString', 'constructor', '__proto__'])(
    'does not expose arbitrary server messages or inherited keys (%s)',
    async (code) => {
      const response = new Response(JSON.stringify({ error: 'private upstream detail', code }), {
        status: 500,
      });
      expect(attachmentErrorKey(await chatTurnError(response))).toBeNull();
    },
  );

  it.each([
    ['ocr_needs_account', 'ocrNeedsAccount', false],
    ['ocr_limit', 'ocrLimit', true],
    ['ocr_failed', 'ocrFailed', true],
    ['too_many_pages', 'tooManyPages', false],
    ['too_large', 'tooLarge', false],
    ['remove_failed', 'removeFailed', true],
  ])('maps %s to a message and offers retry only when it can help', (code, key, retry) => {
    expect(attachmentCodeKey(code)).toBe(key);
    expect(isRetryableAttachmentError(code)).toBe(retry);
  });
});
