/**
 * Homework analysis helpers
 */

import { logger } from '@/lib/logger';

export interface HomeworkStep {
  id: string;
  description: string;
  hints: string[];
  studentNotes: string;
  completed: boolean;
}

export interface AnalysisResult {
  title: string;
  subject: string;
  problemType: string;
  steps: HomeworkStep[];
}

const VALID_SUBJECTS = [
  'mathematics', 'physics', 'chemistry', 'biology', 'history', 'geography',
  'italian', 'english', 'art', 'music', 'civics', 'economics',
  'computerScience', 'health', 'philosophy', 'internationalLaw'
] as const;

const SUBJECT_MAP: Record<string, string> = {
  'math': 'mathematics',
  'maths': 'mathematics',
  'science': 'biology',
  'cs': 'computerScience',
  'pe': 'health',
  'law': 'internationalLaw',
  'matematica': 'mathematics',
  'fisica': 'physics',
  'chimica': 'chemistry',
  'biologia': 'biology',
  'scienze': 'biology',
  'storia': 'history',
  'geografia': 'geography',
  'italiano': 'italian',
  'inglese': 'english',
  'arte': 'art',
  'musica': 'music',
  'educazione civica': 'civics',
  'economia': 'economics',
  'informatica': 'computerScience',
  'salute': 'health',
  'filosofia': 'philosophy',
  'diritto': 'internationalLaw',
};

/**
 * Normalize AI-detected subject to valid Subject enum value
 */
export function normalizeSubject(subject: string): string {
  if (!subject) return 'other';
  const lower = subject.toLowerCase().trim();

  if (VALID_SUBJECTS.includes(lower as typeof VALID_SUBJECTS[number])) {
    return lower;
  }

  if (SUBJECT_MAP[lower]) {
    return SUBJECT_MAP[lower];
  }

  for (const [key, value] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  return 'other';
}

/**
 * Get default fallback analysis structure
 */
export function getDefaultAnalysis(): AnalysisResult {
  return {
    title: 'Problema da analizzare',
    subject: 'other',
    problemType: 'Esercizio',
    steps: [
      {
        id: '1',
        description: 'Leggi attentamente il problema',
        hints: ['Cosa ti viene chiesto?', 'Quali dati hai?'],
        studentNotes: '',
        completed: false,
      },
      {
        id: '2',
        description: 'Identifica il metodo di risoluzione',
        hints: ['Che tipo di problema e?', 'Quali formule conosci?'],
        studentNotes: '',
        completed: false,
      },
      {
        id: '3',
        description: 'Risolvi passo passo',
        hints: ['Qual e il primo calcolo?', 'Controlla ogni passaggio'],
        studentNotes: '',
        completed: false,
      },
    ],
  };
}

/**
 * Parse homework analysis from Azure response content
 */
export function parseAnalysisResponse(content: string): AnalysisResult {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
      content.match(/```\s*([\s\S]*?)\s*```/) ||
      [null, content];
    const jsonStr = jsonMatch[1] || content;
    return JSON.parse(jsonStr.trim());
  } catch {
    logger.warn('Failed to parse homework analysis, using default', { content: content.slice(0, 100) });
    return getDefaultAnalysis();
  }
}

/**
 * Call Azure OpenAI vision API for homework analysis
 */
export async function analyzeHomeworkWithAzure(
  image: string,
  systemPrompt: string | undefined,
  provider: { provider: string; endpoint: string; apiKey?: string; model: string }
): Promise<{ success: boolean; analysis?: AnalysisResult; error?: string }> {
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
  const visionModel = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || provider.model;
  const url = `${provider.endpoint}/openai/deployments/${visionModel}/chat/completions?api-version=${apiVersion}`;

  const analysisPrompt = `${systemPrompt || ''}

Analizza questa immagine di un compito/esercizio scolastico.
Rispondi SOLO con un JSON valido nel seguente formato (senza markdown o altro testo):

{
  "title": "titolo breve del problema",
  "subject": "mathematics|physics|chemistry|biology|history|geography|italian|english|art|music|civics|economics|computerScience|philosophy|other",
  "problemType": "tipo di esercizio (es. equazione, problema, analisi, etc)",
  "steps": [
    {
      "id": "1",
      "description": "descrizione del passaggio",
      "hints": ["suggerimento 1", "suggerimento 2", "suggerimento 3"],
      "studentNotes": "",
      "completed": false
    }
  ]
}

Crea 3-5 passaggi maieutici che guidino lo studente a trovare la soluzione da solo, senza mai rivelare la risposta.`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': provider.apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: analysisPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Azure Vision API error', { response: errorText });
      return { success: false, error: 'Failed to analyze image' };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    const analysis = parseAnalysisResponse(content);
    analysis.subject = normalizeSubject(analysis.subject);

    return { success: true, analysis };
  } catch (error) {
    logger.error('Azure vision call failed', { error: String(error) });
    return { success: false, error: String(error) };
  }
}
