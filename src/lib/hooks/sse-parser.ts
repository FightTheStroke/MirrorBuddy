/**
 * SSE Stream Parser
 * Parses Server-Sent Events from streaming responses
 *
 * @see ADR 0034 for streaming architecture
 */

import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { StreamUsage, SSEParserCallbacks } from "./streaming-types";

/**
 * Parse SSE stream from ReadableStream
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: SSEParserCallbacks,
): Promise<void> {
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";
  let localUsage: StreamUsage | undefined;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) continue;

      if (trimmedLine.startsWith("data: ")) {
        const data = trimmedLine.slice(6);

        if (data === "[DONE]") {
          callbacks.onDone(accumulated, localUsage);
          return;
        }

        try {
          const parsed = JSON.parse(data);

          if (parsed.content) {
            accumulated += parsed.content;
            callbacks.onContent(parsed.content, accumulated);
          }

          if (parsed.blocked || parsed.filtered) {
            callbacks.onFiltered();
          }

          if (parsed.usage) {
            localUsage = parsed.usage;
            callbacks.onUsage(parsed.usage);
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch (_parseError) {
          logger.warn("[SSEParser] Failed to parse SSE data", {
            data: data.substring(0, 100),
          });
        }
      }
    }
  }

  // Stream ended without [DONE] signal
  callbacks.onDone(accumulated, localUsage);
}

/**
 * Make streaming API request
 */
export async function fetchStreamingResponse(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  maestroId: string,
  enableMemory: boolean,
  signal: AbortSignal,
): Promise<Response> {
  const response = await csrfFetch("/api/chat/stream", {
    method: "POST",
    body: JSON.stringify({
      messages,
      systemPrompt,
      maestroId,
      enableMemory,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));

    if (errorData.fallback) {
      logger.warn("[SSEParser] Streaming not available, use fallback", {
        fallback: errorData.fallback,
      });
    }

    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const contentType = response.headers.get("Content-Type");
  if (!contentType?.includes("text/event-stream")) {
    throw new Error("Expected SSE response");
  }

  return response;
}
