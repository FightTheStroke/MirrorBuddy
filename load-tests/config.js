/**
 * Shared k6 Load Test Configuration
 *
 * Usage: k6 run --env BASE_URL=https://staging.mirrorbuddy.app scenarios/chat-api.js
 *
 * Plan 102 - W2-Scalability [T2-01]
 */

// Base URL defaults to staging
export const BASE_URL = __ENV.BASE_URL || "https://staging.mirrorbuddy.app";

// Authentication cookie for authenticated endpoints
export const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";

// CRON_SECRET for cron endpoint testing
export const CRON_SECRET = __ENV.CRON_SECRET || "";

/**
 * Default thresholds (SLI/SLO aligned)
 * Reference: docs/operations/SLI-SLO.md
 */
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ["p(95)<500", "p(99)<1500"],
  http_req_failed: ["rate<0.01"],
  http_reqs: ["rate>10"],
};

/**
 * Baseline load profile: 100 → 500 → 1K VUs
 */
export const BASELINE_STAGES = [
  // Stage 1: 100 VUs
  { duration: "2m", target: 100 },
  { duration: "3m", target: 100 },
  // Stage 2: 500 VUs
  { duration: "3m", target: 500 },
  { duration: "5m", target: 500 },
  // Stage 3: 1K VUs
  { duration: "5m", target: 1000 },
  { duration: "5m", target: 1000 },
  // Ramp-down
  { duration: "2m", target: 0 },
];

/**
 * High load profile: 5K → 10K VUs
 */
export const HIGH_LOAD_STAGES = [
  { duration: "5m", target: 1000 },
  { duration: "5m", target: 5000 },
  { duration: "10m", target: 5000 },
  { duration: "5m", target: 10000 },
  { duration: "10m", target: 10000 },
  { duration: "5m", target: 0 },
];

/**
 * Smoke test profile (quick validation)
 */
export const SMOKE_STAGES = [
  { duration: "30s", target: 5 },
  { duration: "1m", target: 5 },
  { duration: "30s", target: 0 },
];

/**
 * Common headers for authenticated requests
 */
export function getAuthHeaders() {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (AUTH_COOKIE) {
    headers["Cookie"] = `mirrorbuddy-user-id=${AUTH_COOKIE}`;
  }

  return headers;
}

/**
 * Common headers for cron endpoints
 */
export function getCronHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${CRON_SECRET}`,
  };
}
