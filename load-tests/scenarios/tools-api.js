/**
 * k6 Load Test: Tools API
 *
 * Tests tool-related endpoints (mind maps, flashcards, quizzes).
 * These are CPU/AI-intensive operations that call Azure OpenAI.
 *
 * Usage:
 *   k6 run --env BASE_URL=https://mirrorbuddy-git-BRANCH.vercel.app \
 *          --env AUTH_COOKIE=signed-user-id \
 *          scenarios/tools-api.js
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
  getAuthHeaders,
} from "../config.js";

// Custom metrics
const toolLatency = new Trend("tool_latency");
const toolErrors = new Rate("tool_errors");
const toolRequests = new Counter("tool_requests_total");

const profile = __ENV.PROFILE || "baseline";

export const options = {
  stages: profile === "smoke" ? SMOKE_STAGES : BASELINE_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    tool_latency: ["p(95)<5000", "p(99)<15000"],
    tool_errors: ["rate<0.05"],
  },
};

const TOOL_REQUESTS = [
  {
    endpoint: "/api/tools/mindmap",
    body: { topic: "Il sistema solare", maestroId: "galileo-scienze" },
  },
  {
    endpoint: "/api/tools/flashcards",
    body: { topic: "Equazioni di primo grado", count: 5 },
  },
  {
    endpoint: "/api/tools/quiz",
    body: { topic: "La fotosintesi", difficulty: "basic", count: 5 },
  },
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function toolsApiScenario() {
  const headers = getAuthHeaders();
  const tool = randomFrom(TOOL_REQUESTS);

  const res = http.post(
    `${BASE_URL}${tool.endpoint}`,
    JSON.stringify(tool.body),
    { headers, timeout: "30s" },
  );

  check(res, {
    "tool status 200": (r) => r.status === 200,
    "tool has body": (r) => r.body && r.body.length > 10,
  });

  toolLatency.add(res.timings.duration);
  toolErrors.add(res.status !== 200);
  toolRequests.add(1);

  // Tool generation is slow - simulate user processing result (10-30s)
  sleep(10 + Math.random() * 20);
}
