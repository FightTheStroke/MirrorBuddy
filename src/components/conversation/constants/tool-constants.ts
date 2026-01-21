import type { ToolType } from "@/types/tools";

export const TOOL_PROMPTS: Record<ToolType, string> = {
  mindmap: "Crea una mappa mentale su questo argomento",
  quiz: "Crea un quiz per verificare la mia comprensione",
  flashcard: "Crea delle flashcard per memorizzare",
  demo: "Crea una demo interattiva per visualizzare",
  search: "Cerca risorse educative su questo argomento",
  webcam: "Voglio scattare una foto",
  diagram: "Crea un diagramma",
  timeline: "Crea una linea del tempo",
  summary: "Crea un riassunto",
  formula: "Mostra la formula",
  calculator: "Calcola questa espressione",
  chart: "Crea un grafico",
  pdf: "Analizza il PDF",
  homework: "Aiutami con i compiti",
  typing: "Voglio imparare a digitare",
  "study-kit": "Crea un kit di studio",
};
