// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  criticalProductionEnv,
  validateProductionMetadata,
  validateProductionValues,
} from '../lib/production-env-policy';

const metadata = () => ({
  envs: criticalProductionEnv.map(({ name }) => ({
    key: name,
    type: 'encrypted',
    target: ['production'],
  })),
});
const values = () =>
  Object.fromEntries(criticalProductionEnv.map(({ name }) => [name, 'synthetic-value']));

describe('production metadata, not value validation', () => {
  it('accepts all critical names without requiring optional model, Stripe or voice settings', () => {
    expect(() => validateProductionMetadata(metadata())).not.toThrow();
    expect(criticalProductionEnv.some(({ name }) => name === 'DEFAULT_CHAT_MODEL')).toBe(false);
    expect(criticalProductionEnv.some(({ name }) => name === 'STRIPE_SECRET_KEY')).toBe(false);
    expect(criticalProductionEnv.some(({ name }) => name.endsWith('_V21'))).toBe(false);
  });

  it.each([undefined, null, '', {}, { envs: [] }, { envs: null }, { envs: [{}] }])(
    'rejects absent or invalid metadata (%j)',
    (input) => expect(() => validateProductionMetadata(input)).toThrow(),
  );

  it.each([
    { key: 'unexpected\nlog-content' },
    { type: 'unknown' },
    { target: [] },
    { target: ['preview'] },
    { gitBranch: 'other-branch' },
    { decrypted: true },
  ])('rejects unverifiable records (%j)', (override) => {
    const input = metadata();
    Object.assign(input.envs[0], override);
    expect(() => validateProductionMetadata(input)).toThrow();
  });

  it('rejects missing critical names and duplicate production definitions', () => {
    const input = metadata();
    const first = input.envs.shift()!;
    expect(() => validateProductionMetadata(input)).toThrow(first.key);
    input.envs.push(first, first);
    expect(() => validateProductionMetadata(input)).toThrow();
  });

  it('does not trust metadata as evidence of a valid value or print its fields', () => {
    const input = metadata();
    Object.assign(input.envs[0], { value: 'synthetic-private-marker\\n' });
    expect(() => validateProductionMetadata(input)).not.toThrow();
    Object.assign(input.envs[0], { type: 'synthetic-private-marker' });
    expect(() => validateProductionMetadata(input)).toThrow(
      /^Invalid production environment metadata$/,
    );
  });
});

describe('already-injected production values', () => {
  it('requires exactly the existing critical policy and leaves optional names optional', () => {
    expect(validateProductionValues(values())).toEqual([]);
    expect(criticalProductionEnv).toHaveLength(36);
  });

  it.each([null, undefined, {}, { SESSION_SECRET: null }])(
    'rejects absent or malformed environment input (%j)',
    (env) => expect(validateProductionValues(env).length).toBeGreaterThan(0),
  );

  it.each(['', ' ', '\t', 'synthetic-private-marker\\n', 'synthetic-private-marker\n'])(
    'rejects malformed required values without disclosing them (%j)',
    (value) => {
      const failures = validateProductionValues({ ...values(), SESSION_SECRET: value });
      expect(failures).toEqual(['SESSION_SECRET: missing, blank, or newline-corrupted value']);
      expect(failures.join()).not.toContain('synthetic-private-marker');
    },
  );

  it('rejects literal trailing newline corruption on optional and unregistered config too', () => {
    const failures = validateProductionValues({
      ...values(),
      DEFAULT_CHAT_MODEL: 'synthetic-private-marker\\n',
      CUSTOM_CONFIG: 'synthetic-config-marker\\n',
    });
    expect(failures).toHaveLength(2);
    expect(failures.join()).not.toMatch(/synthetic-(private|config)-marker/);
  });

  it('does not print invalid environment names', () => {
    expect(validateProductionValues({ ...values(), 'untrusted\ncontent': 'bad\\n' })).toEqual([
      'Invalid environment variable name',
    ]);
  });
});
