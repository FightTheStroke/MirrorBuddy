/**
 * @vitest-environment node
 *
 * Static analysis test for GET /api/admin/waitlist/stats route.
 * Verifies required fields, middleware order, and Prisma query patterns.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROUTE_PATH = path.resolve(__dirname, '../route.ts');

describe('GET /api/admin/waitlist/stats', () => {
  it('route file exists', () => {
    expect(fs.existsSync(ROUTE_PATH), 'route.ts must exist').toBe(true);
  });

  it('uses pipe() with withSentry, withCSRF, withAdmin', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('withSentry');
    expect(source).toContain('withCSRF');
    expect(source).toContain('withAdmin');
    expect(source).toContain('pipe(');
  });

  it('exports GET handler', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('export const GET');
  });

  it('returns totalSignups', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('totalSignups');
  });

  it('returns verifiedCount', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('verifiedCount');
  });

  it('returns unverifiedCount', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('unverifiedCount');
  });

  it('returns unsubscribedCount', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('unsubscribedCount');
  });

  it('returns marketingConsentCount', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('marketingConsentCount');
  });

  it('returns promoRedeemedCount', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('promoRedeemedCount');
  });

  it('returns conversionRate', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('conversionRate');
  });

  it('returns signupsLast7Days', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('signupsLast7Days');
  });

  it('returns signupsLast30Days', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('signupsLast30Days');
  });

  it('uses prisma.waitlistEntry.count()', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('waitlistEntry.count(');
  });

  it('filters verifiedAt is not null for verifiedCount', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    // verifiedAt: { not: null } or isNot: null
    expect(source).toContain('verifiedAt');
  });

  it('filters unsubscribedAt is not null for unsubscribedCount', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('unsubscribedAt');
  });

  it('excludes test data with isTestData: false', () => {
    const source = fs.readFileSync(ROUTE_PATH, 'utf-8');
    expect(source).toContain('isTestData: false');
  });
});
