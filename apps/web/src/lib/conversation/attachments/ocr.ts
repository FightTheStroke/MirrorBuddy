import { z } from 'zod';
import { sanitizeUpstreamError } from '@/lib/ai/providers/azure-errors';
import { logger } from '@/lib/logger';

// Stay under the 4.5MB Vercel request body limit.
export const MAX_OCR_REQUEST_CHARS = 4_000_000;
const MAX_OCR_TEXT_LENGTH = 50_000;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export const ocrRequestSchema = z
  .object({
    image: z.string().min(1),
    source: z.enum(['pdf', 'image']),
    pageNumber: z.number().int().min(1).max(10_000),
  })
  .strict();

export class OcrError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = 'OcrError';
  }
}

function hasMagicBytes(mime: string, b: Buffer): boolean {
  if (mime === 'image/jpeg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === 'image/png')
    return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return (
    b.length > 12 &&
    b.subarray(0, 4).toString('ascii') === 'RIFF' &&
    b.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export function validateImageDataUrl(image: string): void {
  const match = DATA_URL.exec(image);
  if (!match) throw new OcrError(400, 'ocr_invalid_image');
  const bytes = Buffer.from(match[2], 'base64');
  if (!hasMagicBytes(match[1], bytes)) throw new OcrError(400, 'ocr_invalid_image');
}

interface VisionProvider {
  provider: string;
  endpoint: string;
  apiKey?: string;
  model: string;
}

const OCR_PROMPT =
  'Transcribe all readable text in this image exactly as written. Output only the transcribed text, with no commentary.';

export async function extractImageText(
  image: string,
  provider: VisionProvider | null,
): Promise<string> {
  if (!provider || provider.provider !== 'azure' || !provider.apiKey) {
    throw new OcrError(422, 'ocr_vision_unavailable');
  }
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
  const model = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || provider.model;
  const url = `${provider.endpoint}/openai/deployments/${model}/chat/completions?api-version=${apiVersion}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'api-key': provider.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_PROMPT },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0,
      }),
    });
  } catch {
    throw new OcrError(502, 'ocr_upstream_failed');
  }
  if (!response.ok) {
    logger.error('OCR vision upstream error', {
      ...sanitizeUpstreamError(response.status, await response.text()),
    });
    throw new OcrError(502, 'ocr_upstream_failed');
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) throw new OcrError(422, 'ocr_no_text');
  return text.slice(0, MAX_OCR_TEXT_LENGTH);
}
