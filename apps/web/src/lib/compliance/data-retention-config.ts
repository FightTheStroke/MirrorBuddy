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

export type CountryCode = "IT" | "UK" | "DE" | "ES" | "FR";

export type DataCategory =
  | "student_profile"
  | "parent_contact"
  | "consent_records"
  | "educational_content"
  | "interaction_logs"
  | "ai_safety_logs"
  | "breach_records"
  | "audit_trails_detailed"
  | "audit_trails_summary"
  | "data_subject_requests";

export interface RetentionSchedule {
  country: CountryCode;
  authority: string;
  categories: Record<DataCategory, RetentionPeriod>;
}

export interface RetentionPeriod {
  days: number;
  description: string;
  legalBasis: string;
  notes?: string;
}

export interface DeletionRequest {
  userId: string;
  country: CountryCode;
  reason: "user_request" | "expiration" | "account_closure";
  deleteAllData: boolean;
  verifyDeletion?: boolean;
  timestamp: Date;
}

export interface DeletionAuditLog {
  deletionId: string;
  userId: string;
  country: CountryCode;
  reason: string;
  recordsDeleted: number;
  dataCategories: DataCategory[];
  deletedAt: Date;
  auditTrailId: string;
}

/**
 * ITALY - GDPR + D.Lgs 196/2003 + L.132/2025
 * Authority: Garante della Privacy (Italian Data Protection Authority)
 */
export const ITALY_RETENTION: RetentionSchedule = {
  country: "IT",
  authority: "Garante della Privacy",
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: "Student profile data retention",
      legalBasis: "GDPR Art. 17(3)(a) - contract necessity",
      notes: "Delete after graduation + 2 years unless legal obligation",
    },
    parent_contact: {
      days: 6570, // Until age 18 (typical) + 1 year grace
      description: "Parent/guardian contact information",
      legalBasis: "GDPR Art. 17 exemption, D.Lgs 196/2003",
      notes:
        "Retain until student majority (18) + 1 year for consent withdrawal",
    },
    consent_records: {
      days: 7300, // 20 years (until age 18 + buffer)
      description: "Parental consent records",
      legalBasis: "D.Lgs 196/2003, Art. 7 - proof of lawful basis",
      notes: "Evidence of parental consent; retain until majority + 1 year",
    },
    educational_content: {
      days: 365, // 1 year post-graduation
      description: "Educational assessments and content",
      legalBasis: "Educational continuity + GDPR Art. 5(1)(e)",
      notes: "Student transcript; delete after graduation + 1 year",
    },
    interaction_logs: {
      days: 180, // 6 months
      description: "Learning interaction logs",
      legalBasis: "GDPR Art. 5(1)(e) - storage limitation",
      notes: "Anonymize or delete after 6 months if possible",
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: "AI safety and incident logs",
      legalBasis: "Garante guidance (2024)",
      notes: "Regulatory compliance records",
    },
    breach_records: {
      days: 1095, // 3 years
      description: "Breach notification records",
      legalBasis: "GDPR Art. 33-34",
      notes: "Required by Italian authorities",
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: "Detailed audit trails (operational)",
      legalBasis: "ADR 0075 - audit requirements",
      notes: "Then archive to summary",
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: "Summary audit trails (archival)",
      legalBasis: "Italian tax law (D.P.R. 600/1973)",
      notes: "Financial transaction records",
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: "Data subject rights requests",
      legalBasis: "GDPR Art. 12-22",
      notes: "Proof of request handling",
    },
  },
};

/**
 * UK - UK GDPR + Data Protection Act 2018 + Age Appropriate Design Code
 * Authority: Information Commissioner's Office (ICO)
 */
