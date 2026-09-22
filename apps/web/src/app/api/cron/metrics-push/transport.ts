import { logger } from '@/lib/logger';
import { MetricsPushError } from '@/lib/observability/metrics-push-error';
import type { MetricSample } from './collector-utils';

const log = logger.child({ module: 'metrics-push-transport' });

/** Grafana needs separators escaped wherever they appear, names and keys included. */
function escapeKey(raw: string): string {
  return raw.replace(/[\\,= ]/g, '\\$&');
}

function formatInfluxLineProtocol(samples: MetricSample[]): string {
  return samples
    .map((sample) => {
      const tags = Object.entries(sample.labels)
        .map(([key, value]) => `${escapeKey(key)}=${escapeKey(value)}`)
        .join(',');
      return `${escapeKey(sample.name)},${tags} value=${sample.value} ${sample.timestamp * 1000000}`;
    })
    .join('\n');
}

/**
 * Grafana refuses a whole batch over a single malformed line — an empty label
 * value is enough — so one bad sample used to cost every metric in the push.
 * Anything it would reject is dropped here instead, and named, so the remaining
 * metrics still arrive and the source of the bad sample can be found.
 */
function isAcceptable(sample: MetricSample): boolean {
  if (typeof sample.name !== 'string' || sample.name.trim() === '') return false;
  if (!Number.isFinite(sample.value) || !Number.isFinite(sample.timestamp)) return false;
  if (!sample.labels || typeof sample.labels !== 'object') return false;
  return Object.entries(sample.labels).every(
    ([key, value]) => key.trim() !== '' && typeof value === 'string' && value.trim() !== '',
  );
}

/** The route owns reporting so network and HTTP failures each produce one warning. */
export async function pushToGrafana(samples: MetricSample[]): Promise<void> {
  const url = process.env.GRAFANA_CLOUD_PROMETHEUS_URL?.trim();
  const user = process.env.GRAFANA_CLOUD_PROMETHEUS_USER?.trim();
  const apiKey = process.env.GRAFANA_CLOUD_API_KEY?.trim();
  if (!url || !user || !apiKey) {
    throw new Error('Grafana Cloud config incomplete');
  }

  const sendable = samples.filter(isAcceptable);
  if (sendable.length !== samples.length) {
    const rejected = samples.filter((sample) => !isAcceptable(sample));
    log.warn('Dropped metric samples Grafana would refuse', {
      dropped: rejected.length,
      metrics: [...new Set(rejected.map((sample) => String(sample.name)))].join(','),
    });
  }
  if (sendable.length === 0) return;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      Authorization: `Basic ${Buffer.from(`${user}:${apiKey}`).toString('base64')}`,
    },
    body: formatInfluxLineProtocol(sendable),
  });
  if (!response.ok) {
    throw new MetricsPushError(response.status, '');
  }
}
