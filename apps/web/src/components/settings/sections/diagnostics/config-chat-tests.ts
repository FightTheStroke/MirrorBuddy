import type { DiagnosticResult } from "./types";
import { csrfFetch } from "@/lib/auth";

export async function runConfigCheck(): Promise<DiagnosticResult> {
  try {
    const res = await fetch("/api/provider/status");
    const data = await res.json();

    if (data.activeProvider) {
      return {
        status: "success",
        message: `Provider attivo: ${data.activeProvider}`,
        details:
          data.activeProvider === "azure"
            ? `Chat: ${data.azure.model || "N/A"}, Voice: ${data.azure.realtimeModel || "Non configurato"}`
            : `Model: ${data.ollama.model}`,
      };
    } else {
      return {
        status: "error",
        message: "Nessun provider configurato",
        details: "Configura Azure OpenAI o avvia Ollama",
      };
    }
  } catch (error) {
    return {
      status: "error",
      message: "Errore connessione API",
      details: String(error),
    };
  }
}

export async function runChatTest(): Promise<DiagnosticResult> {
  try {
    const res = await csrfFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: 'Rispondi solo con "OK"' }],
        systemPrompt: "Sei un assistente. Rispondi brevemente in italiano.",
        maxTokens: 50,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const responseContent =
      data.choices?.[0]?.message?.content || data.content || "No response";
    const provider = data.provider || "unknown";
    const model = data.model || "unknown";

    return {
      status: "success",
      message: `Chat API funzionante (${provider}/${model})`,
      details: `Risposta: "${responseContent.substring(0, 80)}"`,
    };
  } catch (error) {
    return {
      status: "error",
      message: "Chat API non funzionante",
      details: String(error),
    };
  }
}
