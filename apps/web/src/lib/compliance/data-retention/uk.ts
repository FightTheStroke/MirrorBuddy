import type { RetentionSchedule } from './types';

/**
 * UK - UK GDPR + Data Protection Act 2018 + Age Appropriate Design Code
 * Authority: Information Commissioner's Office (ICO)
 */
export const UK_RETENTION: RetentionSchedule = {
  country: 'UK',
  authority: "Information Commissioner's Office (ICO)",
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: 'Student profile data retention',
      legalBasis: 'UK GDPR Art. 17(3)(a)',
      notes: 'Aligned with EU standard',
    },
    parent_contact: {
      days: 6570, // Until age 18 + 1 year
      description: 'Parent/guardian contact information',
      legalBasis: 'UK GDPR Art. 6 - legitimate interest',
      notes: 'Contact for withdrawal of consent',
    },
    consent_records: {
      days: 7300, // Until age 18 + 3 years
      description: 'Parental consent records',
      legalBasis: 'UK GDPR Art. 13 - information disclosure',
      notes: 'Evidence of lawful processing',
    },
    educational_content: {
      days: 180, // 6 months
      description: 'Educational content and materials',
      legalBasis: 'UK GDPR Art. 5(1)(e)',
      notes: 'Student data portability right',
    },
    interaction_logs: {
      days: 180, // 6 months
      description: 'Learning interaction logs',
      legalBasis: 'UK GDPR Art. 32 - pseudonymization',
      notes: 'DPA 2018 encourages anonymization after 6 months',
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: 'AI safety and incident logs',
      legalBasis: 'Age Appropriate Design Code (ICO)',
      notes: "Compliance with children's privacy rules",
    },
    breach_records: {
      days: 1095, // 3 years
      description: 'Breach notification records',
      legalBasis: 'UK GDPR Art. 33-34, DPA 2018 Section 170',
      notes: 'Criminal liability threshold',
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: 'Detailed audit trails (operational)',
      legalBasis: 'DPA 2018, Schedule 1',
      notes: 'ICO audit requirements',
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: 'Summary audit trails (archival)',
      legalBasis: 'DPA 2018 - compliance evidence',
      notes: 'Long-term compliance proof',
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: 'Data subject rights requests',
      legalBasis: 'UK GDPR Art. 12-22',
      notes: 'Proof of request handling (1 month response window)',
    },
  },
};
