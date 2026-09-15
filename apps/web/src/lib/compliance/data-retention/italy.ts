import type { RetentionSchedule } from './types';

/**
 * ITALY - GDPR + D.Lgs 196/2003 + L.132/2025
 * Authority: Garante della Privacy (Italian Data Protection Authority)
 */
export const ITALY_RETENTION: RetentionSchedule = {
  country: 'IT',
  authority: 'Garante della Privacy',
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: 'Student profile data retention',
      legalBasis: 'GDPR Art. 17(3)(a) - contract necessity',
      notes: 'Delete after graduation + 2 years unless legal obligation',
    },
    parent_contact: {
      days: 6570, // Until age 18 (typical) + 1 year grace
      description: 'Parent/guardian contact information',
      legalBasis: 'GDPR Art. 17 exemption, D.Lgs 196/2003',
      notes: 'Retain until student majority (18) + 1 year for consent withdrawal',
    },
    consent_records: {
      days: 7300, // 20 years (until age 18 + buffer)
      description: 'Parental consent records',
      legalBasis: 'D.Lgs 196/2003, Art. 7 - proof of lawful basis',
      notes: 'Evidence of parental consent; retain until majority + 1 year',
    },
    educational_content: {
      days: 365, // 1 year post-graduation
      description: 'Educational assessments and content',
      legalBasis: 'Educational continuity + GDPR Art. 5(1)(e)',
      notes: 'Student transcript; delete after graduation + 1 year',
    },
    interaction_logs: {
      days: 180, // 6 months
      description: 'Learning interaction logs',
      legalBasis: 'GDPR Art. 5(1)(e) - storage limitation',
      notes: 'Anonymize or delete after 6 months if possible',
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: 'AI safety and incident logs',
      legalBasis: 'Garante guidance (2024)',
      notes: 'Regulatory compliance records',
    },
    breach_records: {
      days: 1095, // 3 years
      description: 'Breach notification records',
      legalBasis: 'GDPR Art. 33-34',
      notes: 'Required by Italian authorities',
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: 'Detailed audit trails (operational)',
      legalBasis: 'ADR 0075 - audit requirements',
      notes: 'Then archive to summary',
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: 'Summary audit trails (archival)',
      legalBasis: 'Italian tax law (D.P.R. 600/1973)',
      notes: 'Financial transaction records',
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: 'Data subject rights requests',
      legalBasis: 'GDPR Art. 12-22',
      notes: 'Proof of request handling',
    },
  },
};
