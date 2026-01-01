// ============================================================================
// HOMEWORK ANALYZE API
// Analyzes homework images using AI vision to extract problem structure
// Returns maieutic steps for guided learning
// ============================================================================

import { NextResponse } from 'next/server';
import { getActiveProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';

interface HomeworkStep {
  id: string;
  description: string;
  hints: string[];
  studentNotes: string;
  completed: boolean;
}

interface AnalysisResult {
  title: string;
  subject: string;
  problemType: string;
  steps: HomeworkStep[];
}

// Valid Subject enum values from the system
const VALID_SUBJECTS = [
  'mathematics', 'physics', 'chemistry', 'biology', 'history', 'geography',
  'italian', 'english', 'art', 'music', 'civics', 'economics',
  'computerScience', 'health', 'philosophy', 'internationalLaw'
] as const;

// Map AI responses (Italian or abbreviated) to valid Subject values
const SUBJECT_MAP: Record<string, string> = {
  // English abbreviations
  'math': 'mathematics',
  'maths': 'mathematics',
  'science': 'biology',
  'cs': 'computerScience',
  'pe': 'health',
  'law': 'internationalLaw',
  // Italian names
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
function normalizeSubject(subject: string): string {
  if (!subject) return 'other';
  const lower = subject.toLowerCase().trim();

  // Direct match with valid subjects
  if (VALID_SUBJECTS.includes(lower as typeof VALID_SUBJECTS[number])) {
    return lower;
  }

  // Map from abbreviations or Italian
  if (SUBJECT_MAP[lower]) {
    return SUBJECT_MAP[lower];
  }

  // Partial match (e.g., "matematica avanzata" -> "mathematics")
  for (const [key, value] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  return 'other';
}

export async function POST(request: Request) {
  // Rate limiting: 10 requests per minute per IP (vision API is expensive)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`homework:${clientId}`, RATE_LIMITS.HOMEWORK);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/homework/analyze' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const { image, systemPrompt } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    const provider = getActiveProvider();
    if (!provider) {
      return NextResponse.json(
        { error: 'No AI provider configured' },
        { status: 503 }
      );
    }

    // For Azure OpenAI, we need to use the vision-capable model
    // The GPT-4o model supports vision
    if (provider.provider === 'azure') {
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
                    url: image, // base64 data URL
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
        return NextResponse.json(
          { error: 'Failed to analyze image' },
          { status: 500 }
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // Parse JSON from response (handle potential markdown wrapping)
      let analysis: AnalysisResult;
      try {
        // Remove markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
          content.match(/```\s*([\s\S]*?)\s*```/) ||
          [null, content];
        const jsonStr = jsonMatch[1] || content;
        analysis = JSON.parse(jsonStr.trim());
      } catch {
        // If parsing fails, return a generic structure
        analysis = {
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

      // Normalize subject to valid enum value
      analysis.subject = normalizeSubject(analysis.subject);

      return NextResponse.json(analysis);
    }

    // Ollama doesn't support vision - return error
    return NextResponse.json(
      { error: 'Vision analysis requires Azure OpenAI with GPT-4o. Ollama does not support image analysis.' },
      { status: 501 }
    );
  } catch (error) {
    logger.error('Homework analyze error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to analyze homework' },
      { status: 500 }
    );
  }
}

// GET - Check if vision is available
export async function GET() {
  const provider = getActiveProvider();

  if (!provider) {
    return NextResponse.json({
      available: false,
      reason: 'No AI provider configured',
    });
  }

  if (provider.provider === 'ollama') {
    return NextResponse.json({
      available: false,
      reason: 'Ollama does not support image analysis. Use Azure OpenAI with GPT-4o.',
    });
  }

  return NextResponse.json({
    available: true,
    provider: provider.provider,
    model: process.env.AZURE_OPENAI_VISION_DEPLOYMENT || provider.model,
  });
}
