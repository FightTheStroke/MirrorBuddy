"""Live synthetic Azure measurement; no microphone, speaker, or physical acoustics.

Use PYTHONPATH=robot and --key-env; JSON never includes keys or transcript text.
The real dispatcher observes live events, but cancellation/replacement sends are
shadowed locally so the original response can finish for duration comparisons.
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import json
import logging
import math
import os
from pathlib import Path
import re
import time
from urllib.parse import quote

import websockets

from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient

RATE = 48_000  # 24 kHz mono signed 16-bit PCM bytes per second.
PROMPTS = (
    "The sun gives light and warmth. Plants use sunlight to grow.",
    "Il sole ci dona luce e calore. Le piante crescono grazie alla luce.",
    "student@example.com. This is a fictional address for a synthetic test.",
    "student@example.com. Questo indirizzo è inventato per una prova sintetica.",
)

def quantiles(values: list[float]) -> dict:
    ordered = sorted(values)
    if not ordered:
        return {"n": 0}
    return {"n": len(ordered), "min": ordered[0], "max": ordered[-1],
            **{label: ordered[max(0, math.ceil(q * len(ordered)) - 1)]
               for label, q in (("p50", .5), ("p95", .95), ("p99", .99))}}

class Observer:
    """Zero-start-delay virtual FIFO drained using actual monotonic elapsed time."""

    def __init__(self) -> None:
        self.started = self.received = self.tick = time.perf_counter()
        self.queued = self.played = self.forwarded = 0.0
        self.flush_ms: float | None = None
        self.exposure_ms: float | None = None
        self.played_at_flush_ms: float | None = None
        self.first_audio_ms: float | None = None
        self.first_callback_ms: float | None = None
        self.cancel_ms: float | None = None
        self.words_at_flush = 0
        self.text = ""
        self.chunks: list[float] = []
        self.delta_chars: list[int] = []
        self.delta_words: list[int] = []
        self.callback_on_audio = 0
        self.event_type = ""

    def advance(self) -> None:
        now = time.perf_counter()
        consumed = min(self.queued, now - self.tick)
        self.played += consumed
        self.queued -= consumed
        self.tick = now

    def audio(self, pcm: bytes) -> None:
        self.advance()
        self.queued += len(pcm) / RATE
        self.forwarded += len(pcm) / RATE
        if self.first_callback_ms is None:
            self.first_callback_ms = (time.perf_counter() - self.started) * 1000
        self.callback_on_audio += self.event_type.endswith("audio.delta")

    def flush(self) -> None:
        self.advance()
        self.queued = 0.0
        if self.flush_ms is None:
            self.flush_ms = (time.perf_counter() - self.received) * 1000
            self.exposure_ms = self.forwarded * 1000
            self.played_at_flush_ms = self.played * 1000
            self.words_at_flush = len(self.text.split())

    async def send(self, message: str) -> None:
        if json.loads(message).get("type") == "response.cancel":
            self.cancel_ms = (time.perf_counter() - self.received) * 1000
        await asyncio.sleep(0)  # Not an Azure cancellation round trip.

    def record(self, event: dict) -> None:
        self.received = time.perf_counter()
        self.event_type = event.get("type", "")
        if self.event_type.endswith("audio.delta"):
            self.chunks.append(len(base64.b64decode(event.get("delta") or "")) / RATE * 1000)
            if self.first_audio_ms is None:
                self.first_audio_ms = (self.received - self.started) * 1000
        if self.event_type.endswith("audio_transcript.delta"):
            text = event.get("delta") or ""
            self.text += text
            self.delta_chars.append(len(text))
            self.delta_words.append(len(text.split()))

    def result(self) -> dict:
        pcm_ms = sum(self.chunks)
        words = len(self.text.split())
        return {
            "response_complete_ms": (time.perf_counter() - self.started) * 1000,
            "first_audio_received_ms": self.first_audio_ms,
            "first_pcm_callback_ms": self.first_callback_ms,
            "immediate_audio_callbacks": self.callback_on_audio,
            "pcm_duration_ms": pcm_ms, "audio_chunk_ms": quantiles(self.chunks),
            "transcript_delta_chars": quantiles(self.delta_chars),
            "transcript_delta_word_fragments": quantiles(self.delta_words),
            "transcript_words": words, "rejected": self.flush_ms is not None,
            "receipt_to_queue_flush_ms": self.flush_ms,
            "receipt_to_shadow_cancel_ms": self.cancel_ms,
            "forwarded_audio_ceiling_ms": self.exposure_ms,
            "simulated_playout_before_flush_ms": self.played_at_flush_ms,
            "transcript_words_received_at_flush": self.words_at_flush,
        }

def client(observer: Observer) -> AzureRealtimeClient:
    instance = AzureRealtimeClient("", "", "", "alloy", {},
                                   on_output_audio=observer.audio,
                                   on_speech_started=observer.flush)
    instance._safe_send = observer.send
    return instance

async def benchmark(iterations: int) -> dict:
    instance = client(Observer())
    await instance._handle_event({"type": "response.created", "response": {"id": "bench"}})
    encoded = base64.b64encode(bytes(4800)).decode()
    event = {"type": "response.output_audio.delta", "response_id": "bench",
             "item_id": "item", "content_index": 0, "delta": encoded}
    delivered = []
    instance.on_output_audio = delivered.append
    await instance._handle_event(event)
    if not delivered:
        raise ValueError("Benchmark requires immediate PCM delivery")
    instance.on_output_audio = lambda pcm: None
    direct, dispatcher = [], []
    for iteration in range(iterations + 200):
        # Alternate order to reduce systematic warm-cache/order bias.
        for mode in ((0, 1) if iteration % 2 else (1, 0)):
            start = time.perf_counter_ns()
            if mode:
                await instance._handle_event(event)
            else:
                instance.on_output_audio(base64.b64decode(encoded))
            elapsed = (time.perf_counter_ns() - start) / 1000
            if iteration >= 200:
                (dispatcher if mode else direct).append(elapsed)
    return {"iterations": iterations, "pcm_chunk_ms": 100,
            "legacy_decode_callback_us": quantiles(direct),
            "dispatcher_us": quantiles(dispatcher),
            "paired_overhead_us": quantiles([b - a for a, b in zip(direct, dispatcher)])}

async def measure(args: argparse.Namespace) -> dict:
    key = os.environ.get(args.key_env) or ""
    if not key:
        raise ValueError("Selected key environment variable is empty")
    uri = args.endpoint.rstrip("/") + "/openai/v1/realtime?model=" + quote(args.model)
    samples, all_chars, all_words, all_chunks = [], [], [], []
    async with websockets.connect(uri, additional_headers={"api-key": key},
                                  open_timeout=20, max_size=4_000_000) as socket:
        await socket.send(json.dumps({"type": "session.update", "session": {
            "type": "realtime", "output_modalities": ["audio"],
            "audio": {"output": {"format": {"type": "audio/pcm", "rate": 24000},
                                 "voice": "alloy"}},
        }}))
        async with asyncio.timeout(20):
            while True:
                event = json.loads(await socket.recv())
                if event.get("type") == "error":
                    raise ValueError("Azure session error: " + str(event.get("error", {}).get("code")))
                if event.get("type") == "session.updated":
                    break
        for index in range(args.samples):
            observer = Observer()
            instance = client(observer)
            await socket.send(json.dumps({"type": "response.create", "response": {
                "conversation": "none", "input": [], "max_output_tokens": 180,
                "instructions": "Read exactly this synthetic test sentence, without additions: "
                                + PROMPTS[index % len(PROMPTS)],
            }}))
            async with asyncio.timeout(45):
                while True:
                    event = json.loads(await socket.recv())
                    observer.record(event)
                    if event.get("type") == "error":
                        raise ValueError("Azure response error: " + str(event.get("error", {}).get("code")))
                    await instance._handle_event(event)
                    if event.get("type") == "response.done":
                        result = observer.result()
                        result.update(sample=index + 1, prompt_index=index % len(PROMPTS),
                                      status=(event.get("response") or {}).get("status"))
                        samples.append(result)
                        all_chars.extend(observer.delta_chars)
                        all_words.extend(observer.delta_words)
                        all_chunks.extend(observer.chunks)
                        break
    source = Path(__file__).resolve().parents[1] / "reachy_mini_mirrorbuddy/rt_safety.py"
    return {
        "mode": "live_azure_events_shadow_local_cancellation", "model": args.model,
        "safety_source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "samples": samples, "pooled_delta_chars": quantiles(all_chars),
        "pooled_delta_word_fragments": quantiles(all_words),
        "pooled_audio_chunk_ms": quantiles(all_chunks),
        "benchmark": await benchmark(args.iterations),
        "limitations": [
            "No physical audio, hardware queues, acoustic measurements, or Azure cancel timing.",
            "Virtual FIFO uses real arrival/callback times, zero initial buffering, no device latency.",
            "All forwarded PCM before rejection is an exposure ceiling, not all unsafe speech.",
            "Word fragments use whitespace splitting; no acoustic word alignment exists.",
            "Flagged test prompts start with a fictitious email; no safe lead-in is requested.",
            "Cancellation and replacement are shadowed; response duration is uninterrupted.",
            "Small synthetic sample is descriptive, not population-typical or a worst-case bound.",
            "Receipt timestamps follow JSON parsing; instrumentation adds local observer overhead.",
            "Arbitrary audio/transcript ordering has no finite bound without a server guarantee.",
        ],
    }

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint", required=True, help="wss://existing-resource.openai.azure.com")
    parser.add_argument("--model", default="gpt-realtime")
    parser.add_argument("--key-env", default="AZURE_OPENAI_API_KEY")
    parser.add_argument("--samples", type=int, choices=range(1, 11), default=8)
    parser.add_argument("--iterations", type=int, default=10000)
    parser.add_argument("--benchmark-only", action="store_true")
    args = parser.parse_args()
    if not re.fullmatch(r"wss://[a-zA-Z0-9.-]+\.openai\.azure\.com/?", args.endpoint):
        parser.error("An Azure OpenAI wss endpoint is required")
    if args.iterations < 1:
        parser.error("iterations must be positive")
    logging.disable(logging.CRITICAL)
    try:
        job = benchmark(args.iterations) if args.benchmark_only else measure(args)
        print(json.dumps(asyncio.run(job), indent=2))
    except Exception as error:
        print(json.dumps({"measurement_failed": True, "error_type": type(error).__name__}))
        raise SystemExit(1) from None

if __name__ == "__main__":
    main()