export const UK_RETENTION: RetentionSchedule = {
  country: "UK",
  authority: "Information Commissioner's Office (ICO)",
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: "Student profile data retention",
      legalBasis: "UK GDPR Art. 17(3)(a)",
      notes: "Aligned with EU standard",
    },
    parent_contact: {
      days: 6570, // Until age 18 + 1 year
      description: "Parent/guardian contact information",
      legalBasis: "UK GDPR Art. 6 - legitimate interest",
      notes: "Contact for withdrawal of consent",
    },
    consent_records: {
      days: 7300, // Until age 18 + 3 years
      description: "Parental consent records",
      legalBasis: "UK GDPR Art. 13 - information disclosure",
      notes: "Evidence of lawful processing",
    },
    educational_content: {
      days: 180, // 6 months
      description: "Educational content and materials",
      legalBasis: "UK GDPR Art. 5(1)(e)",
      notes: "Student data portability right",
    },
    interaction_logs: {
      days: 180, // 6 months
      description: "Learning interaction logs",
      legalBasis: "UK GDPR Art. 32 - pseudonymization",
      notes: "DPA 2018 encourages anonymization after 6 months",
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: "AI safety and incident logs",
      legalBasis: "Age Appropriate Design Code (ICO)",
      notes: "Compliance with children's privacy rules",
    },
    breach_records: {
      days: 1095, // 3 years
      description: "Breach notification records",
      legalBasis: "UK GDPR Art. 33-34, DPA 2018 Section 170",
      notes: "Criminal liability threshold",
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: "Detailed audit trails (operational)",
      legalBasis: "DPA 2018, Schedule 1",
      notes: "ICO audit requirements",
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: "Summary audit trails (archival)",
      legalBasis: "DPA 2018 - compliance evidence",
      notes: "Long-term compliance proof",
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: "Data subject rights requests",
      legalBasis: "UK GDPR Art. 12-22",
      notes: "Proof of request handling (1 month response window)",
    },
  },
};

/**
 * GERMANY - GDPR + BDSG + TTDSG
 * Authority: Bundesdatenschutzbeauftragte (BfDI - Federal Data Protection Commissioner)
 */
export const GERMANY_RETENTION: RetentionSchedule = {
  country: "DE",
  authority: "Bundesdatenschutzbeauftragte (BfDI)",
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: "Student profile data retention",
      legalBasis: "GDPR Art. 17(3)(a), BDSG §3",
      notes: "Conservative approach; aligned with EU",
    },
    parent_contact: {
      days: 7300, // Until age 18 + 2 years
      description: "Parent/guardian contact information",
      legalBasis: "GDPR Art. 6(1)(f) - legitimate interest",
      notes: "Parental notification rights",
    },
    consent_records: {
      days: 8395, // Until age 18 + 5 years
      description: "Parental consent records",
      legalBasis: "BDSG §22 - documentation requirement",
      notes: "German law stricter on proof retention",
    },
    educational_content: {
      days: 180, // 6 months
      description: "Educational data and assessments",
      legalBasis: "GDPR Art. 5(1)(e), BDSG §4",
      notes: "Schulgesetze (school laws) vary by Bundesland",
    },
    interaction_logs: {
      days: 180, // 6 months (with review period)
      description: "Learning interaction logs",
      legalBasis: "BDSG §3 - data minimization",
      notes: "German DPA stricter on data minimization",
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: "AI processing and safety logs",
      legalBasis: "BDSG §22 - special categories",
      notes: "Health/learning disability data",
    },
    breach_records: {
      days: 1825, // 5 years
      description: "Breach notification records",
      legalBasis: "BDSG §25, GDPR Art. 33-34",
      notes: "German emphasis on long retention",
    },
    audit_trails_detailed: {
      days: 730, // 2 years
      description: "Detailed audit trails (operational)",
      legalBasis: "BDSG §5 - record-keeping",
      notes: "Processing documentation (Verarbeitungsverzeichnis)",
    },
    audit_trails_summary: {
      days: 1825, // 5 years
      description: "Summary audit trails (archival)",
      legalBasis: "NIS 2 Directive (transposed 2024)",
      notes: "Cybersecurity incident response",
    },
    data_subject_requests: {
      days: 1095, // 3 years
      description: "Data subject rights requests",
      legalBasis: "GDPR Art. 12-22, BDSG §5",
      notes: "Proof of rights handling",
    },
  },
};

/**
 * SPAIN - GDPR + LOPDGDD + AEPD Guidance
 * Authority: Autoridad de Protección de Datos Personales (AEPD)
 */
export const SPAIN_RETENTION: RetentionSchedule = {
  country: "ES",
  authority: "Autoridad de Protección de Datos Personales (AEPD)",
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: "Student profile data retention",
      legalBasis: "GDPR Art. 17(3)(a), LOPDGDD Art. 5",
      notes: "Spanish educational standard",
    },
    parent_contact: {
      days: 6570, // Until age 18
      description: "Parent/guardian contact information",
      legalBasis: "GDPR Art. 6, LOPDGDD Art. 6",
      notes: "Stricter than some EU countries",
    },
    consent_records: {
      days: 7300, // Until age 18 + 3 years
      description: "Parental consent records",
      legalBasis: "LOPDGDD Art. 5 - evidence requirement",
      notes: "Spanish enforcement emphasis",
    },
    educational_content: {
      days: 365, // 1 year post-graduation
      description: "Educational assessments and records",
      legalBasis: "LOPDGDD Art. 5(e)",
      notes: "Subject to school retention rules",
    },
    interaction_logs: {
      days: 180, // 6 months
      description: "Learning interaction logs",
      legalBasis: "AEPD guidance (2023)",
      notes: "Quarterly review recommended by AEPD",
    },
    ai_safety_logs: {
      days: 1095, // 3 years
      description: "AI and incident logs",
      legalBasis: "GDPR Art. 33-34, LOPDGDD Art. 72",
      notes: "AEPD scrutiny of incident handling",
    },
    breach_records: {
      days: 1095, // 3 years
      description: "Breach notification records",
      legalBasis: "LOPDGDD Art. 72",
      notes: "AEPD regulatory compliance",
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: "Detailed audit trails (operational)",
      legalBasis: "LOPDGDD Art. 5 - accountability",
      notes: "Spanish interpretation more detailed",
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: "Summary audit trails (archival)",
      legalBasis: "AEPD guidance",
      notes: "Long-term compliance proof",
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: "Data subject rights requests",
      legalBasis: "GDPR Art. 12-22",
      notes: "AEPD requires proof of response",
    },
  },
};

