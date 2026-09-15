import type { RetentionSchedule } from './types';

/**
 * GERMANY - GDPR + BDSG + TTDSG
 * Authority: Bundesdatenschutzbeauftragte (BfDI - Federal Data Protection Commissioner)
 */
export const GERMANY_RETENTION: RetentionSchedule = {
  country: 'DE',
  authority: 'Bundesdatenschutzbeauftragte (BfDI)',
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: 'Student profile data retention',
      legalBasis: 'GDPR Art. 17(3)(a), BDSG §3',
      notes: 'Conservative approach; aligned with EU',
    },
    parent_contact: {
      days: 7300, // Until age 18 + 2 years
      description: 'Parent/guardian contact information',
      legalBasis: 'GDPR Art. 6(1)(f) - legitimate interest',
      notes: 'Parental notification rights',
    },
    consent_records: {
      days: 8395, // Until age 18 + 5 years
      description: 'Parental consent records',
      legalBasis: 'BDSG §22 - documentation requirement',
      notes: 'German law stricter on proof retention',
    },
    educational_content: {
      days: 180, // 6 months
      description: 'Educational data and assessments',
      legalBasis: 'GDPR Art. 5(1)(e), BDSG §4',
      notes: 'Schulgesetze (school laws) vary by Bundesland',
    },
    interaction_logs: {
      days: 180, // 6 months (with review period)
      description: 'Learning interaction logs',
      legalBasis: 'BDSG §3 - data minimization',
      notes: 'German DPA stricter on data minimization',
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: 'AI processing and safety logs',
      legalBasis: 'BDSG §22 - special categories',
      notes: 'Health/learning disability data',
    },
    breach_records: {
      days: 1825, // 5 years
      description: 'Breach notification records',
      legalBasis: 'BDSG §25, GDPR Art. 33-34',
      notes: 'German emphasis on long retention',
    },
    audit_trails_detailed: {
      days: 730, // 2 years
      description: 'Detailed audit trails (operational)',
      legalBasis: 'BDSG §5 - record-keeping',
      notes: 'Processing documentation (Verarbeitungsverzeichnis)',
    },
    audit_trails_summary: {
      days: 1825, // 5 years
      description: 'Summary audit trails (archival)',
      legalBasis: 'NIS 2 Directive (transposed 2024)',
      notes: 'Cybersecurity incident response',
    },
    data_subject_requests: {
      days: 1095, // 3 years
      description: 'Data subject rights requests',
      legalBasis: 'GDPR Art. 12-22, BDSG §5',
      notes: 'Proof of rights handling',
    },
  },
};
