/**
 * k6 Load Test: Voice TTS API
 *
 * Tests POST /api/tts (text-to-speech generation).
 * TTS is resource-intensive (Azure Cognitive Services) so we use
 * conservative thresholds and realistic think-time.
 *
 * Usage:
 *   k6 run --env BASE_URL=https://mirrorbuddy-git-BRANCH.vercel.app \
 *          --env AUTH_COOKIE=signed-user-id \
 *          scenarios/voice-tts.js
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
const ttsLatency = new Trend("tts_latency");
const ttsErrors = new Rate("tts_errors");
const ttsRequests = new Counter("tts_requests_total");

const profile = __ENV.PROFILE || "baseline";

export const options = {
  stages: profile === "smoke" ? SMOKE_STAGES : BASELINE_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    tts_latency: ["p(95)<3000", "p(99)<8000"],
    tts_errors: ["rate<0.05"],
  },
};

const TTS_TEXTS = [
  "Il teorema di Pitagora afferma che la somma dei quadrati costruiti sui cateti.",
  "La fotosintesi clorofilliana è il processo biologico attraverso il quale le piante.",
  "Leonardo da Vinci nacque il quindici aprile millequattrocentocinquantadue.",
  "La Divina Commedia è un poema allegorico di Dante Alighieri.",
  "La musica barocca si sviluppò tra il sedicesimo e il diciottesimo secolo.",
];

const VOICE_IDS = [
  "it-IT-IsabellaNeural",
  "it-IT-DiegoNeural",
  "it-IT-ElsaNeural",
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function voiceTtsScenario() {
  const headers = getAuthHeaders();

  // Generate TTS audio
  const ttsRes = http.post(
    `${BASE_URL}/api/tts`,
    JSON.stringify({
      text: randomFrom(TTS_TEXTS),
      voice: randomFrom(VOICE_IDS),
      speed: 1.0,
    }),
    { headers, timeout: "15s", responseType: "binary" },
  );

  check(ttsRes, {
    "tts status 200": (r) => r.status === 200,
    "tts has audio": (r) => r.body && r.body.byteLength > 1000,
    "tts latency < 3s": (r) => r.timings.duration < 3000,
  });

  ttsLatency.add(ttsRes.timings.duration);
  ttsErrors.add(ttsRes.status !== 200);
  ttsRequests.add(1);

  // Simulate user listening to audio (5-15 seconds)
  sleep(5 + Math.random() * 10);
}
