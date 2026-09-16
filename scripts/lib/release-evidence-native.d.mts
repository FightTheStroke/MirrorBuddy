import type { CoverageSummaryData } from 'istanbul-lib-coverage';

export interface UnitSummary {
  total: number;
  passed: number;
  skipped: number;
}
export interface BrowserSummary extends UnitSummary {
  flaky: number;
}
export interface CoverageResult {
  files: number;
  metrics: CoverageSummaryData;
}
export interface AuditSummary {
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
}

export function validateUnit(input: unknown): UnitSummary;
export function validateCoverage(input: unknown): CoverageResult;
export function validateBrowser(input: unknown): BrowserSummary;
export function validateAudit(input: unknown): AuditSummary;
export function validateNativeEvidence(input: unknown): {
  unit: UnitSummary;
  coverage: CoverageResult;
  e2e: BrowserSummary;
  audit: AuditSummary;
};
