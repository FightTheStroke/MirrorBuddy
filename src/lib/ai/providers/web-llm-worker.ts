import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * WebWorker handler for Edge AI inference
 */
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => {
  handler.onmessage(msg);
};
