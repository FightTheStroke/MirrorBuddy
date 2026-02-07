// ============================================================================
// FINAL QUIZ GENERATOR
// Generate comprehensive quiz covering all topics in a learning path
// Plan 8 MVP - Wave 2: Learning Path Generation [F-13]
// ============================================================================

import { chatCompletion, getDeploymentForModel } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { tierService } from "@/lib/tier";
import type { QuizData, QuizQuestion } from "@/types/tools";

/**
 * Topic summary for quiz generation
 */
export interface TopicSummary {
  title: string;
  keyConcepts: string[];
  difficulty: "basic" | "intermediate" | "advanced";
}

/**
 * Final quiz configuration
 */
export interface FinalQuizOptions {
  totalQuestions?: number;
  distributeByDifficulty?: boolean;
}

/** Minimum score percentage required to pass the final quiz */
const PASSING_SCORE_THRESHOLD = 70;

const DEFAULT_OPTIONS: Required<FinalQuizOptions> = {
  totalQuestions: 10,
  distributeByDifficulty: true,
};

/**
 * Calculate question distribution based on topic difficulties
 */
function calculateQuestionDistribution(
  topics: TopicSummary[],
  totalQuestions: number,
): Map<string, number> {
  const distribution = new Map<string, number>();

  // Weight: advanced = 3, intermediate = 2, basic = 1
  const weights: Record<string, number> = {
    advanced: 3,
    intermediate: 2,
    basic: 1,
  };

  const totalWeight = topics.reduce((sum, t) => sum + weights[t.difficulty], 0);

  // Distribute questions proportionally
  let remaining = totalQuestions;
  topics.forEach((topic, index) => {
    if (index === topics.length - 1) {
      // Last topic gets remaining questions
      distribution.set(topic.title, remaining);
    } else {
      const weight = weights[topic.difficulty];
      const count = Math.max(
        1,
        Math.round((weight / totalWeight) * totalQuestions),
      );
      distribution.set(topic.title, count);
      remaining -= count;
    }
  });

  return distribution;
}

/**
 * Generate final comprehensive quiz for learning path
 * [F-13] Quiz finale su tutto il path
 */
export async function generateFinalQuiz(
  pathTitle: string,
  topics: TopicSummary[],
  options: FinalQuizOptions = {},
  userId?: string,
): Promise<QuizData> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  logger.info("Generating final quiz", {
    pathTitle,
    topicCount: topics.length,
    totalQuestions: opts.totalQuestions,
  });

  if (topics.length === 0) {
    return {
      topic: pathTitle,
      questions: [],
    };
  }

  // Calculate distribution
  const distribution = opts.distributeByDifficulty
    ? calculateQuestionDistribution(topics, opts.totalQuestions)
    : null;

  // Build topic summary for prompt
  const topicDetails = topics
    .map((t) => {
      const qCount =
        distribution?.get(t.title) ??
        Math.ceil(opts.totalQuestions / topics.length);
      return `- ${t.title} (${t.difficulty}): ${qCount} domande\n  Concetti: ${t.keyConcepts.join(", ")}`;
    })
    .join("\n");

  const prompt = `Sei un tutor educativo. Crea un quiz finale di verifica per un percorso di apprendimento.

PERCORSO: ${pathTitle}
NUMERO TOTALE DOMANDE: ${opts.totalQuestions}

ARGOMENTI DA COPRIRE:
${topicDetails}

ISTRUZIONI:
1. Crea esattamente ${opts.totalQuestions} domande a risposta multipla
2. Copri tutti gli argomenti in modo proporzionato
3. 4 opzioni per domanda
4. Una sola risposta corretta
5. Spiegazione chiara per ogni risposta
6. Difficoltà crescente durante il quiz
7. Domande che testano comprensione, non solo memoria
8. Linguaggio chiaro, adatto a studenti con DSA

Rispondi SOLO con JSON valido:
{
  "topic": "${pathTitle}",
  "questions": [
    {
      "question": "Testo domanda?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Spiegazione della risposta corretta"
    }
  ]
}`;

  // Get AI config from tier (ADR 0073)
  const aiConfig = await tierService.getFeatureAIConfigForUser(
    userId ?? null,
    "quiz",
  );
  const deploymentName = getDeploymentForModel(aiConfig.model);

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    "Sei un tutor educativo. Rispondi SOLO con JSON valido.",
    {
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
      model: deploymentName,
    },
  );

  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse final quiz JSON");
  }

  const data = JSON.parse(jsonMatch[0]);

  // Validate and normalize
  const questions: QuizQuestion[] = data.questions.map(
    (q: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    }) => ({
      question: String(q.question),
      options: q.options.map((o: string) => String(o)),
      correctIndex: Number(q.correctIndex),
      explanation: q.explanation ? String(q.explanation) : undefined,
    }),
  );

  logger.info("Final quiz generated", {
    pathTitle,
    questionCount: questions.length,
  });

  return {
    topic: data.topic || pathTitle,
    questions,
  };
}

/**
 * Evaluate quiz results and determine if path is complete
 * Returns mastery percentage and pass/fail status
 */
export function evaluateQuizResults(
  quiz: QuizData,
  answers: number[],
): {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
} {
  if (quiz.questions.length === 0) {
    return { score: 100, passed: true, correctCount: 0, totalCount: 0 };
  }

  let correctCount = 0;
  quiz.questions.forEach((q, index) => {
    if (answers[index] === q.correctIndex) {
      correctCount++;
    }
  });

  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= PASSING_SCORE_THRESHOLD;

  return {
    score,
    passed,
    correctCount,
    totalCount: quiz.questions.length,
  };
}
