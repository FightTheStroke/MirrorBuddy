/**
 * Business KPI types for Mission Control dashboard
 */

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  growthRate: number;
  totalRevenue: number;
  currency: string;
  isEstimated?: boolean;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  trialUsers: number;
  paidUsers: number;
  churnRate: number;
  trialConversionRate: number;
  isEstimated?: boolean;
}

export interface CountryMetric {
  country: string;
  countryCode: string;
  users: number;
  revenue: number;
}

export interface MaestroMetric {
  name: string;
  subject: string;
  sessions: number;
  avgDuration: number;
}

export interface BusinessKPIResponse {
  revenue: RevenueMetrics;
  users: UserMetrics;
  topCountries: CountryMetric[];
  topMaestri: MaestroMetric[];
  isEstimated?: boolean;
}
