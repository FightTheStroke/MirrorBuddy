import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function envKeys(content: string): Set<string> {
  return new Set(
    content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => line.split('=')[0].trim()),
  );
}

describe('.env.example parity', () => {
  it('contains required runtime keys and removes deprecated Azure client keys', () => {
    const root = process.cwd();
    const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    const keys = envKeys(envExample);

    const required = [
      'LIVEKIT_URL',
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET',
      'NEXT_PUBLIC_LIVEKIT_URL',
      'SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SECRET_KEY',
      'SUPABASE_JWT_SECRET',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'POSTGRES_HOST',
      'POSTGRES_DATABASE',
      'DEV_DATABASE_URL',
    ];

    for (const key of required) {
      expect(keys.has(key), `Missing ${key}`).toBe(true);
    }

    expect(keys.has('AZURE_CLIENT_ID')).toBe(false);
    expect(keys.has('AZURE_CLIENT_SECRET')).toBe(false);
    expect(keys.has('AZURE_OPENAI_API_VERSION')).toBe(false);
  });
});
