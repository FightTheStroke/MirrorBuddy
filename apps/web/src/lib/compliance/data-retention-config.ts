/**
 * Data Retention Configuration - Country-Specific Retention Periods
 *
 * Implements GDPR Article 5(1)(e) (Storage Limitation) with country-specific requirements:
 * - Italy: GDPR + D.Lgs 196/2003 + L.132/2025
 * - UK: UK GDPR + Data Protection Act 2018 + Age Appropriate Design Code
 * - Germany: GDPR + BDSG + TTDSG
 * - Spain: GDPR + LOPDGDD + AEPD guidance
 * - France: GDPR + Loi Informatique + CNIL guidance
 *
 * All periods in DAYS. Use calculateExpirationDate() to get deletion target dates.
 *
 * References:
 * - docs/compliance/DATA-RETENTION-POLICY.md (full policy)
 * - docs/compliance/countries/{country}/data-protection.md (legal frameworks)
 */

import { ITALY_RETENTION } from './data-retention/italy';
import { UK_RETENTION } from './data-retention/uk';
import { GERMANY_RETENTION } from './data-retention/germany';
import { SPAIN_RETENTION } from './data-retention/spain';
import { FRANCE_RETENTION } from './data-retention/france';
import type {
  CountryCode,
  DataCategory,
  RetentionSchedule,
  DeletionRequest,
} from './data-retention/types';
export type {
  CountryCode,
  DataCategory,
  RetentionSchedule,
  RetentionPeriod,
  DeletionRequest,
  DeletionAuditLog,
} from './data-retention/types';
export { ITALY_RETENTION, UK_RETENTION, GERMANY_RETENTION, SPAIN_RETENTION, FRANCE_RETENTION };

/**
 * Get retention schedule for a country
 */
export function getRetentionSchedule(country: CountryCode): RetentionSchedule {
  const schedules: Record<CountryCode, RetentionSchedule> = {
    IT: ITALY_RETENTION,
    UK: UK_RETENTION,
    DE: GERMANY_RETENTION,
    ES: SPAIN_RETENTION,
    FR: FRANCE_RETENTION,
  };

  return schedules[country];
}

/**
 * Calculate expiration date for a data category in a specific country
 *
 * @param country Country code
 * @param category Data category
 * @param createdDate Date when data was created/collected
 * @returns Date when data should be deleted
 */
export function calculateExpirationDate(
  country: CountryCode,
  category: DataCategory,
  createdDate: Date,
): Date {
  const schedule = getRetentionSchedule(country);
  const period = schedule.categories[category];

  const expirationDate = new Date(createdDate);
  expirationDate.setDate(expirationDate.getDate() + period.days);

  return expirationDate;
}

/**
 * Check if a data record should be deleted (expiration date has passed)
 *
 * @param country Country code
 * @param category Data category
 * @param createdDate Date when data was created
 * @returns true if data has expired and should be deleted
 */
export function isDataExpired(
  country: CountryCode,
  category: DataCategory,
  createdDate: Date,
): boolean {
  const expirationDate = calculateExpirationDate(country, category, createdDate);
  return new Date() >= expirationDate;
}

/**
 * Get days remaining before data expires
 *
 * @param country Country code
 * @param category Data category
 * @param createdDate Date when data was created
 * @returns Number of days remaining (negative if already expired)
 */
export function getDaysUntilExpiration(
  country: CountryCode,
  category: DataCategory,
  createdDate: Date,
): number {
  const expirationDate = calculateExpirationDate(country, category, createdDate);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysRemaining;
}

/**
 * Export all retention schedules for documentation and admin dashboard
 */
export function getAllRetentionSchedules(): Record<CountryCode, RetentionSchedule> {
  return {
    IT: ITALY_RETENTION,
    UK: UK_RETENTION,
    DE: GERMANY_RETENTION,
    ES: SPAIN_RETENTION,
    FR: FRANCE_RETENTION,
  };
}

/**
 * Check if deletion request meets all legal requirements
 */
export function validateDeletionRequest(request: DeletionRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check country
  const validCountries: CountryCode[] = ['IT', 'UK', 'DE', 'ES', 'FR'];
  if (!validCountries.includes(request.country)) {
    errors.push(`Invalid country code: ${request.country}`);
  }

  // Check reason
  const validReasons = ['user_request', 'expiration', 'account_closure'];
  if (!validReasons.includes(request.reason)) {
    errors.push(`Invalid deletion reason: ${request.reason}`);
  }

  // Check user ID
  if (!request.userId || request.userId.trim().length === 0) {
    errors.push('User ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
