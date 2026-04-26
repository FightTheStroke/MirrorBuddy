import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/api/middlewares', () => ({
  pipe: (..._fns: Array<(handler: unknown) => unknown>) => {
    return (handler: (ctx: { req: Request }) => Promise<Response>) => {
      return async (req: Request) => handler({ req });
    };
  },
  withSentry: () => (handler: (ctx: { req: Request }) => Promise<Response>) => handler,
}));

describe('GET /api/provider/status', () => {
  beforeEach(() => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://chat.openai.azure.com';
    process.env.AZURE_OPENAI_API_KEY = 'chat-key';
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = 'gpt-5';
    process.env.AZURE_OPENAI_REALTIME_ENDPOINT = 'https://voice.openai.azure.com';
    process.env.AZURE_OPENAI_REALTIME_API_KEY = 'voice-key';
    process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT = 'gpt-realtime';
    process.env.AZURE_OPENAI_REALTIME_API_VERSION = '2024-10-01-preview';
  });

  it('should not expose AZURE_OPENAI_REALTIME_API_VERSION in envVars', async () => {
    const request = new NextRequest('http://localhost:3000/api/provider/status');
    const response = await GET(request as any);
    const body = await response.json();

    const names = body.azure.envVars.map((item: { name: string }) => item.name);
    expect(names).not.toContain('AZURE_OPENAI_REALTIME_API_VERSION');
  });
});
