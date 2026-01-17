/**
 * PDF Report Generation Options
 *
 * Configuration for generating accessible PDF reports from student profiles.
 */

/**
 * PDF report generation options
 */
export interface ReportOptions {
  /** Include full history */
  includeHistory?: boolean;
  /** Include evidence session IDs */
  includeEvidence?: boolean;
  /** Include strategies section */
  includeStrategies?: boolean;
  /** Report language */
  language?: 'it' | 'en';
  /** Custom header/footer text */
  headerText?: string;
  /** Watermark for privacy */
  addWatermark?: boolean;
}
