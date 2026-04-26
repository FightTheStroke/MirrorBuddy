/**
 * Azure Cost Management types
 */

export interface CostByService {
  serviceName: string;
  cost: number;
  currency: string;
}

export interface DailyCost {
  date: string;
  cost: number;
}

export interface CostSummary {
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  currency: string;
  costsByService: CostByService[];
  dailyCosts: DailyCost[];
  source: 'service_principal' | 'az_cli';
}

export interface CostForecast {
  subscriptionId: string;
  forecastPeriodEnd: string;
  estimatedTotal: number;
  currency: string;
  source: 'service_principal' | 'az_cli';
}
