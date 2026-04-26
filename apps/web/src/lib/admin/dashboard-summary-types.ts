import type { ServiceStatus } from './health-aggregator-types';

export interface DashboardSummary {
  health: {
    overallStatus: ServiceStatus;
    servicesDownCount: number;
  };
  safety: {
    unresolvedCount: number;
  };
  cost: {
    totalEur: number;
  };
  business: {
    mrr: number;
    trialConversionRate: number;
    churnRate: number | null;
  };
  generatedAt: string;
}
