/**
 * Business KPI types for Mission Control dashboard
 */

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  growthRate: number | null;
  totalRevenue: number | null;
  currency: string;
  isEstimated?: boolean;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  paidUsers: number;
  churnRate: number | null;
  trialConversionRate: number;
  isEstimated?: boolean;
}

export interface CountryMetric {
  country: string;
  countryCode: string;
  users: number;
  revenue: number | null;
}

export interface MaestroMetric {
  name: string;
  subject: string;
  sessions: number;
  avgDuration: number | null;
}

export interface BusinessKPIResponse {
  revenue: RevenueMetrics;
  users: UserMetrics;
  topCountries: CountryMetric[];
  topMaestri: MaestroMetric[];
  isEstimated?: boolean;
}
