/**
 * Test: .env.example has correct GA documentation for realtime secrets.
 *
 * Validates that deprecated vars are marked and GA-specific vars are documented.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('.env.example GA realtime documentation', () => {
  const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf-8');

  it('should NOT list AZURE_OPENAI_REALTIME_REGION as active var', () => {
    // AZURE_OPENAI_REALTIME_REGION is deprecated in GA (domain is in endpoint)
    const activeRegionLine = envExample
      .split('\n')
      .find((line) => line.startsWith('AZURE_OPENAI_REALTIME_REGION') && !line.startsWith('#'));
    expect(activeRegionLine).toBeUndefined();
  });

  it('should NOT list AZURE_OPENAI_REALTIME_API_VERSION as active var', () => {
    // AZURE_OPENAI_REALTIME_API_VERSION is deprecated in GA (v1 path versioning)
    const activeVersionLine = envExample
      .split('\n')
      .find(
        (line) => line.startsWith('AZURE_OPENAI_REALTIME_API_VERSION') && !line.startsWith('#'),
      );
    expect(activeVersionLine).toBeUndefined();
  });

  it('should document deprecated REGION var with explanation', () => {
    expect(envExample).toContain('AZURE_OPENAI_REALTIME_REGION');
    expect(envExample).toContain('DEPRECATED');
  });

  it('should document deprecated API_VERSION var with explanation', () => {
    expect(envExample).toContain('AZURE_OPENAI_REALTIME_API_VERSION');
    expect(envExample).toContain('DEPRECATED');
  });

  it('should list active GA realtime vars', () => {
    expect(envExample).toContain('AZURE_OPENAI_REALTIME_ENDPOINT=');
    expect(envExample).toContain('AZURE_OPENAI_REALTIME_API_KEY=');
    expect(envExample).toContain('AZURE_OPENAI_REALTIME_DEPLOYMENT=');
    expect(envExample).toContain('AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=');
  });

  it('should mention GA in the voice section', () => {
    expect(envExample).toContain('GA');
  });
});
