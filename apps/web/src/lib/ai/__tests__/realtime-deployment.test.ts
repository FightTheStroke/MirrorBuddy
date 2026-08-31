import { describe, it, expect } from 'vitest';
import { resolveRealtimeDeployment } from '../realtime-deployment';

const ALL_ON = { useV15: true, useV2: true, useV21: true };

const env = (vars: Record<string, string | undefined>) => vars as unknown as NodeJS.ProcessEnv;

describe('resolveRealtimeDeployment', () => {
  it('prefers V21 when its flag is on and the deployment exists', () => {
    const result = resolveRealtimeDeployment(
      ALL_ON,
      env({
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V21: 'gpt-realtime-2.1',
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V2: 'gpt-realtime-2',
        AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-realtime',
      }),
    );

    expect(result).toBe('gpt-realtime-2.1');
  });

  it('falls back to V2 when V21 is not deployed', () => {
    const result = resolveRealtimeDeployment(
      ALL_ON,
      env({
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V2: 'gpt-realtime-2',
        AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-realtime',
      }),
    );

    expect(result).toBe('gpt-realtime-2');
  });

  it('ignores V21 when its feature flag is off', () => {
    const result = resolveRealtimeDeployment(
      { useV15: true, useV2: false, useV21: false },
      env({
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V21: 'gpt-realtime-2.1',
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V15: 'gpt-realtime-15',
        AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-realtime',
      }),
    );

    expect(result).toBe('gpt-realtime-15');
  });

  it('uses the base deployment when every flag is off', () => {
    const result = resolveRealtimeDeployment(
      { useV15: false, useV2: false, useV21: false },
      env({
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V21: 'gpt-realtime-2.1',
        AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-realtime',
      }),
    );

    expect(result).toBe('gpt-realtime');
  });

  it('trims whitespace around the deployment name', () => {
    const result = resolveRealtimeDeployment(
      ALL_ON,
      env({ AZURE_OPENAI_REALTIME_DEPLOYMENT_V21: '  gpt-realtime-2.1\n' }),
    );

    expect(result).toBe('gpt-realtime-2.1');
  });

  it('skips blank and literal "undefined" values instead of returning them', () => {
    const result = resolveRealtimeDeployment(
      ALL_ON,
      env({
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V21: '   ',
        AZURE_OPENAI_REALTIME_DEPLOYMENT_V2: 'undefined',
        AZURE_OPENAI_REALTIME_DEPLOYMENT: 'gpt-realtime',
      }),
    );

    expect(result).toBe('gpt-realtime');
  });

  it('returns undefined when nothing is configured', () => {
    expect(resolveRealtimeDeployment(ALL_ON, env({}))).toBeUndefined();
  });
});
