export interface MetricDataPoint {
  date: Date;
  value: number;
}

export interface SuccessMetric {
  id: 'engagement' | 'autonomy' | 'method' | 'emotional';
  name: string;
  description: string;
  currentScore: number;
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  history: MetricDataPoint[];
  subMetrics: SubMetric[];
}

export interface SubMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
}

export interface SuccessMetricsData {
  studentId: string;
  studentName: string;
  lastUpdated: Date;
  overallScore: number;
  metrics: SuccessMetric[];
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achievedAt?: Date;
  metricId: 'engagement' | 'autonomy' | 'method' | 'emotional';
}

