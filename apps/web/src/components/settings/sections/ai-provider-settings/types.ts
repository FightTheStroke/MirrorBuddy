export interface CostSummary {
  totalCost: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  costsByService: Array<{ serviceName: string; cost: number }>;
}

export interface CostForecast {
  estimatedTotal: number;
  currency: string;
  forecastPeriodEnd: string;
}

export interface EnvVarStatus {
  name: string;
  configured: boolean;
  displayValue?: string;
}

export interface DetailedProviderStatus {
  activeProvider: 'azure' | 'ollama' | null;
  azure: {
    configured: boolean;
    model: string | null;
    realtimeConfigured: boolean;
    realtimeModel: string | null;
    envVars: EnvVarStatus[];
  };
  ollama: {
    configured: boolean;
    url: string;
    model: string;
    envVars: EnvVarStatus[];
  };
  services?: {
    braveSearch: {
      configured: boolean;
      fallback: string;
    };
  };
}

