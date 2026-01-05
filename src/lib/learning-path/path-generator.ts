// ============================================================================
// PATH GENERATOR
// Creates Learning Paths from PDF analysis results
// Plan 8 MVP - Wave 2: Learning Path Generation [F-11]
// ============================================================================

import { prisma } from '@/lib/db';
import { chatCompletion } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import type { TopicAnalysisResult, IdentifiedTopic } from './topic-analyzer';
import type { TopicWithRelations } from './material-linker';

/**
 * Options for path generation
 */
export interface PathGenerationOptions {
  includeVisualOverview?: boolean;
  maxTopics?: number;
}

/**
 * Result of path generation
 */
export interface GeneratedPath {
  id: string;
  title: string;
  description?: string;
  visualOverview?: string; // Mermaid code
  topics: GeneratedTopic[];
}

/**
 * Generated topic within a path
 */
export interface GeneratedTopic {
  id: string;
  title: string;
  description: string;
  keyConcepts: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  order: number;
  status: 'locked' | 'unlocked';
  estimatedMinutes: number;
  relatedMaterials: string; // JSON string
}

/**
 * Generate Mermaid diagram code for the learning path
 * AI-powered for better visual representation
 */
export async function generateVisualOverview(
  topics: IdentifiedTopic[],
  title: string
): Promise<string> {
  logger.info('Generating visual overview', { topicCount: topics.length, title });

  // For 2-3 topics, use simple template
  if (topics.length <= 3) {
    return generateSimpleOverview(topics);
  }

  // For more topics, use AI to create a more meaningful diagram
  const topicSummary = topics
    .map((t, i) => `${i + 1}. ${t.title} (${t.estimatedDifficulty})`)
    .join('\n');

  const prompt = `Genera un diagramma Mermaid flowchart per questo percorso di studio.

TITOLO: ${title}

ARGOMENTI (in ordine pedagogico):
${topicSummary}

ISTRUZIONI:
1. Usa "flowchart TD" (top-down)
2. Crea un nodo per ogni argomento
3. Collega i nodi in sequenza
4. Usa etichette brevi e chiare
5. NON aggiungere stili o classi (li aggiungo io)
6. I nodi devono usare IDs T0, T1, T2, ecc.

Rispondi SOLO con il codice Mermaid, senza backticks o spiegazioni.`;

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: prompt }],
      'Sei un esperto di visualizzazione dati. Genera diagrammi Mermaid puliti e leggibili.',
      { temperature: 0.3, maxTokens: 500 }
    );

    // Extract Mermaid code, removing any markdown fences
    const code = result.content
      .replace(/```mermaid\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Validate it starts with flowchart
    if (!code.startsWith('flowchart')) {
      logger.warn('AI generated invalid Mermaid, using fallback');
      return generateSimpleOverview(topics);
    }

    return code;
  } catch (error) {
    logger.error('AI visual overview generation failed', { error });
    return generateSimpleOverview(topics);
  }
}

/**
 * Generate simple template-based overview (fallback)
 */
function generateSimpleOverview(topics: IdentifiedTopic[]): string {
  if (topics.length === 0) {
    return 'flowchart TD\n    empty["Nessun argomento"]';
  }

  const sortedTopics = [...topics].sort((a, b) => a.order - b.order);

  let code = 'flowchart TD\n';

  // Add nodes
  sortedTopics.forEach((topic, index) => {
    const escapedTitle = topic.title.replace(/"/g, "'");
    code += `    T${index}["${escapedTitle}"]\n`;
  });

  // Add connections
  sortedTopics.forEach((_, index) => {
    if (index < sortedTopics.length - 1) {
      code += `    T${index} --> T${index + 1}\n`;
    }
  });

  return code;
}

/**
 * Create a complete Learning Path from topic analysis
 */
export async function createLearningPath(
  userId: string,
  analysisResult: TopicAnalysisResult,
  topicsWithRelations: TopicWithRelations[],
  sourceStudyKitId?: string,
  options: PathGenerationOptions = {}
): Promise<GeneratedPath> {
  const { includeVisualOverview = true } = options;

  logger.info('Creating learning path', {
    userId,
    title: analysisResult.documentTitle,
    topicCount: analysisResult.topics.length,
  });

  // Generate visual overview if requested
  let visualOverview: string | undefined;
  if (includeVisualOverview) {
    visualOverview = await generateVisualOverview(
      analysisResult.topics,
      analysisResult.documentTitle
    );
  }

  // Create the path in database
  const path = await prisma.learningPath.create({
    data: {
      userId,
      title: analysisResult.documentTitle,
      subject: analysisResult.subject,
      sourceStudyKitId,
      totalTopics: analysisResult.topics.length,
      completedTopics: 0,
      progressPercent: 0,
      estimatedMinutes: analysisResult.totalEstimatedMinutes,
      status: 'ready',
      visualOverview,
    },
  });

  // Create topics
  const generatedTopics: GeneratedTopic[] = [];

  for (const topicAnalysis of topicsWithRelations) {
    const order = analysisResult.suggestedOrder.indexOf(topicAnalysis.id) + 1 || topicAnalysis.order;

    // First topic is unlocked, rest are locked
    const status = order === 1 ? 'unlocked' : 'locked';

    // Serialize related materials
    const relatedMaterials = JSON.stringify(
      topicAnalysis.relatedMaterials.map((m) => ({
        id: m.id,
        title: m.title,
        toolType: m.toolType,
        relevanceScore: m.relevanceScore,
      }))
    );

    const topic = await prisma.learningPathTopic.create({
      data: {
        pathId: path.id,
        order,
        title: topicAnalysis.title,
        description: topicAnalysis.description,
        keyConcepts: JSON.stringify(topicAnalysis.keyConcepts),
        difficulty: topicAnalysis.estimatedDifficulty,
        status,
        estimatedMinutes: 10, // Default, can be customized
        relatedMaterials,
      },
    });

    generatedTopics.push({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      keyConcepts: topicAnalysis.keyConcepts,
      difficulty: topicAnalysis.estimatedDifficulty,
      order: topic.order,
      status: status as 'locked' | 'unlocked',
      estimatedMinutes: topic.estimatedMinutes,
      relatedMaterials,
    });
  }

  logger.info('Learning path created', {
    pathId: path.id,
    topicCount: generatedTopics.length,
  });

  return {
    id: path.id,
    title: path.title,
    description: path.description ?? undefined,
    visualOverview,
    topics: generatedTopics,
  };
}

/**
 * Update the visual overview for an existing path
 */
export async function updateVisualOverview(
  pathId: string,
  mermaidCode: string
): Promise<void> {
  await prisma.learningPath.update({
    where: { id: pathId },
    data: { visualOverview: mermaidCode },
  });
}
