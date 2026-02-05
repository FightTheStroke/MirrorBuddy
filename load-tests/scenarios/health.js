/**
 * k6 Load Test: Health Check Baseline
 *
 * Tests /api/health and /api/health/detailed endpoints.
 * This is the simplest scenario - used to establish baseline latency
 * and verify infrastructure is handling concurrent connections.
 *
 * Usage:
 *   k6 run scenarios/health.js
 *   k6 run --env BASE_URL=https://mirrorbuddy-git-BRANCH.vercel.app scenarios/health.js
 *
 * Plan 102 - W2-Scalability [T2-01]
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import {
  BASE_URL,
  DEFAULT_THRESHOLDS,
  BASELINE_STAGES,
  SMOKE_STAGES,
} from "../config.js";

// Custom metrics
const healthLatency = new Trend("health_latency");
const healthErrors = new Rate("health_errors");
const healthChecks = new Counter("health_checks_total");

// Profile selection
const profile = __ENV.PROFILE || "baseline";

export const options = {
  stages: profile === "smoke" ? SMOKE_STAGES : BASELINE_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    health_latency: ["p(95)<200", "p(99)<500"],
    health_errors: ["rate<0.001"],
  },
};

export default function healthScenario() {
  // Basic health check
  const healthRes = http.get(`${BASE_URL}/api/health`);

  check(healthRes, {
    "health status 200": (r) => r.status === 200,
    "health latency < 200ms": (r) => r.timings.duration < 200,
  });

  healthLatency.add(healthRes.timings.duration);
  healthErrors.add(healthRes.status !== 200);
  healthChecks.add(1);

  sleep(1);
}
