export type CountryCode = 'IT' | 'UK' | 'DE' | 'ES' | 'FR';

export type DataCategory =
  | 'student_profile'
  | 'parent_contact'
  | 'consent_records'
  | 'educational_content'
  | 'interaction_logs'
  | 'ai_safety_logs'
  | 'breach_records'
  | 'audit_trails_detailed'
  | 'audit_trails_summary'
  | 'data_subject_requests';

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
  reason: 'user_request' | 'expiration' | 'account_closure';
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
