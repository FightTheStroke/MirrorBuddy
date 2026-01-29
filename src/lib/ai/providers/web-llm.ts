/**
 * 💻 Edge AI Provider (WebLLM / WebGPU)
 *
 * Allows running LLMs directly in the browser for maximum privacy
 * and offline capabilities.
 */

import { ChatCompletionResult } from "./types";
import { logger } from "@/lib/logger";

/**
 * Lazy-load WebLLM to keep initial bundle small
 */
async function getWebLLM() {
  return await import("@mlc-ai/web-llm");
}

export class WebLLMProvider {
  private engine: unknown = null;
  private modelId: string = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

  /**
   * Initializes the local engine
   */
  async init(onProgress?: (progress: number) => void) {
    if (this.engine) return;

    logger.info(`Initializing Edge AI model: ${this.modelId}`);
    const { CreateWebWorkerMLCEngine } = await getWebLLM();

    this.engine = await CreateWebWorkerMLCEngine(
      new Worker(new URL("./web-llm-worker.ts", import.meta.url)),
      this.modelId,
      {
        initProgressCallback: (report) => {
          if (onProgress) onProgress(report.progress);
          logger.debug(`Model loading: ${report.text}`);
        },
      },
    );
  }

  /**
   * Local inference
   */
  async chatCompletion(
    messages: { role: string; content: string }[],
    systemPrompt: string,
    temperature: number = 0.7,
  ): Promise<ChatCompletionResult> {
    if (!this.engine) {
      await this.init();
    }

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = this.engine as any;
    const reply = await engine.chat.completions.create({
      messages: allMessages,
      temperature,
    });

    const content = reply.choices[0].message.content || "";

    return {
      content,
      provider: "web-llm",
      model: this.modelId,
      usage: reply.usage,
    };
  }
}

export const edgeAI = new WebLLMProvider();
