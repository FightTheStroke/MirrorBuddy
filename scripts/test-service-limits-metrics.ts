/**
 * Test Service Limits Metrics Collection
 */
import { collectServiceLimitsSamples } from '../src/lib/observability/service-limits-metrics';

async function test() {
  console.log('Testing service limits metrics collection...\n');

  const instanceLabels = {
    instance: 'mirrorbuddy',
    env: 'test'
  };

  const timestamp = Date.now();

  try {
    const samples = await collectServiceLimitsSamples(instanceLabels, timestamp);

    console.log(`Collected ${samples.length} metric samples\n`);

    // Group by service
    const byService: Record<string, typeof samples> = {};
    samples.forEach(sample => {
      const service = sample.labels.service;
      if (!byService[service]) byService[service] = [];
      byService[service].push(sample);
    });

    for (const [service, metrics] of Object.entries(byService)) {
      console.log(`${service}:`);

      // Group by metric
      const byMetric: Record<string, typeof metrics> = {};
      metrics.forEach(m => {
        const metric = m.labels.metric;
        if (!byMetric[metric]) byMetric[metric] = [];
        byMetric[metric].push(m);
      });

      for (const [metric, metricSamples] of Object.entries(byMetric)) {
        console.log(`  ${metric}:`);
        metricSamples.forEach(s => {
          const type = s.labels.type ? ` (${s.labels.type})` : '';
          console.log(`    ${s.name}: ${s.value}${type}`);
        });
      }
      console.log('');
    }

    console.log('Test passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();
