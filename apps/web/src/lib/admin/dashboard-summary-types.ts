import type { ServiceStatus } from './health-aggregator-types';
import type { MetricTruth } from './metric-truth';

export interface DashboardSummary {
  health: {
    overallStatus: ServiceStatus;
    servicesDownCount: number;
  };
  safety: {
    unresolvedCount: number | null;
  };
  cost: {
    totalEur: number | null;
  };
  business: {
    mrr: number | null;
    trialConversionRate: number | null;
    churnRate: number | null;
  };
  metrics: {
    health: MetricTruth<ServiceStatus>;
    servicesDown: MetricTruth;
    safety: MetricTruth;
    cost: MetricTruth;
    dailyCost: MetricTruth;
    mrr: MetricTruth;
    trialConversionRate: MetricTruth;
    churnRate: MetricTruth;
  };
  generatedAt: string;
}
