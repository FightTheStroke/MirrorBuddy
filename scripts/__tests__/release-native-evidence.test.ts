// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validateNativeEvidence } from '../lib/release-evidence-native.mjs';
import { nativeEvidenceFixture as valid } from './release-native-fixture';

describe('complete native release evidence', () => {
  it('accepts native unit, coverage, browser and audit evidence together', () => {
    expect(validateNativeEvidence(valid()).unit.passed).toBe(1);
  });
  it('rejects mixed passed and failed unit results', () => {
    const data = valid();
    data.unit.numFailedTests = 1;
    expect(() => validateNativeEvidence(data)).toThrow();
  });
  it('rejects partial assertion inventories', () => {
    const data = valid();
    data.unit.numTotalTests = 2;
    data.unit.numPassedTests = 2;
    expect(() => validateNativeEvidence(data)).toThrow();
  });
  it('rejects empty or missing required evidence', () => {
    expect(() => validateNativeEvidence(null)).toThrow();
    for (const field of ['unit', 'coverage', 'e2e', 'audit']) {
      expect(() => validateNativeEvidence({ ...valid(), [field]: undefined })).toThrow();
    }
  });
  it('enforces actual branch coverage, not only lines or statements', () => {
    const data = valid();
    data.coverage['/source/apps/web/src/lib/education/a.ts'].b[0] = [1, 0];
    expect(() => validateNativeEvidence(data)).toThrow(/coverage/i);
  });
  it('rejects unsuccessful or incomplete browser results', () => {
    const data = valid();
    data.e2e.stats.unexpected = 1;
    expect(() => validateNativeEvidence(data)).toThrow();
    data.e2e.stats.unexpected = 0;
    data.e2e.suites[0].specs[0].tests[0].results = [];
    expect(() => validateNativeEvidence(data)).toThrow();
  });
  it('does not turn failed audits or missing metadata into zero vulnerabilities', () => {
    expect(() =>
      validateNativeEvidence({ ...valid(), audit: { error: { code: 'ENOLOCK' } } }),
    ).toThrow();
    const data = valid();
    data.audit.metadata.vulnerabilities.high = 1;
    expect(() => validateNativeEvidence(data)).toThrow();
  });
  it('records permitted native retries as flaky, never first-pass success', () => {
    const data = valid();
    data.e2e.stats.expected = 0;
    data.e2e.stats.flaky = 1;
    data.e2e.suites[0].specs[0].tests[0].status = 'flaky';
    data.e2e.suites[0].specs[0].tests[0].results = [{ status: 'failed' }, { status: 'passed' }];
    expect(validateNativeEvidence(data).e2e.flaky).toBe(1);
  });
});
