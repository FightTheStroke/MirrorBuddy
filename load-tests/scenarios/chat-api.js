/**
 * k6 Load Test: Chat API
 *
 * Tests POST /api/chat (conversation create) and POST /api/chat/stream (message send).
 * Simulates realistic user behavior: create conversation, send message, wait, repeat.
 *
 * Usage:
 *   k6 run --env BASE_URL=https://staging.mirrorbuddy.app \
 *          --env AUTH_COOKIE=signed-user-id \
 *          scenarios/chat-api.js
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
const chatCreateLatency = new Trend("chat_create_latency");
const chatStreamLatency = new Trend("chat_stream_latency");
const chatErrors = new Rate("chat_errors");
const chatMessages = new Counter("chat_messages_total");

const profile = __ENV.PROFILE || "baseline";

export const options = {
  stages: profile === "smoke" ? SMOKE_STAGES : BASELINE_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    chat_create_latency: ["p(95)<1000", "p(99)<3000"],
    chat_stream_latency: ["p(95)<5000", "p(99)<10000"],
    chat_errors: ["rate<0.05"],
  },
};

const MAESTRI = [
  "euclide-matematica",
  "dante-letteratura",
  "galileo-scienze",
  "leonardo-arte",
  "vivaldi-musica",
];

const MESSAGES = [
  "Puoi spiegarmi il teorema di Pitagora?",
  "Come si calcola l'area di un cerchio?",
  "Cos'è la fotosintesi?",
  "Parlami della Divina Commedia",
  "Chi era Leonardo da Vinci?",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  const headers = getAuthHeaders();
  const maestroId = randomFrom(MAESTRI);
  const message = randomFrom(MESSAGES);

  // Step 1: Create or resume conversation
  const createRes = http.post(
    `${BASE_URL}/api/chat`,
    JSON.stringify({ maestroId }),
    { headers },
  );

  check(createRes, {
    "chat create 200": (r) => r.status === 200 || r.status === 201,
  });

  chatCreateLatency.add(createRes.timings.duration);

  if (createRes.status !== 200 && createRes.status !== 201) {
    chatErrors.add(1);
    sleep(2);
    return;
  }

  let conversationId;
  try {
    const body = JSON.parse(createRes.body);
    conversationId = body.id || body.conversationId;
  } catch {
    chatErrors.add(1);
    sleep(2);
    return;
  }

  // Step 2: Send message via streaming endpoint
  const streamRes = http.post(
    `${BASE_URL}/api/chat/stream`,
    JSON.stringify({
      conversationId,
      maestroId,
      message,
    }),
    { headers, timeout: "30s" },
  );

  check(streamRes, {
    "stream 200": (r) => r.status === 200,
    "stream has body": (r) => r.body && r.body.length > 0,
  });

  chatStreamLatency.add(streamRes.timings.duration);
  chatErrors.add(streamRes.status !== 200);
  chatMessages.add(1);

  // Simulate user reading response (3-8 seconds)
  sleep(3 + Math.random() * 5);
}