/**
 * FRANCE - GDPR + Loi Informatique + CNIL Guidance
 * Authority: Commission Nationale de l'Informatique et des Libertés (CNIL)
 */
export const FRANCE_RETENTION: RetentionSchedule = {
  country: "FR",
  authority: "Commission Nationale de l'Informatique et des Libertés (CNIL)",
  categories: {
    student_profile: {
      days: 730, // 2 years post-graduation
      description: "Student profile data retention",
      legalBasis: "GDPR Art. 17(3)(a), Loi Informatique",
      notes: "Balanced approach",
    },
    parent_contact: {
      days: 6570, // Until age 18 or withdrawal
      description: "Parent/guardian contact information",
      legalBasis: "GDPR Art. 6, Loi Informatique",
      notes: "CNIL guidance: flexible on consent withdrawal",
    },
    consent_records: {
      days: 6935, // Until age 18 + 1 year
      description: "Parental consent records",
      legalBasis: "Loi Informatique Art. L. 221-3",
      notes: "French GDPR implementation",
    },
    educational_content: {
      days: 365, // 1 year post-graduation
      description: "Educational content and assessments",
      legalBasis: "GDPR Art. 5(1)(e), Loi Informatique",
      notes: "CNIL: shorter retention than Germany",
    },
    interaction_logs: {
      days: 180, // 6 months
      description: "Learning interaction logs",
      legalBasis: "Loi Informatique Art. L. 221-1",
      notes: "Anonymize or delete after 6 months",
    },
    ai_safety_logs: {
      days: 730, // 2 years
      description: "AI processing and decision logs",
      legalBasis: "Loi Informatique Art. L. 221-5 - AI transparency",
      notes: "French AI transparency law (2021)",
    },
    breach_records: {
      days: 1095, // 3 years
      description: "Breach notification records",
      legalBasis: "GDPR Art. 33-34, Loi Informatique Art. L. 221-8",
      notes: "CNIL requires detailed incident logs",
    },
    audit_trails_detailed: {
      days: 365, // 1 year
      description: "Detailed audit trails (operational)",
      legalBasis: "Loi Informatique Art. L. 221-1 - accountability",
      notes: "French emphasis on transparency",
    },
    audit_trails_summary: {
      days: 1095, // 3 years
      description: "Summary audit trails (archival)",
      legalBasis: "CNIL guidance",
      notes: "Long-term compliance proof",
    },
    data_subject_requests: {
      days: 365, // 1 year
      description: "Data subject rights requests",
      legalBasis: "GDPR Art. 12-22, Loi Informatique",
      notes: "CNIL strict on rights handling proof",
    },
  },
};

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
  const expirationDate = calculateExpirationDate(
    country,
    category,
    createdDate,
  );
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
  const expirationDate = calculateExpirationDate(
    country,
    category,
    createdDate,
  );
  const now = new Date();
  const daysRemaining = Math.ceil(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysRemaining;
}

/**
 * Export all retention schedules for documentation and admin dashboard
 */
export function getAllRetentionSchedules(): Record<
  CountryCode,
  RetentionSchedule
> {
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
  const validCountries: CountryCode[] = ["IT", "UK", "DE", "ES", "FR"];
  if (!validCountries.includes(request.country)) {
    errors.push(`Invalid country code: ${request.country}`);
  }

  // Check reason
  const validReasons = ["user_request", "expiration", "account_closure"];
  if (!validReasons.includes(request.reason)) {
    errors.push(`Invalid deletion reason: ${request.reason}`);
  }

  // Check user ID
  if (!request.userId || request.userId.trim().length === 0) {
    errors.push("User ID is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
