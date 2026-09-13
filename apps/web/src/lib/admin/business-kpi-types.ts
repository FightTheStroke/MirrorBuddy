/**
 * Business KPI types for Mission Control dashboard
 */

import type { MetricTruth } from './metric-truth';

export interface RevenueMetrics {
  mrr: number | null;
  arr: number | null;
  growthRate: number | null;
  totalRevenue: number | null;
  currency: string;
  isEstimated?: boolean;
}

export interface UserMetrics {
  totalUsers: number | null;
  activeUsers: number | null;
  trialUsers: number | null;
  paidUsers: number | null;
  churnRate: number | null;
  trialConversionRate: number | null;
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
  metrics: {
    mrr: MetricTruth;
    arr: MetricTruth;
    totalUsers: MetricTruth;
    activeUsers: MetricTruth;
    trialUsers: MetricTruth;
    paidUsers: MetricTruth;
    churnRate: MetricTruth;
    trialConversionRate: MetricTruth;
    growthRate: MetricTruth;
    totalRevenue: MetricTruth;
    topCountries: MetricTruth<CountryMetric[]>;
    topMaestri: MetricTruth<MaestroMetric[]>;
  };
  revenue: RevenueMetrics;
  users: UserMetrics;
  topCountries: CountryMetric[];
  topMaestri: MaestroMetric[];
  isEstimated?: boolean;
}
