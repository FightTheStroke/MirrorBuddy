import type { RetentionSchedule } from './types';

/**
 * SPAIN - GDPR + LOPDGDD + AEPD Guidance
 * Authority: Autoridad de Protección de Datos Personales (AEPD)
 */
export const SPAIN_RETENTION: RetentionSchedule = {
  country: 'ES',
  authority: 'Autoridad de Protección de Datos Personales (AEPD)',
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: 'Student profile data retention',
      legalBasis: 'GDPR Art. 17(3)(a), LOPDGDD Art. 5',
      notes: 'Spanish educational standard',
    },
    parent_contact: {
      days: 6570, // Until age 18
      description: 'Parent/guardian contact information',
      legalBasis: 'GDPR Art. 6, LOPDGDD Art. 6',
      notes: 'Stricter than some EU countries',
    },
    consent_records: {
      days: 7300, // Until age 18 + 3 years
      description: 'Parental consent records',
      legalBasis: 'LOPDGDD Art. 5 - evidence requirement',
      notes: 'Spanish enforcement emphasis',
    },
    educational_content: {
      days: 365, // 1 year post-graduation
      description: 'Educational assessments and records',
      legalBasis: 'LOPDGDD Art. 5(e)',
      notes: 'Subject to school retention rules',
    },
    interaction_logs: {
      days: 180, // 6 months
      description: 'Learning interaction logs',
      legalBasis: 'AEPD guidance (2023)',
      notes: 'Quarterly review recommended by AEPD',
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: 'AI and incident logs',
      legalBasis: 'GDPR Art. 33-34, LOPDGDD Art. 72',
      notes: 'AEPD scrutiny of incident handling',
    },
    breach_records: {
      days: 1095, // 3 years
      description: 'Breach notification records',
      legalBasis: 'LOPDGDD Art. 72',
      notes: 'AEPD regulatory compliance',
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: 'Detailed audit trails (operational)',
      legalBasis: 'LOPDGDD Art. 5 - accountability',
      notes: 'Spanish interpretation more detailed',
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: 'Summary audit trails (archival)',
      legalBasis: 'AEPD guidance',
      notes: 'Long-term compliance proof',
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: 'Data subject rights requests',
      legalBasis: 'GDPR Art. 12-22',
      notes: 'AEPD requires proof of response',
    },
  },
};
