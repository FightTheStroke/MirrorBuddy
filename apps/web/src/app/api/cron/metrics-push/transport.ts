import { MetricsPushError } from '@/lib/observability/prometheus-push-service';
import type { MetricSample } from './collector-utils';

function formatInfluxLineProtocol(samples: MetricSample[]): string {
  return samples
    .map((sample) => {
      const tags = Object.entries(sample.labels)
        .map(([key, value]) => `${key}=${value.replace(/[\\,= ]/g, '\\$&')}`)
        .join(',');
      return `${sample.name},${tags} value=${sample.value} ${sample.timestamp * 1000000}`;
    })
    .join('\n');
}

/** The route owns reporting so network and HTTP failures each produce one warning. */
export async function pushToGrafana(samples: MetricSample[]): Promise<void> {
  const url = process.env.GRAFANA_CLOUD_PROMETHEUS_URL?.trim();
  const user = process.env.GRAFANA_CLOUD_PROMETHEUS_USER?.trim();
  const apiKey = process.env.GRAFANA_CLOUD_API_KEY?.trim();
  if (!url || !user || !apiKey) {
    throw new Error('Grafana Cloud config incomplete');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      Authorization: `Basic ${Buffer.from(`${user}:${apiKey}`).toString('base64')}`,
    },
    body: formatInfluxLineProtocol(samples),
  });
  if (!response.ok) {
    throw new MetricsPushError(response.status, '');
  }
}
