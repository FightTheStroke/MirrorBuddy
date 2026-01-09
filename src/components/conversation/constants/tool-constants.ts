import type { ToolType } from '@/types/tools';

export const FUNCTION_NAME_TO_TOOL_TYPE: Record<string, ToolType> = {
  create_mindmap: 'mindmap',
  create_quiz: 'quiz',
  create_demo: 'demo',
  web_search: 'search',
  create_flashcards: 'flashcard',
  create_diagram: 'diagram',
  create_timeline: 'timeline',
  create_summary: 'summary',
  open_student_summary: 'summary',
};

export const TOOL_PROMPTS: Record<ToolType, string> = {
  mindmap: 'Crea una mappa mentale su questo argomento',
  quiz: 'Crea un quiz per verificare la mia comprensione',
  flashcard: 'Crea delle flashcard per memorizzare',
  demo: 'Crea una demo interattiva per visualizzare',
  search: 'Cerca risorse educative su questo argomento',
  webcam: 'Voglio scattare una foto',
  diagram: 'Crea un diagramma',
  timeline: 'Crea una linea del tempo',
  summary: 'Crea un riassunto',
  formula: 'Mostra la formula',
  chart: 'Crea un grafico',
  pdf: 'Analizza il PDF',
  homework: 'Aiutami con i compiti',
  'study-kit': 'Crea un kit di studio',
};

