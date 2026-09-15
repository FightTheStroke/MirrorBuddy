import type { RetentionSchedule } from './types';

/**
 * FRANCE - GDPR + Loi Informatique + CNIL Guidance
 * Authority: Commission Nationale de l'Informatique et des Libertés (CNIL)
 */
export const FRANCE_RETENTION: RetentionSchedule = {
  country: 'FR',
  authority: "Commission Nationale de l'Informatique et des Libertés (CNIL)",
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: 'Student profile data retention',
      legalBasis: 'GDPR Art. 17(3)(a), Loi Informatique',
      notes: 'Balanced approach',
    },
    parent_contact: {
      days: 6570, // Until age 18 or withdrawal
      description: 'Parent/guardian contact information',
      legalBasis: 'GDPR Art. 6, Loi Informatique',
      notes: 'CNIL guidance: flexible on consent withdrawal',
    },
    consent_records: {
      days: 6935, // Until age 18 + 1 year
      description: 'Parental consent records',
      legalBasis: 'Loi Informatique Art. L. 221-3',
      notes: 'French GDPR implementation',
    },
    educational_content: {
      days: 365, // 1 year post-graduation
      description: 'Educational content and assessments',
      legalBasis: 'GDPR Art. 5(1)(e), Loi Informatique',
      notes: 'CNIL: shorter retention than Germany',
    },
    interaction_logs: {
      days: 180, // 6 months
      description: 'Learning interaction logs',
      legalBasis: 'Loi Informatique Art. L. 221-1',
      notes: 'Anonymize or delete after 6 months',
    },
    ai_safety_logs: {
      days: 730, // 2 years
      description: 'AI processing and decision logs',
      legalBasis: 'Loi Informatique Art. L. 221-5 - AI transparency',
      notes: 'French AI transparency law (2021)',
    },
    breach_records: {
      days: 1095, // 3 years
      description: 'Breach notification records',
      legalBasis: 'GDPR Art. 33-34, Loi Informatique Art. L. 221-8',
      notes: 'CNIL requires detailed incident logs',
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: 'Detailed audit trails (operational)',
      legalBasis: 'Loi Informatique Art. L. 221-1 - accountability',
      notes: 'French emphasis on transparency',
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: 'Summary audit trails (archival)',
      legalBasis: 'CNIL guidance',
      notes: 'Long-term compliance proof',
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: 'Data subject rights requests',
      legalBasis: 'GDPR Art. 12-22, Loi Informatique',
      notes: 'CNIL strict on rights handling proof',
    },
  },
};
